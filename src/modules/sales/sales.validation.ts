import { SaleType, SaleStatus, PaymentMethod, PaymentStatus } from '@prisma/client'
import { z } from 'zod'

export const createSaleDetailSchema = z.object({
  stockDetailUuid: z.string().trim().uuid({ message: 'Invalid stock detail UUID' }),
  quantityPieces: z.number().int().positive({ message: 'Quantity must be positive' }),
  discount: z.number().min(0).max(100).optional().default(0),
  isFefoOverride: z.boolean().optional().default(false),
})

export const createSaleSchema = z.object({
  customerUuid: z.string().trim().uuid().optional(),
  saleType: z.enum(SaleType).optional().default(SaleType.CASH),
  description: z.string().trim().optional(),
  details: z
    .array(createSaleDetailSchema)
    .min(1, { message: 'At least one item is required' }),
})

export const cancelSaleSchema = z.object({
  description: z.string().trim().min(1, { message: 'Description is required' }),
})

export const addPaymentSchema = z.object({
  amount: z.number().positive({ message: 'Amount must be positive' }),
  paymentMethod: z.enum(PaymentMethod),
  paymentDate: z.string().trim().min(1, { message: 'Payment date is required' }),
  description: z.string().trim().optional(),
})

export const saleQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(SaleStatus).optional(),
  saleType: z.enum(SaleType).optional(),
  paymentStatus: z.enum(PaymentStatus).optional(),
  customerUuid: z.string().trim().uuid().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  sortBy: z.enum(['saleNumber', 'soldAt', 'totalAmount']).optional().default('soldAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>
export type AddPaymentInput = z.infer<typeof addPaymentSchema>
export type SaleQueryInput = z.infer<typeof saleQuerySchema>
