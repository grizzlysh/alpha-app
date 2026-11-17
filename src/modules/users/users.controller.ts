import { parseUuid } from '@utils/parseUuid'
import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '@utils/responseHelper';
import * as userService from './users.service';
import {
  UserUuidParam,
  PlacementUuidParam,
  LicenseUuidParam,
  ListUserQuery,
  ListPlacementQuery,
  ListLicenseQuery,
  CreateUserBody,
  UpdateUserBody,
  UpdateMeBody,
  ChangePasswordBody,
  CreatePlacementBody,
  UpdatePlacementBody,
  CreateLicenseBody,
  UpdateLicenseBody,
} from './users.interface';

const actorOf = (req: Request<any, any, any, any>): userService.UserActor => ({
  id: req.user!.id,
  platformRole: req.user!.platformRole,
  pharmacyId: req.user!.pharmacyId,
});

// ─── Me ───────────────────────────────────────────────────────────────────────

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, pharmacyId } = req.user!;
    const data = await userService.getMe(id, pharmacyId ?? undefined);
    sendSuccess(res, 'ME_FETCHED', data);
  } catch (err) { next(err); }
}

export async function updateMe(
  req: Request<ParamsDictionary, any, UpdateMeBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.user!;
    const data = await userService.updateMe(id, id, req.body);
    sendSuccess(res, 'ME_UPDATED', data);
  } catch (err) { next(err); }
}

export async function changePassword(
  req: Request<ParamsDictionary, any, ChangePasswordBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.user!;
    await userService.changePassword(id, req.body);
    sendNoContent(res, 'PASSWORD_CHANGED');
  } catch (err) { next(err); }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsersDropdown(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await userService.getUsersDropdown(
      req.user!.pharmacyId!,
      req.query.search as string | undefined
    );
    sendSuccess(res, 'USERS_FETCHED', data);
  } catch (err) { next(err); }
}

export async function getSignersDropdown(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const level = req.query.level === 'HEAD_PHARMACIST' ? 'HEAD_PHARMACIST' : 'PHARMACIST';
    const data = await userService.getSignersDropdown(req.user!.pharmacyId!, level);
    sendSuccess(res, 'USERS_FETCHED', data);
  } catch (err) { next(err); }
}

export async function listUsers(
  req: Request<ParamsDictionary, any, any, ListUserQuery>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { data, total } = await userService.listUsers(actorOf(req), req.query as any);
    const page = (req.query as any).page ?? 1;
    const limit = (req.query as any).limit ?? 10;
    sendPaginated(res, 'USERS_FETCHED', data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
}

export async function getUser(
  req: Request<UserUuidParam>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await userService.getUser(actorOf(req), parseUuid(req.params.user_uuid));
    sendSuccess(res, 'USER_FETCHED', data);
  } catch (err) { next(err); }
}

export async function createUser(
  req: Request<ParamsDictionary, any, CreateUserBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await userService.createUser(actorOf(req), req.body);
    sendCreated(res, 'USER_CREATED', data);
  } catch (err) { next(err); }
}

export async function updateUser(
  req: Request<UserUuidParam, any, UpdateUserBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await userService.updateUser(actorOf(req), parseUuid(req.params.user_uuid), req.body);
    sendSuccess(res, 'USER_UPDATED', data);
  } catch (err) { next(err); }
}

export async function deleteUser(
  req: Request<UserUuidParam>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await userService.deleteUser(actorOf(req), parseUuid(req.params.user_uuid));
    sendNoContent(res, 'USER_DELETED');
  } catch (err) { next(err); }
}

export async function resetPassword(
  req: Request<UserUuidParam>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await userService.resetPassword(actorOf(req), parseUuid(req.params.user_uuid));
    sendSuccess(res, 'PASSWORD_RESET', data);
  } catch (err) { next(err); }
}

// ─── Placements ──────────────────────────────────────────────────────────────

export async function listPlacements(
  req: Request<UserUuidParam, any, any, ListPlacementQuery>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await userService.listPlacements(actorOf(req), parseUuid(req.params.user_uuid), req.query as any);
    sendSuccess(res, 'PLACEMENTS_FETCHED', data);
  } catch (err) { next(err); }
}

export async function getPlacement(
  req: Request<PlacementUuidParam>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user_uuid, placement_uuid } = req.params;
    const data = await userService.getPlacement(actorOf(req), user_uuid, placement_uuid);
    sendSuccess(res, 'PLACEMENT_FETCHED', data);
  } catch (err) { next(err); }
}

export async function createPlacement(
  req: Request<UserUuidParam, any, CreatePlacementBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await userService.createPlacement(actorOf(req), parseUuid(req.params.user_uuid), req.body);
    sendCreated(res, 'PLACEMENT_CREATED', data);
  } catch (err) { next(err); }
}

export async function updatePlacement(
  req: Request<PlacementUuidParam, any, UpdatePlacementBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user_uuid, placement_uuid } = req.params;
    const data = await userService.updatePlacement(actorOf(req), user_uuid, placement_uuid, req.body);
    sendSuccess(res, 'PLACEMENT_UPDATED', data);
  } catch (err) { next(err); }
}

export async function deletePlacement(
  req: Request<PlacementUuidParam>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user_uuid, placement_uuid } = req.params;
    await userService.deletePlacement(actorOf(req), user_uuid, placement_uuid);
    sendNoContent(res, 'PLACEMENT_DELETED');
  } catch (err) { next(err); }
}

// ─── Practice Licenses ────────────────────────────────────────────────────────

export async function listLicenses(
  req: Request<PlacementUuidParam, any, any, ListLicenseQuery>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user_uuid, placement_uuid } = req.params;
    const { data, total } = await userService.listLicenses(actorOf(req), user_uuid, placement_uuid, req.query as any);
    const page = (req.query as any).page ?? 1;
    const limit = (req.query as any).limit ?? 10;
    sendPaginated(res, 'LICENSES_FETCHED', data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
}

export async function getLicense(
  req: Request<LicenseUuidParam>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user_uuid, placement_uuid, license_uuid } = req.params;
    const data = await userService.getLicense(actorOf(req), user_uuid, placement_uuid, license_uuid);
    sendSuccess(res, 'LICENSE_FETCHED', data);
  } catch (err) { next(err); }
}

export async function addLicense(
  req: Request<PlacementUuidParam, any, CreateLicenseBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user_uuid, placement_uuid } = req.params;
    const data = await userService.addLicense(actorOf(req), user_uuid, placement_uuid, req.body);
    sendCreated(res, 'LICENSE_CREATED', data);
  } catch (err) { next(err); }
}

export async function updateLicense(
  req: Request<LicenseUuidParam, any, UpdateLicenseBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user_uuid, placement_uuid, license_uuid } = req.params;
    const data = await userService.updateLicense(actorOf(req), user_uuid, placement_uuid, license_uuid, req.body);
    sendSuccess(res, 'LICENSE_UPDATED', data);
  } catch (err) { next(err); }
}

export async function deleteLicense(
  req: Request<LicenseUuidParam>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user_uuid, placement_uuid, license_uuid } = req.params;
    await userService.deleteLicense(actorOf(req), user_uuid, placement_uuid, license_uuid);
    sendNoContent(res, 'LICENSE_DELETED');
  } catch (err) { next(err); }
}

