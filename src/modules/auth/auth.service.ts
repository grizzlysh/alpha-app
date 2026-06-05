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
  LoginUserData,
  CurrentPharmacyData,
  SelectPharmacyResponse,
  RefreshTokenResponse,
  PharmacyRoleItem,
  MeResponse,
  PermissionMap,
} from './auth.interface'
import { PharmacyItem } from '@interfaces/pharmacy.interface'
import { UnauthorizedException } from '@exceptions/UnauthorizedException'
import { NotFoundException } from '@exceptions/NotFoundException'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { PERMISSIONS } from '@constants/permissions'

// ── Token Helpers ─────────────────────────────────────

const getSessionExpiry = async (): Promise<number> => {
  const param = await prisma.systemParameter.findUnique({
    where: { key: 'SESSION_TIMEOUT_MINUTES' },
    select: { value: true },
  })
  const minutes = parseInt(param?.value ?? '480', 10)
  return minutes * 60 // JWT expiresIn expects seconds
}

const generateAccessToken = (payload: JwtPayload, expiresIn: number): string => {
  return jwt.sign(payload, env.JWT_SECRET as string, { expiresIn })
}

const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex')
}

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ── Permission Helpers ────────────────────────────────

const toPermissionMap = (permissions: string[]): PermissionMap => {
  const map: PermissionMap = {}
  for (const perm of permissions) {
    const dot = perm.indexOf('.')
    if (dot === -1) continue
    const module = perm.slice(0, dot)
    const action = perm.slice(dot + 1)
    if (!map[module]) map[module] = {}
    map[module][action] = true
  }
  return map
}

const getEffectivePermissions = async (
  userId: number,
  pharmacyId: number
): Promise<string[]> => {
  const placement = await prisma.placement.findFirst({
    where: { userId, pharmacyId, status: { not: 'DELETED' } },
    select: { roleId: true },
  })

  if (!placement) return []

  const globalPermissions = await prisma.rolePermission.findMany({
    where: {
      roleId: placement.roleId,
      pharmacyId: null,
      isEnabled: true,
    },
    include: { permission: true },
  })

  const pharmacyOverrides = await prisma.rolePermission.findMany({
    where: {
      roleId: placement.roleId,
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
    const pharmacies = await prisma.pharmacy.findMany({
      where: { status: 'ACTIVE' },
      select: { uuid: true, name: true, address: true },
    })
    return pharmacies.map((p) => ({ ...p, role: null }))
  }

  const placements = await prisma.placement.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      pharmacy: { select: { uuid: true, name: true, address: true } },
      role: { select: { name: true, type: true } },
    },
  })

  return placements.map((p) => ({
    ...p.pharmacy,
    role: { name: p.role.name, type: p.role.type },
  }))
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
      failedLoginCount: true,
      lockedUntil: true,
    },
  })

  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedException('Invalid email or password')
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedException('Account is temporarily locked. Please try again later.')
  }

  const maxAttemptsParam = await prisma.systemParameter.findUnique({
    where: { key: 'MAX_LOGIN_ATTEMPTS' },
    select: { value: true },
  })
  const maxAttempts = parseInt(maxAttemptsParam?.value ?? '5', 10)

  const isPasswordValid: boolean = await bcrypt.compare(
    data.password,
    user.password
  )

  if (!isPasswordValid) {
    const newCount = user.failedLoginCount + 1
    if (newCount >= maxAttempts) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: newCount,
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
        },
      })
      throw new UnauthorizedException('Too many failed attempts. Account locked for 30 minutes.')
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: newCount },
    })
    throw new UnauthorizedException('Invalid email or password')
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  })

  const accessiblePharmacies = await getPharmaciesForUser(user.id, user.platformRole)

  const accessTokenPayload: JwtPayload = {
    id: user.id,
    uuid: user.uuid,
    platformRole: user.platformRole,
    pharmacyId: null,
    pharmacyUuid: null,
    permissions: [],
  }

  const expiresIn = await getSessionExpiry()
  const accessToken = generateAccessToken(accessTokenPayload, expiresIn)
  const refreshToken = generateRefreshToken()
  const hashedRefreshToken = hashToken(refreshToken)

  await prisma.userToken.create({
    data: {
      userId: user.id,
      refreshToken: hashedRefreshToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdById: user.id,
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
      accessiblePharmacies,
    },
    currentPharmacy: null,
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
    select: { id: true, uuid: true, name: true },
  })

  if (!pharmacy) {
    throw new NotFoundException('Pharmacy not found')
  }

  let hasAccess: boolean = false
  let pharmacyRole: PharmacyRoleItem | null = null

  if (platformRole === PlatformRole.PLATFORM_ADMIN) {
    hasAccess = true
  } else {
    const placement = await prisma.placement.findFirst({
      where: { userId, pharmacyId: pharmacy.id, status: 'ACTIVE' },
      include: { role: { select: { uuid: true, name: true, type: true } } },
    })
    hasAccess = !!placement
    if (placement) {
      pharmacyRole = placement.role
    }
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

  await prisma.user.update({
    where: { id: userId },
    data: { lastSelectedPharmacyId: pharmacy.id },
  })

  const accessTokenPayload: JwtPayload = {
    id: userId,
    uuid: userUuid,
    platformRole,
    pharmacyId: pharmacy.id,
    pharmacyUuid: pharmacy.uuid,
    permissions,
  }

  const expiresIn = await getSessionExpiry()
  const accessToken = generateAccessToken(accessTokenPayload, expiresIn)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { uuid: true, name: true, email: true, platformRole: true },
  })

  if (!user) throw new UnauthorizedException('User not found')

  const accessiblePharmacies = await getPharmaciesForUser(userId, platformRole)

  const currentPharmacy: CurrentPharmacyData = {
    uuid: pharmacy.uuid,
    name: pharmacy.name,
    role: pharmacyRole,
    permissions: toPermissionMap(permissions),
  }

  return {
    accessToken,
    user: {
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole,
      accessiblePharmacies,
    },
    currentPharmacy,
  }
}

export const refreshAccessToken = async (
  refreshToken: string
): Promise<RefreshTokenResponse> => {
  const hashed = hashToken(refreshToken)

  const userToken = await prisma.userToken.findUnique({
    where: { refreshToken: hashed },
    include: {
      user: {
        select: {
          id: true,
          uuid: true,
          platformRole: true,
          status: true,
          lastSelectedPharmacyId: true,
        },
      },
    },
  })

  if (!userToken || userToken.expiresAt <= new Date()) {
    throw new UnauthorizedException('Invalid or expired refresh token')
  }

  if (userToken.user.status !== 'ACTIVE') {
    throw new UnauthorizedException('User is inactive')
  }

  const { user } = userToken

  let pharmacyId: number | null = null
  let pharmacyUuid: string | null = null
  let permissions: string[] = []

  if (user.lastSelectedPharmacyId) {
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { id: user.lastSelectedPharmacyId, status: 'ACTIVE' },
      select: { id: true, uuid: true },
    })
    if (pharmacy) {
      pharmacyId = pharmacy.id
      pharmacyUuid = pharmacy.uuid
      if (user.platformRole === PlatformRole.PLATFORM_ADMIN) {
        permissions = Object.values(PERMISSIONS)
      } else {
        permissions = await getEffectivePermissions(user.id, pharmacy.id)
      }
    }
  }

  const accessTokenPayload: JwtPayload = {
    id: user.id,
    uuid: user.uuid,
    platformRole: user.platformRole,
    pharmacyId,
    pharmacyUuid,
    permissions,
  }

  const expiresIn = await getSessionExpiry()
  const accessToken = generateAccessToken(accessTokenPayload, expiresIn)

  // Rotate: invalidate old token and issue a new one
  const newRefreshToken = generateRefreshToken()
  const newHashedRefreshToken = hashToken(newRefreshToken)

  await prisma.$transaction([
    prisma.userToken.delete({ where: { id: userToken.id } }),
    prisma.userToken.create({
      data: {
        userId: user.id,
        refreshToken: newHashedRefreshToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdById: user.id,
      },
    }),
  ])

  return { accessToken, refreshToken: newRefreshToken }
}

export const getMe = async (
  userId: number,
  platformRole: PlatformRole | null,
  pharmacyId: number | null,
  permissions: string[]
): Promise<MeResponse> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { uuid: true, name: true, email: true, platformRole: true },
  })

  if (!user) {
    throw new UnauthorizedException('User not found')
  }

  const accessiblePharmacies = await getPharmaciesForUser(userId, platformRole)

  const userData: LoginUserData = {
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    platformRole: user.platformRole,
    accessiblePharmacies,
  }

  if (!pharmacyId) {
    return { user: userData, currentPharmacy: null }
  }

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { uuid: true, name: true },
  })

  if (!pharmacy) {
    return { user: userData, currentPharmacy: null }
  }

  let role: PharmacyRoleItem | null = null

  if (platformRole !== PlatformRole.PLATFORM_ADMIN) {
    const placement = await prisma.placement.findFirst({
      where: { userId, pharmacyId, status: { not: 'DELETED' } },
      include: { role: { select: { uuid: true, name: true, type: true } } },
    })
    if (placement) {
      role = placement.role
    }
  }

  const currentPharmacy: CurrentPharmacyData = {
    uuid: pharmacy.uuid,
    name: pharmacy.name,
    role,
    permissions: toPermissionMap(permissions),
  }

  return { user: userData, currentPharmacy }
}

export const logout = async (
  userId: number,
  refreshToken: string
): Promise<void> => {
  const hashed = hashToken(refreshToken)
  await prisma.userToken.deleteMany({
    where: { userId, refreshToken: hashed },
  })
}
