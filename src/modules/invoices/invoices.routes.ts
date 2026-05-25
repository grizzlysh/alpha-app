import { Router } from 'express'
import * as InvoiceController from './invoices.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()

router.use(authenticate)
router.use(requirePharmacyAccess)

router.get(
  '/',
  requirePermission(PERMISSIONS.INVOICES_VIEW),
  InvoiceController.getInvoices
)

router.get(
  '/:invoice_uuid',
  requirePermission(PERMISSIONS.INVOICES_VIEW),
  InvoiceController.getInvoice
)

router.post(
  '/',
  requirePermission(PERMISSIONS.INVOICES_CREATE),
  InvoiceController.createInvoice
)

router.delete(
  '/:invoice_uuid',
  requirePermission(PERMISSIONS.INVOICES_DELETE),
  InvoiceController.deleteInvoice
)

export default router