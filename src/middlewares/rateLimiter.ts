import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit'
import { HTTP_STATUS } from '../constants/httpStatus'
import { MESSAGE_CODES } from '../constants/messageCodes'
import { MESSAGES } from '../constants/messages'

// ── General API Rate Limiter ──────────────────────────
export const rateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // max 100 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      code: MESSAGE_CODES.TOO_MANY_REQUESTS,
      message: MESSAGES[MESSAGE_CODES.TOO_MANY_REQUESTS],
      data: null,
      errors: null,
      meta: null,
    })
  },
})

// ── Auth Rate Limiter (stricter) ──────────────────────
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 login attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      code: MESSAGE_CODES.TOO_MANY_REQUESTS,
      message: MESSAGES[MESSAGE_CODES.TOO_MANY_REQUESTS],
      data: null,
      errors: null,
      meta: null,
    })
  },
})