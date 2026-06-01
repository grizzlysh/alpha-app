import { Router } from 'express';
import { authenticate } from '@middlewares/auth';
import { requirePlatformAdmin, requirePermission } from '@middlewares/roleGuard';
import { PERMISSIONS } from '@constants/permissions';
import * as userController from './users.controller';

// ─── Me Router ────────────────────────────────────────────────────────────────

export const meRouter = Router();

meRouter.use(authenticate);

meRouter.get('/', userController.getMe);

meRouter.put('/', userController.updateMe);

meRouter.put('/password', userController.changePassword);

// ─── Users Router ─────────────────────────────────────────────────────────────

export const userRouter = Router();

userRouter.use(authenticate);

// ─── User CRUD (PLATFORM_ADMIN only) ─────────────────────────────────────────

userRouter.get('/', requirePlatformAdmin, userController.listUsers);

userRouter.get('/:user_uuid', requirePlatformAdmin, userController.getUser);

userRouter.post('/', requirePlatformAdmin, userController.createUser);

userRouter.put('/:user_uuid', requirePlatformAdmin, userController.updateUser);

userRouter.delete('/:user_uuid', requirePlatformAdmin, userController.deleteUser);

userRouter.post('/:user_uuid/reset-password', requirePlatformAdmin, userController.resetPassword);

// ─── Assignments ──────────────────────────────────────────────────────────────

userRouter.get(
  '/:user_uuid/pharmacies',
  requirePermission(PERMISSIONS.USERS_READ),
  userController.listPlacements
);

userRouter.get(
  '/:user_uuid/pharmacies/:placement_uuid',
  requirePermission(PERMISSIONS.USERS_READ),
  userController.getPlacement
);

userRouter.post(
  '/:user_uuid/pharmacies',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  userController.createPlacement
);

userRouter.put(
  '/:user_uuid/pharmacies/:placement_uuid',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  userController.updatePlacement
);

userRouter.delete(
  '/:user_uuid/pharmacies/:placement_uuid',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  userController.deletePlacement
);

// ─── Licenses ─────────────────────────────────────────────────────────────────

userRouter.get(
  '/:user_uuid/pharmacies/:placement_uuid/licenses',
  requirePermission(PERMISSIONS.USERS_READ),
  userController.listLicenses
);

userRouter.post(
  '/:user_uuid/pharmacies/:placement_uuid/licenses',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  userController.addLicense
);

userRouter.put(
  '/:user_uuid/pharmacies/:placement_uuid/licenses/:license_uuid',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  userController.updateLicense
);

userRouter.delete(
  '/:user_uuid/pharmacies/:placement_uuid/licenses/:license_uuid',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  userController.deleteLicense
);
