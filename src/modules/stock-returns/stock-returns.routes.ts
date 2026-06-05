import { Router } from 'express'
import * as StockReturnController from './stock-returns.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import {
  createStockReturnSchema,
  updateStockReturnSchema,
  cancelStockReturnSchema,
  stockReturnQuerySchema,
} from './stock-returns.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)
router.get('/', requirePermission(PERMISSIONS.STOCK_RETURN_READ), validateQuery(stockReturnQuerySchema), StockReturnController.getStockReturns)
router.get('/:stock_return_uuid', requirePermission(PERMISSIONS.STOCK_RETURN_READ), StockReturnController.getStockReturn)
router.post('/', requirePermission(PERMISSIONS.STOCK_RETURN_CREATE), validateBody(createStockReturnSchema), StockReturnController.createStockReturn)
router.put('/:stock_return_uuid', requirePermission(PERMISSIONS.STOCK_RETURN_UPDATE), validateBody(updateStockReturnSchema), StockReturnController.updateStockReturn)
router.patch('/:stock_return_uuid/complete', requirePermission(PERMISSIONS.STOCK_RETURN_UPDATE), StockReturnController.completeStockReturn)
router.patch('/:stock_return_uuid/cancel', requirePermission(PERMISSIONS.STOCK_RETURN_UPDATE), validateBody(cancelStockReturnSchema), StockReturnController.cancelStockReturn)
router.delete('/:stock_return_uuid', requirePermission(PERMISSIONS.STOCK_RETURN_DELETE), StockReturnController.deleteStockReturn)
export default router
