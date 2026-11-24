import { CustomerType, Prisma } from '@prisma/client'
import {
  DEFAULT_BUSINESS_PARAMS,
  DEFAULT_MEDICINE_CLASSES,
  DEFAULT_MEDICINE_SHAPES,
  DEFAULT_MEDICINE_TYPES,
} from '@constants/defaultCatalog'

type Tx = Prisma.TransactionClient

/**
 * Adds any missing default business parameters. Never overwrites a value the
 * pharmacy has already set, so it is safe to run again.
 */
export async function ensureBusinessParams(
  tx: Tx,
  pharmacyId: number,
  userId: number | null,
  overrides: Record<string, string> = {}
): Promise<number> {
  const result = await tx.businessParameter.createMany({
    data: DEFAULT_BUSINESS_PARAMS.map((p) => ({
      pharmacyId,
      key: p.key,
      value: overrides[p.key] ?? p.value,
      dataType: p.dataType,
      description: p.description,
      createdById: userId,
      updatedById: userId,
    })),
    skipDuplicates: true,
  })
  return result.count
}

/** The default medicine shapes, regulatory types and therapeutic classes. */
export async function seedDefaultClassifications(tx: Tx, pharmacyId: number, userId: number | null): Promise<void> {
  await tx.medicineShape.createMany({
    data: DEFAULT_MEDICINE_SHAPES.map((name) => ({ pharmacyId, name, createdById: userId })),
  })
  await tx.medicineType.createMany({
    data: DEFAULT_MEDICINE_TYPES.map((t) => ({
      pharmacyId,
      name: t.name,
      requiredPrescription: t.requiredPrescription,
      isControlled: t.isControlled ?? false,
      orderLetterKind: t.orderLetterKind ?? 'REGULAR',
      createdById: userId,
    })),
  })
  await tx.medicineClass.createMany({
    data: DEFAULT_MEDICINE_CLASSES.map((name) => ({ pharmacyId, name, createdById: userId })),
  })
}

/** The anonymous customer every POS sale falls back to. */
export async function ensureWalkInCustomer(tx: Tx, pharmacyId: number, userId: number | null): Promise<void> {
  const existing = await tx.customer.findFirst({ where: { pharmacyId, isWalkIn: true, deletedAt: null }, select: { id: true } })
  if (existing) return
  await tx.customer.create({
    data: {
      pharmacyId,
      customerType: CustomerType.PATIENT,
      name: 'Walk-in Patient',
      isWalkIn: true,
      createdById: userId,
    },
  })
}
