import { Request } from 'express'
import { CashMovementInput, CloseShiftInput, OpenShiftInput } from './shifts.validation'
import { ShiftSettings } from '@utils/cashierShift'

export interface ShiftSummary {
  saleCount: number
  /** Cash taken for sales and credit instalments. */
  cashSales: number
  /** Transfers and other non-cash payments (not in the drawer). */
  nonCashSales: number
  /** Cash paid back for refunded or cancelled sales. */
  cashRefunds: number
  cashIn: number
  cashOut: number
  /** Opening cash + cash sales − refunds + cash in − cash out. */
  expectedCash: number
}

export interface ShiftCashMovementResponse {
  uuid: string
  type: 'IN' | 'OUT'
  amount: number
  note: string
  createdAt: Date
  createdBy: string | null
}

export interface ShiftSaleResponse {
  uuid: string
  saleNumber: string
  soldAt: Date
  status: string
  saleType: string
  grandTotal: number
  /** Refunded or cancelled in this shift (money paid back from this drawer). */
  refundedHere: boolean
}

export interface ShiftResponse {
  uuid: string
  shiftNumber: string
  status: 'OPEN' | 'CLOSED'
  cashier: { uuid: string; name: string }
  openedAt: Date
  openingCash: number
  openingNote: string | null
  closedAt: Date | null
  closedBy: { uuid: string; name: string } | null
  countedCash: number | null
  difference: number | null
  closingNote: string | null
  /** Hidden (null) from the cashier while a blind-close shift is open. */
  summary: ShiftSummary | null
}

export interface ShiftDetailResponse extends ShiftResponse {
  cashMovements: ShiftCashMovementResponse[]
  sales: ShiftSaleResponse[]
}

export interface CurrentShiftResponse {
  settings: ShiftSettings
  shift: ShiftResponse | null
}

/** Who is asking: managers see every cashier's shifts and the expected cash. */
export interface ShiftViewer {
  userId: number
  canManage: boolean
}

export type OpenShiftRequest = Request<object, object, OpenShiftInput>
export type CloseShiftRequest = Request<{ shift_uuid: string }, object, CloseShiftInput>
export type CashMovementRequest = Request<{ shift_uuid: string }, object, CashMovementInput>
export type GetShiftRequest = Request<{ shift_uuid: string }>
export type GetShiftsRequest = Request
