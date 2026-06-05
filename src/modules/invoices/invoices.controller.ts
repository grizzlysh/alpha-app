import { parseUuid } from '@utils/parseUuid'
import { Response, NextFunction } from 'express'
import * as InvoiceService from './invoices.service'
import {
  createInvoiceSchema,
  invoiceQuerySchema,
} from './invoices.validation'
import {
  GetInvoicesRequest,
  GetInvoiceRequest,
  CreateInvoiceRequest,
  DeleteInvoiceRequest,
} from './invoices.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getInvoices = async (
  req: GetInvoicesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, meta } = await InvoiceService.getInvoices(
      req.user!.pharmacyId!,
      req.query as any
    )

    sendPaginated(res, MESSAGE_CODES.INVOICES_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getInvoice = async (
  req: GetInvoiceRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invoice = await InvoiceService.getInvoiceByUuid(
      parseUuid(req.params.invoice_uuid),
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.INVOICE_FETCHED, invoice)
  } catch (err) {
    next(err)
  }
}

export const createInvoice = async (
  req: CreateInvoiceRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invoice = await InvoiceService.createInvoice(
      req.body as any,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.INVOICE_CREATED, invoice)
  } catch (err) {
    next(err)
  }
}

export const deleteInvoice = async (
  req: DeleteInvoiceRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await InvoiceService.deleteInvoice(
      parseUuid(req.params.invoice_uuid),
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.INVOICE_DELETED, null)
  } catch (err) {
    next(err)
  }
}
