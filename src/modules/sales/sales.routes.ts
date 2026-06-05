import { Router } from 'express'
import * as SaleController from './sales.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { createSaleSchema, cancelSaleSchema, addPaymentSchema, saleQuerySchema } from './sales.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)
router.get('/', requirePermission(PERMISSIONS.SALES_READ), validateQuery(saleQuerySchema), SaleController.getSales)
router.get('/:sale_uuid', requirePermission(PERMISSIONS.SALES_READ), SaleController.getSale)
router.post('/', requirePermission(PERMISSIONS.SALES_CREATE), validateBody(createSaleSchema), SaleController.createSale)
router.patch('/:sale_uuid/cancel', requirePermission(PERMISSIONS.SALES_UPDATE), validateBody(cancelSaleSchema), SaleController.cancelSale)
router.patch('/:sale_uuid/refund', requirePermission(PERMISSIONS.SALES_UPDATE), validateBody(cancelSaleSchema), SaleController.refundSale)
router.post('/:sale_uuid/payment', requirePermission(PERMISSIONS.SALES_UPDATE), validateBody(addPaymentSchema), SaleController.addPayment)
export default router
