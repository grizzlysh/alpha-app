import { z } from 'zod'
import { StockReturnStatus } from '@prisma/client'

export const createStockReturnDetailSchema = z.object({
  stockDetailUuid: z.string().uuid({ message: 'Invalid stock detail UUID' }),
  quantityPieces: z.number().int().positive({ message: 'Quantity must be positive' }),
  reason: z.string().optional(),
})

export const createStockReturnSchema = z.object({
  distributorUuid: z.string().uuid({ message: 'Invalid distributor UUID' }),
  signedByUuid: z.string().uuid().optional(),
  description: z.string().optional(),
  details: z
    .array(createStockReturnDetailSchema)
    .min(1, { message: 'At least one detail is required' }),
})

export const updateStockReturnSchema = z.object({
  distributorUuid: z.string().uuid().optional(),
  signedByUuid: z.string().uuid().optional(),
  description: z.string().optional(),
  details: z.array(createStockReturnDetailSchema).min(1).optional(),
})

export const cancelStockReturnSchema = z.object({
  description: z.string().min(1, { message: 'Description is required' }),
})

export const stockReturnQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(StockReturnStatus).optional(),
  distributorUuid: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
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
export type StockReturnQueryInput = z.infer<typeof stockReturnQuerySchema>