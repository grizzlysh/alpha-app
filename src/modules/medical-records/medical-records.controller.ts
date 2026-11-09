import { Response } from 'express'
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'
import {
  getMedicalRecord,
  updateMedicalRecord,
  addAllergy,
  updateAllergy,
  removeAllergy,
  getVisits,
  getVisitByUuid,
  createVisit,
  updateVisit,
  deleteVisit,
} from './medical-records.service'
import {
  updateMedicalRecordSchema,
  createAllergySchema,
  updateAllergySchema,
  createVisitSchema,
  updateVisitSchema,
  visitQuerySchema,
} from './medical-records.validation'
import {
  GetMedicalRecordRequest,
  UpdateMedicalRecordRequest,
  CreateAllergyRequest,
  UpdateAllergyRequest,
  DeleteAllergyRequest,
  GetVisitsRequest,
  GetVisitRequest,
  CreateVisitRequest,
  UpdateVisitRequest,
  DeleteVisitRequest,
} from './medical-records.interface'

export const getMedicalRecordController = async (req: GetMedicalRecordRequest, res: Response) => {
  const record = await getMedicalRecord(req.params.customer_uuid, req.user!.pharmacyId!)
  sendSuccess(res, MESSAGE_CODES.MEDICAL_RECORD_FETCHED, record)
}

export const updateMedicalRecordController = async (req: UpdateMedicalRecordRequest, res: Response) => {
  const data = updateMedicalRecordSchema.parse(req.body)
  const record = await updateMedicalRecord(req.params.customer_uuid, data, req.user!.pharmacyId!, req.user!.id)
  sendSuccess(res, MESSAGE_CODES.MEDICAL_RECORD_UPDATED, record)
}

export const addAllergyController = async (req: CreateAllergyRequest, res: Response) => {
  const data = createAllergySchema.parse(req.body)
  const allergy = await addAllergy(req.params.customer_uuid, data, req.user!.pharmacyId!, req.user!.id)
  sendCreated(res, MESSAGE_CODES.MEDICAL_ALLERGY_CREATED, allergy)
}

export const updateAllergyController = async (req: UpdateAllergyRequest, res: Response) => {
  const data = updateAllergySchema.parse(req.body)
  const allergy = await updateAllergy(req.params.customer_uuid, req.params.allergy_uuid, data, req.user!.pharmacyId!, req.user!.id)
  sendSuccess(res, MESSAGE_CODES.MEDICAL_ALLERGY_UPDATED, allergy)
}

export const removeAllergyController = async (req: DeleteAllergyRequest, res: Response) => {
  await removeAllergy(req.params.customer_uuid, req.params.allergy_uuid, req.user!.pharmacyId!, req.user!.id)
  sendNoContent(res, MESSAGE_CODES.MEDICAL_ALLERGY_DELETED)
}

export const getVisitsController = async (req: GetVisitsRequest, res: Response) => {
  const query = visitQuerySchema.parse(req.query)
  const result = await getVisits(req.params.customer_uuid, req.user!.pharmacyId!, query)
  sendPaginated(res, MESSAGE_CODES.MEDICAL_VISITS_FETCHED, result.data, result.meta)
}

export const getVisitController = async (req: GetVisitRequest, res: Response) => {
  const visit = await getVisitByUuid(req.params.customer_uuid, req.params.visit_uuid, req.user!.pharmacyId!)
  sendSuccess(res, MESSAGE_CODES.MEDICAL_VISIT_FETCHED, visit)
}

export const createVisitController = async (req: CreateVisitRequest, res: Response) => {
  const data = createVisitSchema.parse(req.body)
  const visit = await createVisit(req.params.customer_uuid, data, req.user!.pharmacyId!, req.user!.id)
  sendCreated(res, MESSAGE_CODES.MEDICAL_VISIT_CREATED, visit)
}

export const updateVisitController = async (req: UpdateVisitRequest, res: Response) => {
  const data = updateVisitSchema.parse(req.body)
  const visit = await updateVisit(req.params.customer_uuid, req.params.visit_uuid, data, req.user!.pharmacyId!, req.user!.id)
  sendSuccess(res, MESSAGE_CODES.MEDICAL_VISIT_UPDATED, visit)
}

export const deleteVisitController = async (req: DeleteVisitRequest, res: Response) => {
  await deleteVisit(req.params.customer_uuid, req.params.visit_uuid, req.user!.pharmacyId!, req.user!.id)
  sendNoContent(res, MESSAGE_CODES.MEDICAL_VISIT_DELETED)
}
