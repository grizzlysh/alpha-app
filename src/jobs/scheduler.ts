import cron from 'node-cron'
import { JobTrigger } from '@prisma/client'
import { getTimezone } from '@utils/generateDocNumbers'
import { JOBS } from './registry'
import { runJob } from './runner'

/**
 * Registers every job with node-cron, in the system timezone. Called once at
 * server start-up; not in tests (they call runJob directly).
 */
export async function startScheduler(): Promise<void> {
  const timezone = await getTimezone()
  for (const job of JOBS) {
    cron.schedule(
      job.schedule,
      () => {
        void runJob(job, JobTrigger.SCHEDULE)
      },
      { timezone, name: job.name }
    )
  }
  console.log(`[jobs] scheduled ${JOBS.length} jobs (${timezone})`)
}
