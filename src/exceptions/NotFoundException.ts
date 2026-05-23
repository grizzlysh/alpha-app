import { AppError } from './AppError'
import { HTTP_STATUS } from '../constants'

export class NotFoundException extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND)
  }
}