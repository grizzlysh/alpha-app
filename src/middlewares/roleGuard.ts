import { Request, Response, NextFunction } from 'express'
import { PlatformRole } from '@prisma/client'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { UnauthorizedException } from '@exceptions/UnauthorizedException'
import { HTTP_STATUS } from '@constants/httpStatus'
import { MESSAGE_CODES } from '@constants/messageCodes'
import { MESSAGES } from '@constants/messages'

// ── Permission Guard ──────────────────────────────────
// checks if user has specific permission in JWT
export const requirePermission = (permission: string) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedException()
      }

      // platform admin bypasses all permission checks
      if (req.user.platformRole === PlatformRole.PLATFORM_ADMIN) {
        next()
        return
      }

      const hasPermission: boolean = req.user.permissions.includes(permission)
      if (!hasPermission) {
        throw new ForbiddenException(`Missing permission: ${permission}`)
      }

      next()
    } catch (err) {
      next(err)
    }
  }
}

// ── Platform Role Guard ───────────────────────────────
// checks if user has specific platform role
// used for /api/platform/** routes only
export const requirePlatformRole = (...roles: PlatformRole[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedException()
      }

      if (
        !req.user.platformRole ||
        !roles.includes(req.user.platformRole)
      ) {
        throw new ForbiddenException()
      }

      next()
    } catch (err) {
      next(err)
    }
  }
}

// ── Pharmacy Access Guard ─────────────────────────────
// checks if user has selected a pharmacy (has pharmacyId in token)
// used for all /api/** pharmacy routes
export const requirePharmacyAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    // everyone — including PLATFORM_ADMIN — must select a pharmacy
    // before accessing pharmacy-scoped routes
    if (!req.user.pharmacyId) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        code: MESSAGE_CODES.PHARMACY_NOT_SELECTED,
        message: MESSAGES[MESSAGE_CODES.PHARMACY_NOT_SELECTED],
        data: null,
        errors: null,
        meta: null,
      })
      return
    }

    next()
  } catch (err) {
    next(err)
  }
}

// ── Shorthands ────────────────────────────────────────
export const requirePlatformAdmin = requirePlatformRole(
  PlatformRole.PLATFORM_ADMIN
)