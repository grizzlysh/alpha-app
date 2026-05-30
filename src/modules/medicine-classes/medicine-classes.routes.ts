import { Router } from 'express'
import * as MedicineClassController from './medicine-classes.controller'
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
  requirePermission(PERMISSIONS.MEDICINE_CLASSES_VIEW),
  MedicineClassController.getMedicineClasses
)

router.get(
  '/:medicine_class_uuid',
  requirePermission(PERMISSIONS.MEDICINE_CLASSES_VIEW),
  MedicineClassController.getMedicineClass
)

router.post(
  '/',
  requirePermission(PERMISSIONS.MEDICINE_CLASSES_CREATE),
  MedicineClassController.createMedicineClass
)

router.put(
  '/:medicine_class_uuid',
  requirePermission(PERMISSIONS.MEDICINE_CLASSES_EDIT),
  MedicineClassController.updateMedicineClass
)

router.delete(
  '/:medicine_class_uuid',
  requirePermission(PERMISSIONS.MEDICINE_CLASSES_DELETE),
  MedicineClassController.deleteMedicineClass
)

export default router