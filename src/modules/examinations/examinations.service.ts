import { Prisma, VisitStatus, CustomerType } from '@prisma/client'
import { DateTime } from 'luxon'
import { prisma } from '@config/db'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { ConflictException } from '@exceptions/ConflictException'
import { generateDocNumber, getTimezone, nextDailySequence, todayRange, withDocNumberRetry } from '@utils/generateDocNumbers'
import { createPrescription } from '@modules/prescriptions/prescriptions.service'
import {
  QueueQueryInput,
  CheckInInput,
  TriageInput,
  StartExamInput,
  SaveExamInput,
  CompleteExamInput,
  CancelExamInput,
} from './examinations.validation'
import { ExaminationResponse, ExaminationQueueResponse, AllergyConflict, QueueDoctor } from './examinations.interface'
import { checkPrescriptionAllergies } from '@utils/allergyCheck'

// ── Select & format ───────────────────────────────────

const examSelect = {
  uuid: true,
  doctorId: true,
  queueNumber: true,
  status: true,
  visitDate: true,
  checkedInAt: true,
  triagedAt: true,
  triagedByUser: { select: { uuid: true, name: true } },
  startedAt: true,
  completedAt: true,
  chiefComplaint: true,
  findings: true,
  diagnosis: true,
  advice: true,
  notes: true,
  weightKg: true,
  heightCm: true,
  bloodPressure: true,
  temperatureCelsius: true,
  pulsePerMinute: true,
  oxygenSaturation: true,
  doctor: { select: { uuid: true, name: true } },
  prescription: {
    select: {
      uuid: true,
      prescriptionNumber: true,
      status: true,
      details: {
        where: { deletedAt: null },
        select: { uuid: true, medicineName: true, qty: true, frequency: true, duration: true, notes: true },
        orderBy: { id: 'asc' as const },
      },
    },
  },
  medicalRecord: {
    select: {
      number: true,
      bloodType: true,
      customer: {
        select: {
          uuid: true,
          name: true,
          phone: true,
          patientDetail: { select: { gender: true, dateOfBirth: true } },
        },
      },
      allergies: {
        where: { deletedAt: null },
        select: { uuid: true, allergenName: true, allergenType: true, severity: true, reaction: true, notes: true, createdAt: true },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  },
} satisfies Prisma.MedicalVisitSelect

type ExamRow = Prisma.MedicalVisitGetPayload<{ select: typeof examSelect }>

const num = (d: Prisma.Decimal | null): number | null => (d == null ? null : Number(d))

const format = (v: ExamRow): ExaminationResponse => ({
  uuid: v.uuid,
  queueNumber: v.queueNumber,
  status: v.status,
  visitDate: v.visitDate,
  checkedInAt: v.checkedInAt,
  triagedAt: v.triagedAt,
  triagedBy: v.triagedByUser,
  startedAt: v.startedAt,
  completedAt: v.completedAt,
  chiefComplaint: v.chiefComplaint,
  findings: v.findings,
  diagnosis: v.diagnosis,
  advice: v.advice,
  notes: v.notes,
  weightKg: num(v.weightKg),
  heightCm: num(v.heightCm),
  bloodPressure: v.bloodPressure,
  temperatureCelsius: num(v.temperatureCelsius),
  pulsePerMinute: v.pulsePerMinute,
  oxygenSaturation: v.oxygenSaturation,
  doctor: v.doctor,
  prescription: v.prescription,
  patient: {
    uuid: v.medicalRecord.customer.uuid,
    name: v.medicalRecord.customer.name,
    phone: v.medicalRecord.customer.phone,
    gender: v.medicalRecord.customer.patientDetail?.gender ?? null,
    dateOfBirth: v.medicalRecord.customer.patientDetail?.dateOfBirth ?? null,
    medicalRecordNumber: v.medicalRecord.number,
    bloodType: v.medicalRecord.bloodType,
    allergies: v.medicalRecord.allergies,
  },
})

// ── Helpers ───────────────────────────────────────────

const findExam = async (uuid: string, pharmacyId: number) => {
  const visit = await prisma.medicalVisit.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: {
      id: true,
      status: true,
      doctorId: true,
      medicalRecordId: true,
      prescriptionId: true,
      medicalRecord: { select: { customerId: true, customer: { select: { uuid: true } } } },
    },
  })
  if (!visit) throw new NotFoundException('Medical visit not found')
  return visit
}

const loadExam = async (uuid: string): Promise<ExaminationResponse> => {
  const v = await prisma.medicalVisit.findUniqueOrThrow({ where: { uuid }, select: examSelect })
  return format(v)
}

const requireStatus = (actual: VisitStatus, allowed: VisitStatus[], message: string): void => {
  if (!allowed.includes(actual)) throw new BadRequestException(message)
}

/** Patients created before medical records existed may not have one yet. */
const ensureMedicalRecord = async (customerId: number, pharmacyId: number, userId: number): Promise<number> => {
  const existing = await prisma.medicalRecord.findUnique({ where: { customerId }, select: { id: true } })
  if (existing) return existing.id

  const pharmacy = await prisma.pharmacy.findUniqueOrThrow({ where: { id: pharmacyId }, select: { code: true } })
  const created = await withDocNumberRetry('MR', async () =>
    prisma.medicalRecord.create({
      data: {
        customerId,
        pharmacyId,
        number: await generateDocNumber({ type: 'MR', pharmacyId, pharmacyCode: pharmacy.code }),
        createdById: userId,
      },
      select: { id: true },
    })
  )
  return created.id
}

const resolveDoctorId = async (doctorUuid: string, pharmacyId: number): Promise<number> => {
  const doctor = await prisma.doctor.findFirst({
    where: { uuid: doctorUuid, pharmacyId, deletedAt: null, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!doctor) throw new NotFoundException('Doctor not found')
  return doctor.id
}

/** The doctor profile linked to the signed-in user at this pharmacy, if any. */
const doctorOfUser = async (userId: number, pharmacyId: number): Promise<number | null> => {
  const doctor = await prisma.doctor.findFirst({
    where: { userId, pharmacyId, deletedAt: null, status: 'ACTIVE' },
    select: { id: true },
  })
  return doctor?.id ?? null
}

const vitalFieldData = (data: TriageInput) => ({
  ...(data.chiefComplaint !== undefined && { chiefComplaint: data.chiefComplaint || null }),
  ...(data.bloodPressure !== undefined && { bloodPressure: data.bloodPressure || null }),
  ...(data.weightKg !== undefined && { weightKg: data.weightKg }),
  ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
  ...(data.temperatureCelsius !== undefined && { temperatureCelsius: data.temperatureCelsius }),
  ...(data.pulsePerMinute !== undefined && { pulsePerMinute: data.pulsePerMinute }),
  ...(data.oxygenSaturation !== undefined && { oxygenSaturation: data.oxygenSaturation }),
})

const examFieldData = (data: SaveExamInput) => ({
  ...vitalFieldData(data),
  ...(data.findings !== undefined && { findings: data.findings || null }),
  ...(data.diagnosis !== undefined && { diagnosis: data.diagnosis || null }),
  ...(data.advice !== undefined && { advice: data.advice || null }),
  ...(data.notes !== undefined && { notes: data.notes || null }),
})

// ── Services ──────────────────────────────────────────

/**
 * The doctors a queue is split by: everyone with a user account at this
 * pharmacy (in-house doctors) plus any doctor patients were assigned to.
 * Visiting doctors who only write prescriptions are left out.
 */
const queueDoctors = async (pharmacyId: number, assignedIds: number[], userId: number): Promise<QueueDoctor[]> => {
  const doctors = await prisma.doctor.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      OR: [{ status: 'ACTIVE', userId: { not: null } }, { id: { in: assignedIds } }],
    },
    select: { uuid: true, name: true, userId: true },
    orderBy: { name: 'asc' },
  })
  return doctors.map((d) => ({ uuid: d.uuid, name: d.name, isMe: d.userId === userId }))
}

export const getQueue = async (pharmacyId: number, query: QueueQueryInput, userId: number): Promise<ExaminationQueueResponse> => {
  let range: { startOfDay: Date; endOfDay: Date; dateKey: string }
  let isToday = !query.date
  if (query.date) {
    const dt = DateTime.fromISO(query.date, { zone: await getTimezone() })
    if (!dt.isValid) throw new BadRequestException('Invalid date')
    range = {
      startOfDay: dt.startOf('day').toUTC().toJSDate(),
      endOfDay: dt.endOf('day').toUTC().toJSDate(),
      dateKey: dt.toFormat('yyyyMMdd'),
    }
    isToday = range.dateKey === (await todayRange()).dateKey
  } else {
    range = await todayRange()
  }

  // Today's queue also carries over patients still waiting / being examined
  // from earlier days, otherwise they'd be invisible yet still block check-in.
  const dayWhere: Prisma.MedicalVisitWhereInput = {
    pharmacyId,
    deletedAt: null,
    OR: [
      { checkedInAt: { gte: range.startOfDay, lte: range.endOfDay } },
      ...(isToday ? [{ checkedInAt: { lt: range.startOfDay }, status: { in: [VisitStatus.WAITING, VisitStatus.IN_PROGRESS] } }] : []),
    ],
  }

  const [rows, grouped, triaged] = await Promise.all([
    prisma.medicalVisit.findMany({
      where: { ...dayWhere, ...(query.status && { status: query.status }) },
      select: examSelect,
      orderBy: [{ checkedInAt: 'asc' }, { queueNumber: 'asc' }],
    }),
    prisma.medicalVisit.groupBy({ by: ['status'], where: dayWhere, _count: { _all: true } }),
    prisma.medicalVisit.count({ where: { ...dayWhere, status: VisitStatus.WAITING, triagedAt: { not: null } } }),
  ])

  const counts = { WAITING: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 } as Record<VisitStatus, number>
  for (const g of grouped) counts[g.status] = g._count._all

  const assignedIds = [...new Set(rows.map((r) => r.doctorId).filter((id): id is number => id !== null))]
  const doctors = await queueDoctors(pharmacyId, assignedIds, userId)

  return {
    date: `${range.dateKey.slice(0, 4)}-${range.dateKey.slice(4, 6)}-${range.dateKey.slice(6, 8)}`,
    counts,
    triaged,
    doctors,
    items: rows.map(format),
  }
}

export const getExamination = async (uuid: string, pharmacyId: number): Promise<ExaminationResponse> => {
  await findExam(uuid, pharmacyId)
  return loadExam(uuid)
}

export const checkIn = async (data: CheckInInput, pharmacyId: number, userId: number): Promise<ExaminationResponse> => {
  const customer = await prisma.customer.findFirst({
    where: { uuid: data.customerUuid, pharmacyId, deletedAt: null, status: 'ACTIVE' },
    select: { id: true, customerType: true, isWalkIn: true },
  })
  if (!customer) throw new NotFoundException('Customer not found')
  if (customer.customerType !== CustomerType.PATIENT || customer.isWalkIn) {
    throw new BadRequestException('Medical records are only available for patients')
  }

  const doctorId = data.doctorUuid ? await resolveDoctorId(data.doctorUuid, pharmacyId) : undefined
  const medicalRecordId = await ensureMedicalRecord(customer.id, pharmacyId, userId)

  const active = await prisma.medicalVisit.findFirst({
    where: { medicalRecordId, deletedAt: null, status: { in: [VisitStatus.WAITING, VisitStatus.IN_PROGRESS] } },
    select: { queueNumber: true },
  })
  if (active) throw new ConflictException('This patient is already in the examination queue')

  const { dateKey } = await todayRange()
  const queueNumber = await nextDailySequence(pharmacyId, 'QUEUE', dateKey)
  const now = new Date()

  const visit = await prisma.medicalVisit.create({
    data: {
      medicalRecordId,
      pharmacyId,
      status: VisitStatus.WAITING,
      queueNumber,
      visitDate: now,
      checkedInAt: now,
      chiefComplaint: data.chiefComplaint || null,
      doctorId,
      createdById: userId,
    },
    select: { uuid: true },
  })
  return loadExam(visit.uuid)
}

/**
 * Vitals, complaint (and, from the client, allergies) recorded by a nurse or the
 * front desk before the doctor. Optional: the doctor can call in a patient who
 * skipped it. Can be corrected while the patient is waiting or being examined.
 */
export const triageExam = async (
  uuid: string,
  data: TriageInput,
  pharmacyId: number,
  userId: number
): Promise<ExaminationResponse> => {
  const visit = await findExam(uuid, pharmacyId)
  requireStatus(visit.status, [VisitStatus.WAITING, VisitStatus.IN_PROGRESS], 'Vital signs can only be recorded before the examination is finished')
  await prisma.medicalVisit.update({
    where: { id: visit.id },
    data: { ...vitalFieldData(data), triagedAt: new Date(), triagedById: userId, updatedById: userId },
  })
  return loadExam(uuid)
}

export const startExam = async (
  uuid: string,
  data: StartExamInput,
  pharmacyId: number,
  userId: number
): Promise<ExaminationResponse> => {
  const visit = await findExam(uuid, pharmacyId)
  requireStatus(visit.status, [VisitStatus.WAITING], 'Only waiting patients can be called in')

  // Explicit choice > the signed-in doctor > the doctor picked at check-in.
  const doctorId =
    (data.doctorUuid ? await resolveDoctorId(data.doctorUuid, pharmacyId) : null) ??
    (await doctorOfUser(userId, pharmacyId)) ??
    visit.doctorId
  if (!doctorId) throw new BadRequestException('Choose the examining doctor')

  // Conditional update: two doctors clicking "call in" at once can't both win.
  const res = await prisma.medicalVisit.updateMany({
    where: { id: visit.id, status: VisitStatus.WAITING },
    data: { status: VisitStatus.IN_PROGRESS, startedAt: new Date(), doctorId, updatedById: userId },
  })
  if (res.count === 0) throw new ConflictException('This patient has just been called in by someone else')
  return loadExam(uuid)
}

export const saveExam = async (
  uuid: string,
  data: SaveExamInput,
  pharmacyId: number,
  userId: number
): Promise<ExaminationResponse> => {
  const visit = await findExam(uuid, pharmacyId)
  requireStatus(visit.status, [VisitStatus.IN_PROGRESS], 'The examination is not in progress')
  await prisma.medicalVisit.update({ where: { id: visit.id }, data: { ...examFieldData(data), updatedById: userId } })
  return loadExam(uuid)
}

export const checkAllergiesForExam = async (
  uuid: string,
  items: { medicineUuid?: string; medicineName: string }[],
  pharmacyId: number
): Promise<AllergyConflict[]> => {
  const visit = await findExam(uuid, pharmacyId)
  return checkPrescriptionAllergies(visit.medicalRecord.customerId, pharmacyId, items)
}

export const completeExam = async (
  uuid: string,
  data: CompleteExamInput,
  pharmacyId: number,
  userId: number
): Promise<ExaminationResponse> => {
  const visit = await findExam(uuid, pharmacyId)
  requireStatus(visit.status, [VisitStatus.IN_PROGRESS], 'The examination is not in progress')

  if (data.prescription) {
    if (visit.prescriptionId) throw new ConflictException('This visit already has a prescription')

    const conflicts = await checkPrescriptionAllergies(visit.medicalRecord.customerId, pharmacyId, data.prescription.items)
    if (conflicts.length > 0 && !data.acknowledgeAllergies) {
      const list = conflicts.map((c) => `${c.medicineName} (${c.allergenName})`).join(', ')
      throw new ConflictException(`Allergy warning: ${list}`)
    }

    const pharmacy = await prisma.pharmacy.findUniqueOrThrow({ where: { id: pharmacyId }, select: { code: true } })
    const doctor = visit.doctorId
      ? await prisma.doctor.findUnique({ where: { id: visit.doctorId }, select: { uuid: true } })
      : null

    // Written first and linked to the visit; the visit is closed right after.
    await createPrescription(
      {
        customerUuid: visit.medicalRecord.customer.uuid,
        doctorUuid: doctor?.uuid,
        medicalVisitUuid: uuid,
        prescriptionNumber: await generateDocNumber({ type: 'RX', pharmacyId, pharmacyCode: pharmacy.code }),
        prescribedAt: new Date(),
        notes: data.prescription.notes,
        items: data.prescription.items,
      },
      pharmacyId,
      userId
    )
  }

  const res = await prisma.medicalVisit.updateMany({
    where: { id: visit.id, status: VisitStatus.IN_PROGRESS },
    data: { ...examFieldData(data), status: VisitStatus.COMPLETED, completedAt: new Date(), updatedById: userId },
  })
  if (res.count === 0) throw new ConflictException('The examination was changed by someone else, please refresh')
  return loadExam(uuid)
}

export const cancelExam = async (
  uuid: string,
  data: CancelExamInput,
  pharmacyId: number,
  userId: number
): Promise<ExaminationResponse> => {
  const visit = await findExam(uuid, pharmacyId)
  requireStatus(visit.status, [VisitStatus.WAITING, VisitStatus.IN_PROGRESS], 'Only waiting or ongoing examinations can be cancelled')
  await prisma.medicalVisit.update({
    where: { id: visit.id },
    data: {
      status: VisitStatus.CANCELLED,
      ...(data.reason && { notes: data.reason }),
      updatedById: userId,
    },
  })
  return loadExam(uuid)
}
