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
