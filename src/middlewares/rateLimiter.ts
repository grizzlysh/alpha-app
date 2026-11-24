import rateLimit, { ipKeyGenerator, RateLimitRequestHandler } from 'express-rate-limit'
import { Request, Response } from 'express'
import { HTTP_STATUS } from '@constants/httpStatus'
import { MESSAGE_CODES } from '@constants/messageCodes'
import { MESSAGES } from '@constants/messages'

const tooMany = (_req: Request, res: Response): void => {
  res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    success: false,
    code: MESSAGE_CODES.TOO_MANY_REQUESTS,
    message: MESSAGES[MESSAGE_CODES.TOO_MANY_REQUESTS],
    data: null,
    errors: null,
    meta: null,
  })
}

const clientIp = (req: Request): string => ipKeyGenerator(req.ip ?? 'unknown')

// ── General API Rate Limiter ──────────────────────────
// Abuse guard only. A busy POS screen fires several queries per action and a
// whole pharmacy may sit behind one NAT IP, so the budget is generous.
export const rateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientIp,
  handler: tooMany,
})

// ── Login Rate Limiter ────────────────────────────────
// Keyed by IP + email so one person mistyping their password doesn't lock out
// colleagues on the same network, and only failed attempts count.
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    return `${clientIp(req)}|${email}`
  },
  handler: tooMany,
})
