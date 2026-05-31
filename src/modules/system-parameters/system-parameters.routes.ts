import { Router } from 'express'
import * as SystemParameterController from './system-parameters.controller'
import { authenticate } from '@middlewares/auth'
import { requirePlatformRole } from '@middlewares/roleGuard'
import { PlatformRole } from '@prisma/client'

const router: Router = Router()

router.use(authenticate)
router.use(requirePlatformRole(PlatformRole.PLATFORM_ADMIN))

router.get(
  '/',
  SystemParameterController.getSystemParameters
)

router.get(
  '/:system_parameter_uuid',
  SystemParameterController.getSystemParameter
)

router.put(
  '/:system_parameter_uuid',
  SystemParameterController.updateSystemParameter
)

export default router