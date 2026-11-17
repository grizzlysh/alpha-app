import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { NotificationSeverity, NotificationType, PlatformRole, Prisma } from '@prisma/client'

// ── Query/Param Types ─────────────────────────────────

export interface NotificationQueryParams {
  limit?: number
}

export interface NotificationUuidParam extends ParamsDictionary {
  notification_uuid: string
}

/** Who is asking: decides which notifications are visible and which are read. */
export interface NotificationViewer {
  id: number
  platformRole: PlatformRole | null
  permissions: string[]
}

// ── Response Shapes ───────────────────────────────────

export interface NotificationResponse {
  uuid: string
  type: NotificationType
  severity: NotificationSeverity
  count: number
  data: Prisma.JsonValue
  link: string | null
  createdAt: Date
  updatedAt: Date
  isRead: boolean
}

export interface NotificationListResponse {
  items: NotificationResponse[]
  unreadCount: number
}

// ── Typed Request Aliases ─────────────────────────────

export type GetNotificationsRequest = Request<{}, {}, {}, NotificationQueryParams>
export type MarkNotificationReadRequest = Request<NotificationUuidParam>
