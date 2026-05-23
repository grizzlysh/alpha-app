import { Router } from 'express'
import * as AuthController from '@modules/auth/auth.controller'
import { authenticate } from '@middlewares/auth'
import { authRateLimiter } from '@middlewares/rateLimiter'

const router: Router = Router()

// ── Public ────────────────────────────────────────────
router.post('/login', authRateLimiter, AuthController.login)
router.post('/refresh', AuthController.refresh)

// ── Authenticated ─────────────────────────────────────
router.post('/select-pharmacy', authenticate, AuthController.selectPharmacy)
router.post('/logout', authenticate, AuthController.logout)
router.get('/me', authenticate, AuthController.me)

export default router