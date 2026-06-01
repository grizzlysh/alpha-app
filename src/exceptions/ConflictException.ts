import { AppError } from './AppError'
import { HTTP_STATUS } from '@constants/httpStatus'

export class ConflictException extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, HTTP_STATUS.CONFLICT)
  }
}