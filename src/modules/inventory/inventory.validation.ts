import { z } from 'zod'
import { StockMovementType, StockMovementReason } from '@prisma/client'

export const stockQuerySchema = z.object({
  search: z.string().optional(),
  isLowStock: z.enum(['true', 'false']).optional(),
  isExpiringSoon: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'totalPieces', 'updatedAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export const stockMovementQuerySchema = z.object({
  medicineUuid: z.string().uuid().optional(),
  type: z.nativeEnum(StockMovementType).optional(),
  reason: z.nativeEnum(StockMovementReason).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export const updatePriceSchema = z.object({
  sellingPrice: z.number().positive().nullable(),
})

export const updateReorderLevelSchema = z.object({
  reorderLevel: z.number().int().min(0, {
    message: 'Reorder level must be 0 or greater',
  }),
})

export const adjustStockSchema = z.object({
  quantity: z.number().int().min(0, {
    message: 'Quantity must be 0 or greater',
  }),
  signedByUuid: z.string().uuid({ message: 'Invalid employee UUID' }),
  description: z.string().min(1, { message: 'Description is required for adjustment' }),
})

export type StockQueryInput = z.infer<typeof stockQuerySchema>
export type StockMovementQueryInput = z.infer<typeof stockMovementQuerySchema>
export type UpdatePriceInput = z.infer<typeof updatePriceSchema>
export type UpdateReorderLevelInput = z.infer<typeof updateReorderLevelSchema>
export type AdjustStockInput = z.infer<typeof adjustStockSchema>