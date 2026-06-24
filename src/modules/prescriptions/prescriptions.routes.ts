import { Router } from 'express'
import * as PrescriptionController from './prescriptions.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  prescriptionQuerySchema,
  dispensePrescriptionSchema,
} from './prescriptions.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)

router.get('/', requirePermission(PERMISSIONS.PRESCRIPTIONS_READ), validateQuery(prescriptionQuerySchema), PrescriptionController.getPrescriptions)
router.get('/queue', requirePermission(PERMISSIONS.PRESCRIPTIONS_READ), PrescriptionController.getPrescriptionQueue)
router.get('/:prescription_uuid', requirePermission(PERMISSIONS.PRESCRIPTIONS_READ), PrescriptionController.getPrescription)
router.post('/', requirePermission(PERMISSIONS.PRESCRIPTIONS_CREATE), validateBody(createPrescriptionSchema), PrescriptionController.createPrescription)
router.put('/:prescription_uuid', requirePermission(PERMISSIONS.PRESCRIPTIONS_UPDATE), validateBody(updatePrescriptionSchema), PrescriptionController.updatePrescription)
router.delete('/:prescription_uuid', requirePermission(PERMISSIONS.PRESCRIPTIONS_DELETE), PrescriptionController.deletePrescription)
router.post('/:prescription_uuid/dispense', requirePermission(PERMISSIONS.PRESCRIPTIONS_CREATE), validateBody(dispensePrescriptionSchema), PrescriptionController.dispensePrescription)
router.post('/:prescription_uuid/cancel', requirePermission(PERMISSIONS.PRESCRIPTIONS_UPDATE), PrescriptionController.cancelPrescription)

export default router
