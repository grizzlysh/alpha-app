import { Router } from 'express'
import * as SystemParameterController from './system-parameters.controller'
import { authenticate } from '@middlewares/auth'
import { requirePlatformRole } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PlatformRole } from '@prisma/client'
import { systemParameterQuerySchema, updateSystemParameterSchema } from './system-parameters.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePlatformRole(PlatformRole.PLATFORM_ADMIN))
router.get('/', validateQuery(systemParameterQuerySchema), SystemParameterController.getSystemParameters)
router.get('/:system_parameter_uuid', SystemParameterController.getSystemParameter)
router.put('/:system_parameter_uuid', validateBody(updateSystemParameterSchema), SystemParameterController.updateSystemParameter)
export default router
