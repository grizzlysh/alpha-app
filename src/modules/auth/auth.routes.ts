import { Router } from 'express'
import * as AuthController from './auth.controller'
import { authenticate } from '@middlewares/auth'
import { authRateLimiter } from '@middlewares/rateLimiter'
import { validateBody } from '@middlewares/validate'
import { loginSchema, selectPharmacySchema } from './auth.validation'

const router: Router = Router()

router.post('/login', authRateLimiter, validateBody(loginSchema), AuthController.login)
router.post('/refresh', AuthController.refresh)

router.post('/select-pharmacy', authenticate, validateBody(selectPharmacySchema), AuthController.selectPharmacy)
router.post('/logout', authenticate, AuthController.logout)
router.get('/me', authenticate, AuthController.me)

export default router
