import { Prisma } from '@prisma/client'

/** What a job reports back; stored on its JobRun row. */
export interface JobResult {
  /** Rows changed or notifications written. */
  affected: number
  details?: Prisma.InputJsonValue
}

export interface JobContext {
  /** "Now" for the run. Injected so tests can move the clock. */
  now: Date
  /** IANA timezone the pharmacies operate in (system parameter DEFAULT_TIMEZONE). */
  timezone: string
}

export interface JobDefinition {
  name: string
  description: string
  /** Cron expression, evaluated in the system timezone. */
  schedule: string
  /** Postgres advisory-lock key; unique per job. */
  lockKey: number
  run: (ctx: JobContext) => Promise<JobResult>
}
