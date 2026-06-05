import { Router } from 'express'
import * as StockDisposalController from './stock-disposals.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import {
  createStockDisposalSchema,
  updateStockDisposalSchema,
  cancelStockDisposalSchema,
  stockDisposalQuerySchema,
} from './stock-disposals.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)
router.get('/', requirePermission(PERMISSIONS.STOCK_DISPOSAL_READ), validateQuery(stockDisposalQuerySchema), StockDisposalController.getStockDisposals)
router.get('/:stock_disposal_uuid', requirePermission(PERMISSIONS.STOCK_DISPOSAL_READ), StockDisposalController.getStockDisposal)
router.post('/', requirePermission(PERMISSIONS.STOCK_DISPOSAL_CREATE), validateBody(createStockDisposalSchema), StockDisposalController.createStockDisposal)
router.put('/:stock_disposal_uuid', requirePermission(PERMISSIONS.STOCK_DISPOSAL_UPDATE), validateBody(updateStockDisposalSchema), StockDisposalController.updateStockDisposal)
router.patch('/:stock_disposal_uuid/complete', requirePermission(PERMISSIONS.STOCK_DISPOSAL_UPDATE), StockDisposalController.completeStockDisposal)
router.patch('/:stock_disposal_uuid/cancel', requirePermission(PERMISSIONS.STOCK_DISPOSAL_UPDATE), validateBody(cancelStockDisposalSchema), StockDisposalController.cancelStockDisposal)
router.delete('/:stock_disposal_uuid', requirePermission(PERMISSIONS.STOCK_DISPOSAL_DELETE), StockDisposalController.deleteStockDisposal)
export default router
