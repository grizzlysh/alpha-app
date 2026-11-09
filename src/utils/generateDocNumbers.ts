import { DateTime } from 'luxon'
import { prisma } from '@config/db'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export type DocType = 'PO' | 'INV' | 'SL' | 'SR' | 'SD' | 'MR'

// Maps DocType to the DB column name holding the unique document number.
const DOC_NUMBER_FIELD: Record<DocType, string> = {
  PO: 'order_number',
  INV: 'invoice_number',
  SL: 'sale_number',
  SR: 'return_number',
  SD: 'disposal_number',
  MR: 'number',
}

/**
 * Wraps a transaction factory with retry logic for document-number unique
 * constraint violations (P2002). On collision the factory is called again,
 * which re-runs generateDocNumber and picks the next available sequence.
 */
export async function withDocNumberRetry<T>(
  type: DocType,
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  const field = DOC_NUMBER_FIELD[type]
  let lastError: unknown
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      if (
        e instanceof PrismaClientKnownRequestError &&
        e.code === 'P2002' &&
        (e.meta?.target as string[] | undefined)?.some((f) => f === field) &&
        attempt < maxRetries - 1
      ) {
        continue
      }
      throw e
    }
  }
  throw lastError
}

interface GenerateDocNumberOptions {
  type: DocType
  pharmacyId: number
  pharmacyCode: string
}

const getTimezone = async (): Promise<string> => {
  const param = await prisma.systemParameter.findUnique({
    where: { key: 'DEFAULT_TIMEZONE' },
    select: { value: true },
  })
  return param?.value ?? 'UTC'
}

const countExisting = async (type: DocType, pharmacyId: number, gte: Date, lte: Date): Promise<number> => {
  const where = { pharmacyId, createdAt: { gte, lte } }
  switch (type) {
    case 'PO': return prisma.purchaseOrder.count({ where })
    case 'INV': return prisma.invoice.count({ where })
    case 'SL': return prisma.sale.count({ where })
    case 'SR': return prisma.stockReturn.count({ where })
    case 'SD': return prisma.stockDisposal.count({ where })
    case 'MR': return prisma.medicalRecord.count({ where })
  }
}

export const generateDocNumber = async (
  options: GenerateDocNumberOptions
): Promise<string> => {
  const { type, pharmacyId, pharmacyCode } = options

  const timezone = await getTimezone()
  const dt = DateTime.now().setZone(timezone)

  const startOfDay = dt.startOf('day').toUTC().toJSDate()
  const endOfDay = dt.endOf('day').toUTC().toJSDate()
  const dateStr = dt.toFormat('yyyyMMdd')

  // Seed value used only the first time a (pharmacy, type, day) row is created,
  // so documents issued before this counter existed are not re-numbered.
  const existing = await countExisting(type, pharmacyId, startOfDay, endOfDay)

  const rows = await prisma.$queryRaw<{ last_value: number }[]>`
    INSERT INTO "sys_doc_sequences" ("pharmacy_id", "type", "date_key", "last_value", "updated_at")
    VALUES (${pharmacyId}, ${type}, ${dateStr}, ${existing + 1}, NOW())
    ON CONFLICT ("pharmacy_id", "type", "date_key")
    DO UPDATE SET "last_value" = "sys_doc_sequences"."last_value" + 1, "updated_at" = NOW()
    RETURNING "last_value"
  `
  const next = Number(rows[0].last_value)

  const seq = String(next).padStart(3, '0')

  return `${type}-${pharmacyCode.toUpperCase()}-${dateStr}-${seq}`
}
