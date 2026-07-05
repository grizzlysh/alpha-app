import { z } from 'zod'
import { RecordStatus, CustomerType } from '@prisma/client'

const patientDetailSchema = z.object({
  nik: z.string().trim().optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  dateOfBirth: z.string().datetime().optional(),
  bpjsNumber: z.string().trim().optional(),
})

const professionalDetailSchema = z.object({
  strNumber: z.string().trim().optional(),
  sipNumber: z.string().trim().optional(),
  profession: z.string().trim().optional(),
})

export const createCustomerSchema = z.object({
  customerType: z.nativeEnum(CustomerType),
  name: z.string().trim().min(1, { message: 'Name is required' }),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  description: z.string().trim().optional(),
  patientDetail: patientDetailSchema.optional(),
  professionalDetail: professionalDetailSchema.optional(),
})

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
  patientDetail: patientDetailSchema.optional(),
  professionalDetail: professionalDetailSchema.optional(),
})

export const customerQuerySchema = z.object({
  search: z.string().trim().optional(),
  customerType: z.nativeEnum(CustomerType).optional(),
  status: z.nativeEnum(RecordStatus).optional(),
  isWalkIn: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>
