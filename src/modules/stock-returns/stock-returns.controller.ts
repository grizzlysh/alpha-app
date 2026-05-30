import { Response, NextFunction } from 'express'
import * as StockReturnService from './stock-returns.service'
import {
  createStockReturnSchema,
  updateStockReturnSchema,
  cancelStockReturnSchema,
  stockReturnQuerySchema,
} from './stock-returns.validation'
import {
  GetStockReturnsRequest,
  GetStockReturnRequest,
  CreateStockReturnRequest,
  UpdateStockReturnRequest,
  CompleteStockReturnRequest,
  CancelStockReturnRequest,
  DeleteStockReturnRequest,
} from './stock-returns.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getStockReturns = async (
  req: GetStockReturnsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = stockReturnQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await StockReturnService.getStockReturns(
      req.user!.pharmacyId!,
      parsed.data
    )

    sendPaginated(res, MESSAGE_CODES.STOCK_RETURNS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getStockReturn = async (
  req: GetStockReturnRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stockReturn = await StockReturnService.getStockReturnByUuid(
      req.params.stock_return_uuid,
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_RETURN_FETCHED, stockReturn)
  } catch (err) {
    next(err)
  }
}

export const createStockReturn = async (
  req: CreateStockReturnRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createStockReturnSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const stockReturn = await StockReturnService.createStockReturn(
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.STOCK_RETURN_CREATED, stockReturn)
  } catch (err) {
    next(err)
  }
}

export const updateStockReturn = async (
  req: UpdateStockReturnRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateStockReturnSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const stockReturn = await StockReturnService.updateStockReturn(
      req.params.stock_return_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_RETURN_UPDATED, stockReturn)
  } catch (err) {
    next(err)
  }
}

export const completeStockReturn = async (
  req: CompleteStockReturnRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stockReturn = await StockReturnService.completeStockReturn(
      req.params.stock_return_uuid,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_RETURN_COMPLETED, stockReturn)
  } catch (err) {
    next(err)
  }
}

export const cancelStockReturn = async (
  req: CancelStockReturnRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = cancelStockReturnSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const stockReturn = await StockReturnService.cancelStockReturn(
      req.params.stock_return_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_RETURN_CANCELLED, stockReturn)
  } catch (err) {
    next(err)
  }
}

export const deleteStockReturn = async (
  req: DeleteStockReturnRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await StockReturnService.deleteStockReturn(
      req.params.stock_return_uuid,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_RETURN_DELETED, null)
  } catch (err) {
    next(err)
  }
}