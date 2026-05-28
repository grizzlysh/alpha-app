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
}

export interface LoginUserData {
  uuid: string
  name: string
  email: string
  platformRole: PlatformRole | null
  pharmacies: PharmacyItem[]
}

// ── Response Types ────────────────────────────────────

export interface LoginResponse {
  accessToken: string
  user: LoginUserData
}

export interface PharmacyRoleItem {
  uuid: string
  name: string
  type: PharmacyRole
}

export interface SelectPharmacyResponse {
  accessToken: string
  pharmacy: {
    uuid: string
    name: string
  }
  role: PharmacyRoleItem | null
}

export interface RefreshTokenResponse {
  accessToken: string
}

export interface MeResponse {
  uuid: string
  platformRole: PlatformRole | null
  pharmacyUuid: string | null
  permissions: string[]
}