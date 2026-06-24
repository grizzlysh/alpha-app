import { z } from 'zod'

const rotationValues = [0, 90, 180, 270] as const

export const updateCabinetPositionSchema = z.object({
  posX: z.number(),
  posY: z.number(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
})

export type Rotation = typeof rotationValues[number]

export type UpdateCabinetPositionInput = z.infer<typeof updateCabinetPositionSchema>
