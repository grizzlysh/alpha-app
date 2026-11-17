import { Request, Response, NextFunction } from 'express'
import { parseUuid } from '@utils/parseUuid'
import { sendSuccess } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'
import * as NotificationService from './notifications.service'
import { GetNotificationsRequest, MarkNotificationReadRequest, NotificationViewer } from './notifications.interface'
import { NotificationQueryInput } from './notifications.validation'

const viewerOf = (req: Pick<Request, 'user'>): NotificationViewer => ({
  id: req.user!.id,
  platformRole: req.user!.platformRole,
  permissions: req.user!.permissions,
})

export const getNotifications = async (req: GetNotificationsRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await NotificationService.getNotifications(
      req.user!.pharmacyId!,
      viewerOf(req),
      req.query as NotificationQueryInput
    )
    sendSuccess(res, MESSAGE_CODES.NOTIFICATIONS_FETCHED, result)
  } catch (err) {
    next(err)
  }
}

export const markNotificationRead = async (req: MarkNotificationReadRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await NotificationService.markNotificationRead(
      parseUuid(req.params.notification_uuid),
      req.user!.pharmacyId!,
      viewerOf(req)
    )
    sendSuccess(res, MESSAGE_CODES.NOTIFICATION_MARKED_READ, null)
  } catch (err) {
    next(err)
  }
}

export const markAllNotificationsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const marked = await NotificationService.markAllNotificationsRead(req.user!.pharmacyId!, viewerOf(req))
    sendSuccess(res, MESSAGE_CODES.NOTIFICATIONS_ALL_MARKED_READ, { marked })
  } catch (err) {
    next(err)
  }
}
