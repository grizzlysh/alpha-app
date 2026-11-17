import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { NotFoundException } from '@exceptions/NotFoundException'
import { DEFAULT_MEDICINE_TYPES } from '@constants/defaultCatalog'
import { CatalogImportInput } from './catalog.validation'
import { CatalogExport, CatalogImportResult, CatalogInvalidRow } from './catalog.interface'

type Tx = Prisma.TransactionClient

const key = (s: string): string => s.trim().toLowerCase()

// ── Export ────────────────────────────────────────────

export async function exportCatalog(pharmacyId: number, db: Tx | typeof prisma = prisma): Promise<CatalogExport> {
  const pharmacy = await db.pharmacy.findFirst({
    where: { id: pharmacyId, deletedAt: null },
    select: { name: true, code: true },
  })
  if (!pharmacy) throw new NotFoundException('Pharmacy not found')

  const live = { pharmacyId, deletedAt: null }
  const [shapes, types, classes, medicines] = await Promise.all([
    db.medicineShape.findMany({ where: live, select: { name: true }, orderBy: { name: 'asc' } }),
    db.medicineType.findMany({ where: live, select: { name: true, requiredPrescription: true }, orderBy: { name: 'asc' } }),
    db.medicineClass.findMany({ where: live, select: { name: true }, orderBy: { name: 'asc' } }),
    db.medicine.findMany({
      where: live,
      select: {
        name: true,
        unit: true,
        shape: { select: { name: true } },
        type: { select: { name: true } },
        medicineClass: { select: { name: true } },
        ingredients: { select: { name: true }, orderBy: { id: 'asc' } },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return {
    pharmacy,
    exportedAt: new Date(),
    shapes,
    types,
    classes,
    medicines: medicines.map((m) => ({
      name: m.name,
      unit: m.unit,
      shape: m.shape.name,
      type: m.type.name,
      class: m.medicineClass.name,
      ingredients: m.ingredients.map((i) => i.name),
    })),
  }
}

// ── Import ────────────────────────────────────────────

const DEFAULT_RX = new Map(DEFAULT_MEDICINE_TYPES.map((t) => [key(t.name), t.requiredPrescription]))

/** name (lowercase) → id for a pharmacy's live rows. */
async function nameIndex(rows: Promise<{ id: number; name: string }[]>): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  for (const r of await rows) if (!map.has(key(r.name))) map.set(key(r.name), r.id)
  return map
}

/**
 * Adds the medicines and classifications in `input` that the pharmacy doesn't
 * have yet. Matching is by name (case-insensitive); existing rows are never
 * changed, so importing the same file twice is harmless. Stock, prices and
 * batches are not part of the catalog.
 */
export async function applyCatalog(
  tx: Tx,
  pharmacyId: number,
  userId: number,
  input: CatalogImportInput
): Promise<CatalogImportResult> {
  const live = { where: { pharmacyId, deletedAt: null }, select: { id: true, name: true } }
  const [shapeIds, typeIds, classIds, medicineIds] = await Promise.all([
    nameIndex(tx.medicineShape.findMany(live)),
    nameIndex(tx.medicineType.findMany(live)),
    nameIndex(tx.medicineClass.findMany(live)),
    nameIndex(tx.medicine.findMany(live)),
  ])

  // ── Validate medicine rows ──
  const invalid: CatalogInvalidRow[] = []
  const seen = new Set<string>()
  const rows: CatalogImportInput['medicines'] = []
  input.medicines.forEach((m, i) => {
    const fail = (reason: CatalogInvalidRow['reason']) => invalid.push({ row: i + 1, name: m.name, reason })
    const ingredients = m.ingredients.filter(Boolean)
    if (!m.name) return fail('NAME_REQUIRED')
    if (!m.unit) return fail('UNIT_REQUIRED')
    if (!m.shape) return fail('SHAPE_REQUIRED')
    if (!m.type) return fail('TYPE_REQUIRED')
    if (!m.class) return fail('CLASS_REQUIRED')
    if (seen.has(m.name)) return fail('DUPLICATE_IN_FILE')
    seen.add(m.name)
    rows.push({ ...m, ingredients })
  })

  // ── Classifications: listed ones plus any a medicine refers to ──
  const wantShapes = new Set([...input.shapes.map((s) => s.name), ...rows.map((m) => m.shape)])
  const wantClasses = new Set([...input.classes.map((c) => c.name), ...rows.map((m) => m.class)])
  const wantTypes = new Map<string, boolean>()
  for (const t of input.types) wantTypes.set(t.name, t.requiredPrescription ?? DEFAULT_RX.get(t.name) ?? false)
  for (const m of rows) if (!wantTypes.has(m.type)) wantTypes.set(m.type, DEFAULT_RX.get(m.type) ?? false)

  const newShapes = [...wantShapes].filter((n) => !shapeIds.has(n))
  const newClasses = [...wantClasses].filter((n) => !classIds.has(n))
  const newTypes = [...wantTypes].filter(([n]) => !typeIds.has(n))
  const newMedicines = rows.filter((m) => !medicineIds.has(m.name))

  const result: CatalogImportResult = {
    dryRun: input.dryRun,
    shapes: { created: newShapes.length, existing: wantShapes.size - newShapes.length },
    types: { created: newTypes.length, existing: wantTypes.size - newTypes.length },
    classes: { created: newClasses.length, existing: wantClasses.size - newClasses.length },
    medicines: { created: newMedicines.length, existing: rows.length - newMedicines.length, invalid },
  }
  if (input.dryRun) return result

  // ── Write ──
  const by = { pharmacyId, createdById: userId, updatedById: userId }
  if (newShapes.length) {
    const created = await tx.medicineShape.createManyAndReturn({ data: newShapes.map((name) => ({ ...by, name })), select: { id: true, name: true } })
    for (const r of created) shapeIds.set(key(r.name), r.id)
  }
  if (newTypes.length) {
    const created = await tx.medicineType.createManyAndReturn({
      data: newTypes.map(([name, requiredPrescription]) => ({ ...by, name, requiredPrescription })),
      select: { id: true, name: true },
    })
    for (const r of created) typeIds.set(key(r.name), r.id)
  }
  if (newClasses.length) {
    const created = await tx.medicineClass.createManyAndReturn({ data: newClasses.map((name) => ({ ...by, name })), select: { id: true, name: true } })
    for (const r of created) classIds.set(key(r.name), r.id)
  }

  if (newMedicines.length) {
    const created = await tx.medicine.createManyAndReturn({
      data: newMedicines.map((m) => ({
        ...by,
        name: m.name,
        unit: m.unit,
        shapeId: shapeIds.get(m.shape)!,
        typeId: typeIds.get(m.type)!,
        medicineClassId: classIds.get(m.class)!,
      })),
      select: { id: true, name: true },
    })
    const idByName = new Map(created.map((r) => [r.name, r.id]))
    const ingredients = newMedicines.flatMap((m) =>
      m.ingredients.map((name) => ({ medicineId: idByName.get(m.name)!, name, createdById: userId }))
    )
    if (ingredients.length) await tx.medicineIngredient.createMany({ data: ingredients })
  }

  return result
}

export async function importCatalog(pharmacyId: number, userId: number, input: CatalogImportInput): Promise<CatalogImportResult> {
  return prisma.$transaction((tx) => applyCatalog(tx, pharmacyId, userId, input), { timeout: 60_000, maxWait: 10_000 })
}

/** Copies one pharmacy's catalog into another — used when opening a new branch. */
export async function copyCatalog(tx: Tx, sourcePharmacyId: number, targetPharmacyId: number, userId: number): Promise<CatalogImportResult> {
  const source = await exportCatalog(sourcePharmacyId, tx)
  return applyCatalog(tx, targetPharmacyId, userId, {
    dryRun: false,
    shapes: source.shapes.map((s) => ({ name: key(s.name) })),
    types: source.types.map((t) => ({ name: key(t.name), requiredPrescription: t.requiredPrescription })),
    classes: source.classes.map((c) => ({ name: key(c.name) })),
    medicines: source.medicines.map((m) => ({
      name: key(m.name),
      unit: key(m.unit),
      shape: key(m.shape),
      type: key(m.type),
      class: key(m.class),
      ingredients: m.ingredients.map(key),
    })),
  })
}
