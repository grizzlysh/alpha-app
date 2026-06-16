import { parseUuid } from '@utils/parseUuid'
import { Request, Response, NextFunction } from 'express'
import * as MedicineClassService from './medicine-classes.service'
import {
  createMedicineClassSchema,
  updateMedicineClassSchema,
  medicineClassQuerySchema,
} from './medicine-classes.validation'
import {
  GetMedicineClassesRequest,
  GetMedicineClassRequest,
  CreateMedicineClassRequest,
  UpdateMedicineClassRequest,
  DeleteMedicineClassRequest,
} from './medicine-classes.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getMedicineClasses = async (
  req: GetMedicineClassesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, meta } = await MedicineClassService.getMedicineClasses(
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.query as any
    )

    sendPaginated(res, MESSAGE_CODES.MEDICINE_CLASSES_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getMedicineClass = async (
  req: GetMedicineClassRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const medicine_class = await MedicineClassService.getMedicineClassByUuid(
      parseUuid(req.params.medicine_class_uuid),
      req.user!.pharmacyId,
      req.user!.platformRole
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_CLASS_FETCHED, medicine_class)
  } catch (err) {
    next(err)
  }
}

export const createMedicineClass = async (
  req: CreateMedicineClassRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const medicine_class = await MedicineClassService.createMedicineClass(
      req.body,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.MEDICINE_CLASS_CREATED, medicine_class)
  } catch (err) {
    next(err)
  }
}

export const updateMedicineClass = async (
  req: UpdateMedicineClassRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const medicine_class = await MedicineClassService.updateMedicineClass(
      parseUuid(req.params.medicine_class_uuid),
      req.body,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_CLASS_UPDATED, medicine_class)
  } catch (err) {
    next(err)
  }
}

export const deleteMedicineClass = async (
  req: DeleteMedicineClassRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await MedicineClassService.deleteMedicineClass(
      parseUuid(req.params.medicine_class_uuid),
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_CLASS_DELETED, null)
  } catch (err) {
    next(err)
  }
}

export const getMedicineClassesDropdown = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await MedicineClassService.getMedicineClassesDropdown(
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.query.search as string | undefined
    )
    sendSuccess(res, MESSAGE_CODES.MEDICINE_CLASSES_FETCHED, data)
  } catch (err) {
    next(err)
  }
}
