import { Router } from 'express'
import * as CustomerController from './customers.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { createCustomerSchema, updateCustomerSchema, customerQuerySchema, allergyCheckSchema } from './customers.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)

router.get('/', requirePermission(PERMISSIONS.CUSTOMERS_READ), validateQuery(customerQuerySchema), CustomerController.getCustomers)
router.get('/dropdown', requirePermission(PERMISSIONS.CUSTOMERS_READ), CustomerController.getCustomersDropdown)
router.get('/:customer_uuid', requirePermission(PERMISSIONS.CUSTOMERS_READ), CustomerController.getCustomer)
// Purchase history is sales data: it needs sales.read on top of customers.read.
router.get('/:customer_uuid/purchases', requirePermission(PERMISSIONS.CUSTOMERS_READ), requirePermission(PERMISSIONS.SALES_READ), CustomerController.getPurchaseHistory)
// Read-only despite POST (the medicine list can be long): allergy clashes for a cart or prescription.
router.post('/:customer_uuid/allergy-check', requirePermission(PERMISSIONS.CUSTOMERS_READ), validateBody(allergyCheckSchema), CustomerController.checkAllergies)
router.post('/', requirePermission(PERMISSIONS.CUSTOMERS_CREATE), validateBody(createCustomerSchema), CustomerController.createCustomer)
router.put('/:customer_uuid', requirePermission(PERMISSIONS.CUSTOMERS_UPDATE), validateBody(updateCustomerSchema), CustomerController.updateCustomer)
router.delete('/:customer_uuid', requirePermission(PERMISSIONS.CUSTOMERS_DELETE), CustomerController.deleteCustomer)

export default router
