import { z } from 'zod'

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use YYYY-MM-DD' })

export const auditLogQuerySchema = z.object({
  /** A module ("users") or one action ("users.reset_password"). */
  action: z.string().trim().regex(/^[a-z_]+(\.[a-z_]+)?$/, { message: 'Invalid action' }).optional(),
  userUuid: z.string().uuid().optional(),
  entityUuid: z.string().trim().max(64).optional(),
  search: z.string().trim().max(100).optional(),
  dateFrom: day.optional(),
  dateTo: day.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>
