import { parseUuid } from '@utils/parseUuid'
import { Request, Response, NextFunction } from 'express'
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
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getCustomers = async (
  req: GetCustomersRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, meta } = await CustomerService.getCustomers(
      req.user!.pharmacyId!,
      req.query as any
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
      parseUuid(req.params.customer_uuid),
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
    const customer = await CustomerService.createCustomer(
      req.body,
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
    const customer = await CustomerService.updateCustomer(
      parseUuid(req.params.customer_uuid),
      req.body,
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
      parseUuid(req.params.customer_uuid),
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.CUSTOMER_DELETED, null)
  } catch (err) {
    next(err)
  }
}

export const getCustomersDropdown = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await CustomerService.getCustomersDropdown(
      req.user!.pharmacyId!,
      req.query.search as string | undefined
    )
    sendSuccess(res, MESSAGE_CODES.CUSTOMERS_FETCHED, data)
  } catch (err) {
    next(err)
  }
}
