import { Router } from 'express'
import * as PermissionController from './permissions.controller'
import { authenticate } from '@middlewares/auth'
import { requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)

// note: no requirePharmacyAccess here
// because PLATFORM_ADMIN has no pharmacyId
// but still needs access to this route

router.get(
  '/',
  requirePermission(PERMISSIONS.PERMISSIONS_VIEW),
  PermissionController.getPermissions
)

router.get(
  '/:permission_uuid',
  requirePermission(PERMISSIONS.PERMISSIONS_VIEW),
  PermissionController.getPermission
)

export default router