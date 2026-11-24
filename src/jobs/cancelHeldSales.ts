import { PaymentStatus, Prisma, SaleStatus } from '@prisma/client'
import { DateTime } from 'luxon'
import { prisma } from '@config/db'
import { JobContext, JobResult } from './types'

const AUTO_CANCEL_NOTE = 'Auto-cancelled: held past the end of the day'

/**
 * Held (PENDING) sales reserve stock without deducting it. At the end of the
 * day any hold still open is cancelled and its reservations released, so the
 * stock is sellable again. Mirrors the PENDING branch of cancelOrRefundSale.
 */
export async function cancelHeldSales({ now, timezone }: JobContext): Promise<JobResult> {
  const startOfToday = DateTime.fromJSDate(now).setZone(timezone).startOf('day').toUTC().toJSDate()

  const held = await prisma.sale.findMany({
    where: { status: SaleStatus.PENDING, deletedAt: null, createdAt: { lt: startOfToday } },
    select: { id: true },
  })

  let affected = 0
  for (const { id } of held) {
    const cancelled = await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction: a cashier may have completed it meanwhile.
      const sale = await tx.sale.findFirst({
        where: { id, status: SaleStatus.PENDING, deletedAt: null },
        select: { id: true, description: true, payment: { select: { id: true } } },
      })
      if (!sale) return false

      await tx.stockReservation.deleteMany({ where: { saleId: sale.id } })
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: SaleStatus.CANCELLED,
          description: sale.description ? `${sale.description} · ${AUTO_CANCEL_NOTE}` : AUTO_CANCEL_NOTE,
          paidAmount: new Prisma.Decimal(0),
        },
      })
      if (sale.payment) {
        await tx.salePayment.update({
          where: { id: sale.payment.id },
          data: { paymentStatus: PaymentStatus.UNPAID, paidAmount: new Prisma.Decimal(0) },
        })
      }
      return true
    })
    if (cancelled) affected++
  }

  return { affected, details: { cutoff: startOfToday.toISOString(), found: held.length } }
}
