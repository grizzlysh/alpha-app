import { z } from 'zod'
import { StockMovementType, StockMovementReason } from '@prisma/client'

export const stockDetailQuerySchema = z.object({
  search: z.string().trim().optional(),
  /** One medicine's sellable batches, earliest expiry first (FEFO), expired excluded. */
  medicineUuid: z.string().trim().uuid().optional(),
  /** Exact scan: a batch barcode, or a medicine barcode (its sellable batches, FEFO). */
  barcode: z.string().trim().min(1).max(64).optional(),
})

export const stockCatalogQuerySchema = z.object({
  search: z.string().trim().optional(),
  medicineTypeUuid: z.string().trim().uuid({ message: 'Invalid medicine type UUID' }).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export const stockQuerySchema = z.object({
  search: z.string().trim().optional(),
  isLowStock: z.enum(['true', 'false']).optional(),
  isExpiringSoon: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'totalPieces', 'updatedAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(1000).optional().default(10),
})

export const stockMovementQuerySchema = z.object({
  medicineUuid: z.string().trim().uuid().optional(),
  type: z.enum(StockMovementType).optional(),
  reason: z.enum(StockMovementReason).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
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
  signedByUuid: z.string().trim().uuid({ message: 'Invalid employee UUID' }),
  description: z.string().trim().min(1, { message: 'Description is required for adjustment' }),
})

const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be yyyy-MM-dd' })

export const medicineStockCardQuerySchema = z
  .object({ from: isoDate.optional(), to: isoDate.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'Start date must be before end date', path: ['from'] })
  .refine((q) => !q.from || !q.to || (Date.parse(q.to) - Date.parse(q.from)) / 86_400_000 <= 366, {
    message: 'The period can be at most one year',
    path: ['to'],
  })

export type MedicineStockCardQueryInput = z.infer<typeof medicineStockCardQuerySchema>
export type StockDetailQueryInput = z.infer<typeof stockDetailQuerySchema>
export type StockCatalogQueryInput = z.infer<typeof stockCatalogQuerySchema>
export type StockQueryInput = z.infer<typeof stockQuerySchema>
export type StockMovementQueryInput = z.infer<typeof stockMovementQuerySchema>
export type UpdatePriceInput = z.infer<typeof updatePriceSchema>
export type UpdateReorderLevelInput = z.infer<typeof updateReorderLevelSchema>
export type AdjustStockInput = z.infer<typeof adjustStockSchema>
