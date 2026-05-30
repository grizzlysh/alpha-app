import { Response, NextFunction } from 'express'
import * as StockDisposalService from './stock-disposals.service'
import {
  createStockDisposalSchema,
  updateStockDisposalSchema,
  cancelStockDisposalSchema,
  stockDisposalQuerySchema,
} from './stock-disposals.validation'
import {
  GetStockDisposalsRequest,
  GetStockDisposalRequest,
  CreateStockDisposalRequest,
  UpdateStockDisposalRequest,
  CompleteStockDisposalRequest,
  CancelStockDisposalRequest,
  DeleteStockDisposalRequest,
} from './stock-disposals.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getStockDisposals = async (
  req: GetStockDisposalsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = stockDisposalQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await StockDisposalService.getStockDisposals(
      req.user!.pharmacyId!,
      parsed.data
    )

    sendPaginated(res, MESSAGE_CODES.STOCK_DISPOSALS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getStockDisposal = async (
  req: GetStockDisposalRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stockDisposal = await StockDisposalService.getStockDisposalByUuid(
      req.params.stock_disposal_uuid,
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_DISPOSAL_FETCHED, stockDisposal)
  } catch (err) {
    next(err)
  }
}

export const createStockDisposal = async (
  req: CreateStockDisposalRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createStockDisposalSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const stockDisposal = await StockDisposalService.createStockDisposal(
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.STOCK_DISPOSAL_CREATED, stockDisposal)
  } catch (err) {
    next(err)
  }
}

export const updateStockDisposal = async (
  req: UpdateStockDisposalRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateStockDisposalSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const stockDisposal = await StockDisposalService.updateStockDisposal(
      req.params.stock_disposal_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_DISPOSAL_UPDATED, stockDisposal)
  } catch (err) {
    next(err)
  }
}

export const completeStockDisposal = async (
  req: CompleteStockDisposalRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stockDisposal = await StockDisposalService.completeStockDisposal(
      req.params.stock_disposal_uuid,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_DISPOSAL_COMPLETED, stockDisposal)
  } catch (err) {
    next(err)
  }
}

export const cancelStockDisposal = async (
  req: CancelStockDisposalRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = cancelStockDisposalSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const stockDisposal = await StockDisposalService.cancelStockDisposal(
      req.params.stock_disposal_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_DISPOSAL_CANCELLED, stockDisposal)
  } catch (err) {
    next(err)
  }
}

export const deleteStockDisposal = async (
  req: DeleteStockDisposalRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await StockDisposalService.deleteStockDisposal(
      req.params.stock_disposal_uuid,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_DISPOSAL_DELETED, null)
  } catch (err) {
    next(err)
  }
}