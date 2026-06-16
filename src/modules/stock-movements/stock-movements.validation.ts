import { z } from 'zod'
import { StockMovementType, StockMovementReason } from '@prisma/client'

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

export type StockMovementQueryInput = z.infer<typeof stockMovementQuerySchema>
