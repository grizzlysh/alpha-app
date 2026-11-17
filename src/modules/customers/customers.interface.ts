import { PaginationMeta } from '@interfaces/common.interface'
import { PaymentStatus, SaleStatus } from '@prisma/client'
import { Request } from 'express'
import { CreateCustomerInput, UpdateCustomerInput } from './customers.validation'

export interface CustomerDetailResponse {
  uuid: string
  customerType: string
  name: string
  phone: string | null
  address: string | null
  description: string | null
  isWalkIn: boolean
  status: string
  createdAt: Date
  updatedAt: Date
  medicalRecord: {
    uuid: string
    number: string
  } | null
  patientDetail: {
    nik: string | null
    gender: string | null
    dateOfBirth: Date | null
    bpjsNumber: string | null
  } | null
  professionalDetail: {
    strNumber: string | null
    sipNumber: string | null
    profession: string | null
  } | null
}

export interface CustomerDropdownItem {
  uuid: string
  name: string
  phone: string | null
  customerType: string
  isWalkIn: boolean
}

export type GetCustomersRequest = Request<{}, {}, {}, any>

export interface GetCustomerRequest extends Request {
  params: { customer_uuid: string }
}

export interface CreateCustomerRequest extends Request {
  body: CreateCustomerInput
}

export interface UpdateCustomerRequest extends Request {
  params: { customer_uuid: string }
  body: UpdateCustomerInput
}

export interface DeleteCustomerRequest extends Request {
  params: { customer_uuid: string }
}

export interface PurchaseHistoryResponse {
  summary: {
    /** Completed sales only. */
    transactionCount: number
    totalSpent: number
    averageSpent: number
    firstPurchaseAt: Date | null
    lastPurchaseAt: Date | null
  }
  /** Most bought medicines in the last 12 months. */
  frequentItems: {
    medicine: { uuid: string; name: string; unit: string }
    timesBought: number
    totalPieces: number
    lastBoughtAt: Date
  }[]
  sales: {
    uuid: string
    saleNumber: string
    soldAt: Date
    status: SaleStatus
    paymentStatus: PaymentStatus | null
    grandTotal: number
    prescription: { uuid: string; prescriptionNumber: string | null } | null
    items: { medicine: { uuid: string; name: string; unit: string }; quantityPieces: number; totalAmount: number }[]
  }[]
  meta: PaginationMeta
}

export interface PurchaseHistoryRequest extends Request {
  params: { customer_uuid: string }
}
