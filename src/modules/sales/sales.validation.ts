import { SaleType, SaleStatus, PaymentMethod, PaymentStatus } from '@prisma/client'
import { z } from 'zod'

const inlinePrescriptionItemSchema = z.object({
  medicineUuid: z.string().uuid().optional(),
  medicineName: z.string().min(1).max(255),
  frequency: z.string().max(50).optional(),
  duration: z.string().max(100).optional(),
  qty: z.number().int().min(1),
  notes: z.string().optional(),
})

export const inlinePrescriptionSchema = z.object({
  doctorUuid: z.string().uuid().optional(),
  prescriptionNumber: z.string().max(100).optional(),
  prescribedAt: z.coerce.date(),
  notes: z.string().optional(),
  items: z.array(inlinePrescriptionItemSchema).min(1),
})

export const createSaleDetailSchema = z.object({
  stockDetailUuid: z.string().trim().uuid({ message: 'Invalid stock detail UUID' }),
  quantityPieces: z.number().int().positive({ message: 'Quantity must be positive' }),
  sellingPrice: z.number().positive({ message: 'Selling price must be positive' }),
  originalPrice: z.number().positive({ message: 'Original price must be positive' }),
  discountPercentage: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().min(0).optional().default(0),
  isFefoOverride: z.boolean().optional().default(false),
})

export const createSalePaymentSchema = z.object({
  paymentMethod: z.enum(PaymentMethod),
  description: z.string().trim().optional(),
})

export const createSaleSchema = z
  .object({
    customerUuid: z.string().trim().uuid().optional(),
    saleType: z.enum(SaleType).optional().default(SaleType.CASH),
    discountPercentage: z.number().min(0).max(100).optional().default(0),
    discountAmount: z.number().min(0).optional().default(0),
    ppnPercentage: z.number().min(0).max(100).optional().default(0),
    ppnAmount: z.number().min(0).optional().default(0),
    totalAmount: z.number().positive({ message: 'Total amount is required' }),
    grandTotal: z.number().positive({ message: 'Grand total is required' }),
    paidAmount: z.number().min(0).optional().default(0),
    description: z.string().trim().optional(),
    isPending: z.boolean().optional().default(false),
    isPrescription: z.boolean().optional().default(false),
    details: z
      .array(createSaleDetailSchema)
      .min(1, { message: 'At least one item is required' }),
    payment: createSalePaymentSchema.optional(),
    prescriptionUuid: z.string().trim().uuid().optional(),
    prescription: inlinePrescriptionSchema.optional(),
  })
  .refine((data) => data.isPending || data.saleType !== SaleType.CASH || !!data.payment, {
    message: 'Payment information is required for CASH sales',
    path: ['payment'],
  })
  .refine((data) => data.isPending || !data.isPrescription || !!data.prescriptionUuid || !!data.prescription, {
    message: 'Prescription is required when isPrescription is true',
    path: ['prescription'],
  })

// Used for PATCH /sales/:uuid — always a pending sale, no payment needed
export const updateSaleSchema = z.object({
  customerUuid: z.string().trim().uuid().optional(),
  saleType: z.enum(SaleType).optional().default(SaleType.CASH),
  discountPercentage: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().min(0).optional().default(0),
  ppnPercentage: z.number().min(0).max(100).optional().default(0),
  ppnAmount: z.number().min(0).optional().default(0),
  totalAmount: z.number().positive({ message: 'Total amount is required' }),
  grandTotal: z.number().positive({ message: 'Grand total is required' }),
  description: z.string().trim().optional(),
  isPrescription: z.boolean().optional().default(false),
  details: z
    .array(createSaleDetailSchema)
    .min(1, { message: 'At least one item is required' }),
  prescriptionUuid: z.string().trim().uuid().optional(),
  prescription: inlinePrescriptionSchema.optional(),
})

export const cancelSaleSchema = z.object({
  description: z.string().trim().min(1, { message: 'Description is required' }),
})

export const addPaymentSchema = z.object({
  paidAmount: z.number().positive({ message: 'Paid amount must be positive' }),
  paymentMethod: z.enum(PaymentMethod),
  paymentDate: z.string().trim().min(1, { message: 'Payment date is required' }),
  description: z.string().trim().optional(),
})

export const saleQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(SaleStatus).optional(),
  saleType: z.enum(SaleType).optional(),
  paymentStatus: z.enum(PaymentStatus).optional(),
  customerUuid: z.string().trim().uuid().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  sortBy: z.enum(['saleNumber', 'soldAt', 'totalAmount']).optional().default('soldAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export const updatePaymentHistorySchema = z.object({
  paymentMethod: z.enum(PaymentMethod).optional(),
  paymentDate: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
})

export type InlinePrescriptionInput = z.infer<typeof inlinePrescriptionSchema>
export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>
export type AddPaymentInput = z.infer<typeof addPaymentSchema>
export type UpdatePaymentHistoryInput = z.infer<typeof updatePaymentHistorySchema>
export type SaleQueryInput = z.infer<typeof saleQuerySchema>
