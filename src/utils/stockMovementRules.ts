// utils/stockMovementRules.ts

import { BadRequestException } from '@exceptions/BadRequestException'
import { StockMovementReason, StockMovementType } from "@prisma/client"

const VALID_COMBINATIONS: Record<StockMovementReason, StockMovementType[]> = {
  PURCHASE:   ['IN'],
  SALE:       ['OUT'],
  RETURN:     ['IN', 'OUT'],
  ADJUSTMENT: ['IN', 'OUT'],
  DISPOSAL:   ['OUT'],
  DAMAGED:    ['OUT'],
  TRANSFER:   ['IN', 'OUT'],
  DONATION:   ['OUT'],
}

export const validateMovement = (
  type: StockMovementType,
  reason: StockMovementReason
): void => {
  const validTypes = VALID_COMBINATIONS[reason]
  if (!validTypes.includes(type)) {
    throw new BadRequestException(
      `Invalid combination: type ${type} with reason ${reason}`
    )
  }
}