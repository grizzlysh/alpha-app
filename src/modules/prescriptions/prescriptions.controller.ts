import { Request, Response, NextFunction } from 'express'
import { parseUuid } from '@utils/parseUuid'
import * as PrescriptionService from './prescriptions.service'
import {
  ListPrescriptionsRequest, GetPrescriptionRequest, CreatePrescriptionRequest,
  UpdatePrescriptionRequest, DeletePrescriptionRequest,
  DispensePrescriptionRequest, CancelPrescriptionRequest,
} from './prescriptions.interface'
import { sendSuccess, sendCreated, sendPaginated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getPrescriptions = async (req: ListPrescriptionsRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await PrescriptionService.getPrescriptions(req.user!.pharmacyId!, req.query as any)
    sendPaginated(res, MESSAGE_CODES.PRESCRIPTIONS_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getPrescriptionQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await PrescriptionService.getPrescriptionQueue(req.user!.pharmacyId!)
    sendSuccess(res, MESSAGE_CODES.PRESCRIPTIONS_FETCHED, data)
  } catch (err) { next(err) }
}

export const getPrescription = async (req: GetPrescriptionRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rx = await PrescriptionService.getPrescriptionByUuid(parseUuid(req.params.prescription_uuid), req.user!.pharmacyId!)
    sendSuccess(res, MESSAGE_CODES.PRESCRIPTION_FETCHED, rx)
  } catch (err) { next(err) }
}

export const createPrescription = async (req: CreatePrescriptionRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rx = await PrescriptionService.createPrescription(req.body, req.user!.pharmacyId!, req.user!.id)
    sendCreated(res, MESSAGE_CODES.PRESCRIPTION_CREATED, rx)
  } catch (err) { next(err) }
}

export const updatePrescription = async (req: UpdatePrescriptionRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rx = await PrescriptionService.updatePrescription(parseUuid(req.params.prescription_uuid), req.body, req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.PRESCRIPTION_UPDATED, rx)
  } catch (err) { next(err) }
}

export const deletePrescription = async (req: DeletePrescriptionRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await PrescriptionService.deletePrescription(parseUuid(req.params.prescription_uuid), req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.PRESCRIPTION_DELETED, null)
  } catch (err) { next(err) }
}

export const dispensePrescription = async (req: DispensePrescriptionRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rx = await PrescriptionService.dispensePrescription(parseUuid(req.params.prescription_uuid), req.body, req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.PRESCRIPTION_DISPENSED, rx)
  } catch (err) { next(err) }
}

export const cancelPrescription = async (req: CancelPrescriptionRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rx = await PrescriptionService.cancelPrescription(parseUuid(req.params.prescription_uuid), req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.PRESCRIPTION_CANCELLED, rx)
  } catch (err) { next(err) }
}
