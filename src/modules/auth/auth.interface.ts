import { PlatformRole } from '@prisma/client'
import { PharmacyItem } from '@interfaces/pharmacy.interface'

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

// ── Request Types ─────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface SelectPharmacyRequest {
  pharmacyUuid: string
}

// ── Response Types ────────────────────────────────────
export interface LoginResponse {
  accessToken: string
  user: LoginUserData
}

export interface SelectPharmacyResponse {
  accessToken: string
  pharmacy: {
    uuid: string
    name: string
  }
}

export interface RefreshTokenResponse {
  accessToken: string
}

export interface MeResponse {
  id: number
  uuid: string
  platformRole: PlatformRole | null
  pharmacyId: number | null
  pharmacyUuid: string | null
  permissions: string[]
}