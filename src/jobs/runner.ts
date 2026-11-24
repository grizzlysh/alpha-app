import { JobRunStatus, JobTrigger } from '@prisma/client'
import { prisma } from '@config/db'
import { getTimezone } from '@utils/generateDocNumbers'
import { loadJobSettings } from './settings'
import { JobDefinition, JobResult } from './types'

/** The lock-holding transaction is closed after this long, failing the run. */
const JOB_TIMEOUT_MS = 10 * 60 * 1000

/** Jobs currently running in this process (a slow run must not overlap the next one). */
const runningHere = new Set<string>()

export interface JobRunOutcome {
  /** Null when nothing was logged: a scheduled run another instance already took. */
  uuid: string | null
  name: string
  status: JobRunStatus
  affected: number
  error: string | null
}

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err)).slice(0, 2000)

async function logSkipped(job: JobDefinition, trigger: JobTrigger, triggeredById: number | undefined, reason: string): Promise<JobRunOutcome> {
  const now = new Date()
  const run = await prisma.jobRun.create({
    data: { name: job.name, trigger, triggeredById: triggeredById ?? null, status: JobRunStatus.SKIPPED, finishedAt: now, error: reason },
    select: { uuid: true },
  })
  return { uuid: run.uuid, name: job.name, status: JobRunStatus.SKIPPED, affected: 0, error: reason }
}

/**
 * Runs a job once and logs it as a JobRun row.
 *
 * Safe with more than one server instance: the job runs inside a transaction
 * holding a Postgres advisory lock (pg_try_advisory_xact_lock). An instance
 * that fails to take the lock does not run the job; on a schedule tick it
 * stays silent (the other instance logs the run), on a manual run it logs
 * SKIPPED. The lock ends with the transaction, even if the process dies.
 */
export async function runJob(
  job: JobDefinition,
  trigger: JobTrigger,
  options: { now?: Date; triggeredById?: number; params?: Record<string, number> } = {}
): Promise<JobRunOutcome> {
  const silent: JobRunOutcome = { uuid: null, name: job.name, status: JobRunStatus.SKIPPED, affected: 0, error: null }

  if (runningHere.has(job.name)) {
    return trigger === JobTrigger.MANUAL ? logSkipped(job, trigger, options.triggeredById, 'Already running') : silent
  }
  runningHere.add(job.name)

  try {
    const [timezone, settings] = await Promise.all([getTimezone(), loadJobSettings(job)])
    const outcome = await prisma.$transaction(
      async (tx) => {
        const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${job.lockKey}::bigint) AS locked`
        if (!locked) return null

        // The job writes on other connections; this transaction only holds the lock.
        const run = await prisma.jobRun.create({
          data: { name: job.name, trigger, triggeredById: options.triggeredById ?? null },
          select: { id: true, uuid: true },
        })
        let result: JobResult | null = null
        let error: string | null = null
        try {
          result = await job.run({ now: options.now ?? new Date(), timezone, params: options.params ?? settings.params })
        } catch (err) {
          console.error(`[jobs] ${job.name} failed:`, err)
          error = errorMessage(err)
        }
        const status = error ? JobRunStatus.FAILED : JobRunStatus.SUCCESS
        await prisma.jobRun.update({
          where: { id: run.id },
          data: { status, finishedAt: new Date(), affected: result?.affected ?? 0, details: result?.details, error },
        })
        return { uuid: run.uuid, name: job.name, status, affected: result?.affected ?? 0, error }
      },
      { timeout: JOB_TIMEOUT_MS, maxWait: 10_000 }
    )
    if (outcome) return outcome
    return trigger === JobTrigger.MANUAL ? logSkipped(job, trigger, options.triggeredById, 'Lock held by another instance') : silent
  } finally {
    runningHere.delete(job.name)
  }
}
