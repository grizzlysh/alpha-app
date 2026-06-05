import { Router } from 'express'
import * as PermissionController from './permissions.controller'
import { authenticate } from '@middlewares/auth'
import { requirePermission } from '@middlewares/roleGuard'
import { validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { permissionQuerySchema } from './permissions.validation'

const router: Router = Router()
router.use(authenticate)
router.get('/', requirePermission(PERMISSIONS.PERMISSIONS_READ), validateQuery(permissionQuerySchema), PermissionController.getPermissions)
router.get('/:permission_uuid', requirePermission(PERMISSIONS.PERMISSIONS_READ), PermissionController.getPermission)
export default router
