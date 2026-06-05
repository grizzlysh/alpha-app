import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { ValidationException } from '@exceptions/ValidationException'

export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      throw new ValidationException(
        result.error.flatten().fieldErrors as Record<string, any>
      )
    }
    req.body = result.data
    next()
  }

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      throw new ValidationException(
        result.error.flatten().fieldErrors as Record<string, any>
      )
    }
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    })
    next()
  }
