import { Router } from 'express'
import * as MedicineTypeController from './medicine-types.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)

// note: no requirePharmacyAccess here
// because PLATFORM_ADMIN has no pharmacyId
// but still needs access to this route

router.get(
  '/',
  requirePermission(PERMISSIONS.MEDICINES_READ),
  MedicineTypeController.getMedicineTypes
)

router.get(
  '/dropdown',
  requirePermission(PERMISSIONS.MEDICINES_READ),
  MedicineTypeController.getMedicineTypesDropdown
)

router.get(
  '/:medicine_type_uuid',
  requirePermission(PERMISSIONS.MEDICINES_READ),
  MedicineTypeController.getMedicineType
)

router.post(
  '/',
  requirePermission(PERMISSIONS.MEDICINES_CREATE),
  MedicineTypeController.createMedicineType
)

router.put(
  '/:medicine_type_uuid',
  requirePermission(PERMISSIONS.MEDICINES_UPDATE),
  MedicineTypeController.updateMedicineType
)

router.delete(
  '/:medicine_type_uuid',
  requirePermission(PERMISSIONS.MEDICINES_DELETE),
  MedicineTypeController.deleteMedicineType
)

export default router