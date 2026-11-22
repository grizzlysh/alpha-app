import { JobTrigger, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ValidationException } from '@exceptions/ValidationException'
import { getTimezone } from '@utils/generateDocNumbers'
import { JOBS, findJob } from '@jobs/registry'
import { JobRunOutcome, runJob } from '@jobs/runner'
import { loadSettings } from '@jobs/settings'
import { JobDefinition, JobSettings } from '@jobs/types'
import { JobResponse, JobRunResponse } from './jobs.interface'
import { JobRunQueryInput, UpdateJobSettingsInput } from './jobs.validation'

const DEFAULT_LIMIT = 50

const jobRunSelect = {
  uuid: true,
  name: true,
  status: true,
  trigger: true,
  startedAt: true,
  finishedAt: true,
  affected: true,
  details: true,
  error: true,
  triggeredBy: { select: { uuid: true, name: true } },
} satisfies Prisma.JobRunSelect

const requireJob = (name: string): JobDefinition => {
  const job = findJob(name)
  if (!job) throw new NotFoundException('JOB_NOT_FOUND')
  return job
}

const toResponse = (
  job: JobDefinition,
  settings: JobSettings,
  timezone: string,
  lastRun: JobRunResponse | null
): JobResponse => ({
  name: job.name,
  description: job.description,
  enabled: settings.enabled,
  time: settings.time,
  defaultTime: job.defaultTime,
  timezone,
  params: job.params.map((p) => ({ key: p.key, value: settings.params[p.key], default: p.default, min: p.min, max: p.max })),
  pharmacyParams: job.pharmacyParams,
  lastRun,
})

/** Every registered job with its settings and most recent run. */
export const getJobs = async (): Promise<JobResponse[]> => {
  const [settings, timezone, lastRuns] = await Promise.all([
    loadSettings(JOBS),
    getTimezone(),
    Promise.all(
      JOBS.map((job) =>
        prisma.jobRun.findFirst({ where: { name: job.name }, orderBy: { startedAt: 'desc' }, select: jobRunSelect })
      )
    ),
  ])
  return JOBS.map((job, i) => toResponse(job, settings.get(job.name)!, timezone, lastRuns[i]))
}

export const getJobRuns = async (query: JobRunQueryInput): Promise<JobRunResponse[]> =>
  prisma.jobRun.findMany({
    where: query.name ? { name: query.name } : {},
    orderBy: { startedAt: 'desc' },
    take: query.limit ?? DEFAULT_LIMIT,
    select: jobRunSelect,
  })

/** Saves a job's on/off switch, time of day and global numbers (each within its range). */
export const updateJobSettings = async (name: string, data: UpdateJobSettingsInput, userId: number): Promise<JobResponse> => {
  const job = requireJob(name)

  const errors: Record<string, { en: string; id: string }> = {}
  for (const key of Object.keys(data.params)) {
    if (!job.params.some((p) => p.key === key)) errors[`params.${key}`] = { en: 'Unknown setting', id: 'Pengaturan tidak dikenal' }
  }
  const params: Record<string, number> = {}
  for (const p of job.params) {
    const value = data.params[p.key] ?? p.default
    if (value < p.min || value > p.max) {
      errors[`params.${p.key}`] = {
        en: `Must be between ${p.min} and ${p.max}`,
        id: `Harus antara ${p.min} dan ${p.max}`,
      }
    }
    params[p.key] = value
  }
  if (Object.keys(errors).length > 0) throw new ValidationException(errors)

  await prisma.jobSetting.upsert({
    where: { name },
    create: { name, enabled: data.enabled, time: data.time, params, updatedById: userId },
    update: { enabled: data.enabled, time: data.time, params, updatedById: userId },
  })

  return (await getJobs()).find((j) => j.name === name)!
}

/** Runs a job now (on top of its schedule) and waits for it to finish. */
export const runJobNow = async (name: string, userId: number): Promise<JobRunOutcome> =>
  runJob(requireJob(name), JobTrigger.MANUAL, { triggeredById: userId })
