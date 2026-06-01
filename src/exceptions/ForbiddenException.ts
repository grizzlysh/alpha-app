import { AppError } from './AppError'
import { HTTP_STATUS } from '@constants/httpStatus'

export class ForbiddenException extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN)
  }
}