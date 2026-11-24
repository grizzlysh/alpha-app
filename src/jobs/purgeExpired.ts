import { prisma } from '@config/db'
import { JobContext, JobResult } from './types'

const DAY_MS = 86_400_000

/**
 * Deletes rows that only matter until they expire. Retention (params, editable
 * on the jobs page): notificationRetentionDays, jobRunRetentionDays.
 */
export async function purgeExpired({ now, params }: JobContext): Promise<JobResult> {
  const daysAgo = (days: number): Date => new Date(now.getTime() - days * DAY_MS)

  const [idempotencyKeys, refreshTokens, notifications, jobRuns] = await prisma.$transaction([
    prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.userToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.notification.deleteMany({ where: { createdAt: { lt: daysAgo(params.notificationRetentionDays) } } }),
    prisma.jobRun.deleteMany({ where: { startedAt: { lt: daysAgo(params.jobRunRetentionDays) } } }),
  ])

  const details = {
    idempotencyKeys: idempotencyKeys.count,
    refreshTokens: refreshTokens.count,
    notifications: notifications.count,
    jobRuns: jobRuns.count,
  }
  return { affected: Object.values(details).reduce((a, b) => a + b, 0), details }
}
