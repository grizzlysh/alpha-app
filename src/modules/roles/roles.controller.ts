import { Response, NextFunction } from 'express'
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
    const parsed = roleQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await RoleService.getRoles(
      req.user!.pharmacyId,
      req.user!.platformRole,
      parsed.data
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
      req.params.role_uuid,
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
    const parsed = createRoleSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const role = await RoleService.createRole(
      parsed.data,
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
    const parsed = updateRoleSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const role = await RoleService.updateRole(
      req.params.role_uuid,
      parsed.data,
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
    const parsed = setRolePermissionsSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const role = await RoleService.setRolePermissions(
      req.params.role_uuid,
      parsed.data,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.ROLE_PERMISSIONS_UPDATED, role)
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
      req.params.role_uuid,
      req.user!.pharmacyId,
      req.user!.platformRole,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.ROLE_DELETED, null)
  } catch (err) {
    next(err)
  }
}