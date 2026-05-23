import { PlatformRole, PharmacyRole } from '@prisma/client'

export const PLATFORM_ROLES = {
  PLATFORM_ADMIN: PlatformRole.PLATFORM_ADMIN,
  PLATFORM_VIEWER: PlatformRole.PLATFORM_VIEWER,
  PLATFORM_SUPPORT: PlatformRole.PLATFORM_SUPPORT,
} as const

export const PHARMACY_ROLES = {
  OWNER: PharmacyRole.OWNER,
  ADMIN: PharmacyRole.ADMIN,
  PHARMACIST: PharmacyRole.PHARMACIST,
  CASHIER: PharmacyRole.CASHIER,
} as const