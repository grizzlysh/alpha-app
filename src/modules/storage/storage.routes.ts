import { Router } from 'express'
import * as StorageController from './storage.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import {
  createCabinetSchema, updateCabinetSchema, cabinetQuerySchema,
  createShelfSchema, updateShelfSchema, shelfQuerySchema,
  createBinSchema, updateBinSchema, binQuerySchema,
} from './storage.validation'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)

// ── Cabinets ──────────────────────────────────────────────
router.get('/cabinets', requirePermission(PERMISSIONS.STORAGE_READ), validateQuery(cabinetQuerySchema), StorageController.getCabinets)
router.get('/cabinets/dropdown', requirePermission(PERMISSIONS.STORAGE_READ), StorageController.getCabinetsDropdown)
router.get('/cabinets/:cabinet_uuid', requirePermission(PERMISSIONS.STORAGE_READ), StorageController.getCabinet)
router.post('/cabinets', requirePermission(PERMISSIONS.STORAGE_CREATE), validateBody(createCabinetSchema), StorageController.createCabinet)
router.put('/cabinets/:cabinet_uuid', requirePermission(PERMISSIONS.STORAGE_UPDATE), validateBody(updateCabinetSchema), StorageController.updateCabinet)
router.delete('/cabinets/:cabinet_uuid', requirePermission(PERMISSIONS.STORAGE_DELETE), StorageController.deleteCabinet)

// ── Shelves ───────────────────────────────────────────────
router.get('/cabinets/:cabinet_uuid/shelves', requirePermission(PERMISSIONS.STORAGE_READ), validateQuery(shelfQuerySchema), StorageController.getShelves)
router.get('/cabinets/:cabinet_uuid/shelves/dropdown', requirePermission(PERMISSIONS.STORAGE_READ), StorageController.getShelvesDropdown)
router.post('/cabinets/:cabinet_uuid/shelves', requirePermission(PERMISSIONS.STORAGE_CREATE), validateBody(createShelfSchema), StorageController.createShelf)
router.get('/shelves/:shelf_uuid', requirePermission(PERMISSIONS.STORAGE_READ), StorageController.getShelf)
router.put('/shelves/:shelf_uuid', requirePermission(PERMISSIONS.STORAGE_UPDATE), validateBody(updateShelfSchema), StorageController.updateShelf)
router.delete('/shelves/:shelf_uuid', requirePermission(PERMISSIONS.STORAGE_DELETE), StorageController.deleteShelf)

// ── Bins ──────────────────────────────────────────────────
router.get('/cabinets/:cabinet_uuid/shelves/:shelf_uuid/bins', requirePermission(PERMISSIONS.STORAGE_READ), validateQuery(binQuerySchema), StorageController.getBins)
router.get('/cabinets/:cabinet_uuid/shelves/:shelf_uuid/bins/dropdown', requirePermission(PERMISSIONS.STORAGE_READ), StorageController.getBinsDropdown)
router.post('/cabinets/:cabinet_uuid/shelves/:shelf_uuid/bins', requirePermission(PERMISSIONS.STORAGE_CREATE), validateBody(createBinSchema), StorageController.createBin)
router.get('/cabinets/:cabinet_uuid/shelves/:shelf_uuid/bins/:bin_uuid', requirePermission(PERMISSIONS.STORAGE_READ), StorageController.getBin)
router.put('/cabinets/:cabinet_uuid/shelves/:shelf_uuid/bins/:bin_uuid', requirePermission(PERMISSIONS.STORAGE_UPDATE), validateBody(updateBinSchema), StorageController.updateBin)
router.delete('/cabinets/:cabinet_uuid/shelves/:shelf_uuid/bins/:bin_uuid', requirePermission(PERMISSIONS.STORAGE_DELETE), StorageController.deleteBin)

export default router
