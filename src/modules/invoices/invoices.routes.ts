import { Router } from 'express'
import * as InvoiceController from './invoices.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { addPaymentSchema, createInvoiceSchema, invoiceQuerySchema, updatePaymentHistorySchema } from './invoices.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)
router.get('/', requirePermission(PERMISSIONS.INVOICES_READ), validateQuery(invoiceQuerySchema), InvoiceController.getInvoices)
router.get('/:invoice_uuid', requirePermission(PERMISSIONS.INVOICES_READ), InvoiceController.getInvoice)
router.post('/', requirePermission(PERMISSIONS.INVOICES_CREATE), validateBody(createInvoiceSchema), InvoiceController.createInvoice)
router.delete('/:invoice_uuid', requirePermission(PERMISSIONS.INVOICES_DELETE), InvoiceController.deleteInvoice)
router.get('/:invoice_uuid/payment', requirePermission(PERMISSIONS.INVOICES_READ), InvoiceController.getPayment)
router.post('/:invoice_uuid/payment', requirePermission(PERMISSIONS.INVOICES_UPDATE), validateBody(addPaymentSchema), InvoiceController.addPayment)
router.patch('/:invoice_uuid/payment/history/:history_uuid', requirePermission(PERMISSIONS.INVOICES_UPDATE), validateBody(updatePaymentHistorySchema), InvoiceController.updatePaymentHistory)
router.delete('/:invoice_uuid/payment/history/:history_uuid', requirePermission(PERMISSIONS.INVOICES_UPDATE), InvoiceController.deletePaymentHistory)
export default router
