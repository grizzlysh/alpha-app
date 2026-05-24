import { Response, NextFunction } from 'express'
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
  sendNoContent,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getMedicines = async (
  req: GetMedicinesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = medicineQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await MedicineService.getMedicines(
      req.user!.pharmacyId!,
      parsed.data
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
      req.params.medicine_uuid,
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
    const parsed = createMedicineSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const medicine = await MedicineService.createMedicine(
      parsed.data,
      req.user!.pharmacyId!,
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
    const parsed = updateMedicineSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const medicine = await MedicineService.updateMedicine(
      req.params.medicine_uuid,
      parsed.data,
      req.user!.pharmacyId!,
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
      req.params.medicine_uuid,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendNoContent(res, MESSAGE_CODES.MEDICINE_DELETED)
  } catch (err) {
    next(err)
  }
}