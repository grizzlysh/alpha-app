import { Router } from 'express'
import * as ReportController from './reports.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import {
  salesSummarySchema,
  salesListSchema,
  salesExportSchema,
  purchaseSummarySchema,
  purchaseListSchema,
  purchaseExportSchema,
  inventorySummarySchema,
  inventoryListSchema,
  inventoryExportSchema,
  stockMovementSummarySchema,
  stockMovementListSchema,
  stockMovementExportSchema,
  disposalSummarySchema,
  disposalListSchema,
  disposalExportSchema,
  returnSummarySchema,
  returnListSchema,
  returnExportSchema,
} from './reports.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)

const perm = requirePermission(PERMISSIONS.REPORTS_READ)

// ── Sales ─────────────────────────────────────────────────────
router.get('/sales/summary', perm, validateQuery(salesSummarySchema), ReportController.getSalesSummary)
router.get('/sales/export', perm, validateQuery(salesExportSchema), ReportController.getSalesExport)
router.get('/sales', perm, validateQuery(salesListSchema), ReportController.getSalesList)

// ── Purchases ─────────────────────────────────────────────────
router.get('/purchases/summary', perm, validateQuery(purchaseSummarySchema), ReportController.getPurchaseSummary)
router.get('/purchases/export', perm, validateQuery(purchaseExportSchema), ReportController.getPurchaseExport)
router.get('/purchases', perm, validateQuery(purchaseListSchema), ReportController.getPurchaseList)

// ── Inventory ─────────────────────────────────────────────────
router.get('/inventory/summary', perm, validateQuery(inventorySummarySchema), ReportController.getInventorySummary)
router.get('/inventory/export', perm, validateQuery(inventoryExportSchema), ReportController.getInventoryExport)
router.get('/inventory', perm, validateQuery(inventoryListSchema), ReportController.getInventoryList)

// ── Stock Movements ───────────────────────────────────────────
router.get('/stock-movements/summary', perm, validateQuery(stockMovementSummarySchema), ReportController.getStockMovementSummary)
router.get('/stock-movements/export', perm, validateQuery(stockMovementExportSchema), ReportController.getStockMovementExport)
router.get('/stock-movements', perm, validateQuery(stockMovementListSchema), ReportController.getStockMovementList)

// ── Disposals ─────────────────────────────────────────────────
router.get('/disposals/summary', perm, validateQuery(disposalSummarySchema), ReportController.getDisposalSummary)
router.get('/disposals/export', perm, validateQuery(disposalExportSchema), ReportController.getDisposalExport)
router.get('/disposals', perm, validateQuery(disposalListSchema), ReportController.getDisposalList)

// ── Returns ───────────────────────────────────────────────────
router.get('/returns/summary', perm, validateQuery(returnSummarySchema), ReportController.getReturnSummary)
router.get('/returns/export', perm, validateQuery(returnExportSchema), ReportController.getReturnExport)
router.get('/returns', perm, validateQuery(returnListSchema), ReportController.getReturnList)

export default router
