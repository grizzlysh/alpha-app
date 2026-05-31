import { Response, NextFunction } from 'express'
import * as PharmacyService from './pharmacies.service'
import {
  pharmacyQuerySchema,
  createPharmacySchema,
  updatePharmacySchema,
  updatePharmacyOwnerSchema,
} from './pharmacies.validation'
import {
  GetPharmaciesRequest,
  GetPharmacyRequest,
  CreatePharmacyRequest,
  UpdatePharmacyRequest,
  UpdatePharmacyOwnerRequest,
  DeletePharmacyRequest,
} from './pharmacies.interface'
import { ValidationException } from '@exceptions/ValidationException'
import { sendSuccess, sendCreated, sendPaginated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getPharmacies = async (
  req: GetPharmaciesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = pharmacyQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await PharmacyService.getPharmacies(
      req.user!.pharmacyId,
      req.user!.platformRole,
      parsed.data
    )

    sendPaginated(res, MESSAGE_CODES.PHARMACIES_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getPharmacy = async (
  req: GetPharmacyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pharmacy = await PharmacyService.getPharmacyByUuid(
      req.params.pharmacy_uuid,
      req.user!.pharmacyId,
      req.user!.platformRole
    )

    sendSuccess(res, MESSAGE_CODES.PHARMACY_FETCHED, pharmacy)
  } catch (err) {
    next(err)
  }
}

export const createPharmacy = async (
  req: CreatePharmacyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createPharmacySchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const pharmacy = await PharmacyService.createPharmacy(
      parsed.data,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.PHARMACY_CREATED, pharmacy)
  } catch (err) {
    next(err)
  }
}

export const updatePharmacy = async (
  req: UpdatePharmacyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updatePharmacySchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const pharmacy = await PharmacyService.updatePharmacy(
      req.params.pharmacy_uuid,
      parsed.data,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.PHARMACY_UPDATED, pharmacy)
  } catch (err) {
    next(err)
  }
}

export const updatePharmacyOwner = async (
  req: UpdatePharmacyOwnerRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updatePharmacyOwnerSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const pharmacy = await PharmacyService.updatePharmacyOwner(
      req.params.pharmacy_uuid,
      parsed.data,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.PHARMACY_OWNER_UPDATED, pharmacy)
  } catch (err) {
    next(err)
  }
}

export const deletePharmacy = async (
  req: DeletePharmacyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await PharmacyService.deletePharmacy(
      req.params.pharmacy_uuid,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.PHARMACY_DELETED, null)
  } catch (err) {
    next(err)
  }
}