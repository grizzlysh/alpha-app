import { Router } from 'express';
import { authenticate } from '@middlewares/auth';
import { requirePermission } from '@middlewares/roleGuard';
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

// ─── User CRUD ────────────────────────────────────────────────────────────────

userRouter.get('/', requirePermission(PERMISSIONS.USERS_READ), userController.listUsers);

userRouter.get('/:user_uuid', requirePermission(PERMISSIONS.USERS_READ), userController.getUser);

userRouter.post('/', requirePermission(PERMISSIONS.USERS_CREATE), userController.createUser);

userRouter.put('/:user_uuid', requirePermission(PERMISSIONS.USERS_UPDATE), userController.updateUser);

userRouter.delete('/:user_uuid', requirePermission(PERMISSIONS.USERS_DELETE), userController.deleteUser);

userRouter.post('/:user_uuid/reset-password', requirePermission(PERMISSIONS.USERS_UPDATE), userController.resetPassword);

// ─── Placements ───────────────────────────────────────────────────────────────

userRouter.get(
  '/:user_uuid/placements',
  requirePermission(PERMISSIONS.USERS_READ),
  userController.listPlacements
);

userRouter.get(
  '/:user_uuid/placements/:placement_uuid',
  requirePermission(PERMISSIONS.USERS_READ),
  userController.getPlacement
);

userRouter.post(
  '/:user_uuid/placements',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  userController.createPlacement
);

userRouter.put(
  '/:user_uuid/placements/:placement_uuid',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  userController.updatePlacement
);

userRouter.delete(
  '/:user_uuid/placements/:placement_uuid',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  userController.deletePlacement
);

// ─── Practice Licenses ────────────────────────────────────────────────────────

userRouter.get(
  '/:user_uuid/placements/:placement_uuid/practice-licenses',
  requirePermission(PERMISSIONS.LICENSES_READ),
  userController.listLicenses
);

userRouter.get(
  '/:user_uuid/placements/:placement_uuid/practice-licenses/:license_uuid',
  requirePermission(PERMISSIONS.LICENSES_READ),
  userController.getLicense
);

userRouter.post(
  '/:user_uuid/placements/:placement_uuid/practice-licenses',
  requirePermission(PERMISSIONS.LICENSES_CREATE),
  userController.addLicense
);

userRouter.put(
  '/:user_uuid/placements/:placement_uuid/practice-licenses/:license_uuid',
  requirePermission(PERMISSIONS.LICENSES_UPDATE),
  userController.updateLicense
);

userRouter.delete(
  '/:user_uuid/placements/:placement_uuid/practice-licenses/:license_uuid',
  requirePermission(PERMISSIONS.LICENSES_DELETE),
  userController.deleteLicense
);
