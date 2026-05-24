import { Response, NextFunction } from 'express'
import * as MedicineShapeService from './medicine-shapes.service'
import {
  createMedicineShapeSchema,
  updateMedicineShapeSchema,
  medicineShapeQuerySchema,
} from './medicine-shapes.validation'
import {
  GetMedicineShapesRequest,
  GetMedicineShapeRequest,
  CreateMedicineShapeRequest,
  UpdateMedicineShapeRequest,
  DeleteMedicineShapeRequest,
} from './medicine-shapes.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getMedicineShapes = async (
  req: GetMedicineShapesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = medicineShapeQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await MedicineShapeService.getMedicineShapes(
      req.user!.pharmacyId,
      req.user!.platformRole,
      parsed.data
    )

    sendPaginated(res, MESSAGE_CODES.MEDICINE_SHAPES_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getMedicineShape = async (
  req: GetMedicineShapeRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const medicine_shape = await MedicineShapeService.getMedicineShapeByUuid(
      req.params.medicine_shape_uuid,
      req.user!.pharmacyId,
      req.user!.platformRole
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_SHAPE_FETCHED, medicine_shape)
  } catch (err) {
    next(err)
  }
}

export const createMedicineShape = async (
  req: CreateMedicineShapeRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createMedicineShapeSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const medicine_shape = await MedicineShapeService.createMedicineShape(
      parsed.data,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.MEDICINE_SHAPE_CREATED, medicine_shape)
  } catch (err) {
    next(err)
  }
}

export const updateMedicineShape = async (
  req: UpdateMedicineShapeRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateMedicineShapeSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const medicine_shape = await MedicineShapeService.updateMedicineShape(
      req.params.medicine_shape_uuid,
      parsed.data,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_SHAPE_UPDATED, medicine_shape)
  } catch (err) {
    next(err)
  }
}

export const deleteMedicineShape = async (
  req: DeleteMedicineShapeRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await MedicineShapeService.deleteMedicineShape(
      req.params.medicine_shape_uuid,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendNoContent(res, MESSAGE_CODES.MEDICINE_SHAPE_DELETED)
  } catch (err) {
    next(err)
  }
}