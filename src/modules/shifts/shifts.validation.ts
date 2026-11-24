import { z } from 'zod'

const money = z.coerce.number().min(0, { message: 'Amount cannot be negative' }).max(10_000_000_000)

export const openShiftSchema = z.object({
  openingCash: money,
  note: z.string().trim().max(500).optional(),
})

export const closeShiftSchema = z.object({
  countedCash: money,
  note: z.string().trim().max(500).optional(),
})

export const cashMovementSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  amount: z.coerce.number().positive({ message: 'Amount must be more than 0' }).max(10_000_000_000),
  note: z.string().trim().min(1, { message: 'A note is required' }).max(500),
})

export const shiftQuerySchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  cashierUuid: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use YYYY-MM-DD' }).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use YYYY-MM-DD' }).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

export type OpenShiftInput = z.infer<typeof openShiftSchema>
export type CloseShiftInput = z.infer<typeof closeShiftSchema>
export type CashMovementInput = z.infer<typeof cashMovementSchema>
export type ShiftQueryInput = z.infer<typeof shiftQuerySchema>
