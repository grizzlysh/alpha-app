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
  CancelSaleRequest,
  AddPaymentRequest,
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
    const parsed = saleQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await SaleService.getSales(
      req.user!.pharmacyId!,
      parsed.data
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
      req.params.sale_uuid,
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
    const parsed = createSaleSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const sale = await SaleService.createSale(
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.SALE_CREATED, sale)
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
    const parsed = cancelSaleSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const sale = await SaleService.cancelOrRefundSale(
      req.params.sale_uuid,
      SaleStatus.CANCELLED,
      parsed.data,
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
    const parsed = cancelSaleSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const sale = await SaleService.cancelOrRefundSale(
      req.params.sale_uuid,
      SaleStatus.REFUNDED,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.SALE_REFUNDED, sale)
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
    const parsed = addPaymentSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const sale = await SaleService.addPayment(
      req.params.sale_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.SALE_PAYMENT_ADDED, sale)
  } catch (err) {
    next(err)
  }
}