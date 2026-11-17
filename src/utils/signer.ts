import { AppRole, Prisma } from '@prisma/client'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { NotFoundException } from '@exceptions/NotFoundException'

// Who may sign pharmacy documents is decided by the person's practice license,
// not by a permission toggle:
//  - a regular purchase order (surat pesanan): a pharmacist with an active SIPA
//    — the Head Pharmacist or a Pharmacist (an owner counts only when marked
//    Head Pharmacist);
//  - a purchase order with narcotics, psychotropics or precursors, and a stock
//    disposal record: only the Head Pharmacist.

export type SignerLevel = 'PHARMACIST' | 'HEAD_PHARMACIST'

type Db = Prisma.TransactionClient

/** Regulatory types whose orders and disposals need the Head Pharmacist. */
const CONTROLLED_TYPE = /narkotik|psikotropik|prekursor/i
export const isControlledType = (typeName: string): boolean => CONTROLLED_TYPE.test(typeName)

/** Placement filter: active at the pharmacy, licensed, and senior enough. */
export function signerPlacementWhere(pharmacyId: number, level: SignerLevel, now = new Date()): Prisma.PlacementWhereInput {
  return {
    pharmacyId,
    status: 'ACTIVE',
    deletedAt: null,
    leftAt: null,
    practiceLicenses: {
      some: { status: 'ACTIVE', deletedAt: null, validFrom: { lte: now }, validUntil: { gte: now } },
    },
    ...(level === 'HEAD_PHARMACIST'
      ? { isHeadPharmacist: true }
      : { OR: [{ isHeadPharmacist: true }, { role: { type: { in: [AppRole.PHARMACIST, AppRole.HEAD_PHARMACIST] } } }] }),
  }
}

/** Resolves the chosen signer's id, or explains why they can't sign. */
export async function resolveSigner(
  db: Db,
  who: { uuid: string } | { id: number },
  pharmacyId: number,
  level: SignerLevel
): Promise<number> {
  const user = await db.user.findFirst({
    where: { ...who, deletedAt: null, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!user) throw new NotFoundException('Signer not found at this pharmacy')

  const placement = await db.placement.findFirst({
    where: { userId: user.id, ...signerPlacementWhere(pharmacyId, level) },
    select: { id: true },
  })
  if (!placement) {
    throw new ForbiddenException(
      level === 'HEAD_PHARMACIST'
        ? 'Only the Head Pharmacist with an active practice license can sign this document'
        : 'Only a pharmacist with an active practice license can sign this document'
    )
  }
  return user.id
}

/** Purchase orders containing controlled medicines need the Head Pharmacist. */
export async function purchaseOrderSignerLevel(db: Db, medicineIds: number[]): Promise<SignerLevel> {
  if (medicineIds.length === 0) return 'PHARMACIST'
  const types = await db.medicine.findMany({
    where: { id: { in: medicineIds } },
    select: { type: { select: { name: true } } },
  })
  return types.some((m) => isControlledType(m.type.name)) ? 'HEAD_PHARMACIST' : 'PHARMACIST'
}
