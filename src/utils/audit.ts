import { AsyncLocalStorage } from 'async_hooks'
import { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'

type Db = Prisma.TransactionClient | typeof prisma

// The request being served, so services can record who did something without
// every function taking the user, IP and user agent as parameters.
const requestContext = new AsyncLocalStorage<{ req: Request }>()

export const auditContext = (req: Request, _res: Response, next: NextFunction): void => {
  requestContext.run({ req }, next)
}

export type AuditChanges = Record<string, { from: unknown; to: unknown }>

export interface AuditEntry {
  action: string
  entityType: string
  entityUuid?: string | null
  entityLabel?: string | null
  changes?: AuditChanges | null
  metadata?: Record<string, unknown> | null
  /** Defaults to the signed-in user's pharmacy. */
  pharmacyId?: number | null
  /** Defaults to the signed-in user (e.g. set it for a failed sign-in). */
  userId?: number | null
}

const MAX_TEXT = 500
const clip = (v: string | undefined | null): string | null => (v ? v.slice(0, MAX_TEXT) : null)

/** Plain JSON for Prisma (Decimals and Dates become strings). */
const toJson = (v: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull =>
  v === null || v === undefined ? Prisma.DbNull : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue)

/**
 * Appends an audit entry. Pass the transaction client so the entry is written
 * (or rolled back) together with the change it describes.
 */
export const audit = async (db: Db, entry: AuditEntry): Promise<void> => {
  const req = requestContext.getStore()?.req
  await db.auditLog.create({
    data: {
      pharmacyId: entry.pharmacyId !== undefined ? entry.pharmacyId : (req?.user?.pharmacyId ?? null),
      userId: entry.userId !== undefined ? entry.userId : (req?.user?.id ?? null),
      action: entry.action,
      entityType: entry.entityType,
      entityUuid: entry.entityUuid ?? null,
      entityLabel: clip(entry.entityLabel),
      changes: entry.changes && Object.keys(entry.changes).length > 0 ? toJson(entry.changes) : Prisma.DbNull,
      metadata: toJson(entry.metadata),
      ipAddress: clip(req?.ip),
      userAgent: clip(req?.get('user-agent')),
    },
  })
}

const comparable = (v: unknown): unknown =>
  v instanceof Date ? v.toISOString() : v !== null && typeof v === 'object' && 'toFixed' in v ? String(v) : v

/** The fields of `after` whose value differs from `before`. Secrets are never stored. */
export const diffFields = <T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  fields: (keyof T)[] = Object.keys(after) as (keyof T)[]
): AuditChanges => {
  const out: AuditChanges = {}
  for (const f of fields) {
    if (!(f in after) || after[f] === undefined) continue
    const key = String(f)
    if (/password|token|secret/i.test(key)) continue
    const from = comparable(before[f])
    const to = comparable(after[f])
    if (JSON.stringify(from) !== JSON.stringify(to)) out[key] = { from: from ?? null, to: to ?? null }
  }
  return out
}
