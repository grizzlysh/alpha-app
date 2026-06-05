import { Request } from 'express'
import { PlatformRole, PharmacyRole } from '@prisma/client'
import { PharmacyItem } from '@interfaces/pharmacy.interface'

// ── Param/Body Types ──────────────────────────────────

export interface LoginBody {
  email: string
  password: string
}

export interface SelectPharmacyBody {
  pharmacyUuid: string
}

// ── Typed Request Aliases ─────────────────────────────

export type LoginRequest = Request<
  {},
  {},
  LoginBody,
  {}
>

export type SelectPharmacyRequest = Request<
  {},
  {},
  SelectPharmacyBody,
  {}
>

export type RefreshRequest = Request<
  {}, {}, {}, {}
>

export type LogoutRequest = Request<
  {}, {}, {}, {}
>

export type MeRequest = Request<
  {}, {}, {}, {}
>

// ── Internal Types ────────────────────────────────────

export interface JwtPayload {
  id: number
  uuid: string
  platformRole: PlatformRole | null
  pharmacyId: number | null
  pharmacyUuid: string | null
  permissions: string[]
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: LoginUserData
  currentPharmacy: null
}

export interface LoginUserData {
  uuid: string
  name: string
  email: string
  platformRole: PlatformRole | null
  accessiblePharmacies: PharmacyItem[]
}

// ── Response Types ────────────────────────────────────

export type PermissionMap = Record<string, Record<string, boolean>>

export interface PharmacyRoleItem {
  uuid: string
  name: string
  type: PharmacyRole
}

export interface CurrentPharmacyData {
  uuid: string
  name: string
  role: PharmacyRoleItem | null
  permissions: PermissionMap
}

export interface LoginResponse {
  accessToken: string
  user: LoginUserData
  currentPharmacy: CurrentPharmacyData | null
}

export interface SelectPharmacyResponse {
  accessToken: string
  user: LoginUserData
  currentPharmacy: CurrentPharmacyData
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

export interface MeResponse {
  user: LoginUserData
  currentPharmacy: CurrentPharmacyData | null
}
