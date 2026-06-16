import { AppRole } from '@prisma/client'

export interface PharmacyRoleBasic {
  name: string
  type: AppRole
}

export interface PharmacyItem {
  uuid: string
  name: string
  address: string
  role: PharmacyRoleBasic | null
}