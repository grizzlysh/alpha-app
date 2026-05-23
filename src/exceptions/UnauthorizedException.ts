import { AppError } from '@exceptions/AppError'
import { HTTP_STATUS } from '@constants'

export class UnauthorizedException extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, HTTP_STATUS.UNAUTHORIZED)
  }
}