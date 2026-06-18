import { z } from 'zod'

export const advancedDashboardQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((v) => [7, 30].includes(v), { message: 'days must be 7 or 30' })
    .optional()
    .default(7),
})

export type AdvancedDashboardQueryInput = z.infer<typeof advancedDashboardQuerySchema>
