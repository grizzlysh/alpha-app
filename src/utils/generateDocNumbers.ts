import { DateTime } from 'luxon'
import { prisma } from '@config/db'

export type DocType = 'PO' | 'INV' | 'SL' | 'SR' | 'SD'

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
