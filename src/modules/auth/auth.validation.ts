import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email({
    message: 'Invalid email format',
  }),
  password: z.string().trim().min(6, {
    message: 'Password must be at least 6 characters',
  }),
})

export const selectPharmacySchema = z.object({
  pharmacyUuid: z.string().trim().uuid({
    message: 'Invalid pharmacy UUID',
  }),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SelectPharmacyInput = z.infer<typeof selectPharmacySchema>