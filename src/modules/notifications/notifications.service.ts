import { PlatformRole, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { NotFoundException } from '@exceptions/NotFoundException'
import { NotificationListResponse, NotificationViewer } from './notifications.interface'
import { NotificationQueryInput } from './notifications.validation'

const DEFAULT_LIMIT = 30
/** The bell shows the last week; older rows are purged after 30 days. */
const VISIBLE_DAYS = 7
const DAY_MS = 86_400_000

/** Notifications of this pharmacy that the viewer may see (by permission), from the last week. */
const visibleWhere = (pharmacyId: number, viewer: NotificationViewer): Prisma.NotificationWhereInput => ({
  pharmacyId,
  updatedAt: { gte: new Date(Date.now() - VISIBLE_DAYS * DAY_MS) },
  ...(viewer.platformRole === PlatformRole.PLATFORM_ADMIN
    ? {}
    : { OR: [{ permission: null }, { permission: { in: viewer.permissions } }] }),
})

export const getNotifications = async (
  pharmacyId: number,
  viewer: NotificationViewer,
  query: NotificationQueryInput
): Promise<NotificationListResponse> => {
  const where = visibleWhere(pharmacyId, viewer)
  const unreadWhere: Prisma.NotificationWhereInput = { ...where, reads: { none: { userId: viewer.id } } }

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit ?? DEFAULT_LIMIT,
      select: {
        uuid: true,
        type: true,
        severity: true,
        count: true,
        data: true,
        link: true,
        createdAt: true,
        updatedAt: true,
        reads: { where: { userId: viewer.id }, select: { userId: true } },
      },
    }),
    prisma.notification.count({ where: unreadWhere }),
  ])

  return {
    items: rows.map(({ reads, ...n }) => ({ ...n, isRead: reads.length > 0 })),
    unreadCount,
  }
}

export const markNotificationRead = async (
  uuid: string,
  pharmacyId: number,
  viewer: NotificationViewer
): Promise<void> => {
  const notification = await prisma.notification.findFirst({
    where: { uuid, ...visibleWhere(pharmacyId, viewer) },
    select: { id: true },
  })
  if (!notification) throw new NotFoundException('NOTIFICATION_NOT_FOUND')

  await prisma.notificationRead.createMany({
    data: [{ notificationId: notification.id, userId: viewer.id }],
    skipDuplicates: true,
  })
}

export const markAllNotificationsRead = async (pharmacyId: number, viewer: NotificationViewer): Promise<number> => {
  const unread = await prisma.notification.findMany({
    where: { ...visibleWhere(pharmacyId, viewer), reads: { none: { userId: viewer.id } } },
    select: { id: true },
  })
  if (unread.length === 0) return 0

  const { count } = await prisma.notificationRead.createMany({
    data: unread.map((n) => ({ notificationId: n.id, userId: viewer.id })),
    skipDuplicates: true,
  })
  return count
}
