import { Router } from 'express'
import * as CustomerController from './customers.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)
router.use(requirePharmacyAccess)

router.get(
  '/',
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  CustomerController.getCustomers
)

router.get(
  '/dropdown',
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  CustomerController.getCustomersDropdown
)

router.get(
  '/:customer_uuid',
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  CustomerController.getCustomer
)

router.post(
  '/',
  requirePermission(PERMISSIONS.CUSTOMERS_CREATE),
  CustomerController.createCustomer
)

router.put(
  '/:customer_uuid',
  requirePermission(PERMISSIONS.CUSTOMERS_UPDATE),
  CustomerController.updateCustomer
)

router.delete(
  '/:customer_uuid',
  requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
  CustomerController.deleteCustomer
)

export default router