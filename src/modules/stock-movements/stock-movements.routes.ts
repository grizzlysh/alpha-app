import { Router } from 'express'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { stockMovementQuerySchema } from './stock-movements.validation'
import * as StockMovementController from './stock-movements.controller'

const router = Router()

router.use(authenticate, requirePharmacyAccess)

router.get(
  '/',
  requirePermission(PERMISSIONS.STOCK_MOVEMENTS_READ),
  validateQuery(stockMovementQuerySchema),
  StockMovementController.getStockMovements
)

router.get(
  '/:stock_movement_uuid',
  requirePermission(PERMISSIONS.STOCK_MOVEMENTS_READ),
  StockMovementController.getStockMovement
)

export default router
