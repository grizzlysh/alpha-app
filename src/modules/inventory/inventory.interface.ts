export type ExpiryStatus = 'OK' | 'EXPIRING_SOON' | 'EXPIRED'

export interface BinItemResponse {
  uuid: string
  batchNumber: string
  barcode: string
  expiryDate: Date
  expiryStatus: ExpiryStatus
  quantityPieces: number
  remainingPieces: number
  quantityBox: number
  quantityPerBox: number
  medicine: { uuid: string; name: string; unit: string }
  distributor: { uuid: string; name: string }
}

export interface BinNode {
  uuid: string
  name: string
  code: string
  status: string
  itemCount: number
}

export interface ShelfNode {
  uuid: string
  name: string
  code: string
  level: number | null
  status: string
  bins: BinNode[]
}

export type Rotation = 0 | 90 | 180 | 270

export interface CabinetNode {
  uuid: string
  name: string
  code: string
  status: string
  posX: number | null
  posY: number | null
  width: number | null
  height: number | null
  rotation: Rotation | null
  shelves: ShelfNode[]
}
