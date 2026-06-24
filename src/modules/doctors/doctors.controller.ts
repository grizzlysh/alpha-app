import { Request, Response, NextFunction } from 'express'
import { parseUuid } from '@utils/parseUuid'
import * as DoctorService from './doctors.service'
import {
  ListDoctorsRequest, GetDoctorRequest, CreateDoctorRequest,
  UpdateDoctorRequest, DeleteDoctorRequest,
} from './doctors.interface'
import { sendSuccess, sendCreated, sendPaginated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getDoctors = async (req: ListDoctorsRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await DoctorService.getDoctors(req.user!.pharmacyId!, req.query as any)
    sendPaginated(res, MESSAGE_CODES.DOCTORS_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getDoctor = async (req: GetDoctorRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctor = await DoctorService.getDoctorByUuid(parseUuid(req.params.doctor_uuid), req.user!.pharmacyId!)
    sendSuccess(res, MESSAGE_CODES.DOCTOR_FETCHED, doctor)
  } catch (err) { next(err) }
}

export const createDoctor = async (req: CreateDoctorRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctor = await DoctorService.createDoctor(req.body, req.user!.pharmacyId!, req.user!.id)
    sendCreated(res, MESSAGE_CODES.DOCTOR_CREATED, doctor)
  } catch (err) { next(err) }
}

export const updateDoctor = async (req: UpdateDoctorRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctor = await DoctorService.updateDoctor(parseUuid(req.params.doctor_uuid), req.body, req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.DOCTOR_UPDATED, doctor)
  } catch (err) { next(err) }
}

export const deleteDoctor = async (req: DeleteDoctorRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await DoctorService.deleteDoctor(parseUuid(req.params.doctor_uuid), req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.DOCTOR_DELETED, null)
  } catch (err) { next(err) }
}

export const getDoctorsDropdown = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await DoctorService.getDoctorsDropdown(req.user!.pharmacyId!, req.query.search as string | undefined)
    sendSuccess(res, MESSAGE_CODES.DOCTORS_FETCHED, data)
  } catch (err) { next(err) }
}
