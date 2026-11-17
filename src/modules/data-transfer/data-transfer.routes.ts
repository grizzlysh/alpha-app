import { Router } from 'express'
import * as Controller from './data-transfer.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { customerImportSchema, distributorImportSchema, openingStockImportSchema } from './data-transfer.validation'

// Spreadsheet export / import of a pharmacy's starting data.
const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)

router.get('/distributors', requirePermission(PERMISSIONS.DISTRIBUTORS_READ), Controller.exportDistributors)
router.post('/distributors', requirePermission(PERMISSIONS.DISTRIBUTORS_CREATE), validateBody(distributorImportSchema), Controller.importDistributors)
router.get('/customers', requirePermission(PERMISSIONS.CUSTOMERS_READ), Controller.exportCustomers)
router.post('/customers', requirePermission(PERMISSIONS.CUSTOMERS_CREATE), validateBody(customerImportSchema), Controller.importCustomers)
router.post('/opening-stock', requirePermission(PERMISSIONS.INVOICES_CREATE), validateBody(openingStockImportSchema), Controller.importOpeningStock)

export default router
