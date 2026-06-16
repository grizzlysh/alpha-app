import { z } from 'zod'
import { StockReturnStatus } from '@prisma/client'

export const createStockReturnDetailSchema = z.object({
  stockDetailUuid: z.string().trim().uuid({ message: 'Invalid stock detail UUID' }),
  quantityPieces: z.number().int().positive({ message: 'Quantity must be positive' }),
  reason: z.string().trim().optional(),
})

export const createStockReturnSchema = z.object({
  distributorUuid: z.string().trim().uuid({ message: 'Invalid distributor UUID' }),
  signedByUuid: z.string().trim().uuid().optional(),
  reason: z.string().trim().optional(),
  description: z.string().trim().optional(),
  details: z
    .array(createStockReturnDetailSchema)
    .min(1, { message: 'At least one detail is required' }),
})

export const updateStockReturnSchema = z.object({
  distributorUuid: z.string().trim().uuid().optional(),
  signedByUuid: z.string().trim().uuid().optional(),
  reason: z.string().trim().optional(),
  description: z.string().trim().optional(),
  details: z.array(createStockReturnDetailSchema).min(1).optional(),
})

export const cancelStockReturnSchema = z.object({
  description: z.string().trim().min(1, { message: 'Description is required' }),
})

export const rejectStockReturnSchema = z.object({
  description: z.string().trim().min(1, { message: 'Rejection reason is required' }),
})

export const stockReturnQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(StockReturnStatus).optional(),
  distributorUuid: z.string().trim().uuid().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  sortBy: z
    .enum(['returnNumber', 'createdAt', 'returnedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateStockReturnInput = z.infer<typeof createStockReturnSchema>
export type UpdateStockReturnInput = z.infer<typeof updateStockReturnSchema>
export type CancelStockReturnInput = z.infer<typeof cancelStockReturnSchema>
export type RejectStockReturnInput = z.infer<typeof rejectStockReturnSchema>
export type StockReturnQueryInput = z.infer<typeof stockReturnQuerySchema>