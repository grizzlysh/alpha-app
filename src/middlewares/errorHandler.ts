import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { AppError } from '@exceptions/AppError'
import { ValidationException } from '@exceptions/ValidationException'
import { MESSAGE_CODES, MessageCode } from '@constants/messageCodes'
import { HTTP_STATUS } from '@constants/httpStatus'
import { MESSAGES } from '@constants/messages'
import { translateMessage } from '@constants/errorTranslations'
import { ZodError } from 'zod'
import { fieldLabel, formatZodErrors } from '@utils/zodErrors'

type Bilingual = { en: string; id: string }

const send = (
  res: Response,
  status: number,
  code: string,
  message: Bilingual,
  meta: Record<string, unknown> | null = null
): void => {
  res.status(status).json({ success: false, code, message, data: null, errors: null, meta })
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    next(err)
    return
  }

  // ── Validation Exception ────────────────────────────
  // Controllers that call schema.parse() directly throw a raw ZodError; it is
  // still a client mistake (422), not a server fault.
  if (err instanceof ValidationException || err instanceof ZodError) {
    const errors = err instanceof ZodError ? formatZodErrors(err) : err.errors
    res.status(HTTP_STATUS.UNPROCESSABLE).json({
      success: false,
      code: MESSAGE_CODES.VALIDATION_ERROR,
      message: summarizeValidation(errors),
      data: null,
      errors,
      meta: null,
    })
    return
  }

  // ── Operational App Error ───────────────────────────
  if (err instanceof AppError && err.isOperational) {
    const knownCode = err.message in MESSAGES ? (err.message as MessageCode) : null
    const code = knownCode ?? resolveMessageCode(err.statusCode)
    const message = knownCode
      ? MESSAGES[knownCode]
      : translateMessage(err.message) ?? { en: err.message, id: err.message }
    send(res, err.statusCode, code, message)
    return
  }

  // ── Malformed / oversized request body (express.json) ──
  const bodyErr = err as Error & { type?: string; status?: number }
  if (bodyErr.type === 'entity.parse.failed') {
    send(res, HTTP_STATUS.BAD_REQUEST, MESSAGE_CODES.INVALID_JSON, MESSAGES[MESSAGE_CODES.INVALID_JSON])
    return
  }
  if (bodyErr.type === 'entity.too.large') {
    send(res, 413, MESSAGE_CODES.PAYLOAD_TOO_LARGE, MESSAGES[MESSAGE_CODES.PAYLOAD_TOO_LARGE])
    return
  }

  // ── Database errors ─────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(err)
    if (mapped) {
      send(res, mapped.status, mapped.code, mapped.message)
      return
    }
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    logUnexpected(err, req)
    send(res, 503, MESSAGE_CODES.DATABASE_UNAVAILABLE, MESSAGES[MESSAGE_CODES.DATABASE_UNAVAILABLE])
    return
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    // A request slipped past Zod with a shape Prisma rejects — a bug, but the client sent bad input.
    logUnexpected(err, req)
    send(res, HTTP_STATUS.BAD_REQUEST, MESSAGE_CODES.INVALID_REQUEST, MESSAGES[MESSAGE_CODES.INVALID_REQUEST])
    return
  }

  // ── Unknown / Unexpected Error ──────────────────────
  // A short reference lets a user report the error and lets us find it in the logs.
  const reference = logUnexpected(err, req)
  const base = MESSAGES[MESSAGE_CODES.INTERNAL_ERROR]
  send(
    res,
    HTTP_STATUS.INTERNAL_SERVER,
    MESSAGE_CODES.INTERNAL_ERROR,
    { en: `${base.en} (ref: ${reference})`, id: `${base.id} (kode: ${reference})` },
    { reference }
  )
}

// ── Helpers ───────────────────────────────────────────

/** "Please check: email — Invalid email address" (+ "and 2 more"), so a toast alone is actionable. */
const summarizeValidation = (errors: Record<string, unknown>): Bilingual => {
  const base = MESSAGES[MESSAGE_CODES.VALIDATION_ERROR]
  const entries = Object.entries(errors ?? {})
  if (entries.length === 0) return base
  const [field, value] = entries[0]
  const msg = normalizeFieldError(value)
  const label = fieldLabel(field)
  const more = entries.length - 1
  return {
    en: `Please check ${label.en}: ${msg.en}${more > 0 ? ` (and ${more} more)` : ''}`,
    id: `Periksa ${label.id}: ${msg.id}${more > 0 ? ` (dan ${more} lainnya)` : ''}`,
  }
}

const normalizeFieldError = (value: unknown): Bilingual => {
  if (value && typeof value === 'object' && 'en' in value && 'id' in value) return value as Bilingual
  const text = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
  return { en: text, id: text }
}

const logUnexpected = (err: Error, req: Request): string => {
  const reference = crypto.randomBytes(4).toString('hex').toUpperCase()
  console.error(`[${reference}] ${req.method} ${req.originalUrl} — unexpected error:`, err)
  return reference
}

// Friendly names for unique-constraint columns, so "already exists" can say what.
const FIELD_LABELS: Record<string, Bilingual> = {
  email: { en: 'email', id: 'email' },
  phone: { en: 'phone number', id: 'nomor telepon' },
  code: { en: 'code', id: 'kode' },
  name: { en: 'name', id: 'nama' },
  barcode: { en: 'barcode', id: 'barcode' },
  nik: { en: 'NIK', id: 'NIK' },
  license_number: { en: 'license number', id: 'nomor izin' },
  licenseNumber: { en: 'license number', id: 'nomor izin' },
  invoice_number: { en: 'invoice number', id: 'nomor faktur' },
  invoiceNumber: { en: 'invoice number', id: 'nomor faktur' },
  batch_number: { en: 'batch number', id: 'nomor batch' },
  batchNumber: { en: 'batch number', id: 'nomor batch' },
}

const IGNORED_FIELDS = new Set(['pharmacy_id', 'pharmacyId', 'deleted_at', 'deletedAt'])

const mapPrismaError = (
  err: Prisma.PrismaClientKnownRequestError
): { status: number; code: string; message: Bilingual } | null => {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint — tell the user which value is taken when we can.
      const target = err.meta?.target
      const fields = (Array.isArray(target) ? target : typeof target === 'string' ? [target] : [])
        .map(String)
        .filter((f) => !IGNORED_FIELDS.has(f))
      const label = fields.map((f) => FIELD_LABELS[f]).find(Boolean)
      const message = label
        ? { en: `This ${label.en} is already in use`, id: `${capitalize(label.id)} ini sudah dipakai` }
        : MESSAGES[MESSAGE_CODES.DUPLICATE_ENTRY]
      return { status: HTTP_STATUS.CONFLICT, code: MESSAGE_CODES.DUPLICATE_ENTRY, message }
    }
    case 'P2025':
      return { status: HTTP_STATUS.NOT_FOUND, code: MESSAGE_CODES.NOT_FOUND, message: MESSAGES[MESSAGE_CODES.NOT_FOUND] }
    case 'P2003':
    case 'P2014':
      return { status: HTTP_STATUS.CONFLICT, code: MESSAGE_CODES.RECORD_IN_USE, message: MESSAGES[MESSAGE_CODES.RECORD_IN_USE] }
    case 'P2034':
      // Transaction write conflict / deadlock — safe for the user to retry.
      return { status: HTTP_STATUS.CONFLICT, code: MESSAGE_CODES.CONCURRENT_UPDATE, message: MESSAGES[MESSAGE_CODES.CONCURRENT_UPDATE] }
    case 'P2028':
      // Interactive transaction timed out.
      return { status: 503, code: MESSAGE_CODES.SERVER_BUSY, message: MESSAGES[MESSAGE_CODES.SERVER_BUSY] }
    case 'P1001':
    case 'P1002':
    case 'P1017':
      return { status: 503, code: MESSAGE_CODES.DATABASE_UNAVAILABLE, message: MESSAGES[MESSAGE_CODES.DATABASE_UNAVAILABLE] }
    default:
      return null
  }
}

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

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
