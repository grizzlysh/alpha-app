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
  requirePermission(PERMISSIONS.SALES_VIEW),
  SaleController.getSales
)

router.get(
  '/:sale_uuid',
  requirePermission(PERMISSIONS.SALES_VIEW),
  SaleController.getSale
)

router.post(
  '/',
  requirePermission(PERMISSIONS.SALES_CREATE),
  SaleController.createSale
)

router.patch(
  '/:sale_uuid/cancel',
  requirePermission(PERMISSIONS.SALES_EDIT),
  SaleController.cancelSale
)

router.patch(
  '/:sale_uuid/refund',
  requirePermission(PERMISSIONS.SALES_EDIT),
  SaleController.refundSale
)

router.post(
  '/:sale_uuid/payment',
  requirePermission(PERMISSIONS.SALES_EDIT),
  SaleController.addPayment
)

export default router