import { Router } from 'express'
import * as CatalogController from './catalog.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { catalogImportSchema } from './catalog.validation'

// The pharmacy's medicine master (medicines + shapes/types/classes) as one
// portable document, for copying between branches.
const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)

router.get('/export', requirePermission(PERMISSIONS.MEDICINES_READ), CatalogController.exportCatalog)
router.post(
  '/import',
  requirePermission(PERMISSIONS.MEDICINES_CREATE),
  requirePermission(PERMISSIONS.MEDICINE_SHAPES_CREATE),
  requirePermission(PERMISSIONS.MEDICINE_TYPES_CREATE),
  requirePermission(PERMISSIONS.MEDICINE_CLASSES_CREATE),
  validateBody(catalogImportSchema),
  CatalogController.importCatalog
)

export default router
