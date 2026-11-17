import { CustomerType, PaymentStatus, Prisma } from '@prisma/client'
import { randomBytes } from 'crypto'
import { prisma } from '@config/db'
import { NotFoundException } from '@exceptions/NotFoundException'
import { createCustomer } from '@modules/customers/customers.service'
import { createInvoice } from '@modules/invoices/invoices.service'
import {
  CustomerImportInput,
  DistributorImportInput,
  OpeningStockImportInput,
} from './data-transfer.validation'
import {
  CustomerExportRow,
  DistributorExportRow,
  ImportInvalidRow,
  ImportResult,
  OpeningStockResult,
} from './data-transfer.interface'

// Moving a pharmacy's starting data in and out as spreadsheets: distributors,
// customers/patients and the opening stock count. Imports only add what is
// missing — nothing that already exists is changed — so a file can be imported
// again safely. Every import supports a dry run that reports what would happen.

const key = (s: string | null | undefined): string => (s ?? '').trim().toLowerCase()
const digits = (s: string | null | undefined): string => (s ?? '').replace(/\D/g, '')

/** YYYY-MM-DD or DD/MM/YYYY → Date (UTC midnight), or null. */
function parseDate(v: string): Date | null {
  const s = v.trim()
  let y: number, m: number, d: number
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  else if ((match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])]
  else return null
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null
}

const isoDay = (d: Date): string => d.toISOString().slice(0, 10)

// ── Distributors ──────────────────────────────────────

export async function exportDistributors(pharmacyId: number): Promise<DistributorExportRow[]> {
  return prisma.distributor.findMany({
    where: { pharmacyId, deletedAt: null },
    select: { name: true, phone: true, email: true, address: true, contactPerson: true, permitNumber: true },
    orderBy: { name: 'asc' },
  })
}

export async function importDistributors(pharmacyId: number, userId: number, input: DistributorImportInput): Promise<ImportResult> {
  const existing = new Set(
    (await prisma.distributor.findMany({ where: { pharmacyId, deletedAt: null }, select: { name: true } })).map((d) => key(d.name))
  )
  const invalid: ImportInvalidRow[] = []
  const seen = new Set<string>()
  const toCreate: DistributorImportInput['rows'] = []
  let already = 0

  input.rows.forEach((r, i) => {
    const fail = (reason: ImportInvalidRow['reason']) => invalid.push({ row: i + 1, name: r.name, reason })
    if (!r.name) return fail('NAME_REQUIRED')
    if (!r.phone) return fail('PHONE_REQUIRED')
    if (seen.has(key(r.name))) return fail('DUPLICATE_IN_FILE')
    seen.add(key(r.name))
    if (existing.has(key(r.name))) return void already++
    toCreate.push(r)
  })

  if (!input.dryRun && toCreate.length) {
    await prisma.distributor.createMany({
      data: toCreate.map((r) => ({
        pharmacyId,
        name: r.name,
        phone: r.phone,
        email: r.email || null,
        address: r.address || null,
        contactPerson: r.contactPerson || null,
        permitNumber: r.permitNumber || null,
        createdById: userId,
        updatedById: userId,
      })),
    })
  }
  return { dryRun: input.dryRun, created: toCreate.length, existing: already, invalid }
}

// ── Customers / patients ──────────────────────────────

export async function exportCustomers(pharmacyId: number): Promise<CustomerExportRow[]> {
  const rows = await prisma.customer.findMany({
    where: { pharmacyId, deletedAt: null, isWalkIn: false, customerType: CustomerType.PATIENT },
    select: {
      name: true,
      phone: true,
      address: true,
      patientDetail: { select: { gender: true, dateOfBirth: true, nik: true, bpjsNumber: true } },
      medicalRecord: { select: { number: true } },
    },
    orderBy: { name: 'asc' },
  })
  return rows.map((c) => ({
    name: c.name,
    phone: c.phone,
    address: c.address,
    gender: c.patientDetail?.gender ?? null,
    dateOfBirth: c.patientDetail?.dateOfBirth ? isoDay(c.patientDetail.dateOfBirth) : null,
    nik: c.patientDetail?.nik ?? null,
    bpjsNumber: c.patientDetail?.bpjsNumber ?? null,
    medicalRecordNumber: c.medicalRecord?.number ?? null,
  }))
}

function parseGender(v: string): 'MALE' | 'FEMALE' | undefined {
  const g = key(v)
  if (['l', 'lk', 'laki', 'laki-laki', 'pria', 'male', 'm'].includes(g)) return 'MALE'
  if (['p', 'pr', 'perempuan', 'wanita', 'female', 'f'].includes(g)) return 'FEMALE'
  return undefined
}

/**
 * Patients are matched by phone number when they have one, otherwise by name.
 * New ones are created one at a time through the normal path so each gets its
 * medical record number.
 */
export async function importCustomers(pharmacyId: number, userId: number, input: CustomerImportInput): Promise<ImportResult> {
  const current = await prisma.customer.findMany({
    where: { pharmacyId, deletedAt: null },
    select: { name: true, phone: true },
  })
  const phones = new Set(current.map((c) => digits(c.phone)).filter(Boolean))
  const names = new Set(current.map((c) => key(c.name)))

  const invalid: ImportInvalidRow[] = []
  const seen = new Set<string>()
  const toCreate: { row: CustomerImportInput['rows'][number]; dob?: Date }[] = []
  let already = 0

  input.rows.forEach((r, i) => {
    const fail = (reason: ImportInvalidRow['reason']) => invalid.push({ row: i + 1, name: r.name, reason })
    if (!r.name) return fail('NAME_REQUIRED')
    const dob = r.dateOfBirth ? parseDate(r.dateOfBirth) : null
    if (r.dateOfBirth && !dob) return fail('INVALID_DATE')
    const identity = digits(r.phone) || `name:${key(r.name)}`
    if (seen.has(identity)) return fail('DUPLICATE_IN_FILE')
    seen.add(identity)
    if (digits(r.phone) ? phones.has(digits(r.phone)) : names.has(key(r.name))) return void already++
    toCreate.push({ row: r, dob: dob ?? undefined })
  })

  if (!input.dryRun) {
    for (const { row, dob } of toCreate) {
      const gender = parseGender(row.gender)
      await createCustomer(
        {
          customerType: CustomerType.PATIENT,
          name: row.name,
          phone: row.phone || undefined,
          address: row.address || undefined,
          patientDetail:
            gender || dob || row.nik || row.bpjsNumber
              ? { gender, dateOfBirth: dob?.toISOString(), nik: row.nik || undefined, bpjsNumber: row.bpjsNumber || undefined }
              : undefined,
        },
        pharmacyId,
        userId
      )
    }
  }
  return { dryRun: input.dryRun, created: toCreate.length, existing: already, invalid }
}

// ── Opening stock ─────────────────────────────────────

/**
 * The stock counted when a pharmacy starts using the system. It is booked as
 * one receipt invoice per distributor ("saldo awal"), so batches, prices,
 * barcodes and stock movements come out exactly as for a normal delivery. Those
 * invoices are marked paid — they are not debts to the distributor.
 */
export async function importOpeningStock(pharmacyId: number, userId: number, input: OpeningStockImportInput): Promise<OpeningStockResult> {
  const pharmacy = await prisma.pharmacy.findFirst({ where: { id: pharmacyId }, select: { code: true } })
  if (!pharmacy) throw new NotFoundException('Pharmacy not found')

  const [medicines, distributors, batches] = await Promise.all([
    prisma.medicine.findMany({ where: { pharmacyId, deletedAt: null }, select: { id: true, uuid: true, name: true } }),
    prisma.distributor.findMany({ where: { pharmacyId, deletedAt: null }, select: { id: true, uuid: true, name: true } }),
    prisma.stockDetail.findMany({ where: { stock: { pharmacyId } }, select: { batchNumber: true, stock: { select: { medicineId: true } } } }),
  ])
  const medicineByName = new Map(medicines.map((m) => [key(m.name), m]))
  const distributorByName = new Map(distributors.map((d) => [key(d.name), d]))
  const defaultDistributor = input.defaultDistributorUuid ? distributors.find((d) => d.uuid === input.defaultDistributorUuid) : undefined
  if (input.defaultDistributorUuid && !defaultDistributor) throw new NotFoundException('Distributor not found')
  const existingBatch = new Set(batches.map((b) => `${b.stock.medicineId}|${key(b.batchNumber)}`))

  const today = new Date(new Date().toISOString().slice(0, 10))
  const invalid: ImportInvalidRow[] = []
  const seen = new Set<string>()
  type Line = { medicineId: number; medicineUuid: string; batchNumber: string; expiry: Date; qty: number; price: number; sellingPrice?: number }
  const groups = new Map<string, { distributorUuid: string; lines: Line[] }>()
  let already = 0
  let totalValue = 0

  input.rows.forEach((r, i) => {
    const fail = (reason: ImportInvalidRow['reason']) => invalid.push({ row: i + 1, name: r.medicine, reason })
    const medicine = medicineByName.get(key(r.medicine))
    if (!r.medicine || !medicine) return fail('MEDICINE_NOT_FOUND')
    if (!r.batchNumber) return fail('BATCH_REQUIRED')
    const expiry = parseDate(r.expiryDate)
    if (!expiry) return fail('INVALID_DATE')
    if (expiry <= today) return fail('EXPIRED')
    if (!Number.isInteger(r.quantityPieces) || r.quantityPieces <= 0) return fail('QUANTITY_INVALID')
    if (!(r.purchasePrice > 0) || (r.sellingPrice !== undefined && !(r.sellingPrice > 0))) return fail('PRICE_INVALID')
    const distributor = r.distributor ? distributorByName.get(key(r.distributor)) : defaultDistributor
    if (!distributor) return fail('DISTRIBUTOR_NOT_FOUND')
    const batchKey = `${medicine.id}|${key(r.batchNumber)}`
    if (seen.has(batchKey)) return fail('DUPLICATE_IN_FILE')
    seen.add(batchKey)
    if (existingBatch.has(batchKey)) return void already++

    const group = groups.get(distributor.uuid) ?? { distributorUuid: distributor.uuid, lines: [] }
    group.lines.push({
      medicineId: medicine.id,
      medicineUuid: medicine.uuid,
      batchNumber: r.batchNumber,
      expiry,
      qty: r.quantityPieces,
      price: r.purchasePrice,
      sellingPrice: r.sellingPrice,
    })
    groups.set(distributor.uuid, group)
    totalValue += r.quantityPieces * r.purchasePrice
  })

  const created = [...groups.values()].reduce((n, g) => n + g.lines.length, 0)
  const result: OpeningStockResult = {
    dryRun: input.dryRun,
    created,
    existing: already,
    invalid,
    invoices: groups.size,
    totalValue: Math.round(totalValue),
  }
  if (input.dryRun || created === 0) return result

  // Unique even for two imports in the same second (invoice numbers are globally unique).
  const stamp = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${randomBytes(2).toString('hex')}`
  let n = 0
  for (const group of groups.values()) {
    n++
    const invoice = await createInvoice(
      {
        distributorUuid: group.distributorUuid,
        signedByUuid: input.signedByUuid,
        invoiceNumber: `saldo-awal-${pharmacy.code.toLowerCase()}-${stamp}-${n}`,
        invoiceDate: isoDay(today),
        dueDate: isoDay(today),
        receiveDate: isoDay(today),
        discountPercentage: 0,
        ppnPercentage: 0,
        description: 'Saldo stok awal (impor)',
        details: group.lines.map((l) => ({
          medicineUuid: l.medicineUuid,
          batchNumber: l.batchNumber.toLowerCase(),
          expiryDate: isoDay(l.expiry),
          quantityBox: l.qty,
          quantityPerBox: 1,
          quantityPieces: l.qty,
          price: l.price,
          discountPercentage: 0,
        })),
      },
      pharmacyId,
      userId
    )

    await prisma.$transaction(async (tx) => {
      // Opening stock is owned outright: no payable to the distributor.
      await tx.invoice.update({
        where: { uuid: invoice.uuid },
        data: { paymentStatus: PaymentStatus.PAID, paidAmount: new Prisma.Decimal(invoice.grandTotal as unknown as string), updatedById: userId },
      })
      for (const l of group.lines.filter((x) => x.sellingPrice)) {
        await tx.stock.update({
          where: { pharmacyId_medicineId: { pharmacyId, medicineId: l.medicineId } },
          data: { sellingPrice: new Prisma.Decimal(l.sellingPrice!), isManualPrice: true, updatedById: userId },
        })
      }
    })
  }
  return result
}
