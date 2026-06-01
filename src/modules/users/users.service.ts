import { RecordStatus, PlatformRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@config/db';
import { BadRequestException } from '@exceptions/BadRequestException';
import { ConflictException } from '@exceptions/ConflictException';
import { ForbiddenException } from '@exceptions/ForbiddenException';
import { NotFoundException } from '@exceptions/NotFoundException';
import { UnauthorizedException } from '@exceptions/UnauthorizedException';
import { PERMISSIONS } from '@constants/permissions';
import {
  ListUserQuery,
  ListPlacementQuery,
  ListLicenseQuery,
  CreateUserBody,
  UpdateUserBody,
  UpdateMeBody,
  ChangePasswordBody,
  CreatePlacementBody,
  UpdatePlacementBody,
  CreateLicenseBody,
  UpdateLicenseBody,
  UserListItem,
  UserDetailItem,
  MeItem,
  PlacementItem,
  LicenseItem,
} from './users.interface';

const BCRYPT_ROUNDS = 10;

// ─── Selects ──────────────────────────────────────────────────────────────────

const licenseSelect = {
  uuid: true,
  licenseNumber: true,
  validFrom: true,
  validUntil: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const placementSelect = {
  uuid: true,
  joinedAt: true,
  leftAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  pharmacy: { select: { uuid: true, name: true, code: true } },
  role: { select: { uuid: true, name: true } },
  licenses: {
    where: { deletedAt: null, status: RecordStatus.ACTIVE },
    select: licenseSelect,
    orderBy: { validUntil: 'desc' as const },
    take: 1,
  },
};

const userBaseSelect = {
  uuid: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  platformRole: true,
  mustChangePassword: true,
  status: true,
  createdAt: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLicense(l: any): LicenseItem {
  return {
    uuid: l.uuid,
    licenseNumber: l.licenseNumber,
    validFrom: l.validFrom,
    validUntil: l.validUntil,
    status: l.status,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

function formatPlacement(a: any): PlacementItem {
  return {
    uuid: a.uuid,
    pharmacy: a.pharmacy,
    role: a.role,
    joinedAt: a.joinedAt,
    leftAt: a.leftAt,
    status: a.status,
    activeLicense: a.licenses?.[0] ? formatLicense(a.licenses[0]) : null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

// PERMISSIONS.SIGN_FULL = 'sign.full' → module='sign', action='full'
const [SIGN_FULL_MODULE, SIGN_FULL_ACTION] = PERMISSIONS.SIGN_FULL.split('.');

async function roleHasSignFull(roleId: number): Promise<boolean> {
  const signFull = await prisma.permission.findFirst({
    where: { module: SIGN_FULL_MODULE, action: SIGN_FULL_ACTION },
  });
  if (!signFull) return false;

  const rp = await prisma.rolePermission.findFirst({
    where: { roleId, permissionId: signFull.id, isEnabled: true },
  });
  return !!rp;
}

async function getDefaultPassword(): Promise<string> {
  const param = await prisma.systemParameter.findFirst({
    where: { key: 'DEFAULT_PASSWORD' },
  });
  if (!param) throw new BadRequestException('DEFAULT_PASSWORD_NOT_CONFIGURED');
  return param.value;
}

// ─── Me ───────────────────────────────────────────────────────────────────────

export async function getMe(userId: number, pharmacyId?: number): Promise<MeItem> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      ...userBaseSelect,
      updatedAt: true,
      userPharmacies: pharmacyId
        ? {
            where: { pharmacyId, deletedAt: null, status: RecordStatus.ACTIVE },
            select: placementSelect,
            take: 1,
          }
        : undefined,
    },
  });

  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  return {
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    platformRole: user.platformRole,
    mustChangePassword: user.mustChangePassword,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    currentPlacement:
      user.userPharmacies?.[0] ? formatPlacement(user.userPharmacies[0]) : null,
  };
}

export async function updateMe(
  userId: number,
  updatedById: number,
  body: UpdateMeBody
): Promise<MeItem> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.address !== undefined && { address: body.address }),
      updatedById,
    },
  });

  return getMe(userId);
}

export async function changePassword(
  userId: number,
  body: ChangePasswordBody
): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, password: true },
  });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const valid = await bcrypt.compare(body.currentPassword, user.password);
  if (!valid) throw new UnauthorizedException('CURRENT_PASSWORD_INCORRECT');

  if (body.currentPassword === body.newPassword) {
    throw new BadRequestException('NEW_PASSWORD_MUST_BE_DIFFERENT');
  }

  const hashed = await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        mustChangePassword: false,
        updatedById: userId,
      },
    });
    await tx.userToken.deleteMany({ where: { userId } });
  });
}

// ─── List Users ───────────────────────────────────────────────────────────────

export async function listUsers(
  query: ListUserQuery
): Promise<{ data: UserListItem[]; total: number }> {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')));
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(query.status && { status: query.status }),
    ...(query.platformRole && { platformRole: query.platformRole }),
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        ...userBaseSelect,
        _count: {
          select: {
            userPharmacies: {
              where: { deletedAt: null, status: RecordStatus.ACTIVE },
            },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map((u) => ({
      uuid: u.uuid,
      name: u.name,
      email: u.email,
      phone: u.phone,
      address: u.address,
      platformRole: u.platformRole,
      mustChangePassword: u.mustChangePassword,
      status: u.status,
      assignmentCount: u._count.userPharmacies,
      createdAt: u.createdAt,
    })),
    total,
  };
}

// ─── Get User ─────────────────────────────────────────────────────────────────

export async function getUser(userUuid: string): Promise<UserDetailItem> {
  const user = await prisma.user.findFirst({
    where: { uuid: userUuid, deletedAt: null },
    select: {
      ...userBaseSelect,
      updatedAt: true,
      _count: {
        select: {
          userPharmacies: {
            where: { deletedAt: null, status: RecordStatus.ACTIVE },
          },
        },
      },
      userPharmacies: {
        where: { deletedAt: null },
        select: placementSelect,
        orderBy: { joinedAt: 'desc' },
      },
    },
  });

  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  return {
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    platformRole: user.platformRole,
    mustChangePassword: user.mustChangePassword,
    status: user.status,
    assignmentCount: user._count.userPharmacies,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    placements: user.userPharmacies.map(formatPlacement),
  };
}

// ─── Create User ──────────────────────────────────────────────────────────────

export async function createUser(
  createdById: number,
  body: CreateUserBody
): Promise<UserDetailItem> {
  const duplicate = await prisma.user.findFirst({
    where: { email: body.email, deletedAt: null },
  });
  if (duplicate) throw new ConflictException('EMAIL_ALREADY_EXISTS');

  const defaultPassword = await getDefaultPassword();
  const hashed = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: hashed,
      phone: body.phone,
      address: body.address,
      platformRole: body.platformRole ?? PlatformRole.PLATFORM_VIEWER,
      mustChangePassword: true,
      createdById,
      updatedById: createdById,
    },
    select: {
      ...userBaseSelect,
      updatedAt: true,
      _count: {
        select: {
          userPharmacies: { where: { deletedAt: null, status: RecordStatus.ACTIVE } },
        },
      },
    },
  });

  return {
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    platformRole: user.platformRole,
    mustChangePassword: user.mustChangePassword,
    status: user.status,
    assignmentCount: 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    placements: [],
  };
}

// ─── Update User ──────────────────────────────────────────────────────────────

export async function updateUser(
  updatedById: number,
  userUuid: string,
  body: UpdateUserBody
): Promise<UserDetailItem> {
  const user = await prisma.user.findFirst({
    where: { uuid: userUuid, deletedAt: null },
  });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  if (body.email && body.email !== user.email) {
    const duplicate = await prisma.user.findFirst({
      where: { email: body.email, deletedAt: null, id: { not: user.id } },
    });
    if (duplicate) throw new ConflictException('EMAIL_ALREADY_EXISTS');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.email && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.platformRole && { platformRole: body.platformRole }),
      ...(body.status && { status: body.status }),
      updatedById,
    },
  });

  return getUser(userUuid);
}

// ─── Delete User ──────────────────────────────────────────────────────────────

export async function deleteUser(
  deletedById: number,
  userUuid: string
): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { uuid: userUuid, deletedAt: null },
  });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const activeAssignments = await prisma.userPharmacy.count({
    where: { userId: user.id, deletedAt: null, status: RecordStatus.ACTIVE },
  });
  if (activeAssignments > 0) throw new ConflictException('USER_HAS_ACTIVE_PLACEMENTS');

  if (user.id === deletedById) throw new ForbiddenException('CANNOT_DELETE_YOURSELF');

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        status: RecordStatus.DELETED,
        deletedAt: new Date(),
        deletedById,
      },
    });
    await tx.userToken.deleteMany({ where: { userId: user.id } });
  });
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(
  updatedById: number,
  userUuid: string
): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { uuid: userUuid, deletedAt: null },
  });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const defaultPassword = await getDefaultPassword();
  const hashed = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        mustChangePassword: true,
        updatedById,
      },
    });
    await tx.userToken.deleteMany({ where: { userId: user.id } });
  });
}

// ─── List Assignments ─────────────────────────────────────────────────────────

export async function listPlacements(
  userUuid: string,
  query: ListPlacementQuery
): Promise<{ data: PlacementItem[]; total: number }> {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')));
  const skip = (page - 1) * limit;

  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const where = {
    userId: user.id,
    deletedAt: null,
    ...(query.status && { status: query.status }),
  };

  const [assignments, total] = await prisma.$transaction([
    prisma.userPharmacy.findMany({
      where,
      skip,
      take: limit,
      orderBy: { joinedAt: 'desc' },
      select: placementSelect,
    }),
    prisma.userPharmacy.count({ where }),
  ]);

  return { data: assignments.map(formatPlacement), total };
}

// ─── Get Assignment ───────────────────────────────────────────────────────────

export async function getPlacement(
  userUuid: string,
  assignmentUuid: string
): Promise<PlacementItem> {
  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const assignment = await prisma.userPharmacy.findFirst({
    where: { uuid: assignmentUuid, userId: user.id, deletedAt: null },
    select: placementSelect,
  });
  if (!assignment) throw new NotFoundException('PLACEMENT_NOT_FOUND');

  return formatPlacement(assignment);
}

// ─── Create Assignment ────────────────────────────────────────────────────────

export async function createPlacement(
  createdById: number,
  userUuid: string,
  body: CreatePlacementBody
): Promise<PlacementItem> {
  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const pharmacy = await prisma.pharmacy.findFirst({
    where: { uuid: body.pharmacyUuid, deletedAt: null },
  });
  if (!pharmacy) throw new NotFoundException('PHARMACY_NOT_FOUND');

  const role = await prisma.role.findFirst({
    where: { uuid: body.roleUuid, deletedAt: null },
  });
  if (!role) throw new NotFoundException('ROLE_NOT_FOUND');

  const activeCount = await prisma.userPharmacy.count({
    where: { userId: user.id, deletedAt: null, status: RecordStatus.ACTIVE, leftAt: null },
  });
  if (activeCount >= 3) throw new BadRequestException('MAX_PLACEMENTS_REACHED');

  const duplicate = await prisma.userPharmacy.findFirst({
    where: { userId: user.id, pharmacyId: pharmacy.id, deletedAt: null, leftAt: null },
  });
  if (duplicate) throw new ConflictException('USER_ALREADY_PLACED_AT_PHARMACY');

  // Max 1 SIGN_FULL role per pharmacy
  const isSignFull = await roleHasSignFull(role.id);
  if (isSignFull) {
    const existingSignFull = await prisma.userPharmacy.findFirst({
      where: {
        pharmacyId: pharmacy.id,
        deletedAt: null,
        leftAt: null,
        status: RecordStatus.ACTIVE,
        role: {
          rolePermissions: {
            some: {
              isEnabled: true,
              permission: { module: SIGN_FULL_MODULE, action: SIGN_FULL_ACTION },
            },
          },
        },
      },
    });
    if (existingSignFull) throw new ConflictException('PHARMACY_ALREADY_HAS_SIGN_FULL_USER');
  }

  const assignment = await prisma.userPharmacy.create({
    data: {
      userId: user.id,
      pharmacyId: pharmacy.id,
      roleId: role.id,
      joinedAt: new Date(body.joinedAt),
      createdById,
      updatedById: createdById,
    },
    select: placementSelect,
  });

  return formatPlacement(assignment);
}

// ─── Update Assignment ────────────────────────────────────────────────────────

export async function updatePlacement(
  updatedById: number,
  userUuid: string,
  assignmentUuid: string,
  body: UpdatePlacementBody
): Promise<PlacementItem> {
  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const assignment = await prisma.userPharmacy.findFirst({
    where: { uuid: assignmentUuid, userId: user.id, deletedAt: null },
  });
  if (!assignment) throw new NotFoundException('PLACEMENT_NOT_FOUND');

  let roleId: number | undefined;
  if (body.roleUuid) {
    const role = await prisma.role.findFirst({ where: { uuid: body.roleUuid, deletedAt: null } });
    if (!role) throw new NotFoundException('ROLE_NOT_FOUND');

    const isSignFull = await roleHasSignFull(role.id);
    if (isSignFull) {
      const existingSignFull = await prisma.userPharmacy.findFirst({
        where: {
          pharmacyId: assignment.pharmacyId,
          deletedAt: null,
          leftAt: null,
          status: RecordStatus.ACTIVE,
          id: { not: assignment.id },
          role: {
            rolePermissions: {
              some: {
                isEnabled: true,
                permission: { module: SIGN_FULL_MODULE, action: SIGN_FULL_ACTION },
              },
            },
          },
        },
      });
      if (existingSignFull) throw new ConflictException('PHARMACY_ALREADY_HAS_SIGN_FULL_USER');
    }

    roleId = role.id;
  }

  const updated = await prisma.userPharmacy.update({
    where: { id: assignment.id },
    data: {
      ...(roleId && { roleId }),
      ...(body.joinedAt && { joinedAt: new Date(body.joinedAt) }),
      ...(body.leftAt !== undefined && { leftAt: body.leftAt ? new Date(body.leftAt) : null }),
      ...(body.status && { status: body.status }),
      updatedById,
    },
    select: placementSelect,
  });

  return formatPlacement(updated);
}

// ─── Delete Assignment ────────────────────────────────────────────────────────

export async function deletePlacement(
  deletedById: number,
  userUuid: string,
  assignmentUuid: string
): Promise<void> {
  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const assignment = await prisma.userPharmacy.findFirst({
    where: { uuid: assignmentUuid, userId: user.id, deletedAt: null },
  });
  if (!assignment) throw new NotFoundException('PLACEMENT_NOT_FOUND');

  await prisma.userPharmacy.update({
    where: { id: assignment.id },
    data: {
      status: RecordStatus.DELETED,
      deletedAt: new Date(),
      deletedById,
    },
  });
}

// ─── Internal Helper ──────────────────────────────────────────────────────────

async function _resolvePlacement(userUuid: string, assignmentUuid: string) {
  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const assignment = await prisma.userPharmacy.findFirst({
    where: { uuid: assignmentUuid, userId: user.id, deletedAt: null },
  });
  if (!assignment) throw new NotFoundException('PLACEMENT_NOT_FOUND');

  return assignment;
}

// ─── List Licenses ────────────────────────────────────────────────────────────

export async function listLicenses(
  userUuid: string,
  assignmentUuid: string,
  query: ListLicenseQuery
): Promise<{ data: LicenseItem[]; total: number }> {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')));
  const skip = (page - 1) * limit;

  const assignment = await _resolvePlacement(userUuid, assignmentUuid);

  const where = {
    userPharmacyId: assignment.id,
    deletedAt: null,
    ...(query.status && { status: query.status }),
  };

  const [licenses, total] = await prisma.$transaction([
    prisma.license.findMany({
      where,
      skip,
      take: limit,
      orderBy: { validUntil: 'desc' },
      select: licenseSelect,
    }),
    prisma.license.count({ where }),
  ]);

  return { data: licenses.map(formatLicense), total };
}

// ─── Add License ──────────────────────────────────────────────────────────────

export async function addLicense(
  createdById: number,
  userUuid: string,
  assignmentUuid: string,
  body: CreateLicenseBody
): Promise<LicenseItem> {
  const assignment = await _resolvePlacement(userUuid, assignmentUuid);

  const duplicate = await prisma.license.findFirst({
    where: {
      licenseNumber: body.licenseNumber,
      userPharmacy: { pharmacyId: assignment.pharmacyId },
      deletedAt: null,
    },
  });
  if (duplicate) throw new ConflictException('LICENSE_NUMBER_ALREADY_EXISTS');

  const license = await prisma.license.create({
    data: {
      userPharmacyId: assignment.id,
      licenseNumber: body.licenseNumber,
      validFrom: new Date(body.validFrom),
      validUntil: new Date(body.validUntil),
      createdById,
      updatedById: createdById,
    },
    select: licenseSelect,
  });

  return formatLicense(license);
}

// ─── Update License ───────────────────────────────────────────────────────────

export async function updateLicense(
  updatedById: number,
  userUuid: string,
  assignmentUuid: string,
  licenseUuid: string,
  body: UpdateLicenseBody
): Promise<LicenseItem> {
  const assignment = await _resolvePlacement(userUuid, assignmentUuid);

  const license = await prisma.license.findFirst({
    where: { uuid: licenseUuid, userPharmacyId: assignment.id, deletedAt: null },
  });
  if (!license) throw new NotFoundException('LICENSE_NOT_FOUND');

  if (body.licenseNumber && body.licenseNumber !== license.licenseNumber) {
    const duplicate = await prisma.license.findFirst({
      where: {
        licenseNumber: body.licenseNumber,
        userPharmacy: { pharmacyId: assignment.pharmacyId },
        deletedAt: null,
        id: { not: license.id },
      },
    });
    if (duplicate) throw new ConflictException('LICENSE_NUMBER_ALREADY_EXISTS');
  }

  const updated = await prisma.license.update({
    where: { id: license.id },
    data: {
      ...(body.licenseNumber && { licenseNumber: body.licenseNumber }),
      ...(body.validFrom && { validFrom: new Date(body.validFrom) }),
      ...(body.validUntil && { validUntil: new Date(body.validUntil) }),
      ...(body.status && { status: body.status }),
      updatedById,
    },
    select: licenseSelect,
  });

  return formatLicense(updated);
}

// ─── Delete License ───────────────────────────────────────────────────────────

export async function deleteLicense(
  deletedById: number,
  userUuid: string,
  assignmentUuid: string,
  licenseUuid: string
): Promise<void> {
  const assignment = await _resolvePlacement(userUuid, assignmentUuid);

  const license = await prisma.license.findFirst({
    where: { uuid: licenseUuid, userPharmacyId: assignment.id, deletedAt: null },
  });
  if (!license) throw new NotFoundException('LICENSE_NOT_FOUND');

  await prisma.license.update({
    where: { id: license.id },
    data: {
      status: RecordStatus.DELETED,
      deletedAt: new Date(),
      deletedById,
    },
  });
}
