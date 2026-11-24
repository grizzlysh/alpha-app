import { z } from 'zod'

export const jobRunQuerySchema = z.object({
  name: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export type JobRunQueryInput = z.infer<typeof jobRunQuerySchema>
