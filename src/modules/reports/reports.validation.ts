import { z } from 'zod'
import { StockMovementType, StockMovementReason } from '@prisma/client'

const dateRangeSchema = z.object({
  period: z.enum(['monthly']).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
})

// ── Sales ────────────────────────────────────────────────────

export const salesReportSchema = dateRangeSchema

// ── Purchases ────────────────────────────────────────────────

export const purchaseReportSchema = dateRangeSchema.extend({
  distributorUuid: z.string().trim().uuid().optional(),
})

// ── Inventory ────────────────────────────────────────────────

export const inventoryReportSchema = z.object({
  expiryDays: z.coerce.number().int().positive().optional().default(30),
})

// ── Stock Movements ──────────────────────────────────────────

export const stockMovementReportSchema = dateRangeSchema.extend({
  medicineUuid: z.string().trim().uuid().optional(),
  type: z.enum(StockMovementType).optional(),
  reason: z.enum(StockMovementReason).optional(),
})

// ── Disposals ────────────────────────────────────────────────

export const disposalReportSchema = dateRangeSchema

// ── Returns ──────────────────────────────────────────────────

export const returnReportSchema = dateRangeSchema.extend({
  distributorUuid: z.string().trim().uuid().optional(),
})

// ── Inferred Types ───────────────────────────────────────────

export type SalesReportInput = z.infer<typeof salesReportSchema>
export type PurchaseReportInput = z.infer<typeof purchaseReportSchema>
export type InventoryReportInput = z.infer<typeof inventoryReportSchema>
export type StockMovementReportInput = z.infer<typeof stockMovementReportSchema>
export type DisposalReportInput = z.infer<typeof disposalReportSchema>
export type ReturnReportInput = z.infer<typeof returnReportSchema>
