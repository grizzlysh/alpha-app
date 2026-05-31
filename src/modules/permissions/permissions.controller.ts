import { Response, NextFunction } from 'express'
import * as PermissionService from './permissions.service'
import { permissionQuerySchema } from './permissions.validation'
import {
  GetPermissionsRequest,
  GetPermissionRequest,
} from './permissions.interface'
import { ValidationException } from '@exceptions/ValidationException'
import { sendSuccess, sendPaginated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getPermissions = async (
  req: GetPermissionsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = permissionQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await PermissionService.getPermissions(parsed.data)

    sendPaginated(res, MESSAGE_CODES.PERMISSIONS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getPermission = async (
  req: GetPermissionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const permission = await PermissionService.getPermissionByUuid(
      req.params.permission_uuid
    )

    sendSuccess(res, MESSAGE_CODES.PERMISSION_FETCHED, permission)
  } catch (err) {
    next(err)
  }
}