import { PlatformRole } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        uuid: string
        pharmacyId: number | null
        pharmacyUuid: string | null
        roleId: number | null
        platformRole: PlatformRole | null
        permissions: string[]
      }
    }
  }
}