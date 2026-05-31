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
    const parsed = systemParameterQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await SystemParameterService.getSystemParameters(
      parsed.data
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
      req.params.system_parameter_uuid
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
    const parsed = updateSystemParameterSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const param = await SystemParameterService.updateSystemParameter(
      req.params.system_parameter_uuid,
      parsed.data,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.PHARMACY_PARAMETERS_UPDATED, param)
  } catch (err) {
    next(err)
  }
}