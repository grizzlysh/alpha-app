import { Request, Response, NextFunction } from 'express'
import { env } from '../../config/env'
import * as AuthService from './auth.service'
import { loginSchema, selectPharmacySchema } from './auth.validation'
import {
  LoginResponse,
  SelectPharmacyResponse,
  RefreshTokenResponse,
  MeResponse,
} from './auth.interface'
import { ValidationException } from '../../exceptions/ValidationException'
import { UnauthorizedException } from '../../exceptions/UnauthorizedException'
import { sendSuccess } from '../../utils/responseHelper'
import { MESSAGE_CODES } from '../../constants/messageCodes'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000,
}

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const result = await AuthService.login(parsed.data)

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    const response: LoginResponse = {
      accessToken: result.accessToken,
      user: result.user,
    }

    sendSuccess(res, MESSAGE_CODES.LOGIN_SUCCESS, response)
  } catch (err) {
    next(err)
  }
}

export const selectPharmacy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = selectPharmacySchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const result = await AuthService.selectPharmacy(
      req.user!.id,
      req.user!.uuid,
      req.user!.platformRole,
      parsed.data
    )

    const response: SelectPharmacyResponse = result

    sendSuccess(res, MESSAGE_CODES.SUCCESS, response)
  } catch (err) {
    next(err)
  }
}

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken: string | undefined = req.cookies?.refreshToken
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided')
    }

    const result = await AuthService.refreshAccessToken(refreshToken)

    const response: RefreshTokenResponse = result

    sendSuccess(res, MESSAGE_CODES.SUCCESS, response)
  } catch (err) {
    next(err)
  }
}

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken: string | undefined = req.cookies?.refreshToken
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided')
    }

    await AuthService.logout(req.user!.id, refreshToken)

    res.clearCookie('refreshToken', COOKIE_OPTIONS)

    sendSuccess(res, MESSAGE_CODES.LOGOUT_SUCCESS, null)
  } catch (err) {
    next(err)
  }
}

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const response: MeResponse = {
      id: req.user!.id,
      uuid: req.user!.uuid,
      platformRole: req.user!.platformRole,
      pharmacyId: req.user!.pharmacyId,
      pharmacyUuid: req.user!.pharmacyUuid,
      permissions: req.user!.permissions,
    }

    sendSuccess(res, MESSAGE_CODES.SUCCESS, response)
  } catch (err) {
    next(err)
  }
}