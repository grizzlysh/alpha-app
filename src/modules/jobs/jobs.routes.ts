import { Router } from 'express'
import { PlatformRole } from '@prisma/client'
import * as JobController from './jobs.controller'
import { authenticate } from '@middlewares/auth'
import { requirePlatformRole } from '@middlewares/roleGuard'
import { validateBody, validateQuery } from '@middlewares/validate'
import { jobRunQuerySchema, updateJobSettingsSchema } from './jobs.validation'

// Background jobs touch every pharmacy, so only the platform admin may see or run them.
const router: Router = Router()
router.use(authenticate)
router.use(requirePlatformRole(PlatformRole.PLATFORM_ADMIN))

router.get('/', JobController.getJobs)
router.get('/runs', validateQuery(jobRunQuerySchema), JobController.getJobRuns)
router.post('/:job_name/run', JobController.runJob)
router.put('/:job_name/settings', validateBody(updateJobSettingsSchema), JobController.updateJobSettings)

export default router
