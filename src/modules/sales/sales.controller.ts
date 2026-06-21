import { parseUuid } from '@utils/parseUuid'
import { Response, NextFunction } from 'express'
import { SaleStatus } from '@prisma/client'
import * as SaleService from './sales.service'
import {
  createSaleSchema,
  cancelSaleSchema,
  addPaymentSchema,
  saleQuerySchema,
} from './sales.validation'
import {
  GetSalesRequest,
  GetSaleRequest,
  CreateSaleRequest,
  UpdateSaleRequest,
  CancelSaleRequest,
  CompleteSaleRequest,
  AddPaymentRequest,
  GetSalePaymentRequest,
  UpdateSalePaymentHistoryRequest,
  DeleteSalePaymentHistoryRequest,
} from './sales.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getSales = async (
  req: GetSalesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, meta } = await SaleService.getSales(
      req.user!.pharmacyId!,
      req.query as any
    )

    sendPaginated(res, MESSAGE_CODES.SALES_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getSale = async (
  req: GetSaleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sale = await SaleService.getSaleByUuid(
      parseUuid(req.params.sale_uuid),
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.SALE_FETCHED, sale)
  } catch (err) {
    next(err)
  }
}

export const createSale = async (
  req: CreateSaleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sale = await SaleService.createSale(
      req.body as any,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.SALE_CREATED, sale)
  } catch (err) {
    next(err)
  }
}

export const updateSale = async (
  req: UpdateSaleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sale = await SaleService.updateSale(
      parseUuid(req.params.sale_uuid),
      req.body as any,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.SALE_UPDATED, sale)
  } catch (err) {
    next(err)
  }
}

export const completeSale = async (
  req: CompleteSaleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sale = await SaleService.completeSale(
      parseUuid(req.params.sale_uuid),
      req.body as any,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.SALE_COMPLETED, sale)
  } catch (err) {
    next(err)
  }
}

export const cancelSale = async (
  req: CancelSaleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sale = await SaleService.cancelOrRefundSale(
      parseUuid(req.params.sale_uuid),
      SaleStatus.CANCELLED,
      req.body as any,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.SALE_CANCELLED, sale)
  } catch (err) {
    next(err)
  }
}

export const refundSale = async (
  req: CancelSaleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sale = await SaleService.cancelOrRefundSale(
      parseUuid(req.params.sale_uuid),
      SaleStatus.REFUNDED,
      req.body as any,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.SALE_REFUNDED, sale)
  } catch (err) {
    next(err)
  }
}

export const getPayment = async (
  req: GetSalePaymentRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await SaleService.getSalePayment(
      parseUuid(req.params.sale_uuid),
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.SALE_PAYMENT_FETCHED, payment)
  } catch (err) {
    next(err)
  }
}

export const addPayment = async (
  req: AddPaymentRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sale = await SaleService.addPayment(
      parseUuid(req.params.sale_uuid),
      req.body as any,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.SALE_PAYMENT_ADDED, sale)
  } catch (err) {
    next(err)
  }
}

export const updatePaymentHistory = async (
  req: UpdateSalePaymentHistoryRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await SaleService.updatePaymentHistory(
      parseUuid(req.params.history_uuid),
      req.body as any,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.SALE_PAYMENT_HISTORY_UPDATED, payment)
  } catch (err) {
    next(err)
  }
}

export const deletePaymentHistory = async (
  req: DeleteSalePaymentHistoryRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await SaleService.deletePaymentHistory(
      parseUuid(req.params.history_uuid),
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.SALE_PAYMENT_HISTORY_DELETED, payment)
  } catch (err) {
    next(err)
  }
}
