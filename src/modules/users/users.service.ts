import { RecordStatus, AppRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@config/db';
import { BadRequestException } from '@exceptions/BadRequestException';
import { ConflictException } from '@exceptions/ConflictException';
import { ForbiddenException } from '@exceptions/ForbiddenException';
import { NotFoundException } from '@exceptions/NotFoundException';
import { UnauthorizedException } from '@exceptions/UnauthorizedException';
import {
  ListUserQuery,
  ListPlacementQuery,
  PlacementGroup,
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
  UserDropdownItem,
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
  practiceLicenses: {
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
  updatedAt: true,
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
    activeLicense: a.practiceLicenses?.[0] ? formatLicense(a.practiceLicenses[0]) : null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
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
      placements: pharmacyId
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
      user.placements?.[0] ? formatPlacement(user.placements[0]) : null,
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

  let filterPharmacyId: number | undefined;
  if (query.pharmacyUuid) {
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { uuid: query.pharmacyUuid, deletedAt: null },
      select: { id: true },
    });
    if (!pharmacy) throw new NotFoundException('PHARMACY_NOT_FOUND');
    filterPharmacyId = pharmacy.id;
  }

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
    ...(filterPharmacyId !== undefined && {
      placements: { some: { pharmacyId: filterPharmacyId, deletedAt: null } },
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
            placements: {
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
      placementCount: u._count.placements,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
    total,
  };
}

// ─── Users Dropdown ───────────────────────────────────────────────────────────

export async function getUsersDropdown(
  pharmacyId: number,
  search?: string
): Promise<UserDropdownItem[]> {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      status: RecordStatus.ACTIVE,
      placements: {
        some: {
          pharmacyId,
          deletedAt: null,
          status: RecordStatus.ACTIVE,
        },
      },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    },
    select: { uuid: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
}

// ─── Get User ─────────────────────────────────────────────────────────────────

export async function getUser(userUuid: string): Promise<UserDetailItem> {
  const user = await prisma.user.findFirst({
    where: { uuid: userUuid, deletedAt: null },
    select: {
      ...userBaseSelect,
      _count: {
        select: {
          placements: {
            where: { deletedAt: null, status: RecordStatus.ACTIVE },
          },
        },
      },
      placements: {
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
    placementCount: user._count.placements,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    placements: user.placements.map(formatPlacement),
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

  if (!body.placement) {
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashed,
        phone: body.phone,
        address: body.address,
        platformRole: null,
        mustChangePassword: true,
        createdById,
        updatedById: createdById,
      },
      select: { ...userBaseSelect, updatedAt: true },
    });
    return { ...user, placementCount: 0, placements: [] };
  }

  const pharmacy = await prisma.pharmacy.findFirst({
    where: { uuid: body.placement.pharmacyUuid, deletedAt: null },
  });
  if (!pharmacy) throw new NotFoundException('PHARMACY_NOT_FOUND');

  const role = await prisma.role.findFirst({
    where: { uuid: body.placement.roleUuid, deletedAt: null },
  });
  if (!role) throw new NotFoundException('ROLE_NOT_FOUND');

  const licenseRequired = role.type === AppRole.PHARMACIST || role.type === AppRole.HEAD_PHARMACIST || role.type === AppRole.DOCTOR;
  if (licenseRequired && !body.placement.license) throw new BadRequestException('LICENSE_REQUIRED_FOR_ROLE');

  if (role.type === AppRole.HEAD_PHARMACIST) {
    const existingPic = await prisma.placement.findFirst({
      where: {
        pharmacyId: pharmacy.id,
        deletedAt: null,
        leftAt: null,
        status: RecordStatus.ACTIVE,
        role: { type: AppRole.HEAD_PHARMACIST },
      },
    });
    if (existingPic) throw new ConflictException('PHARMACY_ALREADY_HAS_HEAD_PHARMACIST');
  }

  const userUuid = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashed,
        phone: body.phone,
        address: body.address,
        platformRole: null,
        mustChangePassword: true,
        createdById,
        updatedById: createdById,
      },
      select: { id: true, uuid: true },
    });

    const placement = await tx.placement.create({
      data: {
        userId: user.id,
        pharmacyId: pharmacy.id,
        roleId: role.id,
        joinedAt: new Date(body.placement!.joinedAt),
        createdById,
        updatedById: createdById,
      },
      select: { id: true },
    });

    if (body.placement!.license) {
      const lic = body.placement!.license;
      await tx.practiceLicense.create({
        data: {
          placementId: placement.id,
          licenseNumber: lic.licenseNumber,
          validFrom: new Date(lic.validFrom),
          validUntil: new Date(lic.validUntil),
          createdById,
          updatedById: createdById,
        },
      });
    }

    return user.uuid;
  });

  return getUser(userUuid);
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

  const activePlacements = await prisma.placement.count({
    where: { userId: user.id, deletedAt: null, status: RecordStatus.ACTIVE },
  });
  if (activePlacements > 0) throw new ConflictException('USER_HAS_ACTIVE_PLACEMENTS');

  if (user.id === deletedById) throw new ForbiddenException('CANNOT_DELETE_YOURSELF');

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
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

// ─── List Placements ─────────────────────────────────────────────────────────

export async function listPlacements(
  userUuid: string,
  query: ListPlacementQuery
): Promise<PlacementGroup[]> {
  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const placements = await prisma.placement.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      ...(query.status && { status: query.status }),
    },
    orderBy: { joinedAt: 'desc' },
    select: placementSelect,
  });

  const groupMap = new Map<string, PlacementGroup>();
  for (const p of placements) {
    const item = formatPlacement(p);
    const key = item.pharmacy.uuid;
    if (!groupMap.has(key)) groupMap.set(key, { pharmacy: item.pharmacy, tenures: [] });
    groupMap.get(key)!.tenures.push(item);
  }

  for (const group of groupMap.values()) {
    group.tenures.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
  }

  return Array.from(groupMap.values());
}

// ─── Get Placement ───────────────────────────────────────────────────────────

export async function getPlacement(
  userUuid: string,
  placementUuid: string
): Promise<PlacementItem> {
  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const placement = await prisma.placement.findFirst({
    where: { uuid: placementUuid, userId: user.id, deletedAt: null },
    select: placementSelect,
  });
  if (!placement) throw new NotFoundException('PLACEMENT_NOT_FOUND');

  return formatPlacement(placement);
}

// ─── Create Placement ────────────────────────────────────────────────────────

async function checkPlacementOverlap(
  userId: number,
  pharmacyId: number,
  joinedAt: Date,
  leftAt: Date | null,
  excludeId?: number
): Promise<void> {
  const overlap = await prisma.placement.findFirst({
    where: {
      userId,
      pharmacyId,
      deletedAt: null,
      status: RecordStatus.ACTIVE,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      AND: [
        // existing tenure ends after (or during) new start
        { OR: [{ leftAt: null }, { leftAt: { gte: joinedAt } }] },
        // existing tenure starts before (or during) new end — skip if new is open-ended
        ...(leftAt ? [{ joinedAt: { lte: leftAt } }] : []),
      ],
    },
  });
  if (overlap) throw new ConflictException('PLACEMENT_DATE_OVERLAP');
}

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

  const activeCount = await prisma.placement.count({
    where: { userId: user.id, deletedAt: null, status: RecordStatus.ACTIVE, leftAt: null },
  });
  if (activeCount >= 3) throw new BadRequestException('MAX_PLACEMENTS_REACHED');

  const duplicate = await prisma.placement.findFirst({
    where: { userId: user.id, pharmacyId: pharmacy.id, deletedAt: null, leftAt: null, status: RecordStatus.ACTIVE },
  });
  if (duplicate) throw new ConflictException('USER_ALREADY_PLACED_AT_PHARMACY');

  // Max 1 SIGN_FULL role per pharmacy
  // Max 1 HEAD_PHARMACIST per pharmacy
  if (role.type === AppRole.HEAD_PHARMACIST) {
    const existingPic = await prisma.placement.findFirst({
      where: {
        pharmacyId: pharmacy.id,
        deletedAt: null,
        leftAt: null,
        status: RecordStatus.ACTIVE,
        role: { type: AppRole.HEAD_PHARMACIST },
      },
    });
    if (existingPic) throw new ConflictException('PHARMACY_ALREADY_HAS_HEAD_PHARMACIST');
  }

  const licenseRequired = role.type === AppRole.PHARMACIST || role.type === AppRole.HEAD_PHARMACIST || role.type === AppRole.DOCTOR;
  if (licenseRequired && !body.license) throw new BadRequestException('LICENSE_REQUIRED_FOR_ROLE');

  await checkPlacementOverlap(user.id, pharmacy.id, new Date(body.joinedAt), null);

  const placementUuid = await prisma.$transaction(async (tx) => {
    const placement = await tx.placement.create({
      data: {
        userId: user.id,
        pharmacyId: pharmacy.id,
        roleId: role.id,
        joinedAt: new Date(body.joinedAt),
        createdById,
        updatedById: createdById,
      },
      select: { id: true, uuid: true },
    });

    if (body.license) {
      await tx.practiceLicense.create({
        data: {
          placementId: placement.id,
          licenseNumber: body.license.licenseNumber,
          validFrom: new Date(body.license.validFrom),
          validUntil: new Date(body.license.validUntil),
          createdById,
          updatedById: createdById,
        },
      });
    }

    return placement.uuid;
  });

  return getPlacement(userUuid, placementUuid);
}

// ─── Update Placement ────────────────────────────────────────────────────────

export async function updatePlacement(
  updatedById: number,
  userUuid: string,
  placementUuid: string,
  body: UpdatePlacementBody
): Promise<PlacementItem> {
  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const placement = await prisma.placement.findFirst({
    where: { uuid: placementUuid, userId: user.id, deletedAt: null },
  });
  if (!placement) throw new NotFoundException('PLACEMENT_NOT_FOUND');

  let roleId: number | undefined;
  if (body.roleUuid) {
    const role = await prisma.role.findFirst({ where: { uuid: body.roleUuid, deletedAt: null } });
    if (!role) throw new NotFoundException('ROLE_NOT_FOUND');

    if (role.type === AppRole.HEAD_PHARMACIST) {
      const existingPic = await prisma.placement.findFirst({
        where: {
          pharmacyId: placement.pharmacyId,
          deletedAt: null,
          leftAt: null,
          status: RecordStatus.ACTIVE,
          id: { not: placement.id },
          role: { type: AppRole.HEAD_PHARMACIST },
        },
      });
      if (existingPic) throw new ConflictException('PHARMACY_ALREADY_HAS_HEAD_PHARMACIST');
    }

    roleId = role.id;
  }

  if (body.joinedAt !== undefined || body.leftAt !== undefined) {
    const newJoinedAt = body.joinedAt ? new Date(body.joinedAt) : placement.joinedAt;
    const newLeftAt =
      body.leftAt !== undefined
        ? body.leftAt
          ? new Date(body.leftAt)
          : null
        : placement.leftAt;
    await checkPlacementOverlap(user.id, placement.pharmacyId, newJoinedAt, newLeftAt, placement.id);
  }

  const updated = await prisma.placement.update({
    where: { id: placement.id },
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

// ─── Delete Placement ────────────────────────────────────────────────────────

export async function deletePlacement(
  deletedById: number,
  userUuid: string,
  placementUuid: string
): Promise<void> {
  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  const placement = await prisma.placement.findFirst({
    where: { uuid: placementUuid, userId: user.id, deletedAt: null },
  });
  if (!placement) throw new NotFoundException('PLACEMENT_NOT_FOUND');

  await prisma.placement.update({
    where: { id: placement.id },
    data: {
      deletedAt: new Date(),
      deletedById,
    },
  });
}

// ─── Practice Licenses ────────────────────────────────────────────────────────

async function resolvePlacement(userUuid: string, placementUuid: string) {
  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');
  const placement = await prisma.placement.findFirst({
    where: { uuid: placementUuid, userId: user.id, deletedAt: null },
  });
  if (!placement) throw new NotFoundException('PLACEMENT_NOT_FOUND');
  return placement;
}

export async function listLicenses(
  userUuid: string,
  placementUuid: string,
  query: ListLicenseQuery
): Promise<{ data: LicenseItem[]; total: number }> {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')));
  const skip = (page - 1) * limit;

  const placement = await resolvePlacement(userUuid, placementUuid);

  const where = {
    placementId: placement.id,
    deletedAt: null,
    ...(query.status && { status: query.status }),
  };

  const [licenses, total] = await prisma.$transaction([
    prisma.practiceLicense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { validUntil: 'desc' },
      select: licenseSelect,
    }),
    prisma.practiceLicense.count({ where }),
  ]);

  return { data: licenses.map(formatLicense), total };
}

export async function getLicense(
  userUuid: string,
  placementUuid: string,
  licenseUuid: string
): Promise<LicenseItem> {
  const placement = await resolvePlacement(userUuid, placementUuid);

  const license = await prisma.practiceLicense.findFirst({
    where: { uuid: licenseUuid, placementId: placement.id, deletedAt: null },
    select: licenseSelect,
  });
  if (!license) throw new NotFoundException('LICENSE_NOT_FOUND');

  return formatLicense(license);
}

export async function addLicense(
  createdById: number,
  userUuid: string,
  placementUuid: string,
  body: CreateLicenseBody
): Promise<LicenseItem> {
  const placement = await resolvePlacement(userUuid, placementUuid);

  const duplicate = await prisma.practiceLicense.findFirst({
    where: {
      licenseNumber: body.licenseNumber,
      placementId: placement.id,
      deletedAt: null,
    },
  });
  if (duplicate) throw new ConflictException('LICENSE_NUMBER_ALREADY_EXISTS');

  const license = await prisma.practiceLicense.create({
    data: {
      placementId: placement.id,
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

export async function updateLicense(
  updatedById: number,
  userUuid: string,
  placementUuid: string,
  licenseUuid: string,
  body: UpdateLicenseBody
): Promise<LicenseItem> {
  const placement = await resolvePlacement(userUuid, placementUuid);

  const license = await prisma.practiceLicense.findFirst({
    where: { uuid: licenseUuid, placementId: placement.id, deletedAt: null },
  });
  if (!license) throw new NotFoundException('LICENSE_NOT_FOUND');

  if (body.licenseNumber && body.licenseNumber !== license.licenseNumber) {
    const duplicate = await prisma.practiceLicense.findFirst({
      where: {
        licenseNumber: body.licenseNumber,
        placementId: placement.id,
        deletedAt: null,
        id: { not: license.id },
      },
    });
    if (duplicate) throw new ConflictException('LICENSE_NUMBER_ALREADY_EXISTS');
  }

  const updated = await prisma.practiceLicense.update({
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

export async function deleteLicense(
  deletedById: number,
  userUuid: string,
  placementUuid: string,
  licenseUuid: string
): Promise<void> {
  const placement = await resolvePlacement(userUuid, placementUuid);

  const license = await prisma.practiceLicense.findFirst({
    where: { uuid: licenseUuid, placementId: placement.id, deletedAt: null },
  });
  if (!license) throw new NotFoundException('LICENSE_NOT_FOUND');

  await prisma.practiceLicense.update({
    where: { id: license.id },
    data: {
      deletedAt: new Date(),
      deletedById,
    },
  });
}

