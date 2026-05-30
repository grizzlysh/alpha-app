import { z } from 'zod'
import { PurchaseOrderStatus } from '@prisma/client'

export const createPurchaseOrderDetailSchema = z.object({
  medicineUuid: z.string().trim().uuid({ message: 'Invalid medicine UUID' }),
  quantity: z.number().int().positive({ message: 'Quantity must be positive' }),
  unit: z.string().trim().min(1, { message: 'Unit is required' }),
  description: z.string().trim().optional(),
})

export const createPurchaseOrderSchema = z.object({
  distributorUuid: z.string().trim().uuid({ message: 'Invalid distributor UUID' }),
  signedByUuid: z.string().trim().uuid({ message: 'Invalid employee UUID' }).optional(),
  description: z.string().trim().optional(),
  details: z
    .array(createPurchaseOrderDetailSchema)
    .min(1, { message: 'At least one detail is required' }),
})

export const updatePurchaseOrderSchema = z.object({
  distributorUuid: z.string().trim().uuid().optional(),
  signedByUuid: z.string().trim().uuid().optional(),
  description: z.string().trim().optional(),
  details: z.array(createPurchaseOrderDetailSchema).min(1).optional(),
})

export const cancelPurchaseOrderSchema = z.object({
  cancellationReason: z.string().trim().min(1, {
    message: 'Cancellation reason is required',
  }),
})

export const purchaseOrderQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(PurchaseOrderStatus).optional(),
  distributorUuid: z.string().trim().uuid().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  sortBy: z
    .enum(['orderNumber', 'orderedAt', 'createdAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>
export type CancelPurchaseOrderInput = z.infer<typeof cancelPurchaseOrderSchema>
export type PurchaseOrderQueryInput = z.infer<typeof purchaseOrderQuerySchema>