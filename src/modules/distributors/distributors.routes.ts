import { Router } from 'express'
import * as DistributorController from './distributors.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)
router.use(requirePharmacyAccess)

router.get(
  '/',
  requirePermission(PERMISSIONS.DISTRIBUTORS_VIEW),
  DistributorController.getDistributors
)

router.get(
  '/dropdown',
  requirePermission(PERMISSIONS.DISTRIBUTORS_VIEW),
  DistributorController.getDistributorsDropdown
)

router.get(
  '/:distributor_uuid',
  requirePermission(PERMISSIONS.DISTRIBUTORS_VIEW),
  DistributorController.getDistributor
)

router.post(
  '/',
  requirePermission(PERMISSIONS.DISTRIBUTORS_CREATE),
  DistributorController.createDistributor
)

router.put(
  '/:distributor_uuid',
  requirePermission(PERMISSIONS.DISTRIBUTORS_EDIT),
  DistributorController.updateDistributor
)

router.delete(
  '/:distributor_uuid',
  requirePermission(PERMISSIONS.DISTRIBUTORS_DELETE),
  DistributorController.deleteDistributor
)

export default router