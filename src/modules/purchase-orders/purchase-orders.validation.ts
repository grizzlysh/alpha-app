import { z } from 'zod'
import { PurchaseOrderStatus } from '@prisma/client'

export const createPurchaseOrderDetailSchema = z.object({
  medicineUuid: z.string().uuid({ message: 'Invalid medicine UUID' }),
  quantity: z.number().int().positive({ message: 'Quantity must be positive' }),
  unit: z.string().min(1, { message: 'Unit is required' }),
  description: z.string().optional(),
})

export const createPurchaseOrderSchema = z.object({
  distributorUuid: z.string().uuid({ message: 'Invalid distributor UUID' }),
  signedByUuid: z.string().uuid({ message: 'Invalid employee UUID' }).optional(),
  description: z.string().optional(),
  details: z
    .array(createPurchaseOrderDetailSchema)
    .min(1, { message: 'At least one detail is required' }),
})

export const updatePurchaseOrderSchema = z.object({
  distributorUuid: z.string().uuid().optional(),
  signedByUuid: z.string().uuid().optional(),
  description: z.string().optional(),
  details: z.array(createPurchaseOrderDetailSchema).min(1).optional(),
})

export const cancelPurchaseOrderSchema = z.object({
  cancellationReason: z.string().min(1, {
    message: 'Cancellation reason is required',
  }),
})

export const purchaseOrderQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(PurchaseOrderStatus).optional(),
  distributorUuid: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
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