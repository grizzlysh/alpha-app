import { prisma } from '@config/db'
import { NotFoundException } from '@exceptions/NotFoundException'
import { UpdateCabinetPositionInput } from './inventory.validation'
import { BinItemResponse, CabinetNode, ExpiryStatus, Rotation } from './inventory.interface'

const EXPIRY_WARNING_DAYS = 30

const getExpiryStatus = (expiryDate: Date): ExpiryStatus => {
  const now = new Date()
  if (expiryDate < now) return 'EXPIRED'
  const warningThreshold = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000)
  if (expiryDate <= warningThreshold) return 'EXPIRING_SOON'
  return 'OK'
}

export const getInventoryTree = async (pharmacyId: number): Promise<CabinetNode[]> => {
  const cabinets = await prisma.storageCabinet.findMany({
    where: { pharmacyId, deletedAt: null },
    select: {
      uuid: true,
      name: true,
      code: true,
      status: true,
      posX: true,
      posY: true,
      width: true,
      height: true,
      rotation: true,
      shelves: {
        where: { deletedAt: null },
        select: {
          uuid: true,
          name: true,
          code: true,
          level: true,
          status: true,
          bins: {
            where: { deletedAt: null },
            select: {
              uuid: true,
              name: true,
              code: true,
              status: true,
              _count: { select: { stockDetails: true } },
            },
            orderBy: { code: 'asc' },
          },
        },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      },
    },
    orderBy: { name: 'asc' },
  })

  return cabinets.map((cabinet) => ({
    ...cabinet,
    rotation: cabinet.rotation as Rotation | null,
    shelves: cabinet.shelves.map((shelf) => ({
      ...shelf,
      bins: shelf.bins.map(({ _count, ...bin }) => ({
        ...bin,
        itemCount: _count.stockDetails,
      })),
    })),
  }))
}

export const getBinItems = async (
  binUuid: string,
  pharmacyId: number
): Promise<BinItemResponse[]> => {
  const bin = await prisma.storageBin.findFirst({
    where: { uuid: binUuid, deletedAt: null, shelf: { cabinet: { pharmacyId } } },
    select: { id: true },
  })
  if (!bin) throw new NotFoundException('Storage bin not found')

  const items = await prisma.stockDetail.findMany({
    where: { binId: bin.id },
    select: {
      uuid: true,
      batchNumber: true,
      barcode: true,
      expiryDate: true,
      quantityPieces: true,
      quantityBox: true,
      quantityPerBox: true,
      stock: {
        select: {
          medicine: { select: { uuid: true, name: true, unit: true } },
        },
      },
      distributor: { select: { uuid: true, name: true } },
      saleDetails: { select: { quantityPieces: true } },
      stockDisposalDetails: { select: { quantityPieces: true } },
      stockReturnDetails: { select: { quantityPieces: true } },
    },
    orderBy: { expiryDate: 'asc' },
  })

  return items.map((item) => {
    const sold = item.saleDetails.reduce((s, d) => s + d.quantityPieces, 0)
    const disposed = item.stockDisposalDetails.reduce((s, d) => s + d.quantityPieces, 0)
    const returned = item.stockReturnDetails.reduce((s, d) => s + d.quantityPieces, 0)
    const remainingPieces = item.quantityPieces - sold - disposed + returned

    return {
      uuid: item.uuid,
      batchNumber: item.batchNumber,
      barcode: item.barcode,
      expiryDate: item.expiryDate,
      expiryStatus: getExpiryStatus(item.expiryDate),
      quantityPieces: item.quantityPieces,
      remainingPieces,
      quantityBox: item.quantityBox,
      quantityPerBox: item.quantityPerBox,
      medicine: item.stock.medicine,
      distributor: item.distributor,
    }
  })
}

export const updateCabinetPosition = async (
  cabinetUuid: string,
  data: UpdateCabinetPositionInput,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const cabinet = await prisma.storageCabinet.findFirst({
    where: { uuid: cabinetUuid, pharmacyId, deletedAt: null },
    select: { id: true },
  })
  if (!cabinet) throw new NotFoundException('Storage cabinet not found')

  await prisma.storageCabinet.update({
    where: { id: cabinet.id },
    data: {
      posX: data.posX,
      posY: data.posY,
      ...(data.width !== undefined && { width: data.width }),
      ...(data.height !== undefined && { height: data.height }),
      ...(data.rotation !== undefined && { rotation: data.rotation }),
      updatedById: userId,
    },
  })
}
