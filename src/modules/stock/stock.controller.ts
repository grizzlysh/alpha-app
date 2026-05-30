import { Response, NextFunction } from 'express'
import * as StockService from './stock.service'
import {
  stockQuerySchema,
  stockMovementQuerySchema,
  updatePriceSchema,
  updateReorderLevelSchema,
  adjustStockSchema,
} from './stock.validation'
import {
  GetStocksRequest,
  GetStockRequest,
  GetStockMovementsRequest,
  UpdatePriceRequest,
  UpdateReorderLevelRequest,
  AdjustStockRequest,
  GetCrossPharmacyStockRequest,
} from './stock.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getStocks = async (
  req: GetStocksRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = stockQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await StockService.getStocks(
      req.user!.pharmacyId!,
      parsed.data
    )

    sendPaginated(res, MESSAGE_CODES.STOCKS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getStock = async (
  req: GetStockRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stock = await StockService.getStockByUuid(
      req.params.stock_uuid,
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_FETCHED, stock)
  } catch (err) {
    next(err)
  }
}

export const getStockAlerts = async (
  req: GetStocksRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const alerts = await StockService.getStockAlerts(
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_FETCHED, alerts)
  } catch (err) {
    next(err)
  }
}

export const getStockMovements = async (
  req: GetStockMovementsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = stockMovementQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await StockService.getStockMovements(
      req.user!.pharmacyId!,
      parsed.data
    )

    sendPaginated(res, MESSAGE_CODES.STOCK_MOVEMENTS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const updateSellingPrice = async (
  req: UpdatePriceRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updatePriceSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const stock = await StockService.updateSellingPrice(
      req.params.stock_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_PRICE_UPDATED, stock)
  } catch (err) {
    next(err)
  }
}

export const updateReorderLevel = async (
  req: UpdateReorderLevelRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateReorderLevelSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const stock = await StockService.updateReorderLevel(
      req.params.stock_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_UPDATED, stock)
  } catch (err) {
    next(err)
  }
}

export const adjustStock = async (
  req: AdjustStockRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = adjustStockSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const stock = await StockService.adjustStock(
      req.params.stock_detail_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_ADJUSTED, stock)
  } catch (err) {
    next(err)
  }
}

export const getCrossPharmacyStock = async (
  req: GetCrossPharmacyStockRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stocks = await StockService.getCrossPharmacyStock(
      req.params.medicine_uuid,
      req.user!.id,
      req.user!.pharmacyId!,
      req.user!.platformRole
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_FETCHED, stocks)
  } catch (err) {
    next(err)
  }
}
