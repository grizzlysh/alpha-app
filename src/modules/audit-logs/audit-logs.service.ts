import { Prisma } from '@prisma/client'
import { DateTime } from 'luxon'
import { prisma } from '@config/db'
import { PaginationMeta } from '@interfaces/common.interface'
import { getTimezone } from '@utils/generateDocNumbers'
import { AuditActionCount, AuditLogResponse } from './audit-logs.interface'
import { AuditLogQueryInput } from './audit-logs.validation'

const select = {
  uuid: true,
  action: true,
  entityType: true,
  entityUuid: true,
  entityLabel: true,
  changes: true,
  metadata: true,
  ipAddress: true,
  createdAt: true,
  user: { select: { uuid: true, name: true } },
} satisfies Prisma.AuditLogSelect

// The log of the pharmacy selected in the token only — never another pharmacy's.
export const getAuditLogs = async (
  pharmacyId: number,
  query: AuditLogQueryInput
): Promise<{ data: AuditLogResponse[]; meta: PaginationMeta }> => {
  const { action, userUuid, entityUuid, search, dateFrom, dateTo, page, limit } = query
  const zone = await getTimezone()
  const day = (d: string) => DateTime.fromISO(d, { zone })

  const where: Prisma.AuditLogWhereInput = {
    pharmacyId,
    ...(action && (action.includes('.') ? { action } : { action: { startsWith: `${action}.` } })),
    ...(userUuid && { user: { uuid: userUuid } }),
    ...(entityUuid && { entityUuid }),
    ...(search && { entityLabel: { contains: search, mode: 'insensitive' as const } }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: day(dateFrom).startOf('day').toUTC().toJSDate() }),
        ...(dateTo && { lte: day(dateTo).endOf('day').toUTC().toJSDate() }),
      },
    }),
  }

  const [rows, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, select, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.auditLog.count({ where }),
  ])

  return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
}

/** The actions this pharmacy's log contains, for the filter. */
export const getAuditActions = async (pharmacyId: number): Promise<AuditActionCount[]> => {
  const rows = await prisma.auditLog.groupBy({
    by: ['action'],
    where: { pharmacyId },
    _count: { _all: true },
    orderBy: { action: 'asc' },
  })
  return rows.map((r) => ({ action: r.action, count: r._count._all }))
}
