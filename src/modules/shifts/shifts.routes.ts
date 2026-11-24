import { Router } from 'express'
import * as ShiftController from './shifts.controller'
import { authenticate } from '@middlewares/auth'
import { requireAnyPermission, requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { PERMISSIONS } from '@constants/permissions'
import { cashMovementSchema, closeShiftSchema, openShiftSchema, shiftQuerySchema } from './shifts.validation'

// Anyone who sells works their own shift; SHIFTS_MANAGE sees every cashier's
// shifts and can close one left open. The service enforces "own shift only".
const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)
const sellerOrManager = requireAnyPermission(PERMISSIONS.SALES_CREATE, PERMISSIONS.SHIFTS_MANAGE)
const reader = requireAnyPermission(PERMISSIONS.SHIFTS_READ, PERMISSIONS.SHIFTS_MANAGE)

router.get('/current', requirePermission(PERMISSIONS.SALES_CREATE), ShiftController.getCurrentShift)
router.get('/', reader, validateQuery(shiftQuerySchema), ShiftController.getShifts)
router.get('/:shift_uuid', reader, ShiftController.getShift)
router.post('/', requirePermission(PERMISSIONS.SALES_CREATE), validateBody(openShiftSchema), ShiftController.openShift)
router.post('/:shift_uuid/cash-movements', requirePermission(PERMISSIONS.SALES_CREATE), validateBody(cashMovementSchema), ShiftController.addCashMovement)
router.post('/:shift_uuid/close', sellerOrManager, validateBody(closeShiftSchema), ShiftController.closeShift)
export default router
