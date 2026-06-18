import { Router } from 'express'
import * as DashboardController from './dashboard.controller'
import { authenticate } from '@middlewares/auth'
import { requirePharmacyAccess, requirePermission } from '@middlewares/roleGuard'
import { PERMISSIONS } from '@constants/permissions'

const router: Router = Router()
router.use(authenticate)
router.use(requirePharmacyAccess)

router.get('/', requirePermission(PERMISSIONS.DASHBOARD_READ), DashboardController.getDashboard)
router.get('/advanced', requirePermission(PERMISSIONS.DASHBOARD_ADVANCED), DashboardController.getAdvancedDashboard)

export default router
