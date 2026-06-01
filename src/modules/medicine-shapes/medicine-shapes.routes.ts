import { Router } from 'express'
import * as MedicineShapeController from './medicine-shapes.controller'
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
  MedicineShapeController.getMedicineShapes
)

router.get(
  '/dropdown',
  requirePermission(PERMISSIONS.MEDICINES_READ),
  MedicineShapeController.getMedicineShapesDropdown
)

router.get(
  '/:medicine_shape_uuid',
  requirePermission(PERMISSIONS.MEDICINES_READ),
  MedicineShapeController.getMedicineShape
)

router.post(
  '/',
  requirePermission(PERMISSIONS.MEDICINES_CREATE),
  MedicineShapeController.createMedicineShape
)

router.put(
  '/:medicine_shape_uuid',
  requirePermission(PERMISSIONS.MEDICINES_UPDATE),
  MedicineShapeController.updateMedicineShape
)

router.delete(
  '/:medicine_shape_uuid',
  requirePermission(PERMISSIONS.MEDICINES_DELETE),
  MedicineShapeController.deleteMedicineShape
)

export default router