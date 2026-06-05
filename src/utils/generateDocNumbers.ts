import { DateTime } from 'luxon'
import { prisma } from '@config/db'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export type DocType = 'PO' | 'INV' | 'SL' | 'SR' | 'SD'

// Maps DocType to the DB column name holding the unique document number.
const DOC_NUMBER_FIELD: Record<DocType, string> = {
  PO: 'order_number',
  INV: 'invoice_number',
  SL: 'sale_number',
  SR: 'return_number',
  SD: 'disposal_number',
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

export const generateDocNumber = async (
  options: GenerateDocNumberOptions
): Promise<string> => {
  const { type, pharmacyId, pharmacyCode } = options

  const timezone = await getTimezone()
  const dt = DateTime.now().setZone(timezone)

  const startOfDay = dt.startOf('day').toUTC().toJSDate()
  const endOfDay = dt.endOf('day').toUTC().toJSDate()
  const dateStr = dt.toFormat('yyyyMMdd')

  let count: number = 0

  switch (type) {
    case 'PO':
      count = await prisma.purchaseOrder.count({
        where: { pharmacyId, createdAt: { gte: startOfDay, lte: endOfDay } },
      })
      break
    case 'INV':
      count = await prisma.invoice.count({
        where: { pharmacyId, createdAt: { gte: startOfDay, lte: endOfDay } },
      })
      break
    case 'SL':
      count = await prisma.sale.count({
        where: { pharmacyId, createdAt: { gte: startOfDay, lte: endOfDay } },
      })
      break
    case 'SR':
      count = await prisma.stockReturn.count({
        where: { pharmacyId, createdAt: { gte: startOfDay, lte: endOfDay } },
      })
      break
    case 'SD':
      count = await prisma.stockDisposal.count({
        where: { pharmacyId, createdAt: { gte: startOfDay, lte: endOfDay } },
      })
      break
  }

  const seq = String(count + 1).padStart(3, '0')

  return `${type}-${pharmacyCode.toUpperCase()}-${dateStr}-${seq}`
}
