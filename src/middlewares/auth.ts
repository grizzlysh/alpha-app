import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/db'
import { env } from '../config/env'
import { UnauthorizedException } from '../exceptions/UnauthorizedException'
import { MESSAGE_CODES } from '../constants/messageCodes'
import { MESSAGES } from '../constants/messages'
import { HTTP_STATUS } from '../constants/httpStatus'

interface JwtPayload {
  id: number
  uuid: string
  pharmacyId: number | null
  pharmacyUuid: string | null
  roleId: number | null
  platformRole: string | null
  permissions: string[]
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {

    // ── Extract Token ───────────────────────────────
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided')
    }

    const token: string = authHeader.split(' ')[1]

    // ── Verify Token ────────────────────────────────
    let decoded: JwtPayload
    try {
      decoded = jwt.verify(token, env.JWT_SECRET as string) as JwtPayload
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          code: MESSAGE_CODES.TOKEN_EXPIRED,
          message: MESSAGES[MESSAGE_CODES.TOKEN_EXPIRED],
          data: null,
          errors: null,
          meta: null,
        })
        return
      }
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        code: MESSAGE_CODES.TOKEN_INVALID,
        message: MESSAGES[MESSAGE_CODES.TOKEN_INVALID],
        data: null,
        errors: null,
        meta: null,
      })
      return
    }

    // ── Check User Still Exists & Active ────────────
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        uuid: true,
        status: true,
        platformRole: true,
      }
    })

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive')
    }

    // ── Attach User to Request ───────────────────────
    req.user = {
      id: decoded.id,
      uuid: decoded.uuid,
      pharmacyId: decoded.pharmacyId,
      pharmacyUuid: decoded.pharmacyUuid,
      roleId: decoded.roleId,
      platformRole: decoded.platformRole as any,
      permissions: decoded.permissions,
    }

    next()
  } catch (err) {
    next(err)
  }
}