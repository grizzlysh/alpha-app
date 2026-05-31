import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { RecordStatus } from '@prisma/client'

// ── Query/Param/Body Types ────────────────────────────

export interface CustomerQueryParams {
  search?: string
  status?: RecordStatus
  isWalkIn?: string
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: string
  limit?: string
}

export interface CustomerUuidParam extends ParamsDictionary {
  customer_uuid: string
}

export interface CreateCustomerBody {
  name: string
  phone?: string
  address?: string
  description?: string
}

export interface UpdateCustomerBody {
  name?: string
  phone?: string
  address?: string
  description?: string
  status?: RecordStatus
}

// ── Typed Request Aliases ─────────────────────────────

export type GetCustomersRequest = Request<
  {},
  {},
  {},
  CustomerQueryParams
>

export type GetCustomerRequest = Request<
  CustomerUuidParam,
  {}, {}, {}
>

export type CreateCustomerRequest = Request<
  {},
  {},
  CreateCustomerBody,
  {}
>

export type UpdateCustomerRequest = Request<
  CustomerUuidParam,
  {},
  UpdateCustomerBody,
  {}
>

export type DeleteCustomerRequest = Request<
  CustomerUuidParam,
  {}, {}, {}
>

// ── Response Types ────────────────────────────────────

export interface CustomerResponse {
  uuid: string
  name: string
  phone: string | null
  address: string | null
  description: string | null
  isWalkIn: boolean
  status: RecordStatus
  createdAt: Date
  updatedAt: Date
}

export interface CustomerDropdownItem {
  uuid: string
  name: string
  phone: string | null
  isWalkIn: boolean
}