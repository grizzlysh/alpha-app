import { Response } from 'express'
import { z } from 'zod'
import { sendSuccess, sendCreated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'
import { PERMISSIONS } from '@constants/permissions'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { parseUuid } from '@utils/parseUuid'
import * as ExaminationService from './examinations.service'
import {
  queueQuerySchema,
  checkInSchema,
  triageSchema,
  startExamSchema,
  saveExamSchema,
  completeExamSchema,
  cancelExamSchema,
} from './examinations.validation'
import {
  CheckInRequest,
  TriageRequest,
  ExaminationRequest,
  StartExamRequest,
  SaveExamRequest,
  CompleteExamRequest,
  CancelExamRequest,
} from './examinations.interface'

const allergyCheckSchema = z.object({
  items: z.array(z.object({ medicineUuid: z.string().uuid().optional(), medicineName: z.string().trim().min(1) })).max(50),
})

const pharmacyOf = (req: ExaminationRequest | CheckInRequest): number => req.user!.pharmacyId!
const can = (req: ExaminationRequest, permission: string): boolean =>
  req.user!.platformRole === 'PLATFORM_ADMIN' || req.user!.permissions.includes(permission)

export const getQueueController = async (req: ExaminationRequest, res: Response) => {
  const query = queueQuerySchema.parse(req.query)
  const queue = await ExaminationService.getQueue(pharmacyOf(req), query, req.user!.id)
  sendSuccess(res, MESSAGE_CODES.EXAMINATION_QUEUE_FETCHED, queue)
}

export const getExaminationController = async (req: ExaminationRequest, res: Response) => {
  const exam = await ExaminationService.getExamination(parseUuid(req.params.examination_uuid), pharmacyOf(req))
  sendSuccess(res, MESSAGE_CODES.EXAMINATION_FETCHED, exam)
}

export const checkInController = async (req: CheckInRequest, res: Response) => {
  const data = checkInSchema.parse(req.body)
  const exam = await ExaminationService.checkIn(data, pharmacyOf(req), req.user!.id)
  sendCreated(res, MESSAGE_CODES.EXAMINATION_CHECKED_IN, exam)
}

export const triageController = async (req: TriageRequest, res: Response) => {
  const data = triageSchema.parse(req.body)
  const exam = await ExaminationService.triageExam(parseUuid(req.params.examination_uuid), data, pharmacyOf(req), req.user!.id)
  sendSuccess(res, MESSAGE_CODES.EXAMINATION_TRIAGED, exam)
}

export const startExamController = async (req: StartExamRequest, res: Response) => {
  const data = startExamSchema.parse(req.body ?? {})
  const exam = await ExaminationService.startExam(parseUuid(req.params.examination_uuid), data, pharmacyOf(req), req.user!.id)
  sendSuccess(res, MESSAGE_CODES.EXAMINATION_STARTED, exam)
}

export const saveExamController = async (req: SaveExamRequest, res: Response) => {
  const data = saveExamSchema.parse(req.body)
  const exam = await ExaminationService.saveExam(parseUuid(req.params.examination_uuid), data, pharmacyOf(req), req.user!.id)
  sendSuccess(res, MESSAGE_CODES.EXAMINATION_SAVED, exam)
}

export const allergyCheckController = async (req: ExaminationRequest, res: Response) => {
  const { items } = allergyCheckSchema.parse(req.body)
  const conflicts = await ExaminationService.checkAllergiesForExam(parseUuid(req.params.examination_uuid), items, pharmacyOf(req))
  sendSuccess(res, MESSAGE_CODES.EXAMINATION_ALLERGY_CHECKED, conflicts)
}

export const completeExamController = async (req: CompleteExamRequest, res: Response) => {
  const data = completeExamSchema.parse(req.body)
  // Writing a prescription during the exam needs the prescription permission too.
  if (data.prescription && !can(req, PERMISSIONS.PRESCRIPTIONS_CREATE)) {
    throw new ForbiddenException('You do not have permission for this action')
  }
  const exam = await ExaminationService.completeExam(parseUuid(req.params.examination_uuid), data, pharmacyOf(req), req.user!.id)
  sendSuccess(res, MESSAGE_CODES.EXAMINATION_COMPLETED, exam)
}

export const cancelExamController = async (req: CancelExamRequest, res: Response) => {
  const data = cancelExamSchema.parse(req.body ?? {})
  const exam = await ExaminationService.cancelExam(parseUuid(req.params.examination_uuid), data, pharmacyOf(req), req.user!.id)
  sendSuccess(res, MESSAGE_CODES.EXAMINATION_CANCELLED, exam)
}
