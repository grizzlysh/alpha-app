import { Response, NextFunction } from 'express'
import * as BusinessParameterService from './business-parameters.service'
import {
  businessParameterQuerySchema,
  updateBusinessParameterSchema,
} from './business-parameters.validation'
import {
  GetBusinessParametersRequest,
  GetBusinessParameterRequest,
  UpdateBusinessParameterRequest,
} from './business-parameters.interface'
import { ValidationException } from '@exceptions/ValidationException'
import { sendSuccess, sendPaginated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getBusinessParameters = async (
  req: GetBusinessParametersRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = businessParameterQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await BusinessParameterService.getBusinessParameters(
      req.user!.pharmacyId,
      req.user!.platformRole,
      parsed.data
    )

    sendPaginated(res, MESSAGE_CODES.PHARMACY_PARAMETERS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getBusinessParameter = async (
  req: GetBusinessParameterRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const param = await BusinessParameterService.getBusinessParameterByUuid(
      req.params.business_parameter_uuid,
      req.user!.pharmacyId,
      req.user!.platformRole
    )

    sendSuccess(res, MESSAGE_CODES.PHARMACY_PARAMETERS_FETCHED, param)
  } catch (err) {
    next(err)
  }
}

export const updateBusinessParameter = async (
  req: UpdateBusinessParameterRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateBusinessParameterSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const param = await BusinessParameterService.updateBusinessParameter(
      req.params.business_parameter_uuid,
      parsed.data,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.PHARMACY_PARAMETERS_UPDATED, param)
  } catch (err) {
    next(err)
  }
}