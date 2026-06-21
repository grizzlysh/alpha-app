import { PaymentMethod, PaymentStatus } from '@prisma/client'
import { z } from 'zod'

export const createInvoiceDetailSchema = z.object({
  medicineUuid: z.string().trim().uuid({ message: 'Invalid medicine UUID' }),
  batchNumber: z.string().trim().toLowerCase().min(1, { message: 'Batch number is required' }),
  expiryDate: z.string().trim().min(1, { message: 'Expiry date is required' }),
  quantityBox: z.number().int().positive({ message: 'Quantity box must be positive' }),
  quantityPerBox: z.number().int().positive({ message: 'Quantity per box must be positive' }),
  quantityPieces: z.number().int().positive({ message: 'Quantity pieces must be positive' }),
  price: z.number().positive({ message: 'Price must be positive' }),
  discountPercentage: z.number().min(0).max(100).optional().default(0),
})

export const createInvoiceSchema = z.object({
  distributorUuid: z.string().trim().uuid({ message: 'Invalid distributor UUID' }),
  purchaseOrderUuid: z.string().trim().uuid().optional(),
  signedByUuid: z.string().trim().uuid().optional(),
  invoiceNumber: z.string().trim().toLowerCase().min(1, { message: 'Invoice number is required' }),
  invoiceDate: z.string().trim().min(1, { message: 'Invoice date is required' }),
  dueDate: z.string().trim().min(1, { message: 'Due date is required' }),
  receiveDate: z.string().trim().min(1, { message: 'Receive date is required' }),
  discountPercentage: z.number().min(0).max(100).optional().default(0),
  ppnPercentage: z.number().min(0).max(100).optional().default(0),
  description: z.string().trim().optional(),
  details: z
    .array(createInvoiceDetailSchema)
    .min(1, { message: 'At least one detail is required' }),
})

export const invoiceQuerySchema = z.object({
  search: z.string().trim().optional(),
  paymentStatus: z.enum(PaymentStatus).optional(),
  distributorUuid: z.string().trim().uuid().optional(),
  purchaseOrderUuid: z.string().trim().uuid().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  sortBy: z
    .enum(['invoiceDate', 'createdAt', 'totalAmount'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export const addPaymentSchema = z.object({
  amount: z.number().positive({ message: 'Amount must be positive' }),
  paymentMethod: z.enum(PaymentMethod),
  paymentDate: z.string().trim().min(1, { message: 'Payment date is required' }),
  description: z.string().trim().optional(),
})

export const updatePaymentHistorySchema = z.object({
  paymentMethod: z.enum(PaymentMethod).optional(),
  paymentDate: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>
export type AddPaymentInput = z.infer<typeof addPaymentSchema>
export type UpdatePaymentHistoryInput = z.infer<typeof updatePaymentHistorySchema>
