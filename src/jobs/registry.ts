import { cancelHeldSales } from './cancelHeldSales'
import { dailyAlerts } from './dailyAlerts'
import { expirePrescriptions } from './expirePrescriptions'
import { purgeExpired } from './purgeExpired'
import { JobDefinition } from './types'

/**
 * Every background job. Schedules are cron expressions in the system timezone
 * (DEFAULT_TIMEZONE). Each job is idempotent: running it twice changes nothing
 * the second time.
 */
export const JOBS: readonly JobDefinition[] = [
  {
    name: 'cancel-held-sales',
    description: 'Cancel held sales left open past the end of the day and release their reserved stock',
    schedule: '0 1 * * *',
    lockKey: 7_301_001,
    run: cancelHeldSales,
  },
  {
    name: 'expire-prescriptions',
    description: 'Mark undispensed prescriptions older than PRESCRIPTION_VALID_DAYS as expired',
    schedule: '5 1 * * *',
    lockKey: 7_301_002,
    run: expirePrescriptions,
  },
  {
    name: 'purge-expired',
    description: 'Delete expired idempotency keys and refresh tokens, and old notifications and job runs',
    schedule: '30 1 * * *',
    lockKey: 7_301_003,
    run: purgeExpired,
  },
  {
    name: 'daily-alerts',
    description: 'Notify each pharmacy of expiring/expired batches, low stock, overdue payments and expiring licenses',
    schedule: '0 6 * * *',
    lockKey: 7_301_004,
    run: dailyAlerts,
  },
]

export const findJob = (name: string): JobDefinition | undefined => JOBS.find((j) => j.name === name)
