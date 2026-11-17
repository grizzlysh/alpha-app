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
    db.medicineType.findMany({ where: live, select: { name: true, requiredPrescription: true, isControlled: true }, orderBy: { name: 'asc' } }),
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

const DEFAULT_TYPE = new Map(DEFAULT_MEDICINE_TYPES.map((t) => [key(t.name), { rx: t.requiredPrescription, controlled: t.isControlled ?? false }]))

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

  // ── Validate medicine rows ── (names keep their typed case; matching ignores it)
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
    if (seen.has(key(m.name))) return fail('DUPLICATE_IN_FILE')
    seen.add(key(m.name))
    rows.push({ ...m, ingredients })
  })

  // ── Classifications: listed ones plus any a medicine refers to (key → name as first written) ──
  const collect = (names: string[]): Map<string, string> => {
    const map = new Map<string, string>()
    for (const n of names) if (!map.has(key(n))) map.set(key(n), n)
    return map
  }
  const wantShapes = collect([...input.shapes.map((x) => x.name), ...rows.map((m) => m.shape)])
  const wantClasses = collect([...input.classes.map((x) => x.name), ...rows.map((m) => m.class)])
  const wantTypes = new Map<string, { name: string; rx: boolean; controlled: boolean }>()
  for (const t of input.types) {
    const d = DEFAULT_TYPE.get(key(t.name))
    if (!wantTypes.has(key(t.name))) {
      wantTypes.set(key(t.name), { name: t.name, rx: t.requiredPrescription ?? d?.rx ?? false, controlled: t.isControlled ?? d?.controlled ?? false })
    }
  }
  for (const m of rows) {
    const d = DEFAULT_TYPE.get(key(m.type))
    if (!wantTypes.has(key(m.type))) wantTypes.set(key(m.type), { name: m.type, rx: d?.rx ?? false, controlled: d?.controlled ?? false })
  }

  const newShapes = [...wantShapes].filter(([k]) => !shapeIds.has(k)).map(([, n]) => n)
  const newClasses = [...wantClasses].filter(([k]) => !classIds.has(k)).map(([, n]) => n)
  const newTypes = [...wantTypes].filter(([k]) => !typeIds.has(k)).map(([, v]) => v)
  const newMedicines = rows.filter((m) => !medicineIds.has(key(m.name)))

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
      data: newTypes.map((t) => ({ ...by, name: t.name, requiredPrescription: t.rx, isControlled: t.controlled })),
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
        shapeId: shapeIds.get(key(m.shape))!,
        typeId: typeIds.get(key(m.type))!,
        medicineClassId: classIds.get(key(m.class))!,
      })),
      select: { id: true, name: true },
    })
    const idByName = new Map(created.map((r) => [key(r.name), r.id]))
    const ingredients = newMedicines.flatMap((m) =>
      m.ingredients.map((name) => ({ medicineId: idByName.get(key(m.name))!, name, createdById: userId }))
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
    shapes: source.shapes,
    types: source.types,
    classes: source.classes,
    medicines: source.medicines,
  })
}
