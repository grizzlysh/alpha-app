import { parseUuid } from '@utils/parseUuid'
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
    const { data, meta } = await PharmacyService.getPharmacies(
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.query as any
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
      parseUuid(req.params.pharmacy_uuid),
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
    const pharmacy = await PharmacyService.createPharmacy(
      req.body as any,
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
    const pharmacy = await PharmacyService.updatePharmacy(
      parseUuid(req.params.pharmacy_uuid),
      req.body as any,
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
      parseUuid(req.params.pharmacy_uuid),
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
    const { data, meta } = await PharmacyService.getBusinessLicenses(
      parseUuid(req.params.pharmacy_uuid),
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.query as any
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
      parseUuid(req.params.license_uuid),
      parseUuid(req.params.pharmacy_uuid),
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
    const license = await PharmacyService.createBusinessLicense(
      parseUuid(req.params.pharmacy_uuid),
      req.body as any,
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
    const license = await PharmacyService.updateBusinessLicense(
      parseUuid(req.params.license_uuid),
      parseUuid(req.params.pharmacy_uuid),
      req.body as any,
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
      parseUuid(req.params.license_uuid),
      parseUuid(req.params.pharmacy_uuid),
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )
    sendNoContent(res, MESSAGE_CODES.BUSINESS_LICENSE_DELETED)
  } catch (err) { next(err) }
}
