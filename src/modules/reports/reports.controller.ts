import { Response, NextFunction } from 'express'
import * as ReportService from './reports.service'
import {
  GetSalesReportRequest,
  GetPurchaseReportRequest,
  GetInventoryReportRequest,
  GetStockMovementReportRequest,
  GetDisposalReportRequest,
  GetReturnReportRequest,
} from './reports.interface'
import { sendSuccess } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getSalesReport = async (
  req: GetSalesReportRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await ReportService.getSalesReport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_SALES_FETCHED, report)
  } catch (err) {
    next(err)
  }
}

export const getPurchaseReport = async (
  req: GetPurchaseReportRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await ReportService.getPurchaseReport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_PURCHASES_FETCHED, report)
  } catch (err) {
    next(err)
  }
}

export const getInventoryReport = async (
  req: GetInventoryReportRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await ReportService.getInventoryReport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_INVENTORY_FETCHED, report)
  } catch (err) {
    next(err)
  }
}

export const getStockMovementReport = async (
  req: GetStockMovementReportRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await ReportService.getStockMovementReport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_STOCK_MOVEMENTS_FETCHED, report)
  } catch (err) {
    next(err)
  }
}

export const getDisposalReport = async (
  req: GetDisposalReportRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await ReportService.getDisposalReport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_DISPOSALS_FETCHED, report)
  } catch (err) {
    next(err)
  }
}

export const getReturnReport = async (
  req: GetReturnReportRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await ReportService.getReturnReport(req.user!.pharmacyId!, req.query as any)
    sendSuccess(res, MESSAGE_CODES.REPORT_RETURNS_FETCHED, report)
  } catch (err) {
    next(err)
  }
}
