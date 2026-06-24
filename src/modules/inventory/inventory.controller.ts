import { Request, Response, NextFunction } from 'express'
import { sendSuccess, sendNoContent } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'
import { parseUuid } from '@utils/parseUuid'
import { updateCabinetPositionSchema } from './inventory.validation'
import { getInventoryTree, getBinItems, updateCabinetPosition } from './inventory.service'

export const getInventoryTreeController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await getInventoryTree(req.user!.pharmacyId!)
    sendSuccess(res, MESSAGE_CODES.INVENTORY_TREE_FETCHED, data)
  } catch (err) { next(err) }
}

export const getBinItemsController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await getBinItems(parseUuid(req.params.uuid as string), req.user!.pharmacyId!)
    sendSuccess(res, MESSAGE_CODES.INVENTORY_BIN_ITEMS_FETCHED, data)
  } catch (err) { next(err) }
}

export const updateCabinetPositionController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = updateCabinetPositionSchema.parse(req.body)
    await updateCabinetPosition(parseUuid(req.params.uuid as string), body, req.user!.pharmacyId!, req.user!.id)
    sendNoContent(res, MESSAGE_CODES.INVENTORY_CABINET_POSITION_UPDATED)
  } catch (err) { next(err) }
}
