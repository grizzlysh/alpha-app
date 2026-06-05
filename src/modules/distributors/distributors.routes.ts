import { Router } from 'express'
import * as DistributorController from './distributors.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { createDistributorSchema, updateDistributorSchema, distributorQuerySchema } from './distributors.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)
router.get('/', requirePermission(PERMISSIONS.DISTRIBUTORS_READ), validateQuery(distributorQuerySchema), DistributorController.getDistributors)
router.get('/dropdown', requirePermission(PERMISSIONS.DISTRIBUTORS_READ), DistributorController.getDistributorsDropdown)
router.get('/:distributor_uuid', requirePermission(PERMISSIONS.DISTRIBUTORS_READ), DistributorController.getDistributor)
router.post('/', requirePermission(PERMISSIONS.DISTRIBUTORS_CREATE), validateBody(createDistributorSchema), DistributorController.createDistributor)
router.put('/:distributor_uuid', requirePermission(PERMISSIONS.DISTRIBUTORS_UPDATE), validateBody(updateDistributorSchema), DistributorController.updateDistributor)
router.delete('/:distributor_uuid', requirePermission(PERMISSIONS.DISTRIBUTORS_DELETE), DistributorController.deleteDistributor)
export default router
