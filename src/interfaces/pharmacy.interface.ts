import { PharmacyRole } from '@prisma/client'

export interface PharmacyRoleBasic {
  name: string
  type: PharmacyRole
}

export interface PharmacyItem {
  uuid: string
  name: string
  address: string
  role: PharmacyRoleBasic | null
}