import { Request, Response, NextFunction } from 'express'
import * as DataTransferService from './data-transfer.service'
import { CustomerImportInput, DistributorImportInput, OpeningStockImportInput } from './data-transfer.validation'
import { sendSuccess } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

type Handler<B = unknown> = (req: Request<{}, {}, B>, res: Response, next: NextFunction) => Promise<void>

const exporter = (fn: (pharmacyId: number) => Promise<unknown>): Handler => async (req, res, next) => {
  try {
    sendSuccess(res, MESSAGE_CODES.DATA_EXPORTED, await fn(req.user!.pharmacyId!))
  } catch (err) {
    next(err)
  }
}

const importer = <B extends { dryRun: boolean }>(
  fn: (pharmacyId: number, userId: number, body: B) => Promise<{ dryRun: boolean }>
): Handler<B> => async (req, res, next) => {
  try {
    const data = await fn(req.user!.pharmacyId!, req.user!.id, req.body)
    sendSuccess(res, data.dryRun ? MESSAGE_CODES.DATA_IMPORT_PREVIEWED : MESSAGE_CODES.DATA_IMPORTED, data)
  } catch (err) {
    next(err)
  }
}

export const exportDistributors = exporter(DataTransferService.exportDistributors)
export const importDistributors = importer<DistributorImportInput>(DataTransferService.importDistributors)
export const exportCustomers = exporter(DataTransferService.exportCustomers)
export const importCustomers = importer<CustomerImportInput>(DataTransferService.importCustomers)
export const importOpeningStock = importer<OpeningStockImportInput>(DataTransferService.importOpeningStock)
