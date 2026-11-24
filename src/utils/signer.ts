import { AppRole, Prisma } from '@prisma/client'
import { ForbiddenException } from '@exceptions/ForbiddenException'
import { NotFoundException } from '@exceptions/NotFoundException'

// Who may sign pharmacy documents is decided by the person's practice license,
// not by a permission toggle:
//  - purchase orders, invoice receipts, returns and stock adjustments: a
//    pharmacist with an active SIPA — the Head Pharmacist or a Pharmacist (an
//    owner counts only when marked Head Pharmacist);
//  - any of those covering a controlled medicine (type marked isControlled:
//    narcotics, psychotropics, precursors), and every disposal record: only
//    the Head Pharmacist.

export type SignerLevel = 'PHARMACIST' | 'HEAD_PHARMACIST'

type Db = Prisma.TransactionClient


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

/**
 * Documents covering controlled medicines (a medicine type marked
 * isControlled: narcotics, psychotropics, precursors) need the Head Pharmacist.
 */
export async function signerLevelForMedicines(db: Db, medicineIds: number[]): Promise<SignerLevel> {
  if (medicineIds.length === 0) return 'PHARMACIST'
  const controlled = await db.medicine.count({ where: { id: { in: medicineIds }, type: { isControlled: true } } })
  return controlled > 0 ? 'HEAD_PHARMACIST' : 'PHARMACIST'
}
