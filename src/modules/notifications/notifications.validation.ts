import { z } from 'zod'

export const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>
