import { Request, Response, NextFunction } from 'express'
import * as DistributorService from './distributors.service'
import {
  createDistributorSchema,
  updateDistributorSchema,
  distributorQuerySchema,
} from './distributors.validation'
import {
  GetDistributorsRequest,
  GetDistributorRequest,
  CreateDistributorRequest,
  UpdateDistributorRequest,
  DeleteDistributorRequest,
} from './distributors.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getDistributors = async (
  req: GetDistributorsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = distributorQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await DistributorService.getDistributors(
      req.user!.pharmacyId!,
      parsed.data
    )

    sendPaginated(res, MESSAGE_CODES.DISTRIBUTORS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getDistributor = async (
  req: GetDistributorRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const distributor = await DistributorService.getDistributorByUuid(
      req.params.distributor_uuid,
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.DISTRIBUTOR_FETCHED, distributor)
  } catch (err) {
    next(err)
  }
}

export const createDistributor = async (
  req: CreateDistributorRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createDistributorSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const distributor = await DistributorService.createDistributor(
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.DISTRIBUTOR_CREATED, distributor)
  } catch (err) {
    next(err)
  }
}

export const updateDistributor = async (
  req: UpdateDistributorRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateDistributorSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const distributor = await DistributorService.updateDistributor(
      req.params.distributor_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.DISTRIBUTOR_UPDATED, distributor)
  } catch (err) {
    next(err)
  }
}

export const deleteDistributor = async (
  req: DeleteDistributorRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await DistributorService.deleteDistributor(
      req.params.distributor_uuid,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.DISTRIBUTOR_DELETED, null)
  } catch (err) {
    next(err)
  }
}

export const getDistributorsDropdown = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await DistributorService.getDistributorsDropdown(
      req.user!.pharmacyId!,
      req.query.search as string | undefined
    )
    sendSuccess(res, MESSAGE_CODES.DISTRIBUTORS_FETCHED, data)
  } catch (err) {
    next(err)
  }
}