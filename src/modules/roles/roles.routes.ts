import { Router } from 'express'
import * as RoleController from './roles.controller'
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
  requirePermission(PERMISSIONS.ROLES_READ),
  RoleController.getRoles
)

router.get(
  '/dropdown',
  requirePermission(PERMISSIONS.ROLES_READ),
  RoleController.getRolesDdl
)

router.get(
  '/:role_uuid',
  requirePermission(PERMISSIONS.ROLES_READ),
  RoleController.getRole
)

router.post(
  '/',
  requirePermission(PERMISSIONS.ROLES_CREATE),
  RoleController.createRole
)

router.put(
  '/:role_uuid',
  requirePermission(PERMISSIONS.ROLES_UPDATE),
  RoleController.updateRole
)

router.put(
  '/:role_uuid/permissions',
  requirePermission(PERMISSIONS.ROLES_UPDATE),
  RoleController.setRolePermissions
)

router.delete(
  '/:role_uuid',
  requirePermission(PERMISSIONS.ROLES_DELETE),
  RoleController.deleteRole
)

export default router