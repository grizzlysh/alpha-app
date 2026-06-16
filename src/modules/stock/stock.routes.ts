import { Router } from 'express'
import * as StockController from './stock.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import {
  stockDetailQuerySchema,
  stockCatalogQuerySchema,
  stockQuerySchema,
  stockMovementQuerySchema,
  updatePriceSchema,
  updateReorderLevelSchema,
  adjustStockSchema,
} from './stock.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)
router.get('/', requirePermission(PERMISSIONS.STOCK_READ), validateQuery(stockQuerySchema), StockController.getStocks)
router.get('/alerts', requirePermission(PERMISSIONS.STOCK_READ), StockController.getStockAlerts)
router.get('/movements', requirePermission(PERMISSIONS.STOCK_READ), validateQuery(stockMovementQuerySchema), StockController.getStockMovements)
router.get('/cross-pharmacy/:medicine_uuid', requirePermission(PERMISSIONS.STOCK_READ), StockController.getCrossPharmacyStock)
router.get('/details', requirePermission(PERMISSIONS.STOCK_READ), validateQuery(stockDetailQuerySchema), StockController.getStockDetails)
router.get('/catalog', requirePermission(PERMISSIONS.STOCK_READ), validateQuery(stockCatalogQuerySchema), StockController.getStockCatalog)
router.get('/:stock_uuid', requirePermission(PERMISSIONS.STOCK_READ), StockController.getStock)
router.patch('/:stock_uuid/price', requirePermission(PERMISSIONS.STOCK_ADJUST), validateBody(updatePriceSchema), StockController.updateSellingPrice)
router.patch('/:stock_uuid/reorder-level', requirePermission(PERMISSIONS.STOCK_ADJUST), validateBody(updateReorderLevelSchema), StockController.updateReorderLevel)
router.post('/:stock_detail_uuid/adjust', requirePermission(PERMISSIONS.STOCK_ADJUST), validateBody(adjustStockSchema), StockController.adjustStock)
export default router
