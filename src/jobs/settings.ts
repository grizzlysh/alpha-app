import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { JobDefinition, JobSettings } from './types'

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** Saved overrides on top of the registry defaults; anything invalid falls back to the default. */
export function mergeSettings(
  job: JobDefinition,
  saved: { enabled: boolean; time: string; params: Prisma.JsonValue } | null
): JobSettings {
  const savedParams = (saved?.params && typeof saved.params === 'object' && !Array.isArray(saved.params) ? saved.params : {}) as Record<string, unknown>
  const params: Record<string, number> = {}
  for (const p of job.params) {
    const v = Number(savedParams[p.key])
    params[p.key] = Number.isInteger(v) && v >= p.min && v <= p.max ? v : p.default
  }
  return {
    enabled: saved?.enabled ?? true,
    time: saved && TIME_PATTERN.test(saved.time) ? saved.time : job.defaultTime,
    params,
  }
}

export async function loadSettings(jobs: readonly JobDefinition[]): Promise<Map<string, JobSettings>> {
  const rows = await prisma.jobSetting.findMany({ where: { name: { in: jobs.map((j) => j.name) } } })
  const byName = new Map(rows.map((r) => [r.name, r]))
  return new Map(jobs.map((j) => [j.name, mergeSettings(j, byName.get(j.name) ?? null)]))
}

export async function loadJobSettings(job: JobDefinition): Promise<JobSettings> {
  return (await loadSettings([job])).get(job.name)!
}

/** The jobs whose time of day is this minute (HH:mm in the system timezone). */
export function dueJobs(jobs: readonly JobDefinition[], settings: Map<string, JobSettings>, hhmm: string): JobDefinition[] {
  return jobs.filter((j) => {
    const s = settings.get(j.name)
    return s !== undefined && s.enabled && s.time === hhmm
  })
}
