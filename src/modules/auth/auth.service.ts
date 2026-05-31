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

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ── Permission Helpers ────────────────────────────────

const getEffectivePermissions = async (
  userId: number,
  pharmacyId: number
): Promise<string[]> => {
  const userPharmacy = await prisma.userPharmacy.findFirst({
    where: { userId, pharmacyId, status: { not: 'DELETED' } },
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

  const accessiblePharmacies = await getPharmaciesForUser(user.id, user.platformRole)

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
    select: { id: true, uuid: true, name: true, ownerId: true },
  })

  if (!pharmacy) {
    throw new NotFoundException('Pharmacy not found')
  }

  let hasAccess: boolean = false
  let pharmacyRole: PharmacyRoleItem | null = null

  if (platformRole === PlatformRole.PLATFORM_ADMIN) {
    hasAccess = true
  } else if (pharmacy.ownerId === userId) {
    hasAccess = true
    const userPharmacy = await prisma.userPharmacy.findFirst({
      where: { userId, pharmacyId: pharmacy.id, status: { not: 'DELETED' } },
      include: { role: { select: { uuid: true, name: true, type: true } } },
    })
    if (userPharmacy) {
      pharmacyRole = userPharmacy.role
    }
  } else {
    const userPharmacy = await prisma.userPharmacy.findFirst({
      where: { userId, pharmacyId: pharmacy.id, status: { not: 'DELETED' } },
      include: { role: { select: { uuid: true, name: true, type: true } } },
    })
    hasAccess = !!userPharmacy && userPharmacy.status === 'ACTIVE'
    if (hasAccess && userPharmacy) {
      pharmacyRole = userPharmacy.role
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

  const accessTokenPayload: JwtPayload = {
    id: userId,
    uuid: userUuid,
    platformRole,
    pharmacyId: pharmacy.id,
    pharmacyUuid: pharmacy.uuid,
    permissions,
  }

  const accessToken = generateAccessToken(accessTokenPayload)

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
    permissions,
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

  const accessTokenPayload: JwtPayload = {
    id: userToken.user.id,
    uuid: userToken.user.uuid,
    platformRole: userToken.user.platformRole,
    pharmacyId: null,
    pharmacyUuid: null,
    permissions: [],
  }

  const accessToken = generateAccessToken(accessTokenPayload)

  return { accessToken }
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
    const userPharmacy = await prisma.userPharmacy.findFirst({
      where: { userId, pharmacyId, status: { not: 'DELETED' } },
      include: { role: { select: { uuid: true, name: true, type: true } } },
    })
    if (userPharmacy) {
      role = userPharmacy.role
    }
  }

  const currentPharmacy: CurrentPharmacyData = {
    uuid: pharmacy.uuid,
    name: pharmacy.name,
    role,
    permissions,
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
