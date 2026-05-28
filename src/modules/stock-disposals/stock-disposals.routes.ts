import { Router } from 'express'
import * as StockDisposalController from './stock-disposals.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)
router.use(requirePharmacyAccess)

router.get(
  '/',
  requirePermission(PERMISSIONS.STOCK_DISPOSAL_VIEW),
  StockDisposalController.getStockDisposals
)

router.get(
  '/:stock_disposal_uuid',
  requirePermission(PERMISSIONS.STOCK_DISPOSAL_VIEW),
  StockDisposalController.getStockDisposal
)

router.post(
  '/',
  requirePermission(PERMISSIONS.STOCK_DISPOSAL_CREATE),
  StockDisposalController.createStockDisposal
)

router.put(
  '/:stock_disposal_uuid',
  requirePermission(PERMISSIONS.STOCK_DISPOSAL_EDIT),
  StockDisposalController.updateStockDisposal
)

router.patch(
  '/:stock_disposal_uuid/complete',
  requirePermission(PERMISSIONS.STOCK_DISPOSAL_EDIT),
  StockDisposalController.completeStockDisposal
)

router.patch(
  '/:stock_disposal_uuid/cancel',
  requirePermission(PERMISSIONS.STOCK_DISPOSAL_EDIT),
  StockDisposalController.cancelStockDisposal
)

router.delete(
  '/:stock_disposal_uuid',
  requirePermission(PERMISSIONS.STOCK_DISPOSAL_DELETE),
  StockDisposalController.deleteStockDisposal
)

export default router