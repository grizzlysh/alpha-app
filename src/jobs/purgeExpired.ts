import { prisma } from '@config/db'
import { JobContext, JobResult } from './types'

const DAY_MS = 86_400_000
/** Notifications older than this are dropped (they are regenerated daily anyway). */
export const NOTIFICATION_RETENTION_DAYS = 30
/** The job run log is kept this long. */
export const JOB_RUN_RETENTION_DAYS = 90

/** Deletes rows that only matter until they expire. */
export async function purgeExpired({ now }: JobContext): Promise<JobResult> {
  const daysAgo = (days: number): Date => new Date(now.getTime() - days * DAY_MS)

  const [idempotencyKeys, refreshTokens, notifications, jobRuns] = await prisma.$transaction([
    prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.userToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.notification.deleteMany({ where: { createdAt: { lt: daysAgo(NOTIFICATION_RETENTION_DAYS) } } }),
    prisma.jobRun.deleteMany({ where: { startedAt: { lt: daysAgo(JOB_RUN_RETENTION_DAYS) } } }),
  ])

  const details = {
    idempotencyKeys: idempotencyKeys.count,
    refreshTokens: refreshTokens.count,
    notifications: notifications.count,
    jobRuns: jobRuns.count,
  }
  return { affected: Object.values(details).reduce((a, b) => a + b, 0), details }
}
