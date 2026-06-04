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
  '/dropdown',
  requirePermission(PERMISSIONS.PHARMACIES_READ),
  PharmacyController.getPharmaciesDdl
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


router.delete(
  '/:pharmacy_uuid',
  requirePlatformRole(PlatformRole.PLATFORM_ADMIN),
  PharmacyController.deletePharmacy
)

// ─── Business Licenses ────────────────────────────────────────────────────────

router.get(
  '/:pharmacy_uuid/business-licenses',
  requirePermission(PERMISSIONS.LICENSES_READ),
  PharmacyController.listBusinessLicenses
)

router.get(
  '/:pharmacy_uuid/business-licenses/:license_uuid',
  requirePermission(PERMISSIONS.LICENSES_READ),
  PharmacyController.getBusinessLicense
)

router.post(
  '/:pharmacy_uuid/business-licenses',
  requirePermission(PERMISSIONS.LICENSES_CREATE),
  PharmacyController.createBusinessLicense
)

router.put(
  '/:pharmacy_uuid/business-licenses/:license_uuid',
  requirePermission(PERMISSIONS.LICENSES_UPDATE),
  PharmacyController.updateBusinessLicense
)

router.delete(
  '/:pharmacy_uuid/business-licenses/:license_uuid',
  requirePermission(PERMISSIONS.LICENSES_DELETE),
  PharmacyController.deleteBusinessLicense
)

export default router