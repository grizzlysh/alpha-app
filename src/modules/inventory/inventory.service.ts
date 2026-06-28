import { prisma } from '@config/db'
import { NotFoundException } from '@exceptions/NotFoundException'
import { BadRequestException } from '@exceptions/BadRequestException'
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

type CabinetBounds = { left: number; right: number; top: number; bottom: number }

const getCabinetBounds = (
  posX: number,
  posY: number,
  width: number,
  height: number,
  rotation: number
): CabinetBounds => {
  const isSwapped = rotation === 90 || rotation === 270
  const effectiveW = isSwapped ? height : width
  const effectiveH = isSwapped ? width : height
  return { left: posX, right: posX + effectiveW, top: posY, bottom: posY + effectiveH }
}

const boundsOverlap = (a: CabinetBounds, b: CabinetBounds): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

export const updateCabinetPosition = async (
  cabinetUuid: string,
  data: UpdateCabinetPositionInput,
  pharmacyId: number,
  userId: number
): Promise<void> => {
  const cabinet = await prisma.storageCabinet.findFirst({
    where: { uuid: cabinetUuid, pharmacyId, deletedAt: null },
    select: { id: true, width: true, height: true, rotation: true },
  })
  if (!cabinet) throw new NotFoundException('Storage cabinet not found')

  const effectiveWidth = data.width ?? cabinet.width ?? 1
  const effectiveHeight = data.height ?? cabinet.height ?? 1
  const effectiveRotation = data.rotation ?? cabinet.rotation ?? 0

  const newBounds = getCabinetBounds(data.posX, data.posY, effectiveWidth, effectiveHeight, effectiveRotation)

  const otherCabinets = await prisma.storageCabinet.findMany({
    where: { pharmacyId, deletedAt: null, uuid: { not: cabinetUuid }, posX: { not: null } },
    select: { uuid: true, name: true, posX: true, posY: true, width: true, height: true, rotation: true },
  })

  for (const other of otherCabinets) {
    if (other.posX == null || other.posY == null || other.width == null || other.height == null) continue
    const otherBounds = getCabinetBounds(other.posX, other.posY, other.width, other.height, other.rotation ?? 0)
    if (boundsOverlap(newBounds, otherBounds)) {
      throw new BadRequestException(`Cabinet position overlaps with cabinet "${other.name}"`)
    }
  }

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
