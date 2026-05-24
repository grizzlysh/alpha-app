import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { PlatformRole } from '@prisma/client'
import { prisma } from '@config/db'
import { env } from '@config/env'
import { LoginInput, SelectPharmacyInput } from './auth.validation'
import {
  JwtPayload,
  LoginResult,
  SelectPharmacyResponse,
  RefreshTokenResponse,
} from './auth.interface'
import { PharmacyItem } from '@interfaces/pharmacy.interface'
import { UnauthorizedException } from '@exceptions/UnauthorizedException'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PERMISSIONS } from '@constants/permissions'

// ── Token Helpers ─────────────────────────────────────

const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET as string, {
    expiresIn: '15m',
  })
}

const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex')
}

const hashToken = async (token: string): Promise<string> => {
  return bcrypt.hash(token, 10)
}

// ── Permission Helpers ────────────────────────────────

const getEffectivePermissions = async (
  userId: number,
  pharmacyId: number
): Promise<string[]> => {
  const userPharmacy = await prisma.userPharmacy.findUnique({
    where: {
      userId_pharmacyId: { userId, pharmacyId },
    },
    select: { roleId: true },
  })

  if (!userPharmacy) return []

  const globalPermissions = await prisma.rolePermission.findMany({
    where: {
      roleId: userPharmacy.roleId,
      pharmacyId: null,
      isEnabled: true,
    },
    include: { permission: true },
  })

  const pharmacyOverrides = await prisma.rolePermission.findMany({
    where: {
      roleId: userPharmacy.roleId,
      pharmacyId,
    },
    include: { permission: true },
  })

  const permissionMap = new Map<string, boolean>()

  globalPermissions.forEach((rp) => {
    const key = `${rp.permission.module}.${rp.permission.action}`
    permissionMap.set(key, rp.isEnabled)
  })

  pharmacyOverrides.forEach((rp) => {
    const key = `${rp.permission.module}.${rp.permission.action}`
    permissionMap.set(key, rp.isEnabled)
  })

  return Array.from(permissionMap.entries())
    .filter(([_, enabled]) => enabled)
    .map(([permission]) => permission)
}

// ── Pharmacy Helpers ──────────────────────────────────

const getPharmaciesForUser = async (
  userId: number,
  platformRole: PlatformRole | null
): Promise<PharmacyItem[]> => {
  if (platformRole === PlatformRole.PLATFORM_ADMIN) {
    return prisma.pharmacy.findMany({
      where: { status: 'ACTIVE' },
      select: { uuid: true, name: true, address: true },
    })
  }

  const ownedPharmacies = await prisma.pharmacy.findMany({
    where: { ownerId: userId, status: 'ACTIVE' },
    select: { uuid: true, name: true, address: true },
  })

  const assignedPharmacies = await prisma.userPharmacy.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      pharmacy: {
        select: { uuid: true, name: true, address: true },
      },
    },
  })

  const allPharmacies = new Map<string, PharmacyItem>()
  ownedPharmacies.forEach((p) => allPharmacies.set(p.uuid, p))
  assignedPharmacies.forEach((up) =>
    allPharmacies.set(up.pharmacy.uuid, up.pharmacy)
  )

  return Array.from(allPharmacies.values())
}

// ── Services ──────────────────────────────────────────

export const login = async (data: LoginInput): Promise<LoginResult> => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      uuid: true,
      name: true,
      email: true,
      password: true,
      platformRole: true,
      status: true,
    },
  })

  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedException('Invalid email or password')
  }

  const isPasswordValid: boolean = await bcrypt.compare(
    data.password,
    user.password
  )

  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid email or password')
  }

  const pharmacies = await getPharmaciesForUser(user.id, user.platformRole)

  const accessTokenPayload: JwtPayload = {
    id: user.id,
    uuid: user.uuid,
    platformRole: user.platformRole,
    pharmacyId: null,
    pharmacyUuid: null,
    permissions: [],
  }

  const accessToken = generateAccessToken(accessTokenPayload)
  const refreshToken = generateRefreshToken()
  const hashedRefreshToken = await hashToken(refreshToken)

  await prisma.userToken.create({
    data: {
      userId: user.id,
      refreshToken: hashedRefreshToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: user.uuid,
    },
  })

  return {
    accessToken,
    refreshToken,
    user: {
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole,
      pharmacies,
    },
  }
}

export const selectPharmacy = async (
  userId: number,
  userUuid: string,
  platformRole: PlatformRole | null,
  data: SelectPharmacyInput
): Promise<SelectPharmacyResponse> => {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { uuid: data.pharmacyUuid, status: 'ACTIVE' },
    select: { id: true, uuid: true, name: true, ownerId: true },
  })

  if (!pharmacy) {
    throw new NotFoundException('Pharmacy not found')
  }

  let hasAccess: boolean = false

  if (platformRole === PlatformRole.PLATFORM_ADMIN) {
    hasAccess = true
  } else if (pharmacy.ownerId === userId) {
    hasAccess = true
  } else {
    const userPharmacy = await prisma.userPharmacy.findUnique({
      where: {
        userId_pharmacyId: { userId, pharmacyId: pharmacy.id },
      },
    })
    hasAccess = !!userPharmacy && userPharmacy.status === 'ACTIVE'
  }

  if (!hasAccess) {
    throw new ForbiddenException('You do not have access to this pharmacy')
  }

  let permissions: string[] = []

  if (platformRole === PlatformRole.PLATFORM_ADMIN) {
    permissions = Object.values(PERMISSIONS)
  } else {
    permissions = await getEffectivePermissions(userId, pharmacy.id)
  }

  const accessTokenPayload: JwtPayload = {
    id: userId,
    uuid: userUuid,
    platformRole,
    pharmacyId: pharmacy.id,
    pharmacyUuid: pharmacy.uuid,
    permissions,
  }

  const accessToken = generateAccessToken(accessTokenPayload)

  return {
    accessToken,
    pharmacy: {
      uuid: pharmacy.uuid,
      name: pharmacy.name,
    },
  }
}

export const refreshAccessToken = async (
  refreshToken: string
): Promise<RefreshTokenResponse> => {
  const userTokens = await prisma.userToken.findMany({
    where: {
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          uuid: true,
          platformRole: true,
          status: true,
        },
      },
    },
  })

  let matchedToken = null
  for (const token of userTokens) {
    const isMatch = await bcrypt.compare(refreshToken, token.refreshToken)
    if (isMatch) {
      matchedToken = token
      break
    }
  }

  if (!matchedToken) {
    throw new UnauthorizedException('Invalid or expired refresh token')
  }

  if (matchedToken.user.status !== 'ACTIVE') {
    throw new UnauthorizedException('User is inactive')
  }

  const accessTokenPayload: JwtPayload = {
    id: matchedToken.user.id,
    uuid: matchedToken.user.uuid,
    platformRole: matchedToken.user.platformRole,
    pharmacyId: null,
    pharmacyUuid: null,
    permissions: [],
  }

  const accessToken = generateAccessToken(accessTokenPayload)

  return { accessToken }
}

export const logout = async (
  userId: number,
  refreshToken: string
): Promise<void> => {
  const userTokens = await prisma.userToken.findMany({
    where: { userId },
  })

  for (const token of userTokens) {
    const isMatch = await bcrypt.compare(refreshToken, token.refreshToken)
    if (isMatch) {
      await prisma.userToken.delete({ where: { id: token.id } })
      break
    }
  }
}