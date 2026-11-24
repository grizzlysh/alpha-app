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
  /** The job's global numbers (see JobDefinition.params), defaults merged with saved values. */
  params: Record<string, number>
}

/** A number the platform admin may change for one job (applies to every pharmacy). */
export interface JobParamDefinition {
  key: string
  default: number
  min: number
  max: number
}

export interface JobDefinition {
  name: string
  description: string
  /** Time of day it runs by default, HH:mm in the system timezone. */
  defaultTime: string
  /** Postgres advisory-lock key; unique per job. */
  lockKey: number
  /** Global numbers this job reads; editable on the jobs page. */
  params: JobParamDefinition[]
  /** Business parameters (per pharmacy) this job reads; edited by each pharmacy. */
  pharmacyParams: string[]
  run: (ctx: JobContext) => Promise<JobResult>
}

/** A job's effective settings: saved overrides on top of the registry defaults. */
export interface JobSettings {
  enabled: boolean
  time: string
  params: Record<string, number>
}
