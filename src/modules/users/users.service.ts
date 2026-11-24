import { RecordStatus, AppRole, PlatformRole, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateTemporaryPassword } from '@utils/tempPassword';
import { signerPlacementWhere, SignerLevel } from '@utils/signer';
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
  isHeadPharmacist: true,
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
    isHeadPharmacist: a.isHeadPharmacist ?? false,
    joinedAt: a.joinedAt,
    leftAt: a.leftAt,
    status: a.status,
    activeLicense: a.practiceLicenses?.[0] ? formatLicense(a.practiceLicenses[0]) : null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}



// ─── Tenant Scoping ───────────────────────────────────────────────────────────
//
// Platform users manage users across all pharmacies. Everyone else is confined
// to the pharmacy baked into their token: they can only see and manage users who
// have a placement there, never platform users, and only that pharmacy's
// placements and licenses.

export interface UserActor {
  id: number;
  platformRole: PlatformRole | null;
  pharmacyId: number | null;
}

const isPlatformActor = (actor: UserActor): boolean => actor.platformRole !== null;
const isPlatformAdmin = (actor: UserActor): boolean => actor.platformRole === PlatformRole.PLATFORM_ADMIN;

function requireActorPharmacy(actor: UserActor): number {
  if (actor.pharmacyId === null) throw new ForbiddenException('PHARMACY_NOT_SELECTED');
  return actor.pharmacyId;
}

/** Pharmacy filter for placement queries: undefined = unrestricted (platform). */
function placementScope(actor: UserActor): { pharmacyId: number } | Record<string, never> {
  return isPlatformActor(actor) ? {} : { pharmacyId: requireActorPharmacy(actor) };
}

async function isActiveOwnerAt(userId: number, pharmacyId: number): Promise<boolean> {
  const owner = await prisma.placement.findFirst({
    where: { userId, pharmacyId, deletedAt: null, status: RecordStatus.ACTIVE, role: { type: AppRole.OWNER } },
    select: { id: true },
  });
  return owner !== null;
}

interface ResolveTargetOptions {
  /** The caller intends to modify the user (not just read). */
  manage?: boolean;
  /** Count soft-deleted placements as membership (needed to delete a user whose placements were removed). */
  includeDeletedPlacements?: boolean;
}

async function resolveTargetUser(
  actor: UserActor,
  userUuid: string,
  opts: ResolveTargetOptions = {}
): Promise<User> {
  const user = await prisma.user.findFirst({ where: { uuid: userUuid, deletedAt: null } });
  if (!user) throw new NotFoundException('USER_NOT_FOUND');

  if (isPlatformActor(actor)) {
    // Only a platform admin may change another platform account.
    if (opts.manage && user.platformRole !== null && user.id !== actor.id && !isPlatformAdmin(actor)) {
      throw new ForbiddenException('CANNOT_MANAGE_PLATFORM_USER');
    }
    return user;
  }

  const pharmacyId = requireActorPharmacy(actor);

  // Platform accounts are invisible to pharmacy staff — report "not found" rather than "forbidden".
  if (user.platformRole !== null) throw new NotFoundException('USER_NOT_FOUND');

  const membership = await prisma.placement.findFirst({
    where: { userId: user.id, pharmacyId, ...(opts.includeDeletedPlacements ? {} : { deletedAt: null }) },
    select: { id: true },
  });
  if (!membership) throw new NotFoundException('USER_NOT_FOUND');

  // A non-owner cannot modify the pharmacy owner's account.
  if (opts.manage && user.id !== actor.id) {
    const [targetIsOwner, actorIsOwner] = await Promise.all([
      isActiveOwnerAt(user.id, pharmacyId),
      isActiveOwnerAt(actor.id, pharmacyId),
    ]);
    if (targetIsOwner && !actorIsOwner) throw new ForbiddenException('CANNOT_MANAGE_OWNER');
  }

  return user;
}

/** True when the user holds a non-deleted placement at any pharmacy other than `pharmacyId`. */
async function hasPlacementsElsewhere(userId: number, pharmacyId: number, includeDeleted = false): Promise<boolean> {
  const other = await prisma.placement.findFirst({
    where: { userId, pharmacyId: { not: pharmacyId }, ...(includeDeleted ? {} : { deletedAt: null }) },
    select: { id: true },
  });
  return other !== null;
}

// ─── Head Pharmacist ─────────────────────────────────────────────────────────
// The Head Pharmacist is a responsibility flag on a placement, independent of the
// role: an owner who is also the pharmacist in charge keeps the OWNER role and
// sets the flag. A HEAD_PHARMACIST-type role always implies the flag.

function headPharmacistFlag(roleType: AppRole, requested: boolean | undefined, current = false): boolean {
  if (roleType === AppRole.HEAD_PHARMACIST) return true;
  return requested ?? current;
}

async function ensureHeadPharmacistSlotFree(pharmacyId: number, excludePlacementId?: number): Promise<void> {
  const existing = await prisma.placement.findFirst({
    where: {
      pharmacyId,
      isHeadPharmacist: true,
      deletedAt: null,
      leftAt: null,
      status: RecordStatus.ACTIVE,
      ...(excludePlacementId ? { id: { not: excludePlacementId } } : {}),
    },
    select: { id: true },
  });
  if (existing) throw new ConflictException('PHARMACY_ALREADY_HAS_HEAD_PHARMACIST');
}

const roleRequiresLicense = (roleType: AppRole): boolean =>
  roleType === AppRole.PHARMACIST || roleType === AppRole.HEAD_PHARMACIST || roleType === AppRole.DOCTOR;

/** Roles assignable at a pharmacy: global roles, or roles owned by that same pharmacy. */
async function resolveAssignableRole(roleUuid: string, pharmacyId: number) {
  const role = await prisma.role.findFirst({ where: { uuid: roleUuid, deletedAt: null } });
  if (!role) throw new NotFoundException('ROLE_NOT_FOUND');
  if (role.pharmacyId !== null && role.pharmacyId !== pharmacyId) {
    throw new BadRequestException('ROLE_NOT_IN_PHARMACY');
  }
  return role;
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
  actor: UserActor,
  query: ListUserQuery
): Promise<{ data: UserListItem[]; total: number }> {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')));
  const skip = (page - 1) * limit;

  const platform = isPlatformActor(actor);
  let filterPharmacyId: number | undefined;
  if (!platform) {
    // Pharmacy staff always see only their own pharmacy; any pharmacyUuid in the query is ignored.
    filterPharmacyId = requireActorPharmacy(actor);
  } else if (query.pharmacyUuid) {
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
    ...(platform
      ? query.platformRole && { platformRole: query.platformRole }
      : { platformRole: null }),
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

// ─── Signers Dropdown ────────────────────────────────────────────────────────

/** People who may sign at this pharmacy at the given level (licensed pharmacists / the Head Pharmacist). */
export async function getSignersDropdown(
  pharmacyId: number,
  level: SignerLevel
): Promise<(UserDropdownItem & { isHeadPharmacist: boolean })[]> {
  const where = signerPlacementWhere(pharmacyId, level);
  const users = await prisma.user.findMany({
    where: { deletedAt: null, status: RecordStatus.ACTIVE, placements: { some: where } },
    select: {
      uuid: true,
      name: true,
      email: true,
      placements: { where: { ...where, isHeadPharmacist: true }, select: { id: true }, take: 1 },
    },
    orderBy: { name: 'asc' },
  });
  return users.map((u) => ({ uuid: u.uuid, name: u.name, email: u.email, isHeadPharmacist: u.placements.length > 0 }));
}

// ─── Get User ─────────────────────────────────────────────────────────────────

export async function getUser(actor: UserActor, userUuid: string): Promise<UserDetailItem> {
  await resolveTargetUser(actor, userUuid);
  const scope = placementScope(actor);

  const user = await prisma.user.findFirst({
    where: { uuid: userUuid, deletedAt: null },
    select: {
      ...userBaseSelect,
      _count: {
        select: {
          placements: {
            where: { deletedAt: null, status: RecordStatus.ACTIVE, ...scope },
          },
        },
      },
      placements: {
        where: { deletedAt: null, ...scope },
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

/**
 * New accounts get a random one-time password, returned once so the creator can
 * hand it over; the user must change it at first sign-in.
 */
export async function createUser(
  actor: UserActor,
  body: CreateUserBody
): Promise<UserDetailItem & { temporaryPassword: string }> {
  const createdById = actor.id;
  const callerPlatformRole = actor.platformRole;

  // Pharmacy staff may only create users placed in their own pharmacy —
  // a user without a placement would be invisible (and unmanageable) to them.
  if (!isPlatformActor(actor)) {
    if (!body.placement) throw new BadRequestException('PLACEMENT_REQUIRED');
  }

  // Emails are unique across all accounts, deleted ones included (DB constraint).
  const duplicate = await prisma.user.findFirst({ where: { email: body.email }, select: { deletedAt: true } });
  if (duplicate) throw new ConflictException(duplicate.deletedAt ? 'EMAIL_BELONGS_TO_DELETED_USER' : 'EMAIL_ALREADY_EXISTS');

  const temporaryPassword = generateTemporaryPassword();
  const hashed = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

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
    return { ...user, placementCount: 0, placements: [], temporaryPassword };
  }

  const pharmacy = await prisma.pharmacy.findFirst({
    where: { uuid: body.placement.pharmacyUuid, deletedAt: null },
  });
  if (!pharmacy) throw new NotFoundException('PHARMACY_NOT_FOUND');

  if (!isPlatformActor(actor) && pharmacy.id !== requireActorPharmacy(actor)) {
    throw new ForbiddenException('PLACEMENT_OUTSIDE_PHARMACY');
  }

  const role = await resolveAssignableRole(body.placement.roleUuid, pharmacy.id);

  if (role.type === AppRole.OWNER && callerPlatformRole !== 'PLATFORM_ADMIN') {
    throw new ForbiddenException('CANNOT_ASSIGN_OWNER_ROLE');
  }

  const isHeadPharmacist = headPharmacistFlag(role.type, body.placement.isHeadPharmacist);
  // A Head Pharmacist needs a practice license (SIPA) whatever the role.
  if ((roleRequiresLicense(role.type) || isHeadPharmacist) && !body.placement.license) {
    throw new BadRequestException('LICENSE_REQUIRED_FOR_ROLE');
  }
  if (isHeadPharmacist) await ensureHeadPharmacistSlotFree(pharmacy.id);

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
        isHeadPharmacist,
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

  return { ...(await getUser(actor, userUuid)), temporaryPassword };
}

// ─── Update User ──────────────────────────────────────────────────────────────

export async function updateUser(
  actor: UserActor,
  userUuid: string,
  body: UpdateUserBody
): Promise<UserDetailItem> {
  const updatedById = actor.id;
  const user = await resolveTargetUser(actor, userUuid, { manage: true });

  // Account status is global. A pharmacy may not lock someone out of the other
  // pharmacies they work at — it should end the placement instead.
  if (!isPlatformActor(actor) && body.status && body.status !== user.status) {
    if (user.id === actor.id) throw new ForbiddenException('CANNOT_CHANGE_OWN_STATUS');
    if (await hasPlacementsElsewhere(user.id, requireActorPharmacy(actor))) {
      throw new ForbiddenException('USER_HAS_OTHER_PHARMACIES');
    }
  }

  if (body.email && body.email !== user.email) {
    const duplicate = await prisma.user.findFirst({
      where: { email: body.email, id: { not: user.id } },
      select: { deletedAt: true },
    });
    if (duplicate) throw new ConflictException(duplicate.deletedAt ? 'EMAIL_BELONGS_TO_DELETED_USER' : 'EMAIL_ALREADY_EXISTS');
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

  return getUser(actor, userUuid);
}

// ─── Delete User ──────────────────────────────────────────────────────────────

export async function deleteUser(
  actor: UserActor,
  userUuid: string
): Promise<void> {
  const deletedById = actor.id;
  const user = await resolveTargetUser(actor, userUuid, { manage: true, includeDeletedPlacements: true });

  // Deleting an account is global; pharmacy staff may only delete accounts that
  // have never worked anywhere but their pharmacy.
  if (!isPlatformActor(actor) && (await hasPlacementsElsewhere(user.id, requireActorPharmacy(actor), true))) {
    throw new ForbiddenException('USER_HAS_OTHER_PHARMACIES');
  }

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

/**
 * Resets to a random one-time password (shown once to the caller) instead of the
 * shared DEFAULT_PASSWORD, so a reset never leaves an account on a guessable password.
 */
export async function resetPassword(
  actor: UserActor,
  userUuid: string
): Promise<{ temporaryPassword: string }> {
  const updatedById = actor.id;
  const user = await resolveTargetUser(actor, userUuid, { manage: true });
  if (user.id === actor.id) throw new BadRequestException('CANNOT_RESET_OWN_PASSWORD');

  const temporaryPassword = generateTemporaryPassword();
  const hashed = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

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

  return { temporaryPassword };
}

// ─── List Placements ─────────────────────────────────────────────────────────

export async function listPlacements(
  actor: UserActor,
  userUuid: string,
  query: ListPlacementQuery
): Promise<PlacementGroup[]> {
  const user = await resolveTargetUser(actor, userUuid);

  const placements = await prisma.placement.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      ...placementScope(actor),
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
  actor: UserActor,
  userUuid: string,
  placementUuid: string
): Promise<PlacementItem> {
  const user = await resolveTargetUser(actor, userUuid);

  const placement = await prisma.placement.findFirst({
    where: { uuid: placementUuid, userId: user.id, deletedAt: null, ...placementScope(actor) },
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
  actor: UserActor,
  userUuid: string,
  body: CreatePlacementBody
): Promise<PlacementItem> {
  const createdById = actor.id;
  const callerPlatformRole = actor.platformRole;

  const pharmacy = await prisma.pharmacy.findFirst({
    where: { uuid: body.pharmacyUuid, deletedAt: null },
  });
  if (!pharmacy) throw new NotFoundException('PHARMACY_NOT_FOUND');

  if (!isPlatformActor(actor) && pharmacy.id !== requireActorPharmacy(actor)) {
    throw new ForbiddenException('PLACEMENT_OUTSIDE_PHARMACY');
  }

  // Includes soft-deleted placements so a former employee can be re-hired.
  const user = await resolveTargetUser(actor, userUuid, { manage: true, includeDeletedPlacements: true });
  if (!isPlatformActor(actor) && user.id === actor.id) {
    throw new ForbiddenException('CANNOT_MODIFY_OWN_PLACEMENT');
  }

  const role = await resolveAssignableRole(body.roleUuid, pharmacy.id);

  if (role.type === AppRole.OWNER && callerPlatformRole !== 'PLATFORM_ADMIN') {
    throw new ForbiddenException('CANNOT_ASSIGN_OWNER_ROLE');
  }

  // Staff work at no more than 3 pharmacies at once; an owner may own any number of branches.
  if (role.type !== AppRole.OWNER) {
    const activeCount = await prisma.placement.count({
      where: { userId: user.id, deletedAt: null, status: RecordStatus.ACTIVE, leftAt: null, role: { type: { not: AppRole.OWNER } } },
    });
    if (activeCount >= 3) throw new BadRequestException('MAX_PLACEMENTS_REACHED');
  }

  const duplicate = await prisma.placement.findFirst({
    where: { userId: user.id, pharmacyId: pharmacy.id, deletedAt: null, leftAt: null, status: RecordStatus.ACTIVE },
  });
  if (duplicate) throw new ConflictException('USER_ALREADY_PLACED_AT_PHARMACY');

  // Max 1 active Head Pharmacist per pharmacy (also enforced by a partial unique index).
  const isHeadPharmacist = headPharmacistFlag(role.type, body.isHeadPharmacist);
  if (isHeadPharmacist) await ensureHeadPharmacistSlotFree(pharmacy.id);

  if ((roleRequiresLicense(role.type) || isHeadPharmacist) && !body.license) {
    throw new BadRequestException('LICENSE_REQUIRED_FOR_ROLE');
  }

  await checkPlacementOverlap(user.id, pharmacy.id, new Date(body.joinedAt), null);

  const placementUuid = await prisma.$transaction(async (tx) => {
    const placement = await tx.placement.create({
      data: {
        userId: user.id,
        pharmacyId: pharmacy.id,
        roleId: role.id,
        isHeadPharmacist,
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

  return getPlacement(actor, userUuid, placementUuid);
}

// ─── Update Placement ────────────────────────────────────────────────────────

export async function updatePlacement(
  actor: UserActor,
  userUuid: string,
  placementUuid: string,
  body: UpdatePlacementBody
): Promise<PlacementItem> {
  const updatedById = actor.id;
  const callerPlatformRole = actor.platformRole;
  const user = await resolveTargetUser(actor, userUuid, { manage: true });

  const placement = await prisma.placement.findFirst({
    where: { uuid: placementUuid, userId: user.id, deletedAt: null, ...placementScope(actor) },
  });
  if (!placement) throw new NotFoundException('PLACEMENT_NOT_FOUND');

  // Nobody below platform level edits their own role or status (self-promotion).
  // The one exception: an owner may mark themselves as the Head Pharmacist —
  // common in small pharmacies where the owner is the licensed pharmacist.
  if (!isPlatformActor(actor) && user.id === actor.id) {
    if (body.roleUuid || body.status) throw new ForbiddenException('CANNOT_MODIFY_OWN_PLACEMENT');
    if (body.isHeadPharmacist !== undefined && !(await isActiveOwnerAt(actor.id, placement.pharmacyId))) {
      throw new ForbiddenException('CANNOT_MODIFY_OWN_PLACEMENT');
    }
  }

  let roleId: number | undefined;
  let newRoleType: AppRole | undefined;
  if (body.roleUuid) {
    const role = await resolveAssignableRole(body.roleUuid, placement.pharmacyId);

    if (role.type === AppRole.OWNER && callerPlatformRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('CANNOT_ASSIGN_OWNER_ROLE');
    }

    roleId = role.id;
    newRoleType = role.type;
  }

  const currentRole = await prisma.role.findUnique({ where: { id: placement.roleId }, select: { type: true } });
  const effectiveRoleType = newRoleType ?? currentRole!.type;
  const isHeadPharmacist = headPharmacistFlag(effectiveRoleType, body.isHeadPharmacist, placement.isHeadPharmacist);
  if (isHeadPharmacist && !placement.isHeadPharmacist) {
    await ensureHeadPharmacistSlotFree(placement.pharmacyId, placement.id);
    const license = await prisma.practiceLicense.findFirst({
      where: { placementId: placement.id, deletedAt: null, status: RecordStatus.ACTIVE, validUntil: { gte: new Date() } },
      select: { id: true },
    });
    if (!license) throw new BadRequestException('LICENSE_REQUIRED_FOR_ROLE');
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
      isHeadPharmacist,
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
  actor: UserActor,
  userUuid: string,
  placementUuid: string
): Promise<void> {
  const deletedById = actor.id;
  const user = await resolveTargetUser(actor, userUuid, { manage: true });
  if (!isPlatformActor(actor) && user.id === actor.id) {
    throw new ForbiddenException('CANNOT_MODIFY_OWN_PLACEMENT');
  }

  const placement = await prisma.placement.findFirst({
    where: { uuid: placementUuid, userId: user.id, deletedAt: null, ...placementScope(actor) },
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

async function resolvePlacement(
  actor: UserActor,
  userUuid: string,
  placementUuid: string,
  manage = false
) {
  const user = await resolveTargetUser(actor, userUuid, { manage });
  const placement = await prisma.placement.findFirst({
    where: { uuid: placementUuid, userId: user.id, deletedAt: null, ...placementScope(actor) },
  });
  if (!placement) throw new NotFoundException('PLACEMENT_NOT_FOUND');
  return placement;
}

export async function listLicenses(
  actor: UserActor,
  userUuid: string,
  placementUuid: string,
  query: ListLicenseQuery
): Promise<{ data: LicenseItem[]; total: number }> {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')));
  const skip = (page - 1) * limit;

  const placement = await resolvePlacement(actor, userUuid, placementUuid);

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
  actor: UserActor,
  userUuid: string,
  placementUuid: string,
  licenseUuid: string
): Promise<LicenseItem> {
  const placement = await resolvePlacement(actor, userUuid, placementUuid);

  const license = await prisma.practiceLicense.findFirst({
    where: { uuid: licenseUuid, placementId: placement.id, deletedAt: null },
    select: licenseSelect,
  });
  if (!license) throw new NotFoundException('LICENSE_NOT_FOUND');

  return formatLicense(license);
}

export async function addLicense(
  actor: UserActor,
  userUuid: string,
  placementUuid: string,
  body: CreateLicenseBody
): Promise<LicenseItem> {
  const createdById = actor.id;
  const placement = await resolvePlacement(actor, userUuid, placementUuid, true);

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
  actor: UserActor,
  userUuid: string,
  placementUuid: string,
  licenseUuid: string,
  body: UpdateLicenseBody
): Promise<LicenseItem> {
  const updatedById = actor.id;
  const placement = await resolvePlacement(actor, userUuid, placementUuid, true);

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
  actor: UserActor,
  userUuid: string,
  placementUuid: string,
  licenseUuid: string
): Promise<void> {
  const deletedById = actor.id;
  const placement = await resolvePlacement(actor, userUuid, placementUuid, true);

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

