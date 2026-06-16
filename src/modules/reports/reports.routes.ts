import { Router } from 'express'
import * as ReportController from './reports.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import {
  salesReportSchema,
  purchaseReportSchema,
  inventoryReportSchema,
  stockMovementReportSchema,
  disposalReportSchema,
  returnReportSchema,
} from './reports.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)

router.get('/sales', requirePermission(PERMISSIONS.REPORTS_READ), validateQuery(salesReportSchema), ReportController.getSalesReport)
router.get('/purchases', requirePermission(PERMISSIONS.REPORTS_READ), validateQuery(purchaseReportSchema), ReportController.getPurchaseReport)
router.get('/inventory', requirePermission(PERMISSIONS.REPORTS_READ), validateQuery(inventoryReportSchema), ReportController.getInventoryReport)
router.get('/stock-movements', requirePermission(PERMISSIONS.REPORTS_READ), validateQuery(stockMovementReportSchema), ReportController.getStockMovementReport)
router.get('/disposals', requirePermission(PERMISSIONS.REPORTS_READ), validateQuery(disposalReportSchema), ReportController.getDisposalReport)
router.get('/returns', requirePermission(PERMISSIONS.REPORTS_READ), validateQuery(returnReportSchema), ReportController.getReturnReport)

export default router
