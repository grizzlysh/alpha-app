import { Router } from 'express'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'
import {
  getMedicalRecordController,
  updateMedicalRecordController,
  addAllergyController,
  updateAllergyController,
  removeAllergyController,
  getVisitsController,
  getVisitController,
  createVisitController,
  updateVisitController,
  deleteVisitController,
} from './medical-records.controller'

const router = Router()

router.use(authenticate, requirePharmacyAccess)

// Medical record header
router.get('/:customer_uuid', requirePermission(PERMISSIONS.MEDICAL_RECORDS_READ), getMedicalRecordController)
router.put('/:customer_uuid', requirePermission(PERMISSIONS.MEDICAL_RECORDS_WRITE), updateMedicalRecordController)

// Allergies
router.post('/:customer_uuid/allergies', requirePermission(PERMISSIONS.MEDICAL_RECORDS_WRITE), addAllergyController)
router.put('/:customer_uuid/allergies/:allergy_uuid', requirePermission(PERMISSIONS.MEDICAL_RECORDS_WRITE), updateAllergyController)
router.delete('/:customer_uuid/allergies/:allergy_uuid', requirePermission(PERMISSIONS.MEDICAL_RECORDS_WRITE), removeAllergyController)

// Visits
router.get('/:customer_uuid/visits', requirePermission(PERMISSIONS.MEDICAL_RECORDS_READ), getVisitsController)
router.get('/:customer_uuid/visits/:visit_uuid', requirePermission(PERMISSIONS.MEDICAL_RECORDS_READ), getVisitController)
router.post('/:customer_uuid/visits', requirePermission(PERMISSIONS.MEDICAL_RECORDS_WRITE), createVisitController)
router.put('/:customer_uuid/visits/:visit_uuid', requirePermission(PERMISSIONS.MEDICAL_RECORDS_WRITE), updateVisitController)
router.delete('/:customer_uuid/visits/:visit_uuid', requirePermission(PERMISSIONS.MEDICAL_RECORDS_WRITE), deleteVisitController)

export default router
