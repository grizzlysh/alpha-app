import { AppError } from '@exceptions/AppError'
import { HTTP_STATUS } from '@constants'

export class ForbiddenException extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN)
  }
}