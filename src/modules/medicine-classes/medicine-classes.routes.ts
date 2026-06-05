import { Router } from 'express'
import * as MedicineClassController from './medicine-classes.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { createMedicineClassSchema, updateMedicineClassSchema, medicineClassQuerySchema } from './medicine-classes.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)
router.get('/', requirePermission(PERMISSIONS.MEDICINE_CLASSES_READ), validateQuery(medicineClassQuerySchema), MedicineClassController.getMedicineClasses)
router.get('/dropdown', requirePermission(PERMISSIONS.MEDICINE_CLASSES_READ), MedicineClassController.getMedicineClassesDropdown)
router.get('/:medicine_class_uuid', requirePermission(PERMISSIONS.MEDICINE_CLASSES_READ), MedicineClassController.getMedicineClass)
router.post('/', requirePermission(PERMISSIONS.MEDICINE_CLASSES_CREATE), validateBody(createMedicineClassSchema), MedicineClassController.createMedicineClass)
router.put('/:medicine_class_uuid', requirePermission(PERMISSIONS.MEDICINE_CLASSES_UPDATE), validateBody(updateMedicineClassSchema), MedicineClassController.updateMedicineClass)
router.delete('/:medicine_class_uuid', requirePermission(PERMISSIONS.MEDICINE_CLASSES_DELETE), MedicineClassController.deleteMedicineClass)
export default router
