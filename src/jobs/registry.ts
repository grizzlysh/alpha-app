import { cancelHeldSales } from './cancelHeldSales'
import { dailyAlerts } from './dailyAlerts'
import { expirePrescriptions } from './expirePrescriptions'
import { purgeExpired } from './purgeExpired'
import { JobDefinition } from './types'

/**
 * Every background job and its defaults. The time, on/off switch and global
 * numbers can be changed on the jobs page (stored in sys_job_settings); the
 * per-pharmacy numbers are business parameters. Each job is idempotent:
 * running it twice changes nothing the second time.
 */
export const JOBS: readonly JobDefinition[] = [
  {
    name: 'cancel-held-sales',
    description: 'Cancel held sales left open past the end of the day and release their reserved stock',
    defaultTime: '01:00',
    lockKey: 7_301_001,
    params: [],
    pharmacyParams: [],
    run: cancelHeldSales,
  },
  {
    name: 'expire-prescriptions',
    description: 'Mark undispensed prescriptions older than PRESCRIPTION_VALID_DAYS as expired',
    defaultTime: '01:05',
    lockKey: 7_301_002,
    params: [],
    pharmacyParams: ['PRESCRIPTION_VALID_DAYS'],
    run: expirePrescriptions,
  },
  {
    name: 'purge-expired',
    description: 'Delete expired idempotency keys and refresh tokens, and old notifications and job runs',
    defaultTime: '01:30',
    lockKey: 7_301_003,
    params: [
      { key: 'notificationRetentionDays', default: 30, min: 7, max: 365 },
      { key: 'jobRunRetentionDays', default: 90, min: 7, max: 730 },
    ],
    pharmacyParams: [],
    run: purgeExpired,
  },
  {
    name: 'daily-alerts',
    description: 'Notify each pharmacy of expiring/expired batches, low stock, overdue payments and expiring licenses',
    defaultTime: '06:00',
    lockKey: 7_301_004,
    params: [],
    pharmacyParams: ['EXPIRY_ALERT_DAYS', 'LICENSE_ALERT_DAYS'],
    run: dailyAlerts,
  },
]

export const findJob = (name: string): JobDefinition | undefined => JOBS.find((j) => j.name === name)
