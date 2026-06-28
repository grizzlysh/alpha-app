import { z } from 'zod'

const prescriptionDetailSchema = z.object({
  medicineUuid: z.string().uuid().optional(),
  medicineName: z.string().min(1).max(255),
  frequency: z.string().max(50).optional(),
  duration: z.string().max(100).optional(),
  qty: z.number().int().min(1),
  notes: z.string().optional(),
})

export const createPrescriptionSchema = z.object({
  customerUuid: z.string().uuid(),
  doctorUuid: z.string().uuid().optional(),
  prescriptionNumber: z.string().max(100).optional(),
  prescribedAt: z.coerce.date(),
  notes: z.string().optional(),
  items: z.array(prescriptionDetailSchema).min(1),
})

export const updatePrescriptionSchema = z.object({
  doctorUuid: z.string().uuid().optional().nullable(),
  prescriptionNumber: z.string().max(100).optional().nullable(),
  prescribedAt: z.coerce.date().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(
    prescriptionDetailSchema.extend({
      uuid: z.string().uuid().optional(),
    })
  ).min(1).optional(),
})

export const prescriptionQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['PENDING', 'DISPENSED', 'PARTIAL', 'CANCELLED', 'EXPIRED']).optional(),
  doctorUuid: z.string().uuid().optional(),
  customerUuid: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['prescribedAt', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const availablePrescriptionsQuerySchema = z.object({
  customerUuid: z.string().uuid().optional(),
})

const dispenseItemSchema = z.object({
  detailUuid: z.string().uuid(),
  dispensedQty: z.number().int().min(1),
  stockDetailUuid: z.string().uuid(),
  sellingPrice: z.number().positive(),
  originalPrice: z.number().min(0),
  discountPercentage: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
})

export const dispensePrescriptionSchema = z.object({
  items: z.array(dispenseItemSchema).min(1),
  saleType: z.enum(['CASH', 'CREDIT']).default('CASH'),
  discountPercentage: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  ppnPercentage: z.number().min(0).max(100).default(0),
  ppnAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  grandTotal: z.number().min(0),
  description: z.string().optional(),
  payment: z.object({
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'DEBIT', 'CREDIT_CARD', 'QRIS']),
    description: z.string().optional(),
  }).optional(),
})

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>
export type PrescriptionQueryInput = z.infer<typeof prescriptionQuerySchema>
export type DispensePrescriptionInput = z.infer<typeof dispensePrescriptionSchema>
export type AvailablePrescriptionsQueryInput = z.infer<typeof availablePrescriptionsQuerySchema>
