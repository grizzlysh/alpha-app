import { Router } from 'express'
import * as StockReturnController from './stock-returns.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)
router.use(requirePharmacyAccess)

router.get(
  '/',
  requirePermission(PERMISSIONS.STOCK_RETURN_VIEW),
  StockReturnController.getStockReturns
)

router.get(
  '/:stock_return_uuid',
  requirePermission(PERMISSIONS.STOCK_RETURN_VIEW),
  StockReturnController.getStockReturn
)

router.post(
  '/',
  requirePermission(PERMISSIONS.STOCK_RETURN_CREATE),
  StockReturnController.createStockReturn
)

router.put(
  '/:stock_return_uuid',
  requirePermission(PERMISSIONS.STOCK_RETURN_EDIT),
  StockReturnController.updateStockReturn
)

router.patch(
  '/:stock_return_uuid/complete',
  requirePermission(PERMISSIONS.STOCK_RETURN_EDIT),
  StockReturnController.completeStockReturn
)

router.patch(
  '/:stock_return_uuid/cancel',
  requirePermission(PERMISSIONS.STOCK_RETURN_EDIT),
  StockReturnController.cancelStockReturn
)

router.delete(
  '/:stock_return_uuid',
  requirePermission(PERMISSIONS.STOCK_RETURN_DELETE),
  StockReturnController.deleteStockReturn
)

export default router