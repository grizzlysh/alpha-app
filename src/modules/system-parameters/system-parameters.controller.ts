import { parseUuid } from '@utils/parseUuid'
import { Response, NextFunction } from 'express'
import * as SystemParameterService from './system-parameters.service'
import {
  systemParameterQuerySchema,
  updateSystemParameterSchema,
} from './system-parameters.validation'
import {
  GetSystemParametersRequest,
  GetSystemParameterRequest,
  UpdateSystemParameterRequest,
} from './system-parameters.interface'
import { ValidationException } from '@exceptions/ValidationException'
import { sendSuccess, sendPaginated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getSystemParameters = async (
  req: GetSystemParametersRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, meta } = await SystemParameterService.getSystemParameters(
      req.query as any
    )

    sendPaginated(res, MESSAGE_CODES.PHARMACY_PARAMETERS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getSystemParameter = async (
  req: GetSystemParameterRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const param = await SystemParameterService.getSystemParameterByUuid(
      parseUuid(req.params.system_parameter_uuid)
    )

    sendSuccess(res, MESSAGE_CODES.PHARMACY_PARAMETERS_FETCHED, param)
  } catch (err) {
    next(err)
  }
}

export const updateSystemParameter = async (
  req: UpdateSystemParameterRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const param = await SystemParameterService.updateSystemParameter(
      parseUuid(req.params.system_parameter_uuid),
      req.body as any,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.PHARMACY_PARAMETERS_UPDATED, param)
  } catch (err) {
    next(err)
  }
}
