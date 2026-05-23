import { Response } from 'express'
import { HTTP_STATUS, HttpStatus } from '@constants/httpStatus'
import { MessageCode } from '@constants/messageCodes'
import { MESSAGES } from '@constants/messages'

interface BilingualMessage {
  en: string
  id: string
}

interface BilingualErrors {
  [field: string]: BilingualMessage
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ApiResponse<T> {
  success: boolean
  code: MessageCode
  message: BilingualMessage
  data: T | null
  errors: BilingualErrors | null
  meta: PaginationMeta | null
}

export const sendSuccess = <T>(
  res: Response,
  code: MessageCode,
  data: T,
  statusCode: HttpStatus = HTTP_STATUS.OK
): void => {
  const response: ApiResponse<T> = {
    success: true,
    code,
    message: MESSAGES[code],
    data,
    errors: null,
    meta: null,
  }
  res.status(statusCode).json(response)
}

export const sendCreated = <T>(
  res: Response,
  code: MessageCode,
  data: T
): void => {
  sendSuccess(res, code, data, HTTP_STATUS.CREATED)
}

export const sendNoContent = (
  res: Response,
  code: MessageCode
): void => {
  const response: ApiResponse<null> = {
    success: true,
    code,
    message: MESSAGES[code],
    data: null,
    errors: null,
    meta: null,
  }
  res.status(HTTP_STATUS.NO_CONTENT).json(response)
}

export const sendError = (
  res: Response,
  code: MessageCode,
  statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER,
  errors: BilingualErrors | null = null
): void => {
  const response: ApiResponse<null> = {
    success: false,
    code,
    message: MESSAGES[code],
    data: null,
    errors,
    meta: null,
  }
  res.status(statusCode).json(response)
}

export const sendPaginated = <T>(
  res: Response,
  code: MessageCode,
  data: T[],
  meta: PaginationMeta
): void => {
  const response: ApiResponse<T[]> = {
    success: true,
    code,
    message: MESSAGES[code],
    data,
    errors: null,
    meta,
  }
  res.status(HTTP_STATUS.OK).json(response)
}