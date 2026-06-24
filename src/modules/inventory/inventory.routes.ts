import { Router } from 'express'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'
import {
  getInventoryTreeController,
  getBinItemsController,
  updateCabinetPositionController,
} from './inventory.controller'

const router = Router()

router.use(authenticate, requirePharmacyAccess)

router.get('/tree', requirePermission(PERMISSIONS.STORAGE_READ), getInventoryTreeController)
router.get('/bins/:uuid/items', requirePermission(PERMISSIONS.STORAGE_READ), getBinItemsController)
router.patch('/cabinets/:uuid/position', requirePermission(PERMISSIONS.STORAGE_UPDATE), updateCabinetPositionController)

export default router
