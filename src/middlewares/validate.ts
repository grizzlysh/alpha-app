import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { ValidationException } from '@exceptions/ValidationException'
import { formatZodErrors } from '@utils/zodErrors'

export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {})
    if (!result.success) {
      throw new ValidationException(formatZodErrors(result.error))
    }
    req.body = result.data
    next()
  }

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      throw new ValidationException(formatZodErrors(result.error))
    }
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    })
    next()
  }
