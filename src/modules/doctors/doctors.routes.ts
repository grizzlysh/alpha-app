import { Router } from 'express'
import * as DoctorController from './doctors.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { createDoctorSchema, updateDoctorSchema, doctorQuerySchema } from './doctors.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)

router.get('/', requirePermission(PERMISSIONS.DOCTORS_READ), validateQuery(doctorQuerySchema), DoctorController.getDoctors)
router.get('/dropdown', requirePermission(PERMISSIONS.DOCTORS_READ), DoctorController.getDoctorsDropdown)
router.get('/:doctor_uuid', requirePermission(PERMISSIONS.DOCTORS_READ), DoctorController.getDoctor)
router.post('/', requirePermission(PERMISSIONS.DOCTORS_CREATE), validateBody(createDoctorSchema), DoctorController.createDoctor)
router.put('/:doctor_uuid', requirePermission(PERMISSIONS.DOCTORS_UPDATE), validateBody(updateDoctorSchema), DoctorController.updateDoctor)
router.delete('/:doctor_uuid', requirePermission(PERMISSIONS.DOCTORS_DELETE), DoctorController.deleteDoctor)

export default router
