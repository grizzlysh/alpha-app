import { Response, NextFunction } from 'express'
import * as DashboardService from './dashboard.service'
import { GetDashboardRequest, GetAdvancedDashboardRequest } from './dashboard.interface'
import { advancedDashboardQuerySchema } from './dashboard.validation'
import { sendSuccess } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getDashboard = async (
  req: GetDashboardRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await DashboardService.getDashboard(req.user!.pharmacyId!)
    sendSuccess(res, MESSAGE_CODES.DASHBOARD_FETCHED, data)
  } catch (err) {
    next(err)
  }
}

export const getAdvancedDashboard = async (
  req: GetAdvancedDashboardRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = advancedDashboardQuerySchema.parse(req.query)
    const data = await DashboardService.getAdvancedDashboard(req.user!.pharmacyId!, query)
    sendSuccess(res, MESSAGE_CODES.DASHBOARD_ADVANCED_FETCHED, data)
  } catch (err) {
    next(err)
  }
}
