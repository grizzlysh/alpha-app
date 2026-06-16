import { parseUuid } from '@utils/parseUuid'
import { Request, Response, NextFunction } from 'express'
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
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getMedicineShapes = async (
  req: GetMedicineShapesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, meta } = await MedicineShapeService.getMedicineShapes(
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.query as any
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
      parseUuid(req.params.medicine_shape_uuid),
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
    const medicine_shape = await MedicineShapeService.createMedicineShape(
      req.body,
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
    const medicine_shape = await MedicineShapeService.updateMedicineShape(
      parseUuid(req.params.medicine_shape_uuid),
      req.body,
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
      parseUuid(req.params.medicine_shape_uuid),
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.MEDICINE_SHAPE_DELETED, null)
  } catch (err) {
    next(err)
  }
}

export const getMedicineShapesDropdown = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await MedicineShapeService.getMedicineShapesDropdown(
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.query.search as string | undefined
    )
    sendSuccess(res, MESSAGE_CODES.MEDICINE_SHAPES_FETCHED, data)
  } catch (err) {
    next(err)
  }
}
