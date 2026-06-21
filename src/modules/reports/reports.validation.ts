import { StockMovementType, StockMovementReason } from '@prisma/client'
import { z } from 'zod'

const dateRangeSchema = z.object({
  period: z.enum(['monthly']).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
})

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(25),
})

// ── Sales ────────────────────────────────────────────────────

export const salesSummarySchema = dateRangeSchema
export const salesListSchema = dateRangeSchema.merge(paginationSchema)
export const salesExportSchema = dateRangeSchema

// ── Purchases ────────────────────────────────────────────────

const purchaseFiltersSchema = dateRangeSchema.extend({
  distributorUuid: z.string().trim().uuid().optional(),
})

export const purchaseSummarySchema = purchaseFiltersSchema
export const purchaseListSchema = purchaseFiltersSchema.merge(paginationSchema)
export const purchaseExportSchema = purchaseFiltersSchema

// ── Inventory ────────────────────────────────────────────────

const inventoryFiltersSchema = z.object({
  expiryDays: z.coerce.number().int().positive().optional().default(30),
  isLowStock: z.string().optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
})

export const inventorySummarySchema = inventoryFiltersSchema.omit({ isLowStock: true })
export const inventoryListSchema = inventoryFiltersSchema.merge(paginationSchema)
export const inventoryExportSchema = inventoryFiltersSchema

// ── Stock Movements ──────────────────────────────────────────

const movementFiltersSchema = dateRangeSchema.extend({
  medicineUuid: z.string().trim().uuid().optional(),
  type: z.enum(StockMovementType).optional(),
  reason: z.enum(StockMovementReason).optional(),
})

export const stockMovementSummarySchema = movementFiltersSchema
export const stockMovementListSchema = movementFiltersSchema.merge(paginationSchema)
export const stockMovementExportSchema = movementFiltersSchema

// ── Disposals ────────────────────────────────────────────────

export const disposalSummarySchema = dateRangeSchema
export const disposalListSchema = dateRangeSchema.merge(paginationSchema)
export const disposalExportSchema = dateRangeSchema

// ── Returns ──────────────────────────────────────────────────

const returnFiltersSchema = dateRangeSchema.extend({
  distributorUuid: z.string().trim().uuid().optional(),
})

export const returnSummarySchema = returnFiltersSchema
export const returnListSchema = returnFiltersSchema.merge(paginationSchema)
export const returnExportSchema = returnFiltersSchema

// ── Inferred Types ───────────────────────────────────────────

export type SalesSummaryInput = z.infer<typeof salesSummarySchema>
export type SalesListInput = z.infer<typeof salesListSchema>
export type SalesExportInput = z.infer<typeof salesExportSchema>

export type PurchaseSummaryInput = z.infer<typeof purchaseSummarySchema>
export type PurchaseListInput = z.infer<typeof purchaseListSchema>
export type PurchaseExportInput = z.infer<typeof purchaseExportSchema>

export type InventorySummaryInput = z.infer<typeof inventorySummarySchema>
export type InventoryListInput = z.infer<typeof inventoryListSchema>
export type InventoryExportInput = z.infer<typeof inventoryExportSchema>

export type StockMovementSummaryInput = z.infer<typeof stockMovementSummarySchema>
export type StockMovementListInput = z.infer<typeof stockMovementListSchema>
export type StockMovementExportInput = z.infer<typeof stockMovementExportSchema>

export type DisposalSummaryInput = z.infer<typeof disposalSummarySchema>
export type DisposalListInput = z.infer<typeof disposalListSchema>
export type DisposalExportInput = z.infer<typeof disposalExportSchema>

export type ReturnSummaryInput = z.infer<typeof returnSummarySchema>
export type ReturnListInput = z.infer<typeof returnListSchema>
export type ReturnExportInput = z.infer<typeof returnExportSchema>
