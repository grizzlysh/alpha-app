import { AppError } from '@exceptions/AppError'
import { HTTP_STATUS } from '@constants'

export class BadRequestException extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, HTTP_STATUS.BAD_REQUEST)
  }
}