import { z } from 'zod'
import { TIME_PATTERN } from '@jobs/settings'

export const jobRunQuerySchema = z.object({
  name: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

/** Ranges of the job-specific params are checked against the registry in the service. */
export const updateJobSettingsSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(TIME_PATTERN, { message: 'Use HH:mm (00:00–23:59)' }),
  params: z.record(z.string(), z.number().int()).optional().default({}),
})

export type JobRunQueryInput = z.infer<typeof jobRunQuerySchema>
export type UpdateJobSettingsInput = z.infer<typeof updateJobSettingsSchema>
