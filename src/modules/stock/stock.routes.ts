import { Router } from 'express'
import * as StockController from './stock.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)
router.use(requirePharmacyAccess)

router.get(
  '/',
  requirePermission(PERMISSIONS.STOCK_READ),
  StockController.getStocks
)

router.get(
  '/alerts',
  requirePermission(PERMISSIONS.STOCK_READ),
  StockController.getStockAlerts
)

router.get(
  '/movements',
  requirePermission(PERMISSIONS.STOCK_READ),
  StockController.getStockMovements
)

router.get(
  '/cross-pharmacy/:medicine_uuid',
  requirePermission(PERMISSIONS.STOCK_READ),
  StockController.getCrossPharmacyStock
)

router.get(
  '/:stock_uuid',
  requirePermission(PERMISSIONS.STOCK_READ),
  StockController.getStock
)

router.patch(
  '/:stock_uuid/price',
  requirePermission(PERMISSIONS.STOCK_ADJUST),
  StockController.updateSellingPrice
)

router.patch(
  '/:stock_uuid/reorder-level',
  requirePermission(PERMISSIONS.STOCK_ADJUST),
  StockController.updateReorderLevel
)

router.post(
  '/:stock_detail_uuid/adjust',
  requirePermission(PERMISSIONS.STOCK_ADJUST),
  StockController.adjustStock
)

export default router
