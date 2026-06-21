import { Request, Response, NextFunction } from 'express'
import { prisma } from '@config/db'

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH'])
const TTL_MS = 24 * 60 * 60 * 1000

export const idempotency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const key = req.headers['idempotency-key'] as string | undefined

  if (!key || !WRITE_METHODS.has(req.method)) {
    next()
    return
  }

  try {
    const now = new Date()

    const existing = await prisma.idempotencyKey.findUnique({
      where: { key },
    })

    if (existing && existing.expiresAt > now) {
      res.status(existing.statusCode).json(existing.responseBody)
      return
    }

    const originalJson = res.json.bind(res)

    res.json = (body: unknown): Response => {
      const statusCode = res.statusCode

      // Only cache successful and client-error responses; skip server errors so the client can retry.
      if (statusCode < 500) {
        prisma.idempotencyKey.upsert({
          where: { key },
          create: {
            key,
            statusCode,
            responseBody: body as any,
            expiresAt: new Date(Date.now() + TTL_MS),
          },
          update: {
            statusCode,
            responseBody: body as any,
            expiresAt: new Date(Date.now() + TTL_MS),
          },
        }).catch((err) => {
          console.error('Failed to persist idempotency key:', err)
        })
      }

      return originalJson(body)
    }

    next()
  } catch (err) {
    next(err)
  }
}
