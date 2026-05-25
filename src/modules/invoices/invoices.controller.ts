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
  sendNoContent,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getInvoices = async (
  req: GetInvoicesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = invoiceQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await InvoiceService.getInvoices(
      req.user!.pharmacyId!,
      parsed.data
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
      req.params.invoice_uuid,
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
    const parsed = createInvoiceSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const invoice = await InvoiceService.createInvoice(
      parsed.data,
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
      req.params.invoice_uuid,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendNoContent(res, MESSAGE_CODES.INVOICE_DELETED)
  } catch (err) {
    next(err)
  }
}