import { Router } from 'express'
import * as MedicineTypeController from './medicine-types.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { createMedicineTypeSchema, updateMedicineTypeSchema, medicineTypeQuerySchema } from './medicine-types.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)
router.get('/', requirePermission(PERMISSIONS.MEDICINES_READ), validateQuery(medicineTypeQuerySchema), MedicineTypeController.getMedicineTypes)
router.get('/dropdown', requirePermission(PERMISSIONS.MEDICINES_READ), MedicineTypeController.getMedicineTypesDropdown)
router.get('/:medicine_type_uuid', requirePermission(PERMISSIONS.MEDICINES_READ), MedicineTypeController.getMedicineType)
router.post('/', requirePermission(PERMISSIONS.MEDICINES_CREATE), validateBody(createMedicineTypeSchema), MedicineTypeController.createMedicineType)
router.put('/:medicine_type_uuid', requirePermission(PERMISSIONS.MEDICINES_UPDATE), validateBody(updateMedicineTypeSchema), MedicineTypeController.updateMedicineType)
router.delete('/:medicine_type_uuid', requirePermission(PERMISSIONS.MEDICINES_DELETE), MedicineTypeController.deleteMedicineType)
export default router
