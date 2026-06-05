import { Router } from 'express'
import * as MedicineController from './medicines.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import {
  createMedicineSchema,
  updateMedicineSchema,
  medicineQuerySchema,
} from './medicines.validation'

const router: Router = Router()

router.use(authenticate)
router.use(requirePharmacyAccess)

router.get('/', requirePermission(PERMISSIONS.MEDICINES_READ), validateQuery(medicineQuerySchema), MedicineController.getMedicines)
router.get('/dropdown', requirePermission(PERMISSIONS.MEDICINES_READ), MedicineController.getMedicinesDropdown)
router.get('/:medicine_uuid', requirePermission(PERMISSIONS.MEDICINES_READ), MedicineController.getMedicine)
router.post('/', requirePermission(PERMISSIONS.MEDICINES_CREATE), validateBody(createMedicineSchema), MedicineController.createMedicine)
router.put('/:medicine_uuid', requirePermission(PERMISSIONS.MEDICINES_UPDATE), validateBody(updateMedicineSchema), MedicineController.updateMedicine)
router.delete('/:medicine_uuid', requirePermission(PERMISSIONS.MEDICINES_DELETE), MedicineController.deleteMedicine)

export default router
