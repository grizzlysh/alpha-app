import { Request, Response, NextFunction } from 'express'
import * as PharmacyService from './pharmacies.service'
import {
  GetPharmaciesRequest,
  GetPharmacyRequest,
  CreatePharmacyRequest,
  UpdatePharmacyRequest,
  DeletePharmacyRequest,
  GetBusinessLicensesRequest,
  GetBusinessLicenseRequest,
  CreateBusinessLicenseRequest,
  UpdateBusinessLicenseRequest,
  DeleteBusinessLicenseRequest,
} from './pharmacies.interface'
import {
  pharmacyQuerySchema,
  createPharmacySchema,
  updatePharmacySchema,
  businessLicenseQuerySchema,
  createBusinessLicenseSchema,
  updateBusinessLicenseSchema,
} from './pharmacies.validation'
import { ValidationException } from '@exceptions/ValidationException'
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '@utils/responseHelper'
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


export const getPharmaciesDdl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await PharmacyService.getPharmaciesDdl(
      req.user!.pharmacyId,
      req.user!.platformRole
    )
    sendSuccess(res, MESSAGE_CODES.PHARMACIES_FETCHED, data)
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

// ─── Business Licenses ────────────────────────────────────────────────────────

export const listBusinessLicenses = async (
  req: GetBusinessLicensesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = businessLicenseQuerySchema.safeParse(req.query)
    if (!parsed.success) throw new ValidationException(parsed.error.flatten().fieldErrors as Record<string, any>)

    const { data, meta } = await PharmacyService.getBusinessLicenses(
      req.params.pharmacy_uuid,
      req.user!.pharmacyId,
      req.user!.platformRole,
      parsed.data
    )
    sendPaginated(res, MESSAGE_CODES.BUSINESS_LICENSES_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getBusinessLicense = async (
  req: GetBusinessLicenseRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const license = await PharmacyService.getBusinessLicenseByUuid(
      req.params.license_uuid,
      req.params.pharmacy_uuid,
      req.user!.pharmacyId,
      req.user!.platformRole
    )
    sendSuccess(res, MESSAGE_CODES.BUSINESS_LICENSE_FETCHED, license)
  } catch (err) { next(err) }
}

export const createBusinessLicense = async (
  req: CreateBusinessLicenseRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createBusinessLicenseSchema.safeParse(req.body)
    if (!parsed.success) throw new ValidationException(parsed.error.flatten().fieldErrors as Record<string, any>)

    const license = await PharmacyService.createBusinessLicense(
      req.params.pharmacy_uuid,
      parsed.data,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )
    sendCreated(res, MESSAGE_CODES.BUSINESS_LICENSE_CREATED, license)
  } catch (err) { next(err) }
}

export const updateBusinessLicense = async (
  req: UpdateBusinessLicenseRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateBusinessLicenseSchema.safeParse(req.body)
    if (!parsed.success) throw new ValidationException(parsed.error.flatten().fieldErrors as Record<string, any>)

    const license = await PharmacyService.updateBusinessLicense(
      req.params.license_uuid,
      req.params.pharmacy_uuid,
      parsed.data,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )
    sendSuccess(res, MESSAGE_CODES.BUSINESS_LICENSE_UPDATED, license)
  } catch (err) { next(err) }
}

export const deleteBusinessLicense = async (
  req: DeleteBusinessLicenseRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await PharmacyService.deleteBusinessLicense(
      req.params.license_uuid,
      req.params.pharmacy_uuid,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )
    sendNoContent(res, MESSAGE_CODES.BUSINESS_LICENSE_DELETED)
  } catch (err) { next(err) }
}