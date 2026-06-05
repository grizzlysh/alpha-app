import { parseUuid } from '@utils/parseUuid'
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
    const { data, meta } = await BusinessParameterService.getBusinessParameters(
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.query as any
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
      parseUuid(req.params.business_parameter_uuid),
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
    const param = await BusinessParameterService.updateBusinessParameter(
      parseUuid(req.params.business_parameter_uuid),
      req.body,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.PHARMACY_PARAMETERS_UPDATED, param)
  } catch (err) {
    next(err)
  }
}
