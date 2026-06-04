import { Router } from 'express'
import * as BusinessParameterController from './business-parameters.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)
router.use(requirePharmacyAccess)

router.get(
  '/',
  requirePermission(PERMISSIONS.BUSINESS_PARAMETERS_READ),
  BusinessParameterController.getBusinessParameters
)

router.get(
  '/:business_parameter_uuid',
  requirePermission(PERMISSIONS.BUSINESS_PARAMETERS_READ),
  BusinessParameterController.getBusinessParameter
)

router.put(
  '/:business_parameter_uuid',
  requirePermission(PERMISSIONS.BUSINESS_PARAMETERS_UPDATE),
  BusinessParameterController.updateBusinessParameter
)

export default router