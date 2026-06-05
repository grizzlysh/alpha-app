import { Response, NextFunction } from 'express'
import { env } from '@config/env'
import * as AuthService from './auth.service'
import { loginSchema, selectPharmacySchema } from './auth.validation'
import {
  LoginRequest,
  SelectPharmacyRequest,
  RefreshRequest,
  LogoutRequest,
  MeRequest,
  LoginResponse,
  SelectPharmacyResponse,
  RefreshTokenResponse,
  MeResponse,
} from './auth.interface'
import { ValidationException } from '@exceptions/ValidationException'
import { UnauthorizedException } from '@exceptions/UnauthorizedException'
import { sendSuccess } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000,
}

export const login = async (
  req: LoginRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await AuthService.login(req.body)

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    const response: LoginResponse = {
      accessToken: result.accessToken,
      user: result.user,
      currentPharmacy: null,
    }

    sendSuccess(res, MESSAGE_CODES.LOGIN_SUCCESS, response)
  } catch (err) {
    next(err)
  }
}

export const selectPharmacy = async (
  req: SelectPharmacyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await AuthService.selectPharmacy(
      req.user!.id,
      req.user!.uuid,
      req.user!.platformRole,
      req.body
    )

    const response: SelectPharmacyResponse = result

    sendSuccess(res, MESSAGE_CODES.PHARMACY_SELECTED, response)
  } catch (err) {
    next(err)
  }
}

export const refresh = async (
  req: RefreshRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken: string | undefined = req.cookies?.refreshToken
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided')
    }

    const result = await AuthService.refreshAccessToken(refreshToken)

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    const response: RefreshTokenResponse = { accessToken: result.accessToken, refreshToken: result.refreshToken }

    sendSuccess(res, MESSAGE_CODES.TOKEN_REFRESHED, response)
  } catch (err) {
    next(err)
  }
}

export const logout = async (
  req: LogoutRequest,
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
  req: MeRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await AuthService.getMe(
      req.user!.id,
      req.user!.platformRole,
      req.user!.pharmacyId,
      req.user!.permissions
    )

    const response: MeResponse = result

    sendSuccess(res, MESSAGE_CODES.ME_FETCHED, response)
  } catch (err) {
    next(err)
  }
}
