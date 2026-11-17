import { JobTrigger, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { NotFoundException } from '@exceptions/NotFoundException'
import { JOBS, findJob } from '@jobs/registry'
import { JobRunOutcome, runJob } from '@jobs/runner'
import { JobResponse, JobRunResponse } from './jobs.interface'
import { JobRunQueryInput } from './jobs.validation'

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

/** Every registered job with its most recent run. */
export const getJobs = async (): Promise<JobResponse[]> => {
  const lastRuns = await Promise.all(
    JOBS.map((job) =>
      prisma.jobRun.findFirst({ where: { name: job.name }, orderBy: { startedAt: 'desc' }, select: jobRunSelect })
    )
  )
  return JOBS.map((job, i) => ({
    name: job.name,
    description: job.description,
    schedule: job.schedule,
    lastRun: lastRuns[i],
  }))
}

export const getJobRuns = async (query: JobRunQueryInput): Promise<JobRunResponse[]> =>
  prisma.jobRun.findMany({
    where: query.name ? { name: query.name } : {},
    orderBy: { startedAt: 'desc' },
    take: query.limit ?? DEFAULT_LIMIT,
    select: jobRunSelect,
  })

/** Runs a job now (on top of its schedule) and waits for it to finish. */
export const runJobNow = async (name: string, userId: number): Promise<JobRunOutcome> => {
  const job = findJob(name)
  if (!job) throw new NotFoundException('JOB_NOT_FOUND')
  return runJob(job, JobTrigger.MANUAL, { triggeredById: userId })
}
