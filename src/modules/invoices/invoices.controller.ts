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
  AddInvoicePaymentRequest,
  GetInvoicePaymentRequest,
  UpdatePaymentHistoryRequest,
  DeletePaymentHistoryRequest,
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

export const getPayment = async (
  req: GetInvoicePaymentRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await InvoiceService.getInvoicePayment(
      parseUuid(req.params.invoice_uuid),
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.INVOICE_PAYMENT_FETCHED, payment)
  } catch (err) {
    next(err)
  }
}

export const addPayment = async (
  req: AddInvoicePaymentRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invoice = await InvoiceService.addPayment(
      parseUuid(req.params.invoice_uuid),
      req.body as any,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.INVOICE_PAYMENT_ADDED, invoice)
  } catch (err) {
    next(err)
  }
}

export const updatePaymentHistory = async (
  req: UpdatePaymentHistoryRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await InvoiceService.updatePaymentHistory(
      parseUuid(req.params.history_uuid),
      req.body as any,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.INVOICE_PAYMENT_HISTORY_UPDATED, payment)
  } catch (err) {
    next(err)
  }
}

export const deletePaymentHistory = async (
  req: DeletePaymentHistoryRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await InvoiceService.deletePaymentHistory(
      parseUuid(req.params.history_uuid),
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.INVOICE_PAYMENT_HISTORY_DELETED, payment)
  } catch (err) {
    next(err)
  }
}
