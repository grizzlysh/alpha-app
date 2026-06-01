import { Router } from 'express'
import * as SaleController from './sales.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)
router.use(requirePharmacyAccess)

router.get(
  '/',
  requirePermission(PERMISSIONS.SALES_READ),
  SaleController.getSales
)

router.get(
  '/:sale_uuid',
  requirePermission(PERMISSIONS.SALES_READ),
  SaleController.getSale
)

router.post(
  '/',
  requirePermission(PERMISSIONS.SALES_CREATE),
  SaleController.createSale
)

router.patch(
  '/:sale_uuid/cancel',
  requirePermission(PERMISSIONS.SALES_UPDATE),
  SaleController.cancelSale
)

router.patch(
  '/:sale_uuid/refund',
  requirePermission(PERMISSIONS.SALES_UPDATE),
  SaleController.refundSale
)

router.post(
  '/:sale_uuid/payment',
  requirePermission(PERMISSIONS.SALES_UPDATE),
  SaleController.addPayment
)

export default router