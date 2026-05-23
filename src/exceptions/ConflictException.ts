import { AppError } from '@exceptions/AppError'
import { HTTP_STATUS } from '@constants'

export class ConflictException extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, HTTP_STATUS.CONFLICT)
  }
}