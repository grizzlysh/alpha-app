import { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'
import * as JobService from './jobs.service'
import { GetJobRunsRequest, RunJobRequest } from './jobs.interface'
import { JobRunQueryInput } from './jobs.validation'

export const getJobs = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, MESSAGE_CODES.JOBS_FETCHED, await JobService.getJobs())
  } catch (err) {
    next(err)
  }
}

export const getJobRuns = async (req: GetJobRunsRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, MESSAGE_CODES.JOB_RUNS_FETCHED, await JobService.getJobRuns(req.query as JobRunQueryInput))
  } catch (err) {
    next(err)
  }
}

export const runJob = async (req: RunJobRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const outcome = await JobService.runJobNow(req.params.job_name, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.JOB_RUN_FINISHED, outcome)
  } catch (err) {
    next(err)
  }
}
