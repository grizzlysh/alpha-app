import { PrescriptionStatus, PrescriptionDetailStatus, SaleStatus, SaleType, PaymentStatus, Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@config/db'
import {
  CreatePrescriptionInput, UpdatePrescriptionInput,
  PrescriptionQueryInput, DispensePrescriptionInput,
} from './prescriptions.validation'
import { PrescriptionResponse, PrescriptionListItem } from './prescriptions.interface'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
import { PaginationMeta } from '@interfaces/common.interface'
import { generateDocNumber, withDocNumberRetry } from '@utils/generateDocNumbers'

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

    const medicineIds = await Promise.all(
      data.items
        .filter((i) => i.medicineUuid)
        .map(async (i) => {
          const med = await tx.medicine.findFirst({
            where: { uuid: i.medicineUuid!, pharmacyId, deletedAt: null },
            select: { id: true },
          })
          return { uuid: i.medicineUuid!, id: med?.id }
        })
    )
    const medicineMap = new Map(medicineIds.map((m) => [m.uuid, m.id]))

    return tx.prescription.create({
      data: {
        pharmacyId,
        customerId,
        doctorId,
        prescriptionNumber: data.prescriptionNumber,
        prescribedAt: data.prescribedAt,
        notes: data.notes,
        createdById: userId,
        details: {
          create: data.items.map((item) => ({
            medicineName: item.medicineName,
            medicineId: item.medicineUuid ? medicineMap.get(item.medicineUuid) ?? null : null,
            frequency: item.frequency,
            duration: item.duration,
            qty: item.qty,
            notes: item.notes,
            createdById: userId,
          })),
        },
      },
      select: fullSelect,
    })
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

      const medicineIds = await Promise.all(
        data.items
          .filter((i) => i.medicineUuid)
          .map(async (i) => {
            const med = await tx.medicine.findFirst({
              where: { uuid: i.medicineUuid!, pharmacyId, deletedAt: null },
              select: { id: true },
            })
            return { uuid: i.medicineUuid!, id: med?.id }
          })
      )
      const medicineMap = new Map(medicineIds.map((m) => [m.uuid, m.id]))

      for (const item of data.items) {
        await tx.prescriptionDetail.create({
          data: {
            prescriptionId: existing.id,
            medicineName: item.medicineName,
            medicineId: item.medicineUuid ? medicineMap.get(item.medicineUuid) ?? null : null,
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

export const dispensePrescription = async (
  uuid: string,
  data: DispensePrescriptionInput,
  pharmacyId: number,
  userId: number
): Promise<PrescriptionResponse> => {
  const existing = await prisma.prescription.findFirst({
    where: { uuid, pharmacyId, deletedAt: null },
    select: {
      id: true,
      status: true,
      customerId: true,
      details: {
        where: { deletedAt: null },
        select: { id: true, uuid: true, qty: true, dispensedQty: true, status: true },
      },
    },
  })
  if (!existing) throw new NotFoundException('Prescription not found')
  if (existing.status === PrescriptionStatus.DISPENSED) {
    throw new BadRequestException('Prescription has already been fully dispensed')
  }
  if (existing.status === PrescriptionStatus.CANCELLED || existing.status === PrescriptionStatus.EXPIRED) {
    throw new BadRequestException('Prescription cannot be dispensed')
  }

  const [allowExpiredParam, allowFefoParam, creditDaysParam] = await Promise.all([
    prisma.systemParameter.findUnique({ where: { key: 'ALLOW_EXPIRED_MEDICINE_SALE' }, select: { value: true } }),
    prisma.businessParameter.findUnique({ where: { pharmacyId_key: { pharmacyId, key: 'ALLOW_FEFO_OVERRIDE' } }, select: { value: true } }),
    prisma.businessParameter.findUnique({ where: { pharmacyId_key: { pharmacyId, key: 'CREDIT_PAYMENT_DAYS' } }, select: { value: true } }),
  ])
  const allowExpiredSale = allowExpiredParam?.value === 'true'
  const allowFefoOverride = allowFefoParam?.value !== 'false'
  const creditPaymentDays = parseInt(creditDaysParam?.value ?? '30', 10)

  const detailMap = new Map(existing.details.map((d) => [d.uuid, d]))

  const rx = await withDocNumberRetry('SL', () => prisma.$transaction(async (tx) => {
    const pharmacy = await tx.pharmacy.findUnique({ where: { id: pharmacyId }, select: { code: true } })
    if (!pharmacy) throw new NotFoundException('Pharmacy not found')

    const saleNumber = await generateDocNumber({ type: 'SL', pharmacyId, pharmacyCode: pharmacy.code })
    const soldAt = new Date()

    // ── Resolve & validate stock for each dispense item ───
    type StockDraft = {
      stockDetailId: number
      medicineId: number
      quantityPieces: number
      quantityBox: number
      sellingPrice: Decimal
      originalPrice: Decimal
      discountPercentage: Decimal
      discountAmount: Decimal
      totalAmount: Decimal
      isFefoOverride: boolean
      createdById: number
      _stockId: number
      _quantityBefore: number
      _stockDetailQuantityBefore: number
      _stockDetailQuantityPerBox: number
    }

    const stockDrafts: StockDraft[] = []

    for (const item of data.items) {
      const rxDetail = detailMap.get(item.detailUuid)
      if (!rxDetail) throw new BadRequestException(`Prescription detail not found: ${item.detailUuid}`)
      if (rxDetail.status === PrescriptionDetailStatus.DISPENSED) {
        throw new BadRequestException(`Item already dispensed: ${item.detailUuid}`)
      }

      const stockDetail = await tx.stockDetail.findFirst({
        where: { uuid: item.stockDetailUuid, stock: { pharmacyId } },
        select: {
          id: true,
          quantityPieces: true,
          quantityPerBox: true,
          expiryDate: true,
          stockId: true,
          stock: { select: { id: true, medicineId: true, totalPieces: true } },
        },
      })
      if (!stockDetail) throw new NotFoundException(`Stock detail not found: ${item.stockDetailUuid}`)

      if (!allowExpiredSale && stockDetail.expiryDate < soldAt) {
        throw new BadRequestException(`Medicine batch is expired: ${item.stockDetailUuid}`)
      }

      const reservedAgg = await tx.stockReservation.aggregate({
        where: { stockDetailId: stockDetail.id },
        _sum: { quantityPieces: true },
      })
      const availablePieces = stockDetail.quantityPieces - (reservedAgg._sum.quantityPieces ?? 0)
      if (availablePieces < item.dispensedQty) {
        throw new BadRequestException(`Insufficient stock for batch: ${item.stockDetailUuid}`)
      }

      const quantityBox = Math.floor(item.dispensedQty / stockDetail.quantityPerBox)

      stockDrafts.push({
        stockDetailId: stockDetail.id,
        medicineId: stockDetail.stock.medicineId,
        quantityPieces: item.dispensedQty,
        quantityBox,
        sellingPrice: new Decimal(item.sellingPrice.toFixed(2)),
        originalPrice: new Decimal(item.originalPrice.toFixed(2)),
        discountPercentage: new Decimal((item.discountPercentage ?? 0).toFixed(2)),
        discountAmount: new Decimal((item.discountAmount ?? 0).toFixed(2)),
        totalAmount: new Decimal((item.sellingPrice * item.dispensedQty).toFixed(2)),
        isFefoOverride: false,
        createdById: userId,
        _stockId: stockDetail.stockId,
        _quantityBefore: stockDetail.stock.totalPieces,
        _stockDetailQuantityBefore: stockDetail.quantityPieces,
        _stockDetailQuantityPerBox: stockDetail.quantityPerBox,
      })
    }

    const paidAmount = data.saleType === SaleType.CASH ? data.grandTotal : 0
    let dueDate: Date | undefined
    if (data.saleType === SaleType.CREDIT) {
      dueDate = new Date(soldAt)
      dueDate.setDate(dueDate.getDate() + creditPaymentDays)
    }

    // ── Create Sale ───────────────────────────────────────
    const sale = await tx.sale.create({
      data: {
        pharmacyId,
        customerId: existing.customerId,
        prescriptionId: existing.id,
        saleNumber,
        saleType: data.saleType as SaleType,
        status: SaleStatus.COMPLETED,
        totalAmount: new Decimal(data.totalAmount.toFixed(2)),
        discountPercentage: new Decimal((data.discountPercentage ?? 0).toFixed(2)),
        discountAmount: new Decimal((data.discountAmount ?? 0).toFixed(2)),
        ppnPercentage: new Decimal((data.ppnPercentage ?? 0).toFixed(2)),
        ppnAmount: new Decimal((data.ppnAmount ?? 0).toFixed(2)),
        grandTotal: new Decimal(data.grandTotal.toFixed(2)),
        paidAmount: new Decimal(paidAmount.toFixed(2)),
        dueDate,
        soldAt,
        description: data.description,
        createdById: userId,
        details: {
          create: stockDrafts.map(({ _stockId, _quantityBefore, _stockDetailQuantityBefore, _stockDetailQuantityPerBox, ...d }) => d),
        },
      },
      select: { id: true, uuid: true, saleNumber: true, details: { select: { id: true } } },
    })

    // ── Deduct Stock + Create Movements ──────────────────
    let offset = 0
    for (let i = 0; i < stockDrafts.length; i++) {
      const draft = stockDrafts[i]
      const saleDetail = sale.details[i]

      await tx.stock.update({
        where: { id: draft._stockId },
        data: { totalPieces: { decrement: draft.quantityPieces }, updatedById: userId },
      })

      const newQty = draft._stockDetailQuantityBefore - draft.quantityPieces
      await tx.stockDetail.update({
        where: { id: draft.stockDetailId },
        data: {
          quantityPieces: newQty,
          quantityBox: Math.floor(newQty / draft._stockDetailQuantityPerBox),
          updatedById: userId,
        },
      })

      await tx.stockMovement.create({
        data: {
          pharmacyId,
          medicineId: draft.medicineId,
          stockId: draft._stockId,
          stockDetailId: draft.stockDetailId,
          saleDetailId: saleDetail.id,
          type: 'OUT',
          reason: 'SALE',
          quantity: draft.quantityPieces,
          quantityBefore: draft._quantityBefore - offset,
          quantityAfter: draft._quantityBefore - offset - draft.quantityPieces,
          createdById: userId,
        },
      })

      offset += draft.quantityPieces
    }

    // ── Create Payment ────────────────────────────────────
    if (data.saleType === SaleType.CASH) {
      await tx.salePayment.create({
        data: {
          saleId: sale.id,
          totalAmount: new Decimal(data.grandTotal.toFixed(2)),
          paidAmount: new Decimal(paidAmount.toFixed(2)),
          paymentStatus: PaymentStatus.PAID,
          createdById: userId,
          history: {
            create: {
              amount: new Decimal(paidAmount.toFixed(2)),
              paymentMethod: data.payment!.paymentMethod as any,
              paymentDate: soldAt,
              description: data.payment?.description,
              createdById: userId,
            },
          },
        },
      })
    } else {
      await tx.salePayment.create({
        data: {
          saleId: sale.id,
          totalAmount: new Decimal(data.grandTotal.toFixed(2)),
          paidAmount: new Decimal(0),
          paymentStatus: PaymentStatus.UNPAID,
          createdById: userId,
        },
      })
    }

    // ── Update Prescription Details ───────────────────────
    const dispensedUuids = new Set(data.items.map((i) => i.detailUuid))
    for (const rxDetail of existing.details) {
      if (!dispensedUuids.has(rxDetail.uuid)) continue

      const item = data.items.find((i) => i.detailUuid === rxDetail.uuid)!
      const newDispensedQty = rxDetail.dispensedQty + item.dispensedQty
      const detailStatus: PrescriptionDetailStatus =
        newDispensedQty >= rxDetail.qty ? PrescriptionDetailStatus.DISPENSED : PrescriptionDetailStatus.PARTIAL

      await tx.prescriptionDetail.update({
        where: { id: rxDetail.id },
        data: { dispensedQty: newDispensedQty, status: detailStatus, updatedById: userId },
      })
    }

    // ── Compute Overall Prescription Status ───────────────
    const updatedDetails = await tx.prescriptionDetail.findMany({
      where: { prescriptionId: existing.id, deletedAt: null },
      select: { status: true },
    })
    const allDone = updatedDetails.every((d) => d.status === PrescriptionDetailStatus.DISPENSED || d.status === PrescriptionDetailStatus.CANCELLED)
    const rxStatus: PrescriptionStatus = allDone ? PrescriptionStatus.DISPENSED : PrescriptionStatus.PARTIAL

    await tx.prescription.update({
      where: { id: existing.id },
      data: { saleId: sale.id, status: rxStatus, updatedById: userId },
    })

    return existing.id
  }, { timeout: 15000, maxWait: 5000 }))

  const updated = await prisma.prescription.findUnique({
    where: { id: rx as unknown as number },
    select: fullSelect,
  })
  return updated as unknown as PrescriptionResponse
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
