import { Request, Response, NextFunction } from 'express'
import { PlatformRole } from '@prisma/client'
import { PERMISSIONS } from '@constants/permissions'
import { MESSAGE_CODES } from '@constants/messageCodes'
import { parseUuid } from '@utils/parseUuid'
import { sendCreated, sendPaginated, sendSuccess } from '@utils/responseHelper'
import * as ShiftService from './shifts.service'
import { ShiftQueryInput } from './shifts.validation'
import {
  CashMovementRequest,
  CloseShiftRequest,
  GetShiftRequest,
  GetShiftsRequest,
  OpenShiftRequest,
  ShiftViewer,
} from './shifts.interface'

const viewerOf = (req: Pick<Request, 'user'>): ShiftViewer => ({
  userId: req.user!.id,
  canManage:
    req.user!.platformRole === PlatformRole.PLATFORM_ADMIN ||
    req.user!.permissions.includes(PERMISSIONS.SHIFTS_MANAGE),
})

export const getCurrentShift = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, MESSAGE_CODES.SHIFT_FETCHED, await ShiftService.getCurrentShift(req.user!.pharmacyId!, viewerOf(req)))
  } catch (err) {
    next(err)
  }
}

export const getShifts = async (req: GetShiftsRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await ShiftService.getShifts(req.user!.pharmacyId!, viewerOf(req), req.query as unknown as ShiftQueryInput)
    sendPaginated(res, MESSAGE_CODES.SHIFTS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getShift = async (req: GetShiftRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shift = await ShiftService.getShift(parseUuid(req.params.shift_uuid), req.user!.pharmacyId!, viewerOf(req))
    sendSuccess(res, MESSAGE_CODES.SHIFT_FETCHED, shift)
  } catch (err) {
    next(err)
  }
}

export const openShift = async (req: OpenShiftRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, MESSAGE_CODES.SHIFT_OPENED, await ShiftService.openShift(req.user!.pharmacyId!, viewerOf(req), req.body))
  } catch (err) {
    next(err)
  }
}

export const addCashMovement = async (req: CashMovementRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shift = await ShiftService.addCashMovement(parseUuid(req.params.shift_uuid), req.user!.pharmacyId!, viewerOf(req), req.body)
    sendCreated(res, MESSAGE_CODES.SHIFT_CASH_MOVEMENT_ADDED, shift)
  } catch (err) {
    next(err)
  }
}

export const closeShift = async (req: CloseShiftRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shift = await ShiftService.closeShift(parseUuid(req.params.shift_uuid), req.user!.pharmacyId!, viewerOf(req), req.body)
    sendSuccess(res, MESSAGE_CODES.SHIFT_CLOSED, shift)
  } catch (err) {
    next(err)
  }
}
