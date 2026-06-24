import { z } from 'zod'

export const createDoctorSchema = z.object({
  name: z.string().min(1).max(255),
  licenseNumber: z.string().max(100).optional(),
  specialty: z.string().max(255).optional(),
  clinicName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  userUuid: z.string().uuid().optional(),
})

export const updateDoctorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  licenseNumber: z.string().max(100).optional().nullable(),
  specialty: z.string().max(255).optional().nullable(),
  clinicName: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

export const doctorQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>
export type DoctorQueryInput = z.infer<typeof doctorQuerySchema>
