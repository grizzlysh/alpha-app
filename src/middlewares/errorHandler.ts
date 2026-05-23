import { Request, Response, NextFunction } from 'express'
import { AppError } from '../exceptions/AppError'
import { ValidationException } from '../exceptions/ValidationException'
import { MESSAGE_CODES } from '../constants/messageCodes'
import { HTTP_STATUS } from '../constants/httpStatus'
import { MESSAGES } from '../constants/messages'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {

  // ── Validation Exception ────────────────────────────
  if (err instanceof ValidationException) {
    res.status(HTTP_STATUS.UNPROCESSABLE).json({
      success: false,
      code: MESSAGE_CODES.VALIDATION_ERROR,
      message: MESSAGES[MESSAGE_CODES.VALIDATION_ERROR],
      data: null,
      errors: err.errors,
      meta: null,
    })
    return
  }

  // ── Operational App Error ───────────────────────────
  if (err instanceof AppError && err.isOperational) {
    const code = resolveMessageCode(err.statusCode)
    res.status(err.statusCode).json({
      success: false,
      code,
      message: {
        en: err.message,
        id: resolveIdMessage(err.statusCode, err.message),
      },
      data: null,
      errors: null,
      meta: null,
    })
    return
  }

  // ── Unknown / Unexpected Error ──────────────────────
  console.error('Unexpected error:', err)
  res.status(HTTP_STATUS.INTERNAL_SERVER).json({
    success: false,
    code: MESSAGE_CODES.INTERNAL_ERROR,
    message: MESSAGES[MESSAGE_CODES.INTERNAL_ERROR],
    data: null,
    errors: null,
    meta: null,
  })
}

// ── Helpers ───────────────────────────────────────────

const resolveMessageCode = (statusCode: number): string => {
  const map: Record<number, string> = {
    400: MESSAGE_CODES.VALIDATION_ERROR,
    401: MESSAGE_CODES.UNAUTHORIZED,
    403: MESSAGE_CODES.FORBIDDEN,
    404: MESSAGE_CODES.NOT_FOUND,
    409: MESSAGE_CODES.CONFLICT,
    500: MESSAGE_CODES.INTERNAL_ERROR,
  }
  return map[statusCode] ?? MESSAGE_CODES.INTERNAL_ERROR
}

const resolveIdMessage = (
  statusCode: number,
  fallback: string
): string => {
  const map: Record<number, string> = {
    400: 'Permintaan tidak valid',
    401: 'Tidak terautentikasi',
    403: 'Akses ditolak',
    404: 'Data tidak ditemukan',
    409: 'Data sudah ada',
    500: 'Terjadi kesalahan pada server',
  }
  return map[statusCode] ?? fallback
}