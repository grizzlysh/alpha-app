import { Router } from 'express'
import * as InventoryController from './inventory.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)
router.use(requirePharmacyAccess)

router.get(
  '/',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  InventoryController.getStocks
)

router.get(
  '/alerts',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  InventoryController.getStockAlerts
)

router.get(
  '/movements',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  InventoryController.getStockMovements
)

router.get(
  '/cross-pharmacy/:medicine_uuid',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  InventoryController.getCrossPharmacyStock
)

router.get(
  '/:stock_uuid',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  InventoryController.getStock
)

router.patch(
  '/:stock_uuid/price',
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
  InventoryController.updateSellingPrice
)

router.patch(
  '/:stock_uuid/reorder-level',
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
  InventoryController.updateReorderLevel
)

router.post(
  '/:stock_detail_uuid/adjust',
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
  InventoryController.adjustStock
)

export default router