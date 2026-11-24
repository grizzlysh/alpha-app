import { PaymentMethod, Prisma, ShiftStatus } from '@prisma/client'
import { Decimal, PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { DateTime } from 'luxon'
import { prisma } from '@config/db'
import { audit } from '@utils/audit'
import { BadRequestException } from '@exceptions/BadRequestException'
import { ConflictException } from '@exceptions/ConflictException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { NotFoundException } from '@exceptions/NotFoundException'
import { PaginationMeta } from '@interfaces/common.interface'
import { findOpenShift, getShiftSettings, ShiftSettings } from '@utils/cashierShift'
import { generateDocNumber, getTimezone, withDocNumberRetry } from '@utils/generateDocNumbers'
import {
  CurrentShiftResponse,
  ShiftDetailResponse,
  ShiftResponse,
  ShiftSummary,
  ShiftViewer,
} from './shifts.interface'
import { CashMovementInput, CloseShiftInput, OpenShiftInput, ShiftQueryInput } from './shifts.validation'

type Db = Prisma.TransactionClient | typeof prisma

const ZERO = new Decimal(0)
const num = (d: Decimal | null | undefined): number => (d ? parseFloat(d.toString()) : 0)
const numOrNull = (d: Decimal | null | undefined): number | null => (d === null || d === undefined ? null : num(d))

const shiftSelect = {
  id: true,
  uuid: true,
  shiftNumber: true,
  status: true,
  userId: true,
  openedAt: true,
  openingCash: true,
  openingNote: true,
  closedAt: true,
  countedCash: true,
  expectedCash: true,
  difference: true,
  closingNote: true,
  cashSales: true,
  nonCashSales: true,
  cashRefunds: true,
  cashIn: true,
  cashOut: true,
  saleCount: true,
  user: { select: { uuid: true, name: true } },
  closedByUser: { select: { uuid: true, name: true } },
} satisfies Prisma.CashierShiftSelect

type ShiftRow = Prisma.CashierShiftGetPayload<{ select: typeof shiftSelect }>

interface SummaryDecimals {
  saleCount: number
  cashSales: Decimal
  nonCashSales: Decimal
  cashRefunds: Decimal
  cashIn: Decimal
  cashOut: Decimal
  expectedCash: Decimal
}

/** The shift's money, worked out from its payments, refunds and cash movements. */
const computeSummary = async (db: Db, shiftId: number, openingCash: Decimal): Promise<SummaryDecimals> => {
  const [byMethod, refunds, movements, saleCount] = await Promise.all([
    db.salePaymentHistory.groupBy({ by: ['paymentMethod'], where: { shiftId }, _sum: { amount: true } }),
    // A refund pays back the cash the sale took, whichever shift took it.
    db.salePaymentHistory.aggregate({
      where: { paymentMethod: PaymentMethod.CASH, salePayment: { sale: { refundShiftId: shiftId } } },
      _sum: { amount: true },
    }),
    db.shiftCashMovement.groupBy({ by: ['type'], where: { shiftId }, _sum: { amount: true } }),
    db.sale.count({ where: { shiftId, deletedAt: null } }),
  ])

  const method = (m: PaymentMethod): Decimal => byMethod.find((r) => r.paymentMethod === m)?._sum.amount ?? ZERO
  const cashSales = method(PaymentMethod.CASH)
  const nonCashSales = byMethod
    .filter((r) => r.paymentMethod !== PaymentMethod.CASH)
    .reduce((acc, r) => acc.add(r._sum.amount ?? ZERO), ZERO)
  const cashRefunds = refunds._sum.amount ?? ZERO
  const cashIn = movements.find((m) => m.type === 'IN')?._sum.amount ?? ZERO
  const cashOut = movements.find((m) => m.type === 'OUT')?._sum.amount ?? ZERO
  const expectedCash = openingCash.add(cashSales).sub(cashRefunds).add(cashIn).sub(cashOut)

  return { saleCount, cashSales, nonCashSales, cashRefunds, cashIn, cashOut, expectedCash }
}

const toSummary = (s: SummaryDecimals): ShiftSummary => ({
  saleCount: s.saleCount,
  cashSales: num(s.cashSales),
  nonCashSales: num(s.nonCashSales),
  cashRefunds: num(s.cashRefunds),
  cashIn: num(s.cashIn),
  cashOut: num(s.cashOut),
  expectedCash: num(s.expectedCash),
})

/** A closed shift keeps the totals frozen when it was closed. */
const frozenSummary = (row: ShiftRow): ShiftSummary => ({
  saleCount: row.saleCount ?? 0,
  cashSales: num(row.cashSales),
  nonCashSales: num(row.nonCashSales),
  cashRefunds: num(row.cashRefunds),
  cashIn: num(row.cashIn),
  cashOut: num(row.cashOut),
  expectedCash: num(row.expectedCash),
})

const formatShift = async (
  db: Db,
  row: ShiftRow,
  viewer: ShiftViewer,
  settings: ShiftSettings
): Promise<ShiftResponse> => {
  const open = row.status === ShiftStatus.OPEN
  // Blind close: the cashier counts without knowing what the drawer should hold.
  const hidden = open && settings.blindClose && !viewer.canManage
  const summary = open ? (hidden ? null : toSummary(await computeSummary(db, row.id, row.openingCash))) : frozenSummary(row)
  return {
    uuid: row.uuid,
    shiftNumber: row.shiftNumber,
    status: row.status,
    cashier: row.user,
    openedAt: row.openedAt,
    openingCash: num(row.openingCash),
    openingNote: row.openingNote,
    closedAt: row.closedAt,
    closedBy: row.closedByUser,
    countedCash: numOrNull(row.countedCash),
    difference: numOrNull(row.difference),
    closingNote: row.closingNote,
    summary,
  }
}

const loadShift = async (db: Db, uuid: string, pharmacyId: number, viewer: ShiftViewer): Promise<ShiftRow> => {
  const row = await db.cashierShift.findFirst({ where: { uuid, pharmacyId }, select: shiftSelect })
  if (!row) throw new NotFoundException('SHIFT_NOT_FOUND')
  if (!viewer.canManage && row.userId !== viewer.userId) throw new ForbiddenException('SHIFT_NOT_YOURS')
  return row
}

// ── Services ──────────────────────────────────────────

export const getCurrentShift = async (pharmacyId: number, viewer: ShiftViewer): Promise<CurrentShiftResponse> => {
  const settings = await getShiftSettings(pharmacyId)
  const row = await prisma.cashierShift.findFirst({
    where: { pharmacyId, userId: viewer.userId, status: ShiftStatus.OPEN },
    select: shiftSelect,
  })
  return { settings, shift: row ? await formatShift(prisma, row, viewer, settings) : null }
}

export const openShift = async (pharmacyId: number, viewer: ShiftViewer, data: OpenShiftInput): Promise<ShiftResponse> => {
  const settings = await getShiftSettings(pharmacyId)
  if (!settings.enabled) throw new BadRequestException('SHIFT_DISABLED')

  try {
    const row = await withDocNumberRetry('SH', () =>
      prisma.$transaction(async (tx) => {
        if (await findOpenShift(tx, pharmacyId, viewer.userId)) throw new ConflictException('SHIFT_ALREADY_OPEN')
        const pharmacy = await tx.pharmacy.findUnique({ where: { id: pharmacyId }, select: { code: true } })
        if (!pharmacy) throw new NotFoundException('Pharmacy not found')
        const shiftNumber = await generateDocNumber({ type: 'SH', pharmacyId, pharmacyCode: pharmacy.code })
        const created = await tx.cashierShift.create({
          data: {
            pharmacyId,
            userId: viewer.userId,
            shiftNumber,
            openingCash: new Decimal(data.openingCash.toFixed(2)),
            openingNote: data.note || null,
          },
          select: shiftSelect,
        })
        await audit(tx, { action: 'shifts.open', entityType: 'shift', entityUuid: created.uuid, entityLabel: shiftNumber, pharmacyId, metadata: { openingCash: data.openingCash } })
        return created
      })
    )
    return formatShift(prisma, row, viewer, settings)
  } catch (e) {
    // Two "open" clicks at once: the partial unique index lets only one through.
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('SHIFT_ALREADY_OPEN')
    throw e
  }
}

export const addCashMovement = async (
  uuid: string,
  pharmacyId: number,
  viewer: ShiftViewer,
  data: CashMovementInput
): Promise<ShiftDetailResponse> => {
  await prisma.$transaction(async (tx) => {
    const row = await loadShift(tx, uuid, pharmacyId, viewer)
    // Only the cashier at the drawer records cash going in or out of it.
    if (row.userId !== viewer.userId) throw new ForbiddenException('SHIFT_NOT_YOURS')
    if (row.status !== ShiftStatus.OPEN) throw new BadRequestException('SHIFT_ALREADY_CLOSED')
    const amount = new Decimal(data.amount.toFixed(2))
    if (data.type === 'OUT') {
      const { expectedCash } = await computeSummary(tx, row.id, row.openingCash)
      if (amount.gt(expectedCash)) throw new BadRequestException('SHIFT_CASH_OUT_EXCEEDS')
    }
    await tx.shiftCashMovement.create({
      data: { shiftId: row.id, type: data.type, amount, note: data.note, createdById: viewer.userId },
    })
    await audit(tx, {
      action: data.type === 'IN' ? 'shifts.cash_in' : 'shifts.cash_out',
      entityType: 'shift',
      entityUuid: row.uuid,
      entityLabel: row.shiftNumber,
      pharmacyId,
      metadata: { amount: data.amount, note: data.note },
    })
  })
  return getShift(uuid, pharmacyId, viewer)
}

export const closeShift = async (
  uuid: string,
  pharmacyId: number,
  viewer: ShiftViewer,
  data: CloseShiftInput
): Promise<ShiftDetailResponse> => {
  const settings = await getShiftSettings(pharmacyId)
  await prisma.$transaction(async (tx) => {
    const row = await loadShift(tx, uuid, pharmacyId, viewer)
    if (row.status !== ShiftStatus.OPEN) throw new BadRequestException('SHIFT_ALREADY_CLOSED')

    const summary = await computeSummary(tx, row.id, row.openingCash)
    const countedCash = new Decimal(data.countedCash.toFixed(2))
    const difference = countedCash.sub(summary.expectedCash)
    const note = data.note?.trim() || null
    if (difference.abs().gt(settings.differenceTolerance) && !note) {
      throw new BadRequestException('SHIFT_DIFFERENCE_NOTE_REQUIRED')
    }

    // Conditional update: a second close at the same moment changes nothing.
    const closed = await tx.cashierShift.updateMany({
      where: { id: row.id, status: ShiftStatus.OPEN },
      data: {
        status: ShiftStatus.CLOSED,
        closedAt: new Date(),
        closedById: viewer.userId,
        countedCash,
        expectedCash: summary.expectedCash,
        difference,
        closingNote: note,
        cashSales: summary.cashSales,
        nonCashSales: summary.nonCashSales,
        cashRefunds: summary.cashRefunds,
        cashIn: summary.cashIn,
        cashOut: summary.cashOut,
        saleCount: summary.saleCount,
      },
    })
    if (closed.count === 0) throw new BadRequestException('SHIFT_ALREADY_CLOSED')
    await audit(tx, {
      action: 'shifts.close',
      entityType: 'shift',
      entityUuid: row.uuid,
      entityLabel: row.shiftNumber,
      pharmacyId,
      metadata: {
        cashier: row.user.name,
        expectedCash: summary.expectedCash.toString(),
        countedCash: countedCash.toString(),
        difference: difference.toString(),
        note,
      },
    })
  })
  return getShift(uuid, pharmacyId, viewer)
}

export const getShift = async (uuid: string, pharmacyId: number, viewer: ShiftViewer): Promise<ShiftDetailResponse> => {
  const settings = await getShiftSettings(pharmacyId)
  const row = await loadShift(prisma, uuid, pharmacyId, viewer)
  const [base, movements, sales] = await Promise.all([
    formatShift(prisma, row, viewer, settings),
    prisma.shiftCashMovement.findMany({
      where: { shiftId: row.id },
      orderBy: { createdAt: 'asc' },
      select: { uuid: true, type: true, amount: true, note: true, createdAt: true, createdByUser: { select: { name: true } } },
    }),
    prisma.sale.findMany({
      where: { OR: [{ shiftId: row.id }, { refundShiftId: row.id }], deletedAt: null },
      orderBy: { soldAt: 'asc' },
      select: { uuid: true, saleNumber: true, soldAt: true, status: true, saleType: true, grandTotal: true, refundShiftId: true },
    }),
  ])
  const hideAmounts = base.summary === null
  return {
    ...base,
    cashMovements: movements.map((m) => ({
      uuid: m.uuid,
      type: m.type,
      amount: num(m.amount),
      note: m.note,
      createdAt: m.createdAt,
      createdBy: m.createdByUser?.name ?? null,
    })),
    // With a blind close the cashier still sees which sales they made, not the takings.
    sales: sales.map((s) => ({
      uuid: s.uuid,
      saleNumber: s.saleNumber,
      soldAt: s.soldAt,
      status: s.status,
      saleType: s.saleType,
      grandTotal: hideAmounts ? 0 : num(s.grandTotal),
      refundedHere: s.refundShiftId === row.id,
    })),
  }
}

export const getShifts = async (
  pharmacyId: number,
  viewer: ShiftViewer,
  query: ShiftQueryInput
): Promise<{ data: ShiftResponse[]; meta: PaginationMeta }> => {
  const { status, cashierUuid, dateFrom, dateTo, page, limit } = query
  const zone = await getTimezone()
  const day = (d: string) => DateTime.fromISO(d, { zone })

  const where: Prisma.CashierShiftWhereInput = {
    pharmacyId,
    ...(status && { status }),
    // Without the manage permission a cashier only ever sees their own shifts.
    ...(viewer.canManage ? cashierUuid && { user: { uuid: cashierUuid } } : { userId: viewer.userId }),
    ...((dateFrom || dateTo) && {
      openedAt: {
        ...(dateFrom && { gte: day(dateFrom).startOf('day').toUTC().toJSDate() }),
        ...(dateTo && { lte: day(dateTo).endOf('day').toUTC().toJSDate() }),
      },
    }),
  }

  const settings = await getShiftSettings(pharmacyId)
  const [rows, total] = await prisma.$transaction([
    prisma.cashierShift.findMany({
      where,
      select: shiftSelect,
      orderBy: { openedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.cashierShift.count({ where }),
  ])

  return {
    data: await Promise.all(rows.map((r) => formatShift(prisma, r, viewer, settings))),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}
