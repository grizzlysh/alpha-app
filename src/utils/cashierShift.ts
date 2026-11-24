import { Prisma, ShiftStatus } from '@prisma/client'
import { prisma } from '@config/db'
import { BadRequestException } from '@exceptions/BadRequestException'

type Db = Prisma.TransactionClient | typeof prisma

export const SHIFT_PARAM_KEYS = {
  enabled: 'CASHIER_SHIFT_ENABLED',
  openingCash: 'CASHIER_SHIFT_OPENING_CASH',
  blindClose: 'CASHIER_SHIFT_BLIND_CLOSE',
  differenceTolerance: 'CASHIER_SHIFT_DIFFERENCE_TOLERANCE',
} as const

export interface ShiftSettings {
  /** Cashiers must open a shift before taking money. */
  enabled: boolean
  /** Suggested opening cash (float). */
  openingCash: number
  /** The cashier counts the drawer without seeing the expected amount. */
  blindClose: boolean
  /** A difference larger than this (Rp) needs a note. */
  differenceTolerance: number
}

const nonNegative = (raw: string | undefined, fallback: number): number => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export const getShiftSettings = async (pharmacyId: number, db: Db = prisma): Promise<ShiftSettings> => {
  const rows = await db.businessParameter.findMany({
    where: { pharmacyId, key: { in: Object.values(SHIFT_PARAM_KEYS) } },
    select: { key: true, value: true },
  })
  const v = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string | undefined>
  return {
    enabled: v[SHIFT_PARAM_KEYS.enabled] === 'true',
    openingCash: nonNegative(v[SHIFT_PARAM_KEYS.openingCash], 0),
    blindClose: v[SHIFT_PARAM_KEYS.blindClose] === 'true',
    differenceTolerance: nonNegative(v[SHIFT_PARAM_KEYS.differenceTolerance], 0),
  }
}

/** The cashier's open shift at this pharmacy, if any. */
export const findOpenShift = (db: Db, pharmacyId: number, userId: number): Promise<{ id: number } | null> =>
  db.cashierShift.findFirst({
    where: { pharmacyId, userId, status: ShiftStatus.OPEN },
    select: { id: true },
  })

/**
 * The shift that takes (or pays back) money for this cashier.
 * With shifts turned on, a cashier without an open shift is stopped;
 * with shifts off, money is simply not tied to a shift (null).
 */
export const shiftForMoney = async (
  db: Db,
  pharmacyId: number,
  userId: number,
  enabled: boolean
): Promise<number | null> => {
  if (!enabled) return null
  const open = await findOpenShift(db, pharmacyId, userId)
  if (!open) throw new BadRequestException('SHIFT_NOT_OPEN')
  return open.id
}
