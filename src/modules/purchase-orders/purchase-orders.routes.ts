import { Router } from 'express'
import * as PurchaseOrderController from './purchase-orders.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  cancelPurchaseOrderSchema,
  purchaseOrderQuerySchema,
} from './purchase-orders.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)
router.get('/', requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ), validateQuery(purchaseOrderQuerySchema), PurchaseOrderController.getPurchaseOrders)
router.get('/dropdown', requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ), PurchaseOrderController.getPurchaseOrdersDropdown)
router.get('/:purchase_order_uuid', requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ), PurchaseOrderController.getPurchaseOrder)
router.get('/:purchase_order_uuid/print', requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ), PurchaseOrderController.getPurchaseOrderPrint)
router.post('/', requirePermission(PERMISSIONS.PURCHASE_ORDERS_CREATE), validateBody(createPurchaseOrderSchema), PurchaseOrderController.createPurchaseOrder)
router.put('/:purchase_order_uuid', requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE), validateBody(updatePurchaseOrderSchema), PurchaseOrderController.updatePurchaseOrder)
router.patch('/:purchase_order_uuid/submit', requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE), PurchaseOrderController.submitPurchaseOrder)
router.patch('/:purchase_order_uuid/complete', requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE), PurchaseOrderController.completePurchaseOrder)
router.patch('/:purchase_order_uuid/cancel', requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE), validateBody(cancelPurchaseOrderSchema), PurchaseOrderController.cancelPurchaseOrder)
router.delete('/:purchase_order_uuid', requirePermission(PERMISSIONS.PURCHASE_ORDERS_DELETE), PurchaseOrderController.deletePurchaseOrder)
export default router
