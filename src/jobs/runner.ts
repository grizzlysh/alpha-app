import { JobRunStatus, JobTrigger } from '@prisma/client'
import { prisma } from '@config/db'
import { getTimezone } from '@utils/generateDocNumbers'
import { JobDefinition, JobResult } from './types'

/** The lock-holding transaction is closed after this long, failing the run. */
const JOB_TIMEOUT_MS = 10 * 60 * 1000

/** Jobs currently running in this process (a slow run must not overlap the next tick). */
const runningHere = new Set<string>()

export interface JobRunOutcome {
  uuid: string
  name: string
  status: JobRunStatus
  affected: number
  error: string | null
}

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err)).slice(0, 2000)

/**
 * Runs a job once, logged as a JobRun row.
 *
 * Safe with more than one server instance: the job runs inside a transaction
 * that holds a Postgres advisory lock (pg_try_advisory_xact_lock). Another
 * instance that ticks at the same moment fails to take the lock and records the
 * run as SKIPPED. The lock is released when the transaction ends, including when
 * the process dies, so it can never be left stuck.
 */
export async function runJob(
  job: JobDefinition,
  trigger: JobTrigger,
  options: { now?: Date; triggeredById?: number } = {}
): Promise<JobRunOutcome> {
  const run = await prisma.jobRun.create({
    data: { name: job.name, trigger, triggeredById: options.triggeredById ?? null },
    select: { id: true, uuid: true },
  })

  const finish = async (status: JobRunStatus, result: JobResult | null, error: string | null): Promise<JobRunOutcome> => {
    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        affected: result?.affected ?? 0,
        details: result?.details,
        error,
      },
    })
    return { uuid: run.uuid, name: job.name, status, affected: result?.affected ?? 0, error }
  }

  if (runningHere.has(job.name)) return finish(JobRunStatus.SKIPPED, null, 'Already running in this process')
  runningHere.add(job.name)

  try {
    const timezone = await getTimezone()
    const result = await prisma.$transaction(
      async (tx) => {
        const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${job.lockKey}::bigint) AS locked`
        if (!locked) return null
        // The job does its own writes on other connections; this transaction
        // only exists to hold the lock until the job is done.
        return job.run({ now: options.now ?? new Date(), timezone })
      },
      { timeout: JOB_TIMEOUT_MS, maxWait: 10_000 }
    )
    if (result === null) return finish(JobRunStatus.SKIPPED, null, 'Lock held by another instance')
    return finish(JobRunStatus.SUCCESS, result, null)
  } catch (err) {
    console.error(`[jobs] ${job.name} failed:`, err)
    return finish(JobRunStatus.FAILED, null, errorMessage(err))
  } finally {
    runningHere.delete(job.name)
  }
}
