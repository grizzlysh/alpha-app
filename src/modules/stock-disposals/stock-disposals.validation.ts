import { z } from 'zod'
import { StockDisposalStatus, DisposalReason } from '@prisma/client'

export const createStockDisposalDetailSchema = z.object({
  stockDetailUuid: z.string().trim().uuid({ message: 'Invalid stock detail UUID' }),
  quantityPieces: z.number().int().positive({ message: 'Quantity must be positive' }),
  reason: z.nativeEnum(DisposalReason, { message: 'Invalid disposal reason' }),
})

export const createStockDisposalSchema = z.object({
  signedByUuid: z.string().trim().uuid().optional(),
  description: z.string().trim().optional(),
  details: z
    .array(createStockDisposalDetailSchema)
    .min(1, { message: 'At least one detail is required' }),
})

export const updateStockDisposalSchema = z.object({
  signedByUuid: z.string().trim().uuid().optional(),
  description: z.string().trim().optional(),
  details: z.array(createStockDisposalDetailSchema).min(1).optional(),
})

export const cancelStockDisposalSchema = z.object({
  description: z.string().trim().min(1, { message: 'Description is required' }),
})

export const stockDisposalQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(StockDisposalStatus).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  sortBy: z
    .enum(['disposalNumber', 'createdAt', 'disposedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateStockDisposalInput = z.infer<typeof createStockDisposalSchema>
export type UpdateStockDisposalInput = z.infer<typeof updateStockDisposalSchema>
export type CancelStockDisposalInput = z.infer<typeof cancelStockDisposalSchema>
export type StockDisposalQueryInput = z.infer<typeof stockDisposalQuerySchema>