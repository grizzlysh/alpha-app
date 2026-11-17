import { Router } from 'express'
import * as NotificationController from './notifications.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess } from '@middlewares/roleGuard'
import { validateQuery } from '@middlewares/validate'
import { notificationQuerySchema } from './notifications.validation'

// Every staff member of the pharmacy can open the bell; each notification is
// filtered by the permission it carries (see notifications.service).
const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)

router.get('/', validateQuery(notificationQuerySchema), NotificationController.getNotifications)
router.post('/read-all', NotificationController.markAllNotificationsRead)
router.post('/:notification_uuid/read', NotificationController.markNotificationRead)

export default router
