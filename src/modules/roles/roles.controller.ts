import { parseUuid } from '@utils/parseUuid'
import { Request, Response, NextFunction } from 'express'
import * as RoleService from './roles.service'
import {
  roleQuerySchema,
  createRoleSchema,
  updateRoleSchema,
  setRolePermissionsSchema,
} from './roles.validation'
import {
  GetRolesRequest,
  GetRoleRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  SetRolePermissionsRequest,
  DeleteRoleRequest,
} from './roles.interface'
import { ValidationException } from '@exceptions/ValidationException'
import { sendSuccess, sendCreated, sendPaginated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getRoles = async (
  req: GetRolesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, meta } = await RoleService.getRoles(
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.query as any
    )

    sendPaginated(res, MESSAGE_CODES.ROLES_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getRole = async (
  req: GetRoleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role = await RoleService.getRoleByUuid(
      parseUuid(req.params.role_uuid),
      req.user!.pharmacyId,
      req.user!.platformRole
    )

    sendSuccess(res, MESSAGE_CODES.ROLE_FETCHED, role)
  } catch (err) {
    next(err)
  }
}

export const createRole = async (
  req: CreateRoleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role = await RoleService.createRole(
      req.body as any,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.ROLE_CREATED, role)
  } catch (err) {
    next(err)
  }
}

export const updateRole = async (
  req: UpdateRoleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role = await RoleService.updateRole(
      parseUuid(req.params.role_uuid),
      req.body as any,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.ROLE_UPDATED, role)
  } catch (err) {
    next(err)
  }
}

export const setRolePermissions = async (
  req: SetRolePermissionsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role = await RoleService.setRolePermissions(
      parseUuid(req.params.role_uuid),
      req.body as any,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.ROLE_PERMISSIONS_UPDATED, role)
  } catch (err) {
    next(err)
  }
}

export const getRolesDdl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await RoleService.getRolesDdl(
      req.user!.pharmacyId,
      req.user!.platformRole
    )
    sendSuccess(res, MESSAGE_CODES.ROLES_FETCHED, data)
  } catch (err) {
    next(err)
  }
}

export const deleteRole = async (
  req: DeleteRoleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await RoleService.deleteRole(
      parseUuid(req.params.role_uuid),
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.ROLE_DELETED, null)
  } catch (err) {
    next(err)
  }
}
