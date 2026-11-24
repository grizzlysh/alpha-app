import { Router } from 'express'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'
import {
  getQueueController,
  getExaminationController,
  checkInController,
  triageController,
  startExamController,
  saveExamController,
  allergyCheckController,
  completeExamController,
  cancelExamController,
} from './examinations.controller'

const router = Router()

router.use(authenticate, requirePharmacyAccess)

// Queue (front desk + doctor)
router.get('/', requirePermission(PERMISSIONS.EXAMINATIONS_READ), getQueueController)
router.post('/', requirePermission(PERMISSIONS.EXAMINATIONS_CHECKIN), checkInController)
router.get('/:examination_uuid', requirePermission(PERMISSIONS.EXAMINATIONS_READ), getExaminationController)
// Cancelling a waiting patient (left without being seen) is a front-desk action.
router.post('/:examination_uuid/cancel', requirePermission(PERMISSIONS.EXAMINATIONS_CHECKIN), cancelExamController)

// Triage (nurse / front desk): vitals before the doctor, optional
router.put('/:examination_uuid/triage', requirePermission(PERMISSIONS.EXAMINATIONS_TRIAGE), triageController)

// Examination (doctor)
router.post('/:examination_uuid/start', requirePermission(PERMISSIONS.EXAMINATIONS_PERFORM), startExamController)
router.put('/:examination_uuid', requirePermission(PERMISSIONS.EXAMINATIONS_PERFORM), saveExamController)
router.post('/:examination_uuid/allergy-check', requirePermission(PERMISSIONS.EXAMINATIONS_PERFORM), allergyCheckController)
router.post('/:examination_uuid/complete', requirePermission(PERMISSIONS.EXAMINATIONS_PERFORM), completeExamController)

export default router
