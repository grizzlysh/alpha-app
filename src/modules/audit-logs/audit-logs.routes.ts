import { Router } from 'express'
import * as AuditLogController from './audit-logs.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { auditLogQuerySchema } from './audit-logs.validation'

// Read-only: entries are written by the services that make the changes.
const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)
router.get('/', requirePermission(PERMISSIONS.AUDIT_LOGS_READ), validateQuery(auditLogQuerySchema), AuditLogController.getAuditLogs)
router.get('/actions', requirePermission(PERMISSIONS.AUDIT_LOGS_READ), AuditLogController.getAuditActions)
export default router
