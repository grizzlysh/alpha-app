import { Request, Response, NextFunction } from 'express'
import { MESSAGE_CODES } from '@constants/messageCodes'
import { sendPaginated, sendSuccess } from '@utils/responseHelper'
import * as AuditLogService from './audit-logs.service'
import { AuditLogQueryInput } from './audit-logs.validation'

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await AuditLogService.getAuditLogs(req.user!.pharmacyId!, req.query as unknown as AuditLogQueryInput)
    sendPaginated(res, MESSAGE_CODES.AUDIT_LOGS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getAuditActions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, MESSAGE_CODES.AUDIT_LOGS_FETCHED, await AuditLogService.getAuditActions(req.user!.pharmacyId!))
  } catch (err) {
    next(err)
  }
}
