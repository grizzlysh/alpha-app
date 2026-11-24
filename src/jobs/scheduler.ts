import cron from 'node-cron'
import { JobTrigger } from '@prisma/client'
import { DateTime } from 'luxon'
import { getTimezone } from '@utils/generateDocNumbers'
import { JOBS } from './registry'
import { runJob } from './runner'
import { dueJobs, loadSettings } from './settings'

/**
 * Checks once a minute which jobs are due (their saved time of day, in the
 * system timezone) and runs them. Reading the settings on every tick means a
 * time changed on the jobs page applies from the next minute, on every
 * instance, without a restart. Called once at start-up; not in tests.
 */
export function startScheduler(): void {
  cron.schedule(
    '* * * * *',
    () => {
      void tick().catch((err: unknown) => console.error('[jobs] scheduler tick failed:', err))
    },
    { name: 'job-scheduler' }
  )
  console.log(`[jobs] scheduler started (${JOBS.length} jobs)`)
}

async function tick(): Promise<void> {
  const timezone = await getTimezone()
  const hhmm = DateTime.now().setZone(timezone).toFormat('HH:mm')
  const settings = await loadSettings(JOBS)
  for (const job of dueJobs(JOBS, settings, hhmm)) {
    void runJob(job, JobTrigger.SCHEDULE)
  }
}
