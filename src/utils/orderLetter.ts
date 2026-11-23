import { OrderLetterKind, Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { BadRequestException } from '@exceptions/BadRequestException'

type Db = Prisma.TransactionClient | typeof prisma

/** The order letter each medicine goes on: its own override, else its type's. */
export async function orderLetterKinds(db: Db, medicineIds: number[]): Promise<Map<number, OrderLetterKind>> {
  const rows = await db.medicine.findMany({
    where: { id: { in: medicineIds } },
    select: { id: true, orderLetterKind: true, type: { select: { orderLetterKind: true } } },
  })
  return new Map(rows.map((m) => [m.id, m.orderLetterKind ?? m.type.orderLetterKind]))
}

/**
 * The kind of a purchase order with these medicines. Every kind has its own
 * surat pesanan, so the items must share one; a narcotics letter holds a
 * single medicine.
 */
export async function resolveOrderLetterKind(db: Db, medicineIds: number[]): Promise<OrderLetterKind> {
  const kinds = await orderLetterKinds(db, medicineIds)
  const distinct = [...new Set(kinds.values())]
  if (distinct.length > 1) {
    throw new BadRequestException(`Each kind of medicine needs its own purchase order: ${distinct.join(', ')}`)
  }
  const kind = distinct[0] ?? OrderLetterKind.REGULAR
  if (kind === OrderLetterKind.NARCOTIC && new Set(medicineIds).size > 1) {
    throw new BadRequestException('A narcotics purchase order can hold only one medicine')
  }
  return kind
}

/** Each kind of order letter is numbered in its own series. */
export const ORDER_NUMBER_PREFIX: Record<OrderLetterKind, string> = {
  REGULAR: 'PO',
  NARCOTIC: 'PO-N',
  PSYCHOTROPIC: 'PO-P',
  PRECURSOR: 'PO-PF',
  CERTAIN_DRUG: 'PO-OOT',
}

/** Narcotics and psychotropics are only ever dispensed on a prescription. */
export const PRESCRIPTION_ONLY_KINDS: OrderLetterKind[] = [OrderLetterKind.NARCOTIC, OrderLetterKind.PSYCHOTROPIC]

/** Precursors and obat-obat tertentu sold without a prescription are capped per sale. */
export const RESTRICTED_SALE_KINDS: OrderLetterKind[] = [OrderLetterKind.PRECURSOR, OrderLetterKind.CERTAIN_DRUG]

export const RESTRICTED_SALE_LIMIT_KEY = 'RESTRICTED_SALE_LIMIT'

/** A medicine set to narcotics or psychotropics must sit in a prescription-only type. */
export async function assertPrescriptionForKind(db: Db, typeId: number, kind: OrderLetterKind | null | undefined): Promise<void> {
  const type = await db.medicineType.findUnique({ where: { id: typeId }, select: { requiredPrescription: true, orderLetterKind: true } })
  if (!type) return
  const effective = kind ?? type.orderLetterKind
  if (PRESCRIPTION_ONLY_KINDS.includes(effective) && !type.requiredPrescription) {
    throw new BadRequestException('Narcotics and psychotropics must belong to a prescription-only medicine type')
  }
}

/**
 * Without a prescription, each precursor / obat-obat tertentu medicine may be
 * sold up to the pharmacy's RESTRICTED_SALE_LIMIT pieces per sale (0 = no cap).
 */
export async function assertRestrictedSaleLimit(db: Db, pharmacyId: number, lines: { medicineId: number; quantityPieces: number }[]): Promise<void> {
  const param = await db.businessParameter.findUnique({
    where: { pharmacyId_key: { pharmacyId, key: RESTRICTED_SALE_LIMIT_KEY } },
    select: { value: true },
  })
  const limit = Number(param?.value ?? 0)
  if (!Number.isFinite(limit) || limit <= 0) return

  const perMedicine = new Map<number, number>()
  for (const l of lines) perMedicine.set(l.medicineId, (perMedicine.get(l.medicineId) ?? 0) + l.quantityPieces)
  const kinds = await orderLetterKinds(db, [...perMedicine.keys()])
  const over = [...perMedicine].filter(([id, qty]) => RESTRICTED_SALE_KINDS.includes(kinds.get(id)!) && qty > limit).map(([id]) => id)
  if (!over.length) return
  const names = await db.medicine.findMany({ where: { id: { in: over } }, select: { name: true } })
  throw new BadRequestException(`Without a prescription at most ${limit} pieces per sale: ${names.map((n) => n.name).join(', ')}`)
}
