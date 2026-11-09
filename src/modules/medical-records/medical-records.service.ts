import { prisma } from '@config/db'
import { CustomerType } from '@prisma/client'
import { UpdateMedicalRecordInput, CreateAllergyInput, UpdateAllergyInput, CreateVisitInput, UpdateVisitInput, VisitQueryInput } from './medical-records.validation'
import { MedicalRecordResponse, AllergyResponse, MedicalVisitResponse } from './medical-records.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { ConflictException } from '@exceptions/ConflictException'
import { PaginationMeta } from '@interfaces/common.interface'

// ── Selects ───────────────────────────────────────────

const recordSelect = {
  uuid: true,
  number: true,
  bloodType: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: { uuid: true, name: true, phone: true },
  },
  allergies: {
    select: {
      uuid: true,
      allergenName: true,
      allergenType: true,
      reaction: true,
      severity: true,
      notes: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
}

const allergySelect = {
  uuid: true,
  allergenName: true,
  allergenType: true,
  reaction: true,
  severity: true,
  notes: true,
  createdAt: true,
}

const visitSelect = {
  uuid: true,
  visitDate: true,
  chiefComplaint: true,
  diagnosis: true,
  notes: true,
  weightKg: true,
  heightCm: true,
  bloodPressure: true,
  temperatureCelsius: true,
  pulsePerMinute: true,
  createdAt: true,
  updatedAt: true,
  prescription: {
    select: { uuid: true, prescriptionNumber: true, status: true },
  },
  doctor: {
    select: { uuid: true, name: true },
  },
}

// ── Helpers ───────────────────────────────────────────

const resolveRecord = async (customerUuid: string, pharmacyId: number) => {
  const customer = await prisma.customer.findFirst({
    where: { uuid: customerUuid, pharmacyId, deletedAt: null },
    select: { id: true, customerType: true },
  })
  if (!customer) throw new NotFoundException('Customer not found')
  if (customer.customerType !== CustomerType.PATIENT) throw new BadRequestException('Medical records are only available for patients')

  const record = await prisma.medicalRecord.findUnique({ where: { customerId: customer.id } })
  if (!record) throw new NotFoundException('Medical record not found')
  return record
}

/**
 * A visit may only link a prescription written for the same patient, and a
 * prescription can back at most one visit. `undefined` = leave as is,
 * `null` = unlink.
 */
const resolveVisitPrescriptionId = async (
  prescriptionUuid: string | null | undefined,
  record: { id: number; customerId: number },
  pharmacyId: number,
  currentVisitId?: number
): Promise<number | null | undefined> => {
  if (prescriptionUuid === undefined) return undefined
  if (prescriptionUuid === null) return null

  const prescription = await prisma.prescription.findFirst({
    where: { uuid: prescriptionUuid, pharmacyId, deletedAt: null },
    select: { id: true, customerId: true, medicalVisit: { select: { id: true } } },
  })
  if (!prescription) throw new NotFoundException('Prescription not found')
  if (prescription.customerId !== record.customerId) {
    throw new BadRequestException('The prescription belongs to a different patient')
  }
  if (prescription.medicalVisit && prescription.medicalVisit.id !== currentVisitId) {
    throw new ConflictException('The prescription is already linked to another visit')
  }
  return prescription.id
}

const resolveVisitDoctorId = async (doctorUuid: string | undefined, pharmacyId: number): Promise<number | undefined> => {
  if (!doctorUuid) return undefined
  const doctor = await prisma.doctor.findFirst({
    where: { uuid: doctorUuid, pharmacyId, deletedAt: null },
    select: { id: true },
  })
  if (!doctor) throw new NotFoundException('Doctor not found')
  return doctor.id
}

// ── Services ──────────────────────────────────────────

export const getMedicalRecord = async (
  customerUuid: string,
  pharmacyId: number
): Promise<MedicalRecordResponse> => {
  const customer = await prisma.customer.findFirst({
    where: { uuid: customerUuid, pharmacyId, deletedAt: null },
    select: { id: true, customerType: true },
  })
  if (!customer) throw new NotFoundException('Customer not found')
  if (customer.customerType !== CustomerType.PATIENT) throw new BadRequestException('Medical records are only available for patients')

  const record = await prisma.medicalRecord.findUnique({
    where: { customerId: customer.id },
    select: recordSelect,
  })
  if (!record) throw new NotFoundException('Medical record not found')
  return record as unknown as MedicalRecordResponse
}

export const updateMedicalRecord = async (
  customerUuid: string,
  data: UpdateMedicalRecordInput,
  pharmacyId: number,
  userId: number
): Promise<MedicalRecordResponse> => {
  const existing = await resolveRecord(customerUuid, pharmacyId)

  const record = await prisma.medicalRecord.update({
    where: { id: existing.id },
    data: { ...data, updatedById: userId },
    select: recordSelect,
  })
  return record as unknown as MedicalRecordResponse
}

// ── Allergies ─────────────────────────────────────────

export const addAllergy = async (
  customerUuid: string,
  data: CreateAllergyInput,
  pharmacyId: number,
  userId: number
): Promise<AllergyResponse> => {
  const existing = await resolveRecord(customerUuid, pharmacyId)

  const allergy = await prisma.medicalRecordAllergy.create({
    data: {
      medicalRecordId: existing.id,
      allergenName: data.allergenName,
      allergenType: data.allergenType,
      reaction: data.reaction,
      severity: data.severity,
      notes: data.notes,
      createdById: userId,
    },
    select: allergySelect,
  })
  return allergy as unknown as AllergyResponse
}

export const updateAllergy = async (
  customerUuid: string,
  allergyUuid: string,
  data: UpdateAllergyInput,
  pharmacyId: number,
  userId: number
): Promise<AllergyResponse> => {
  const existing = await resolveRecord(customerUuid, pharmacyId)

  const allergy = await prisma.medicalRecordAllergy.findFirst({
    where: { uuid: allergyUuid, medicalRecordId: existing.id },
    select: { id: true },
  })
  if (!allergy) throw new NotFoundException('Allergy record not found')

  const updated = await prisma.medicalRecordAllergy.update({
    where: { id: allergy.id },
    data: {
      ...(data.allergenName !== undefined && { allergenName: data.allergenName }),
      ...(data.allergenType !== undefined && { allergenType: data.allergenType }),
      ...(data.severity !== undefined && { severity: data.severity }),
      // empty string clears the optional text fields
      ...(data.reaction !== undefined && { reaction: data.reaction || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      updatedById: userId,
    },
    select: allergySelect,
  })
  return updated as unknown as AllergyResponse
}

export const removeAllergy = async (
  customerUuid: string,
  allergyUuid: string,
  pharmacyId: number
): Promise<void> => {
  const existing = await resolveRecord(customerUuid, pharmacyId)

  const allergy = await prisma.medicalRecordAllergy.findFirst({
    where: { uuid: allergyUuid, medicalRecordId: existing.id },
    select: { id: true },
  })
  if (!allergy) throw new NotFoundException('Allergy record not found')

  await prisma.medicalRecordAllergy.delete({ where: { id: allergy.id } })
}

// ── Visits ────────────────────────────────────────────

export const getVisits = async (
  customerUuid: string,
  pharmacyId: number,
  query: VisitQueryInput
): Promise<{ data: MedicalVisitResponse[]; meta: PaginationMeta }> => {
  const existing = await resolveRecord(customerUuid, pharmacyId)
  const { page, limit } = query
  const skip = (page - 1) * limit

  const where = { medicalRecordId: existing.id, deletedAt: null }

  const [visits, total] = await prisma.$transaction([
    prisma.medicalVisit.findMany({ where, select: visitSelect, orderBy: { visitDate: 'desc' }, skip, take: limit }),
    prisma.medicalVisit.count({ where }),
  ])

  return {
    data: visits as unknown as MedicalVisitResponse[],
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getVisitByUuid = async (
  customerUuid: string,
  visitUuid: string,
  pharmacyId: number
): Promise<MedicalVisitResponse> => {
  const existing = await resolveRecord(customerUuid, pharmacyId)

  const visit = await prisma.medicalVisit.findFirst({
    where: { uuid: visitUuid, medicalRecordId: existing.id, deletedAt: null },
    select: visitSelect,
  })
  if (!visit) throw new NotFoundException('Medical visit not found')
  return visit as unknown as MedicalVisitResponse
}

export const createVisit = async (
  customerUuid: string,
  data: CreateVisitInput,
  pharmacyId: number,
  userId: number
): Promise<MedicalVisitResponse> => {
  const existing = await resolveRecord(customerUuid, pharmacyId)

  const prescriptionId = await resolveVisitPrescriptionId(data.prescriptionUuid, existing, pharmacyId)
  const doctorId = await resolveVisitDoctorId(data.doctorUuid, pharmacyId)

  const { prescriptionUuid, doctorUuid, ...visitData } = data

  const visit = await prisma.medicalVisit.create({
    data: {
      medicalRecordId: existing.id,
      pharmacyId,
      visitDate: new Date(visitData.visitDate),
      chiefComplaint: visitData.chiefComplaint,
      diagnosis: visitData.diagnosis,
      notes: visitData.notes,
      weightKg: visitData.weightKg,
      heightCm: visitData.heightCm,
      bloodPressure: visitData.bloodPressure,
      temperatureCelsius: visitData.temperatureCelsius,
      pulsePerMinute: visitData.pulsePerMinute,
      prescriptionId,
      doctorId,
      createdById: userId,
    },
    select: visitSelect,
  })
  return visit as unknown as MedicalVisitResponse
}

export const updateVisit = async (
  customerUuid: string,
  visitUuid: string,
  data: UpdateVisitInput,
  pharmacyId: number,
  userId: number
): Promise<MedicalVisitResponse> => {
  const existing = await resolveRecord(customerUuid, pharmacyId)

  const existingVisit = await prisma.medicalVisit.findFirst({
    where: { uuid: visitUuid, medicalRecordId: existing.id, deletedAt: null },
    select: { id: true },
  })
  if (!existingVisit) throw new NotFoundException('Medical visit not found')

  const prescriptionId = await resolveVisitPrescriptionId(data.prescriptionUuid, existing, pharmacyId, existingVisit.id)
  const doctorId = await resolveVisitDoctorId(data.doctorUuid, pharmacyId)

  const { prescriptionUuid, doctorUuid, visitDate, ...rest } = data

  const visit = await prisma.medicalVisit.update({
    where: { id: existingVisit.id },
    data: {
      ...rest,
      ...(visitDate && { visitDate: new Date(visitDate) }),
      ...(prescriptionId !== undefined && { prescriptionId }),
      ...(doctorId !== undefined && { doctorId }),
      updatedById: userId,
    },
    select: visitSelect,
  })
  return visit as unknown as MedicalVisitResponse
}

export const deleteVisit = async (
  customerUuid: string,
  visitUuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await resolveRecord(customerUuid, pharmacyId)

  const existingVisit = await prisma.medicalVisit.findFirst({
    where: { uuid: visitUuid, medicalRecordId: existing.id, deletedAt: null },
    select: { id: true },
  })
  if (!existingVisit) throw new NotFoundException('Medical visit not found')

  await prisma.medicalVisit.update({
    where: { id: existingVisit.id },
    data: { deletedAt: new Date(), deletedById: userId },
  })
}
