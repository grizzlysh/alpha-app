import { prisma } from '@config/db'

export type DocType = 'PO' | 'INV' | 'SL' | 'SR' | 'SD'

interface GenerateDocNumberOptions {
  type: DocType
  pharmacyId: number
  pharmacyCode: string
}

export const generateDocNumber = async (
  options: GenerateDocNumberOptions
): Promise<string> => {
  const { type, pharmacyId, pharmacyCode } = options

  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')

  let count: number = 0

  switch (type) {
    case 'PO':
      count = await prisma.purchaseOrder.count({
        where: {
          pharmacyId,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      })
      break
    case 'INV':
      count = await prisma.invoice.count({
        where: {
          pharmacyId,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      })
      break
    case 'SL':
      count = await prisma.sale.count({
        where: {
          pharmacyId,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      })
      break
    case 'SR':
      count = await prisma.stockReturn.count({
        where: {
          pharmacyId,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      })
      break
    case 'SD':
      count = await prisma.stockDisposal.count({
        where: {
          pharmacyId,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      })
      break
  }

  const seq = String(count + 1).padStart(3, '0')

  return `${type}-${pharmacyCode.toUpperCase()}-${dateStr}-${seq}`
}