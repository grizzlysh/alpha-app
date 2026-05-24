import { Response, NextFunction } from 'express'
import * as CustomerService from './customers.service'
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from './customers.validation'
import {
  GetCustomersRequest,
  GetCustomerRequest,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  DeleteCustomerRequest,
} from './customers.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getCustomers = async (
  req: GetCustomersRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = customerQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await CustomerService.getCustomers(
      req.user!.pharmacyId!,
      parsed.data
    )

    sendPaginated(res, MESSAGE_CODES.CUSTOMERS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getCustomer = async (
  req: GetCustomerRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customer = await CustomerService.getCustomerByUuid(
      req.params.customer_uuid,
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.CUSTOMER_FETCHED, customer)
  } catch (err) {
    next(err)
  }
}

export const createCustomer = async (
  req: CreateCustomerRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createCustomerSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const customer = await CustomerService.createCustomer(
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.CUSTOMER_CREATED, customer)
  } catch (err) {
    next(err)
  }
}

export const updateCustomer = async (
  req: UpdateCustomerRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateCustomerSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const customer = await CustomerService.updateCustomer(
      req.params.customer_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.CUSTOMER_UPDATED, customer)
  } catch (err) {
    next(err)
  }
}

export const deleteCustomer = async (
  req: DeleteCustomerRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await CustomerService.deleteCustomer(
      req.params.customer_uuid,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendNoContent(res, MESSAGE_CODES.CUSTOMER_DELETED)
  } catch (err) {
    next(err)
  }
}