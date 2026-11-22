import {
  NotificationSeverity,
  NotificationType,
  PaymentStatus,
  Prisma,
  RecordStatus,
  SaleStatus,
} from '@prisma/client'
import { DateTime } from 'luxon'
import { prisma } from '@config/db'
import { PERMISSIONS } from '@constants/permissions'
import { DEFAULT_BUSINESS_PARAMS } from '@constants/defaultCatalog'
import { JobContext, JobResult } from './types'

const DAY_MS = 86_400_000
/** Per-pharmacy windows (business parameters); the catalog default applies when unset. */
const EXPIRY_PARAM = 'EXPIRY_ALERT_DAYS'
const LICENSE_PARAM = 'LICENSE_ALERT_DAYS'

const defaultDays = (key: string): number => Number(DEFAULT_BUSINESS_PARAMS.find((p) => p.key === key)?.value ?? 30)

interface AlertWindows {
  expiryDays: number
  licenseDays: number
}

interface Alert {
  type: NotificationType
  severity: NotificationSeverity
  count: number
  permission: string
  link: string
  data?: Prisma.InputJsonValue
}

const toNum = (d: Prisma.Decimal): number => Number(d.toString())

async function collectAlerts(pharmacyId: number, now: Date, windows: AlertWindows): Promise<Alert[]> {
  const expiryHorizon = new Date(now.getTime() + windows.expiryDays * DAY_MS)
  const licenseHorizon = new Date(now.getTime() + windows.licenseDays * DAY_MS)

  const [expiring, expired, stocks, payables, receivables, businessLicenses, practiceLicenses] = await Promise.all([
    prisma.stockDetail.count({
      where: { stock: { pharmacyId }, quantityPieces: { gt: 0 }, expiryDate: { gt: now, lte: expiryHorizon } },
    }),
    prisma.stockDetail.count({
      where: { stock: { pharmacyId }, quantityPieces: { gt: 0 }, expiryDate: { lte: now } },
    }),
    // Same rule as the dashboard's "Need to Restock": out of stock, or at/below the reorder level.
    prisma.stock.findMany({ where: { pharmacyId }, select: { totalPieces: true, reorderLevel: true } }),
    prisma.invoice.findMany({
      where: {
        pharmacyId,
        deletedAt: null,
        paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] },
        dueDate: { lt: now },
      },
      select: { grandTotal: true, paidAmount: true },
    }),
    prisma.sale.findMany({
      where: {
        pharmacyId,
        deletedAt: null,
        status: SaleStatus.COMPLETED,
        dueDate: { lt: now },
        payment: { paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] } },
      },
      select: { grandTotal: true, paidAmount: true },
    }),
    prisma.businessLicense.count({
      where: { pharmacyId, deletedAt: null, status: RecordStatus.ACTIVE, validUntil: { lte: licenseHorizon } },
    }),
    prisma.practiceLicense.count({
      where: {
        deletedAt: null,
        status: RecordStatus.ACTIVE,
        validUntil: { lte: licenseHorizon },
        placement: { pharmacyId, status: RecordStatus.ACTIVE, leftAt: null, deletedAt: null },
      },
    }),
  ])

  const lowStock = stocks.filter((s) => s.totalPieces === 0 || (s.reorderLevel > 0 && s.totalPieces <= s.reorderLevel)).length
  const outstanding = (rows: { grandTotal: Prisma.Decimal; paidAmount: Prisma.Decimal }[]): number =>
    rows.reduce((sum, r) => sum + toNum(r.grandTotal) - toNum(r.paidAmount), 0)

  const alerts: Alert[] = [
    { type: NotificationType.EXPIRED_BATCHES, severity: NotificationSeverity.CRITICAL, count: expired, permission: PERMISSIONS.STOCK_READ, link: '/stock' },
    {
      type: NotificationType.EXPIRING_BATCHES,
      severity: NotificationSeverity.WARNING,
      count: expiring,
      permission: PERMISSIONS.STOCK_READ,
      link: '/stock',
      data: { days: windows.expiryDays },
    },
    { type: NotificationType.LOW_STOCK, severity: NotificationSeverity.WARNING, count: lowStock, permission: PERMISSIONS.STOCK_READ, link: '/stock' },
    {
      type: NotificationType.OVERDUE_PAYABLES,
      severity: NotificationSeverity.CRITICAL,
      count: payables.length,
      permission: PERMISSIONS.INVOICES_READ,
      link: '/invoices',
      data: { amount: outstanding(payables) },
    },
    {
      type: NotificationType.OVERDUE_RECEIVABLES,
      severity: NotificationSeverity.WARNING,
      count: receivables.length,
      permission: PERMISSIONS.SALES_READ,
      link: '/sales',
      data: { amount: outstanding(receivables) },
    },
    {
      type: NotificationType.LICENSE_EXPIRING,
      severity: NotificationSeverity.CRITICAL,
      count: businessLicenses + practiceLicenses,
      permission: PERMISSIONS.DASHBOARD_READ,
      link: '/dashboard',
      data: { days: windows.licenseDays },
    },
  ]
  return alerts
}

/**
 * Writes one notification per alert type per pharmacy per day. Re-running on
 * the same day updates the counts in place (unique pharmacyId + dedupeKey),
 * and drops an alert whose count fell to zero.
 */
export async function dailyAlerts({ now, timezone }: JobContext): Promise<JobResult> {
  const dateKey = DateTime.fromJSDate(now).setZone(timezone).toFormat('yyyyMMdd')
  const [pharmacies, params] = await Promise.all([
    prisma.pharmacy.findMany({ where: { deletedAt: null }, select: { id: true } }),
    prisma.businessParameter.findMany({
      where: { key: { in: [EXPIRY_PARAM, LICENSE_PARAM] } },
      select: { pharmacyId: true, key: true, value: true },
    }),
  ])
  const windowOf = (pharmacyId: number, key: string): number => {
    const v = Number(params.find((p) => p.pharmacyId === pharmacyId && p.key === key)?.value)
    return Number.isInteger(v) && v > 0 ? v : defaultDays(key)
  }

  let affected = 0
  for (const { id: pharmacyId } of pharmacies) {
    const alerts = await collectAlerts(pharmacyId, now, {
      expiryDays: windowOf(pharmacyId, EXPIRY_PARAM),
      licenseDays: windowOf(pharmacyId, LICENSE_PARAM),
    })
    for (const alert of alerts) {
      const dedupeKey = `${alert.type}:${dateKey}`
      if (alert.count === 0) {
        await prisma.notification.deleteMany({ where: { pharmacyId, dedupeKey } })
        continue
      }
      const fields = {
        severity: alert.severity,
        count: alert.count,
        permission: alert.permission,
        link: alert.link,
        data: alert.data ?? Prisma.JsonNull,
      }
      await prisma.notification.upsert({
        where: { pharmacyId_dedupeKey: { pharmacyId, dedupeKey } },
        create: { pharmacyId, type: alert.type, dedupeKey, ...fields },
        update: fields,
      })
      affected++
    }
  }

  return { affected, details: { pharmacies: pharmacies.length, dateKey } }
}
