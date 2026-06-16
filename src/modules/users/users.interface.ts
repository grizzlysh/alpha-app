import { ParamsDictionary } from 'express-serve-static-core';
import { RecordStatus, PlatformRole } from '@prisma/client';

// ─── Params ───────────────────────────────────────────────────────────────────

export interface UserUuidParam extends ParamsDictionary {
  user_uuid: string;
}

export interface PlacementUuidParam extends UserUuidParam {
  placement_uuid: string;
}

export interface LicenseUuidParam extends PlacementUuidParam {
  license_uuid: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface ListUserQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: RecordStatus;
  platformRole?: PlatformRole;
}

export interface ListPlacementQuery {
  status?: RecordStatus;
}

export interface PlacementGroup {
  pharmacy: { uuid: string; name: string; code: string };
  tenures: PlacementItem[];
}

// ─── Request Bodies ───────────────────────────────────────────────────────────

export interface LicenseInput {
  licenseNumber: string;
  validFrom: string;
  validUntil: string;
}

export interface CreateUserBody {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  placement?: {
    pharmacyUuid: string;
    roleUuid: string;
    joinedAt: string;
    license?: LicenseInput;
  };
}

export interface UpdateUserBody {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: RecordStatus;
}

export interface UpdateMeBody {
  name?: string;
  phone?: string;
  address?: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export interface CreatePlacementBody {
  pharmacyUuid: string;
  roleUuid: string;
  joinedAt: string;
  license?: LicenseInput;
}

export interface UpdatePlacementBody {
  roleUuid?: string;
  joinedAt?: string;
  leftAt?: string | null;
  status?: RecordStatus;
}

export interface ListLicenseQuery {
  page?: string;
  limit?: string;
  status?: RecordStatus;
}

export interface CreateLicenseBody {
  licenseNumber: string;
  validFrom: string;
  validUntil: string;
}

export interface UpdateLicenseBody {
  licenseNumber?: string;
  validFrom?: string;
  validUntil?: string;
  status?: RecordStatus;
}

// ─── Response Items ───────────────────────────────────────────────────────────

export interface LicenseItem {
  uuid: string;
  licenseNumber: string;
  validFrom: Date;
  validUntil: Date;
  status: RecordStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlacementItem {
  uuid: string;
  pharmacy: { uuid: string; name: string; code: string };
  role: { uuid: string; name: string };
  joinedAt: Date;
  leftAt: Date | null;
  status: RecordStatus;
  activeLicense: LicenseItem | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListItem {
  uuid: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  platformRole: PlatformRole | null;
  mustChangePassword: boolean;
  status: RecordStatus;
  placementCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDetailItem extends UserListItem {
  placements: PlacementItem[];
  updatedAt: Date;
}

export interface MeItem {
  uuid: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  platformRole: PlatformRole | null;
  mustChangePassword: boolean;
  status: RecordStatus;
  createdAt: Date;
  updatedAt: Date;
  currentPlacement: PlacementItem | null;
}
