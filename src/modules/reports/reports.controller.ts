import { Response, NextFunction } from 'express'
import * as ReportService from './reports.service'
import {
  GetSalesSummaryRequest,
  GetSalesListRequest,
  GetSalesExportRequest,
  GetPurchaseSummaryRequest,
  GetPurchaseListRequest,
  GetPurchaseExportRequest,
  GetInventorySummaryRequest,
  GetInventoryListRequest,
  GetInventoryExportRequest,
  GetStockMovementSummaryRequest,
  GetStockMovementListRequest,
  GetStockMovementExportRequest,
  GetDisposalSummaryRequest,
  GetDisposalListRequest,
  GetDisposalExportRequest,
  GetReturnSummaryRequest,
  GetReturnListRequest,
  GetReturnExportRequest,
} from './reports.interface'
import { sendSuccess, sendPaginated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

// ── Sales ─────────────────────────────────────────────────────

export const getSalesSummary = async (req: GetSalesSummaryRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const report = await ReportService.getSalesSummary(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_SALES_FETCHED, report)
  } catch (err) { next(err) }
}

export const getSalesList = async (req: GetSalesListRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await ReportService.getSalesList(req.user!.pharmacyId!, req.query as any)
    sendPaginated(res, MESSAGE_CODES.REPORT_SALES_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getSalesExport = async (req: GetSalesExportRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ReportService.getSalesExport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_SALES_FETCHED, data)
  } catch (err) { next(err) }
}

// ── Purchases ─────────────────────────────────────────────────

export const getPurchaseSummary = async (req: GetPurchaseSummaryRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const report = await ReportService.getPurchaseSummary(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_PURCHASES_FETCHED, report)
  } catch (err) { next(err) }
}

export const getPurchaseList = async (req: GetPurchaseListRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await ReportService.getPurchaseList(req.user!.pharmacyId!, req.query as any)
    sendPaginated(res, MESSAGE_CODES.REPORT_PURCHASES_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getPurchaseExport = async (req: GetPurchaseExportRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ReportService.getPurchaseExport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_PURCHASES_FETCHED, data)
  } catch (err) { next(err) }
}

// ── Inventory ─────────────────────────────────────────────────

export const getInventorySummary = async (req: GetInventorySummaryRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [summary, alerts] = await Promise.all([
      ReportService.getInventorySummary(req.user!.pharmacyId!, req.query as any),
      ReportService.getInventoryExpiryAlerts(req.user!.pharmacyId!, req.query as any),
    ])
    sendSuccess(res, MESSAGE_CODES.REPORT_INVENTORY_FETCHED, { summary, ...alerts })
  } catch (err) { next(err) }
}

export const getInventoryList = async (req: GetInventoryListRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await ReportService.getInventoryList(req.user!.pharmacyId!, req.query as any)
    sendPaginated(res, MESSAGE_CODES.REPORT_INVENTORY_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getInventoryExport = async (req: GetInventoryExportRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ReportService.getInventoryExport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_INVENTORY_FETCHED, data)
  } catch (err) { next(err) }
}

// ── Stock Movements ───────────────────────────────────────────

export const getStockMovementSummary = async (req: GetStockMovementSummaryRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const report = await ReportService.getStockMovementSummary(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_STOCK_MOVEMENTS_FETCHED, report)
  } catch (err) { next(err) }
}

export const getStockMovementList = async (req: GetStockMovementListRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await ReportService.getStockMovementList(req.user!.pharmacyId!, req.query as any)
    sendPaginated(res, MESSAGE_CODES.REPORT_STOCK_MOVEMENTS_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getStockMovementExport = async (req: GetStockMovementExportRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ReportService.getStockMovementExport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_STOCK_MOVEMENTS_FETCHED, data)
  } catch (err) { next(err) }
}

// ── Disposals ─────────────────────────────────────────────────

export const getDisposalSummary = async (req: GetDisposalSummaryRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const report = await ReportService.getDisposalSummary(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_DISPOSALS_FETCHED, report)
  } catch (err) { next(err) }
}

export const getDisposalList = async (req: GetDisposalListRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await ReportService.getDisposalList(req.user!.pharmacyId!, req.query as any)
    sendPaginated(res, MESSAGE_CODES.REPORT_DISPOSALS_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getDisposalExport = async (req: GetDisposalExportRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ReportService.getDisposalExport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_DISPOSALS_FETCHED, data)
  } catch (err) { next(err) }
}

// ── Returns ───────────────────────────────────────────────────

export const getReturnSummary = async (req: GetReturnSummaryRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const report = await ReportService.getReturnSummary(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_RETURNS_FETCHED, report)
  } catch (err) { next(err) }
}

export const getReturnList = async (req: GetReturnListRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await ReportService.getReturnList(req.user!.pharmacyId!, req.query as any)
    sendPaginated(res, MESSAGE_CODES.REPORT_RETURNS_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getReturnExport = async (req: GetReturnExportRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ReportService.getReturnExport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_RETURNS_FETCHED, data)
  } catch (err) { next(err) }
}
