import { Router } from 'express'
import * as PharmacyController from './pharmacies.controller'
import { authenticate } from '@middlewares/auth'
import { requirePermission, requirePlatformRole } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'
import { PlatformRole } from '@prisma/client'

const router: Router = Router()

router.use(authenticate)

router.get(
  '/',
  requirePermission(PERMISSIONS.PHARMACIES_READ),
  PharmacyController.getPharmacies
)

router.get(
  '/:pharmacy_uuid',
  requirePermission(PERMISSIONS.PHARMACIES_READ),
  PharmacyController.getPharmacy
)

router.post(
  '/',
  requirePlatformRole(PlatformRole.PLATFORM_ADMIN),
  PharmacyController.createPharmacy
)

router.put(
  '/:pharmacy_uuid',
  requirePermission(PERMISSIONS.PHARMACIES_UPDATE),
  PharmacyController.updatePharmacy
)

router.put(
  '/:pharmacy_uuid/owner',
  requirePlatformRole(PlatformRole.PLATFORM_ADMIN),
  PharmacyController.updatePharmacyOwner
)

router.delete(
  '/:pharmacy_uuid',
  requirePlatformRole(PlatformRole.PLATFORM_ADMIN),
  PharmacyController.deletePharmacy
)

export default router