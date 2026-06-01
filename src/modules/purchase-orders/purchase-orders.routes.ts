import { Router } from 'express'
import * as PurchaseOrderController from './purchase-orders.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)
router.use(requirePharmacyAccess)

router.get(
  '/',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  PurchaseOrderController.getPurchaseOrders
)

router.get(
  '/dropdown',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  PurchaseOrderController.getPurchaseOrdersDropdown
)

router.get(
  '/:purchase_order_uuid',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  PurchaseOrderController.getPurchaseOrder
)

router.post(
  '/',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_CREATE),
  PurchaseOrderController.createPurchaseOrder
)

router.put(
  '/:purchase_order_uuid',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE),
  PurchaseOrderController.updatePurchaseOrder
)

router.patch(
  '/:purchase_order_uuid/submit',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE),
  PurchaseOrderController.submitPurchaseOrder
)

router.patch(
  '/:purchase_order_uuid/cancel',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE),
  PurchaseOrderController.cancelPurchaseOrder
)

router.delete(
  '/:purchase_order_uuid',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_DELETE),
  PurchaseOrderController.deletePurchaseOrder
)

export default router