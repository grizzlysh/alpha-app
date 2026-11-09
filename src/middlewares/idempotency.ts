import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { env } from '@config/env'
import { MESSAGE_CODES } from '@constants/messageCodes'
import { MESSAGES } from '@constants/messages'

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
// Long enough to cover a device that queues writes offline over a weekend.
const TTL_MS = 72 * 60 * 60 * 1000
// Marks a key whose original request is still running.
const IN_PROGRESS = 0

/**
 * Replays the stored response when a client retries a write with the same
 * `Idempotency-Key` (e.g. the checkout response was lost on a flaky connection).
 *
 * - Keys are scoped to the authenticated user + method + path, so one client's
 *   key can never return another user's response.
 * - The key is *reserved before* the handler runs (unique insert), so two
 *   concurrent duplicates can't both execute.
 * - Unauthenticated routes (login, refresh) are never cached: their responses
 *   carry tokens.
 * - 5xx responses release the key so the client can retry.
 */
export const idempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const clientKey = req.headers['idempotency-key']
  if (typeof clientKey !== 'string' || !clientKey || !WRITE_METHODS.has(req.method)) {
    next()
    return
  }
  if (req.path.startsWith('/api/auth')) {
    next()
    return
  }

  const userId = userIdFromToken(req)
  if (userId === null) {
    // Let authenticate() reject it; nothing to scope the key to.
    next()
    return
  }

  const scoped = crypto
    .createHash('sha256')
    .update(`${userId}|${req.method}|${req.originalUrl.split('?')[0]}|${clientKey}`)
    .digest('hex')

  try {
    if (Math.random() < 0.01) void purgeExpired()

    const reserved = await reserve(scoped)
    if (!reserved) {
      const existing = await prisma.idempotencyKey.findUnique({ where: { key: scoped } })
      if (existing && existing.expiresAt > new Date()) {
        if (existing.statusCode === IN_PROGRESS) {
          res.status(409).json({
            success: false,
            code: MESSAGE_CODES.REQUEST_IN_PROGRESS,
            message: MESSAGES[MESSAGE_CODES.REQUEST_IN_PROGRESS],
            data: null,
            errors: null,
            meta: null,
          })
          return
        }
        res.setHeader('Idempotent-Replayed', 'true')
        res.status(existing.statusCode).json(existing.responseBody)
        return
      }
      // Expired leftover: take it over.
      await prisma.idempotencyKey.deleteMany({ where: { key: scoped } })
      if (!(await reserve(scoped))) {
        next()
        return
      }
    }

    const originalJson = res.json.bind(res)
    res.json = (body: unknown): Response => {
      const statusCode = res.statusCode
      const persist =
        statusCode >= 500
          ? prisma.idempotencyKey.deleteMany({ where: { key: scoped } })
          : prisma.idempotencyKey.update({
              where: { key: scoped },
              data: { statusCode, responseBody: (body ?? null) as Prisma.InputJsonValue },
            })
      persist.catch((err: unknown) => console.error('Failed to persist idempotency key:', err))
      return originalJson(body)
    }
    // A handler that ends without res.json (e.g. 204) still completes the key.
    res.on('finish', () => {
      if (res.statusCode === 204) {
        prisma.idempotencyKey
          .update({ where: { key: scoped }, data: { statusCode: 204, responseBody: Prisma.JsonNull } })
          .catch(() => undefined)
      }
    })

    next()
  } catch (err) {
    next(err)
  }
}

const reserve = async (key: string): Promise<boolean> => {
  try {
    await prisma.idempotencyKey.create({
      data: { key, statusCode: IN_PROGRESS, responseBody: Prisma.JsonNull, expiresAt: new Date(Date.now() + TTL_MS) },
    })
    return true
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false
    throw err
  }
}

const purgeExpired = async (): Promise<void> => {
  await prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined)
}

const userIdFromToken = (req: Request): number | null => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(header.slice(7), env.JWT_SECRET) as { id?: number }
    return typeof decoded.id === 'number' ? decoded.id : null
  } catch {
    return null
  }
}
