import { parseUuid } from '@utils/parseUuid'
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
    const { data, meta } = await DistributorService.getDistributors(
      req.user!.pharmacyId!,
      req.query as any
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
      parseUuid(req.params.distributor_uuid),
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
    const distributor = await DistributorService.createDistributor(
      req.body,
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
    const distributor = await DistributorService.updateDistributor(
      parseUuid(req.params.distributor_uuid),
      req.body,
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
      parseUuid(req.params.distributor_uuid),
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
