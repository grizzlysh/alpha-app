import { Router } from 'express'
import * as RoleController from './roles.controller'
import { authenticate } from '@middlewares/auth'
import { requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { createRoleSchema, updateRoleSchema, roleQuerySchema, setRolePermissionsSchema } from './roles.validation'

const router: Router = Router()
router.use(authenticate)
router.get('/', requirePermission(PERMISSIONS.ROLES_READ), validateQuery(roleQuerySchema), RoleController.getRoles)
router.get('/dropdown', requirePermission(PERMISSIONS.ROLES_READ), RoleController.getRolesDdl)
router.get('/:role_uuid', requirePermission(PERMISSIONS.ROLES_READ), RoleController.getRole)
router.post('/', requirePermission(PERMISSIONS.ROLES_CREATE), validateBody(createRoleSchema), RoleController.createRole)
router.put('/:role_uuid', requirePermission(PERMISSIONS.ROLES_UPDATE), validateBody(updateRoleSchema), RoleController.updateRole)
router.put('/:role_uuid/permissions', requirePermission(PERMISSIONS.ROLES_UPDATE), validateBody(setRolePermissionsSchema), RoleController.setRolePermissions)
router.delete('/:role_uuid', requirePermission(PERMISSIONS.ROLES_DELETE), RoleController.deleteRole)
export default router
