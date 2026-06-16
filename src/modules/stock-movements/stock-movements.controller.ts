import { Response, NextFunction } from 'express'
import { parseUuid } from '@utils/parseUuid'
import * as StockMovementService from './stock-movements.service'
import {
  GetStockMovementsRequest,
  GetStockMovementRequest,
} from './stock-movements.interface'
import { sendSuccess, sendPaginated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getStockMovements = async (
  req: GetStockMovementsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, meta } = await StockMovementService.listStockMovements(
      req.user!.pharmacyId!,
      req.query as any
    )

    sendPaginated(res, MESSAGE_CODES.STOCK_MOVEMENTS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getStockMovement = async (
  req: GetStockMovementRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const movement = await StockMovementService.getStockMovementByUuid(
      parseUuid(req.params.stock_movement_uuid),
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.STOCK_MOVEMENT_FETCHED, movement)
  } catch (err) {
    next(err)
  }
}
