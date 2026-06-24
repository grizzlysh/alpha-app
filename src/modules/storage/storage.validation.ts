import { z } from 'zod'
import { RecordStatus } from '@prisma/client'

// ── Cabinet ───────────────────────────────────────────────

export const createCabinetSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(100),
  code: z.string().trim().toUpperCase().min(1, { message: 'Code is required' }).max(20),
  description: z.string().trim().optional(),
})

export const updateCabinetSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().toUpperCase().min(1).max(20).optional(),
  description: z.string().trim().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
})

export const cabinetQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
  sortBy: z.enum(['name', 'code', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

// ── Shelf ─────────────────────────────────────────────────

export const createShelfSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(100),
  code: z.string().trim().toUpperCase().min(1, { message: 'Code is required' }).max(20),
  level: z.coerce.number().int().positive().optional(),
  description: z.string().trim().optional(),
})

export const updateShelfSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().toUpperCase().min(1).max(20).optional(),
  level: z.coerce.number().int().positive().optional(),
  description: z.string().trim().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
})

export const shelfQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
  sortBy: z.enum(['name', 'code', 'level', 'createdAt']).optional().default('level'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

// ── Bin ───────────────────────────────────────────────────

export const createBinSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(100),
  code: z.string().trim().toUpperCase().min(1, { message: 'Code is required' }).max(20),
  description: z.string().trim().optional(),
})

export const updateBinSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().toUpperCase().min(1).max(20).optional(),
  description: z.string().trim().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
})

export const binQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
  sortBy: z.enum(['name', 'code', 'createdAt']).optional().default('code'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

export type CreateCabinetInput = z.infer<typeof createCabinetSchema>
export type UpdateCabinetInput = z.infer<typeof updateCabinetSchema>
export type CabinetQueryInput = z.infer<typeof cabinetQuerySchema>

export type CreateShelfInput = z.infer<typeof createShelfSchema>
export type UpdateShelfInput = z.infer<typeof updateShelfSchema>
export type ShelfQueryInput = z.infer<typeof shelfQuerySchema>

export type CreateBinInput = z.infer<typeof createBinSchema>
export type UpdateBinInput = z.infer<typeof updateBinSchema>
export type BinQueryInput = z.infer<typeof binQuerySchema>
