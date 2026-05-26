import { z } from 'zod'
import { SaleStatus, SaleType, PaymentMethod, PaymentStatus } from '@prisma/client'

export const createSaleDetailSchema = z.object({
  stockDetailUuid: z.string().uuid({ message: 'Invalid stock detail UUID' }),
  quantityPieces: z.number().int().positive({ message: 'Quantity must be positive' }),
  isFefoOverride: z.boolean().optional().default(false),
})

export const createSaleSchema = z.object({
  customerUuid: z.string().uuid().optional(),
  saleType: z.nativeEnum(SaleType).optional().default(SaleType.CASH),
  description: z.string().optional(),
  details: z
    .array(createSaleDetailSchema)
    .min(1, { message: 'At least one item is required' }),
})

export const cancelSaleSchema = z.object({
  description: z.string().min(1, { message: 'Description is required' }),
})

export const addPaymentSchema = z.object({
  amount: z.number().positive({ message: 'Amount must be positive' }),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentDate: z.string().min(1, { message: 'Payment date is required' }),
  description: z.string().optional(),
})

export const saleQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(SaleStatus).optional(),
  saleType: z.nativeEnum(SaleType).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  customerUuid: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['saleNumber', 'soldAt', 'totalAmount']).optional().default('soldAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>
export type AddPaymentInput = z.infer<typeof addPaymentSchema>
export type SaleQueryInput = z.infer<typeof saleQuerySchema>