import { AppError } from './AppError'
import { HTTP_STATUS } from '@constants/httpStatus'

interface BilingualMessage {
  en: string
  id: string
}

export class ValidationException extends AppError {
  public readonly errors: Record<string, BilingualMessage>

  constructor(
    errors: Record<string, BilingualMessage>,
    message: string = 'Validation failed'
  ) {
    super(message, HTTP_STATUS.UNPROCESSABLE)
    this.errors = errors
  }
}