import { parseUuid } from '@utils/parseUuid'
import { Request, Response, NextFunction } from 'express'
import * as MedicineService from './medicines.service'
import {
  createMedicineSchema,
  updateMedicineSchema,
  medicineQuerySchema,
} from './medicines.validation'
import {
  GetMedicinesRequest,
  GetMedicineRequest,
  CreateMedicineRequest,
  UpdateMedicineRequest,
  DeleteMedicineRequest,
  MedicineResponse,
} from './medicines.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getMedicines = async (
  req: GetMedicinesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, meta } = await MedicineService.getMedicines(
      req.user!.pharmacyId!,
      req.query as any
    )

    sendPaginated(res, MESSAGE_CODES.MEDICINES_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getMedicine = async (
  req: GetMedicineRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const medicine = await MedicineService.getMedicineByUuid(
      parseUuid(req.params.medicine_uuid),
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_FETCHED, medicine)
  } catch (err) {
    next(err)
  }
}

export const createMedicine = async (
  req: CreateMedicineRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const medicine = await MedicineService.createMedicine(
      req.body as any,      req.user!.pharmacyId!,
      req.user!.uuid,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.MEDICINE_CREATED, medicine)
  } catch (err) {
    next(err)
  }
}

export const updateMedicine = async (
  req: UpdateMedicineRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const medicine = await MedicineService.updateMedicine(
      parseUuid(req.params.medicine_uuid),
      req.body as any,      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_UPDATED, medicine)
  } catch (err) {
    next(err)
  }
}

export const deleteMedicine = async (
  req: DeleteMedicineRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await MedicineService.deleteMedicine(
      parseUuid(req.params.medicine_uuid),
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_DELETED, null)
  } catch (err) {
    next(err)
  }
}

export const getMedicinesDropdown = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await MedicineService.getMedicinesDropdown(
      req.user!.pharmacyId!,
      req.query.search as string | undefined
    )
    sendSuccess(res, MESSAGE_CODES.MEDICINES_FETCHED, data)
  } catch (err) {
    next(err)
  }
}
