import { Router } from 'express';
import { authenticate } from '@middlewares/auth';
import { requirePermission } from '@middlewares/roleGuard';
import { validateBody, validateQuery } from '@middlewares/validate';
import { PERMISSIONS } from '@constants/permissions';
import * as userController from './users.controller';
import {
  updateMeSchema,
  changePasswordSchema,
  listUserSchema,
  createUserSchema,
  updateUserSchema,
  listPlacementSchema,
  createPlacementSchema,
  updatePlacementSchema,
  listLicenseSchema,
  createLicenseSchema,
  updateLicenseSchema,
} from './users.validation';

export const meRouter = Router();
meRouter.use(authenticate);
meRouter.get('/', userController.getMe);
meRouter.put('/', validateBody(updateMeSchema), userController.updateMe);
meRouter.put('/password', validateBody(changePasswordSchema), userController.changePassword);

export const userRouter = Router();
userRouter.use(authenticate);

userRouter.get('/', requirePermission(PERMISSIONS.USERS_READ), validateQuery(listUserSchema), userController.listUsers);
userRouter.get('/:user_uuid', requirePermission(PERMISSIONS.USERS_READ), userController.getUser);
userRouter.post('/', requirePermission(PERMISSIONS.USERS_CREATE), validateBody(createUserSchema), userController.createUser);
userRouter.put('/:user_uuid', requirePermission(PERMISSIONS.USERS_UPDATE), validateBody(updateUserSchema), userController.updateUser);
userRouter.delete('/:user_uuid', requirePermission(PERMISSIONS.USERS_DELETE), userController.deleteUser);
userRouter.post('/:user_uuid/reset-password', requirePermission(PERMISSIONS.USERS_UPDATE), userController.resetPassword);

userRouter.get('/:user_uuid/placements', requirePermission(PERMISSIONS.USERS_READ), validateQuery(listPlacementSchema), userController.listPlacements);
userRouter.get('/:user_uuid/placements/:placement_uuid', requirePermission(PERMISSIONS.USERS_READ), userController.getPlacement);
userRouter.post('/:user_uuid/placements', requirePermission(PERMISSIONS.USERS_UPDATE), validateBody(createPlacementSchema), userController.createPlacement);
userRouter.put('/:user_uuid/placements/:placement_uuid', requirePermission(PERMISSIONS.USERS_UPDATE), validateBody(updatePlacementSchema), userController.updatePlacement);
userRouter.delete('/:user_uuid/placements/:placement_uuid', requirePermission(PERMISSIONS.USERS_UPDATE), userController.deletePlacement);

userRouter.get('/:user_uuid/placements/:placement_uuid/practice-licenses', requirePermission(PERMISSIONS.LICENSES_READ), validateQuery(listLicenseSchema), userController.listLicenses);
userRouter.get('/:user_uuid/placements/:placement_uuid/practice-licenses/:license_uuid', requirePermission(PERMISSIONS.LICENSES_READ), userController.getLicense);
userRouter.post('/:user_uuid/placements/:placement_uuid/practice-licenses', requirePermission(PERMISSIONS.LICENSES_CREATE), validateBody(createLicenseSchema), userController.addLicense);
userRouter.put('/:user_uuid/placements/:placement_uuid/practice-licenses/:license_uuid', requirePermission(PERMISSIONS.LICENSES_UPDATE), validateBody(updateLicenseSchema), userController.updateLicense);
userRouter.delete('/:user_uuid/placements/:placement_uuid/practice-licenses/:license_uuid', requirePermission(PERMISSIONS.LICENSES_DELETE), userController.deleteLicense);
