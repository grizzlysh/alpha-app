import { Request, Response, NextFunction } from 'express'
import * as CatalogService from './catalog.service'
import { CatalogImportInput } from './catalog.validation'
import { sendSuccess } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const exportCatalog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await CatalogService.exportCatalog(req.user!.pharmacyId!)
    sendSuccess(res, MESSAGE_CODES.CATALOG_EXPORTED, data)
  } catch (err) {
    next(err)
  }
}

export const importCatalog = async (
  req: Request<{}, {}, CatalogImportInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await CatalogService.importCatalog(req.user!.pharmacyId!, req.user!.id, req.body)
    sendSuccess(res, data.dryRun ? MESSAGE_CODES.CATALOG_IMPORT_PREVIEWED : MESSAGE_CODES.CATALOG_IMPORTED, data)
  } catch (err) {
    next(err)
  }
}
