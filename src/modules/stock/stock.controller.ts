import { parseUuid } from '@utils/parseUuid'
import { Response, NextFunction } from 'express'
import * as StockService from './stock.service'
import {
  stockDetailQuerySchema,
  stockCatalogQuerySchema,
  stockQuerySchema,
  stockMovementQuerySchema,
  updatePriceSchema,
  updateReorderLevelSchema,
  adjustStockSchema,
} from './stock.validation'
import {
  GetStockDetailsRequest,
  GetStockCatalogRequest,
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

export const getStockDetails = async (
  req: GetStockDetailsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = stockDetailQuerySchema.parse(req.query)
    const data = await StockService.searchStockDetails(
      req.user!.pharmacyId!,
      parsed
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_DETAIL_FETCHED, data)
  } catch (err) {
    next(err)
  }
}

export const getStockCatalog = async (
  req: GetStockCatalogRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = stockCatalogQuerySchema.parse(req.query)
    const { data, meta } = await StockService.getStockCatalog(
      req.user!.pharmacyId!,
      parsed
    )

    sendPaginated(res, MESSAGE_CODES.STOCK_CATALOG_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getStocks = async (
  req: GetStocksRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, meta } = await StockService.getStocks(
      req.user!.pharmacyId!,
      req.query as any
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
      parseUuid(req.params.stock_uuid),
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
    const { data, meta } = await StockService.getStockMovements(
      req.user!.pharmacyId!,
      req.query as any
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
    const stock = await StockService.updateSellingPrice(
      parseUuid(req.params.stock_uuid),
      req.body as any,
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
    const stock = await StockService.updateReorderLevel(
      parseUuid(req.params.stock_uuid),
      req.body as any,
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
    const stock = await StockService.adjustStock(
      parseUuid(req.params.stock_detail_uuid),
      req.body as any,
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
      parseUuid(req.params.medicine_uuid),
      req.user!.id,
      req.user!.pharmacyId!,
      req.user!.platformRole
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_FETCHED, stocks)
  } catch (err) {
    next(err)
  }
}
