import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { JobRunStatus, JobTrigger, Prisma } from '@prisma/client'

// ── Query/Param Types ─────────────────────────────────

export interface JobNameParam extends ParamsDictionary {
  job_name: string
}

export interface JobRunQueryParams {
  name?: string
  limit?: number
}

// ── Response Shapes ───────────────────────────────────

export interface JobRunResponse {
  uuid: string
  name: string
  status: JobRunStatus
  trigger: JobTrigger
  startedAt: Date
  finishedAt: Date | null
  affected: number
  details: Prisma.JsonValue
  error: string | null
  triggeredBy: { uuid: string; name: string } | null
}

export interface JobResponse {
  name: string
  description: string
  schedule: string
  lastRun: JobRunResponse | null
}

// ── Typed Request Aliases ─────────────────────────────

export type GetJobRunsRequest = Request<{}, {}, {}, JobRunQueryParams>
export type RunJobRequest = Request<JobNameParam>
