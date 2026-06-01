import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '@config/db'
import { env } from '@config/env'

export const maintenanceMode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const param = await prisma.systemParameter.findUnique({
    where: { key: 'MAINTENANCE_MODE' },
    select: { value: true },
  })

  if (param?.value !== 'true') {
    next()
    return
  }

  // Always allow login and refresh so users can authenticate
  if (req.path === '/api/auth/login' || req.path === '/api/auth/refresh') {
    next()
    return
  }

  // Allow platform admins through by decoding their JWT
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1]
      const decoded = jwt.verify(token, env.JWT_SECRET as string) as any
      if (decoded.platformRole === 'PLATFORM_ADMIN') {
        next()
        return
      }
    } catch {
      // invalid token — fall through to block
    }
  }

  res.status(503).json({
    success: false,
    code: 'MAINTENANCE_MODE',
    message: {
      en: 'System is under maintenance. Please try again later.',
      id: 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.',
    },
    data: null,
    errors: null,
    meta: null,
  })
}
