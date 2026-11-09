import { PrescriptionStatus, PrescriptionDetailStatus, SaleType, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import {
  CreatePrescriptionInput, UpdatePrescriptionInput,
  PrescriptionQueryInput, DispensePrescriptionInput,
  AvailablePrescriptionsQueryInput,
} from './prescriptions.validation'
import { PrescriptionResponse, PrescriptionListItem, AvailablePrescriptionItem } from './prescriptions.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { ConflictException } from '@exceptions/ConflictException'
import { PaginationMeta } from '@interfaces/common.interface'
import { createSale, SaleActor } from '@modules/sales/sales.service'
import { CreateSaleInput } from '@modules/sales/sales.validation'

// ── Selects ───────────────────────────────────────────────

const listSelect = {
  uuid: true,
  prescriptionNumber: true,
  prescribedAt: true,
  status: true,
  createdAt: true,
  customer: { select: { uuid: true, name: true } },
  doctor: { select: { uuid: true, name: true, licenseNumber: true } },
}

const detailSelect = {
  uuid: true,
  medicineName: true,
  frequency: true,
  duration: true,
  qty: true,
  dispensedQty: true,
  notes: true,
  status: true,
  medicine: { select: { uuid: true, name: true, unit: true } },
}

const fullSelect = {
  uuid: true,
  prescriptionNumber: true,
  prescribedAt: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { uuid: true, name: true } },
  doctor: { select: { uuid: true, name: true, licenseNumber: true, clinicName: true } },
  sale: { select: { uuid: true, saleNumber: true } },
  medicalVisit: { select: { uuid: true, visitDate: true, diagnosis: true } },
  details: { where: { deletedAt: null }, select: detailSelect, orderBy: { id: 'asc' as const } },
}

// ── Helpers ───────────────────────────────────────────────

const findPrescription = async (uuid: string, pharmacyId: number) => {
  const rx = await prisma.prescription.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: { id: true, status: true },
  })
  if (!rx) throw new NotFoundException('Prescription not found')
  return rx
}

const resolveCustomerId = async (customerUuid: string, pharmacyId: number, tx: Prisma.TransactionClient) => {
  const customer = await tx.customer.findFirst({
    where: { uuid: customerUuid, pharmacyId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!customer) throw new NotFoundException('Customer not found')
  return customer.id
}

/**
 * Resolve each line to a medicine in this pharmacy: by uuid when given,
 * otherwise by exact (case-insensitive) name, since the form lets staff type or
 * pick the name. Unmatched lines stay free text (medicineId = null).
 */
const resolveItemMedicineIds = async (
  tx: Prisma.TransactionClient,
  items: { medicineUuid?: string; medicineName: string }[],
  pharmacyId: number
): Promise<(number | null)[]> => {
  return Promise.all(
    items.map(async (i) => {
      const med = await tx.medicine.findFirst({
        where: {
          pharmacyId,
          deletedAt: null,
          ...(i.medicineUuid ? { uuid: i.medicineUuid } : { name: { equals: i.medicineName.trim(), mode: 'insensitive' as const } }),
        },
        select: { id: true },
      })
      return med?.id ?? null
    })
  )
}

const resolveDoctorId = async (doctorUuid: string, pharmacyId: number) => {
  const doctor = await prisma.doctor.findFirst({
    where: { uuid: doctorUuid, pharmacyId, deletedAt: null, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!doctor) throw new NotFoundException('Doctor not found')
  return doctor.id
}

// ── Services ──────────────────────────────────────────────

export const getPrescriptions = async (
  pharmacyId: number,
  query: PrescriptionQueryInput
): Promise<{ data: PrescriptionListItem[]; meta: PaginationMeta }> => {
  const { search, status, doctorUuid, customerUuid, dateFrom, dateTo, sortBy, sortOrder, page, limit } = query
  const skip = (page - 1) * limit

  let doctorId: number | undefined
  if (doctorUuid) {
    const d = await prisma.doctor.findFirst({ where: { uuid: doctorUuid, pharmacyId }, select: { id: true } })
    doctorId = d?.id
  }

  let customerId: number | undefined
  if (customerUuid) {
    const c = await prisma.customer.findFirst({ where: { uuid: customerUuid, pharmacyId }, select: { id: true } })
    customerId = c?.id
  }

  const where = {
    pharmacyId,
    deletedAt: null,
    ...(status && { status }),
    ...(doctorId && { doctorId }),
    ...(customerId && { customerId }),
    ...(dateFrom && { prescribedAt: { gte: new Date(dateFrom) } }),
    ...(dateTo && { prescribedAt: { lte: new Date(dateTo) } }),
    ...(search && {
      OR: [
        { prescriptionNumber: { contains: search, mode: 'insensitive' as const } },
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
        { doctor: { name: { contains: search, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.prescription.findMany({ where, select: listSelect, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
    prisma.prescription.count({ where }),
  ])

  return {
    data: data as unknown as PrescriptionListItem[],
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export const getPrescriptionQueue = async (
  pharmacyId: number
): Promise<PrescriptionListItem[]> => {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const data = await prisma.prescription.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      status: { in: ['PENDING', 'PARTIAL'] },
      createdAt: { gte: startOfDay },
    },
    select: listSelect,
    orderBy: { createdAt: 'asc' },
  })

  return data as unknown as PrescriptionListItem[]
}

export const getAvailablePrescriptions = async (
  pharmacyId: number,
  query: AvailablePrescriptionsQueryInput
): Promise<AvailablePrescriptionItem[]> => {
  let customerId: number | undefined
  if (query.customerUuid) {
    const customer = await prisma.customer.findFirst({
      where: { uuid: query.customerUuid, pharmacyId },
      select: { id: true },
    })
    customerId = customer?.id
  }

  const data = await prisma.prescription.findMany({
    where: {
      pharmacyId,
      deletedAt: null,
      status: { in: [PrescriptionStatus.PENDING, PrescriptionStatus.PARTIAL] },
      ...(customerId && { customerId }),
    },
    select: {
      uuid: true,
      prescriptionNumber: true,
      prescribedAt: true,
      status: true,
      customer: { select: { uuid: true, name: true } },
      doctor: { select: { uuid: true, name: true } },
    },
    orderBy: { prescribedAt: 'desc' },
  })

  return data as AvailablePrescriptionItem[]
}

export const getPrescriptionByUuid = async (
  uuid: string,
  pharmacyId: number
): Promise<PrescriptionResponse> => {
  const rx = await prisma.prescription.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: fullSelect,
  })
  if (!rx) throw new NotFoundException('Prescription not found')
  return rx as unknown as PrescriptionResponse
}

export const createPrescription = async (
  data: CreatePrescriptionInput,
  pharmacyId: number,
  userId: number
): Promise<PrescriptionResponse> => {
  let doctorId: number | undefined
  if (data.doctorUuid) {
    doctorId = await resolveDoctorId(data.doctorUuid, pharmacyId)
  }

  const rx = await prisma.$transaction(async (tx) => {
    const customerId = await resolveCustomerId(data.customerUuid, pharmacyId, tx)

    let visit: { id: number; doctorId: number | null } | null = null
    if (data.medicalVisitUuid) {
      const found = await tx.medicalVisit.findFirst({
        where: { uuid: data.medicalVisitUuid, pharmacyId, deletedAt: null },
        select: { id: true, doctorId: true, prescriptionId: true, medicalRecord: { select: { customerId: true } } },
      })
      if (!found) throw new NotFoundException('Medical visit not found')
      if (found.medicalRecord.customerId !== customerId) {
        throw new BadRequestException('The visit belongs to a different patient')
      }
      if (found.prescriptionId) throw new ConflictException('This visit already has a prescription')
      visit = found
    }

    const medicineIds = await resolveItemMedicineIds(tx, data.items, pharmacyId)

    const created = await tx.prescription.create({
      data: {
        pharmacyId,
        customerId,
        // A prescription written during a visit defaults to that visit's doctor.
        doctorId: doctorId ?? visit?.doctorId ?? undefined,
        prescriptionNumber: data.prescriptionNumber,
        prescribedAt: data.prescribedAt,
        notes: data.notes,
        createdById: userId,
        details: {
          create: data.items.map((item, idx) => ({
            medicineName: item.medicineName,
            medicineId: medicineIds[idx],
            frequency: item.frequency,
            duration: item.duration,
            qty: item.qty,
            notes: item.notes,
            createdById: userId,
          })),
        },
      },
      select: { id: true },
    })

    if (visit) {
      await tx.medicalVisit.update({ where: { id: visit.id }, data: { prescriptionId: created.id, updatedById: userId } })
    }
    return tx.prescription.findUniqueOrThrow({ where: { id: created.id }, select: fullSelect })
  })

  return rx as unknown as PrescriptionResponse
}

export const updatePrescription = async (
  uuid: string,
  data: UpdatePrescriptionInput,
  pharmacyId: number,
  userId: number
): Promise<PrescriptionResponse> => {
  const existing = await findPrescription(uuid, pharmacyId)
  if (existing.status !== PrescriptionStatus.PENDING) {
    throw new BadRequestException('Only pending prescriptions can be edited')
  }

  let doctorId: number | null | undefined
  if (data.doctorUuid !== undefined) {
    doctorId = data.doctorUuid ? await resolveDoctorId(data.doctorUuid, pharmacyId) : null
  }

  const rx = await prisma.$transaction(async (tx) => {
    if (data.items) {
      // Soft-delete existing details then recreate
      await tx.prescriptionDetail.updateMany({
        where: { prescriptionId: existing.id, deletedAt: null },
        data: { deletedAt: new Date(), deletedById: userId },
      })

      const medicineIds = await resolveItemMedicineIds(tx, data.items, pharmacyId)

      for (const [idx, item] of data.items.entries()) {
        await tx.prescriptionDetail.create({
          data: {
            prescriptionId: existing.id,
            medicineName: item.medicineName,
            medicineId: medicineIds[idx],
            frequency: item.frequency,
            duration: item.duration,
            qty: item.qty,
            notes: item.notes,
            createdById: userId,
          },
        })
      }
    }

    return tx.prescription.update({
      where: { id: existing.id },
      data: {
        ...(doctorId !== undefined && { doctorId }),
        ...(data.prescriptionNumber !== undefined && { prescriptionNumber: data.prescriptionNumber }),
        ...(data.prescribedAt && { prescribedAt: data.prescribedAt }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedById: userId,
      },
      select: fullSelect,
    })
  })

  return rx as unknown as PrescriptionResponse
}

export const deletePrescription = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const existing = await findPrescription(uuid, pharmacyId)
  if (existing.status !== PrescriptionStatus.PENDING) {
    throw new BadRequestException('Only pending prescriptions can be deleted')
  }

  await prisma.$transaction(async (tx) => {
    await tx.prescriptionDetail.updateMany({
      where: { prescriptionId: existing.id, deletedAt: null },
      data: { deletedAt: new Date(), deletedById: userId },
    })
    await tx.prescription.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), deletedById: userId },
    })
  })
}

/**
 * Dispensing goes through the regular sale flow so pricing, discount limits,
 * FEFO, expiry and atomic stock deduction are identical to the POS. The sale
 * then updates the prescription's dispensed quantities.
 */
export const dispensePrescription = async (
  uuid: string,
  data: DispensePrescriptionInput,
  pharmacyId: number,
  actor: SaleActor
): Promise<PrescriptionResponse> => {
  const existing = await prisma.prescription.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: {
      id: true,
      status: true,
      customer: { select: { uuid: true } },
      details: { where: { deletedAt: null }, select: { uuid: true, status: true } },
    },
  })
  if (!existing) throw new NotFoundException('Prescription not found')
  if (existing.status === PrescriptionStatus.DISPENSED) {
    throw new BadRequestException('Prescription has already been fully dispensed')
  }
  if (existing.status === PrescriptionStatus.CANCELLED || existing.status === PrescriptionStatus.EXPIRED) {
    throw new BadRequestException('Prescription cannot be dispensed')
  }

  const detailMap = new Map(existing.details.map((d) => [d.uuid, d]))
  for (const item of data.items) {
    const d = detailMap.get(item.detailUuid)
    if (!d) throw new BadRequestException('Prescription detail not found')
    if (d.status === PrescriptionDetailStatus.DISPENSED) throw new BadRequestException('Item already dispensed')
  }

  await createSale(
    {
      customerUuid: existing.customer.uuid,
      prescriptionUuid: uuid,
      isPrescription: true,
      isPending: false,
      saleType: data.saleType as SaleType,
      discountPercentage: data.discountPercentage ?? 0,
      discountAmount: data.discountAmount ?? 0,
      ppnPercentage: 0,
      ppnAmount: 0,
      paidAmount: 0,
      description: data.description,
      payment: data.payment,
      details: data.items.map((item) => ({
        stockDetailUuid: item.stockDetailUuid,
        quantityPieces: item.dispensedQty,
        sellingPrice: item.sellingPrice,
        discountPercentage: item.discountPercentage ?? 0,
      })),
    } as CreateSaleInput,
    pharmacyId,
    actor
  )

  return getPrescriptionByUuid(uuid, pharmacyId)
}

export const cancelPrescription = async (
  uuid: string,
  pharmacyId: number,
  userId: number
): Promise<PrescriptionResponse> => {
  const existing = await findPrescription(uuid, pharmacyId)

  if (existing.status === PrescriptionStatus.CANCELLED) {
    throw new BadRequestException('Prescription has already been cancelled')
  }
  if (existing.status === PrescriptionStatus.DISPENSED) {
    throw new BadRequestException('Prescription has already been fully dispensed')
  }

  const rx = await prisma.$transaction(async (tx) => {
    await tx.prescriptionDetail.updateMany({
      where: { prescriptionId: existing.id, status: PrescriptionDetailStatus.PENDING, deletedAt: null },
      data: { status: PrescriptionDetailStatus.CANCELLED, updatedById: userId },
    })
    return tx.prescription.update({
      where: { id: existing.id },
      data: { status: PrescriptionStatus.CANCELLED, updatedById: userId },
      select: fullSelect,
    })
  })

  return rx as unknown as PrescriptionResponse
}
