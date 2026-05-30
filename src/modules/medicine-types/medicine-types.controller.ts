import { Response, NextFunction } from 'express'
import * as MedicineTypeService from './medicine-types.service'
import {
  createMedicineTypeSchema,
  updateMedicineTypeSchema,
  medicineTypeQuerySchema,
} from './medicine-types.validation'
import {
  GetMedicineTypesRequest,
  GetMedicineTypeRequest,
  CreateMedicineTypeRequest,
  UpdateMedicineTypeRequest,
  DeleteMedicineTypeRequest,
} from './medicine-types.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getMedicineTypes = async (
  req: GetMedicineTypesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = medicineTypeQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await MedicineTypeService.getMedicineTypes(
      req.user!.pharmacyId,
      req.user!.platformRole,
      parsed.data
    )

    sendPaginated(res, MESSAGE_CODES.MEDICINE_TYPES_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getMedicineType = async (
  req: GetMedicineTypeRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const medicine_type = await MedicineTypeService.getMedicineTypeByUuid(
      req.params.medicine_type_uuid,
      req.user!.pharmacyId,
      req.user!.platformRole
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_TYPE_FETCHED, medicine_type)
  } catch (err) {
    next(err)
  }
}

export const createMedicineType = async (
  req: CreateMedicineTypeRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createMedicineTypeSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const medicine_type = await MedicineTypeService.createMedicineType(
      parsed.data,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.MEDICINE_TYPE_CREATED, medicine_type)
  } catch (err) {
    next(err)
  }
}

export const updateMedicineType = async (
  req: UpdateMedicineTypeRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateMedicineTypeSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const medicine_type = await MedicineTypeService.updateMedicineType(
      req.params.medicine_type_uuid,
      parsed.data,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_TYPE_UPDATED, medicine_type)
  } catch (err) {
    next(err)
  }
}

export const deleteMedicineType = async (
  req: DeleteMedicineTypeRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await MedicineTypeService.deleteMedicineType(
      req.params.medicine_type_uuid,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_TYPE_DELETED, null)
  } catch (err) {
    next(err)
  }
}