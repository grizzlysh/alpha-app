import { Prisma } from '@prisma/client'
import { prisma } from '@config/db'
import { MEDICINE_NAME_FORMATS, MEDICINE_NAME_FORMAT_KEY, MedicineNameFormat } from '@constants/defaultCatalog'

type Db = Prisma.TransactionClient | typeof prisma

/** "10mg" → "10 mg", "250mg / 5ml" → "250 mg/5 ml": one space before units, none around "/". */
export const normalizeStrength = (s: string): string =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(\d)\s*([a-zA-Zµ%])/g, '$1 $2')
    .replace(/\s*\/\s*/g, '/')

const AMOUNT = /^(\d+(?:[.,]\d+)?) (\S.*)$/

/** A strength inside free text: "500mg", "250 mg/5 ml", "0,1 %", "100.000 IU". */
export const STRENGTH_IN_TEXT = /(\d+(?:[.,]\d+)*)\s*(mg|mcg|µg|g|ml|l|iu|ui|%|unit)(?![a-z])(?:\s*\/\s*(\d+(?:[.,]\d+)*)?\s*(ml|g|l|tab|tablet|kapsul|dosis)(?![a-z]))?/i

/** "Paracetamol 500 mg" → { name: "Paracetamol", strength: "500 mg" }; no strength → null. */
export const splitIngredient = (text: string): { name: string; strength: string | null } => {
  const m = STRENGTH_IN_TEXT.exec(text)
  if (!m || m.index === 0) return { name: text.trim(), strength: null }
  const name = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim()
  return name ? { name, strength: normalizeStrength(m[0]) } : { name: text.trim(), strength: null }
}

/**
 * The strength shown in the name: one ingredient's as is; several with the
 * same unit as "500/50 mg"; otherwise joined with " + ".
 */
export const combinedStrength = (strengths: (string | null | undefined)[]): string => {
  const list = strengths.filter((s): s is string => !!s?.trim()).map(normalizeStrength)
  if (list.length <= 1) return list[0] ?? ''
  const parts = list.map((s) => AMOUNT.exec(s))
  const unit = parts[0]?.[2]
  if (parts.every((p) => p && p[2] === unit)) return `${parts.map((p) => p![1]).join('/')} ${unit}`
  return list.join(' + ')
}

export interface MedicineNameParts {
  baseName: string
  strengths: (string | null | undefined)[]
  shape: string
  variant?: string | null
}

export const buildMedicineName = (format: MedicineNameFormat, p: MedicineNameParts): string => {
  const strength = combinedStrength(p.strengths)
  const order: Record<MedicineNameFormat, string[]> = {
    NAME_STRENGTH_SHAPE: [p.baseName, strength, p.shape],
    NAME_SHAPE_STRENGTH: [p.baseName, p.shape, strength],
    NAME_STRENGTH: [p.baseName, strength],
  }
  return [...order[format], p.variant ?? '']
    .map((x) => x.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
}

export const isMedicineNameFormat = (v: string): v is MedicineNameFormat =>
  (MEDICINE_NAME_FORMATS as readonly string[]).includes(v)

export const getMedicineNameFormat = async (pharmacyId: number, db: Db = prisma): Promise<MedicineNameFormat> => {
  const param = await db.businessParameter.findUnique({
    where: { pharmacyId_key: { pharmacyId, key: MEDICINE_NAME_FORMAT_KEY } },
    select: { value: true },
  })
  return param && isMedicineNameFormat(param.value) ? param.value : 'NAME_STRENGTH_SHAPE'
}

/**
 * The structured medicines of a pharmacy (optionally only those of one shape)
 * with the name `format` gives them. Custom names are left out.
 */
export const plannedNames = async (
  db: Db,
  pharmacyId: number,
  format: MedicineNameFormat,
  where: Prisma.MedicineWhereInput = {}
): Promise<{ id: number; current: string; next: string }[]> => {
  const rows = await db.medicine.findMany({
    where: { pharmacyId, deletedAt: null, isCustomName: false, ...where },
    select: {
      id: true,
      name: true,
      baseName: true,
      variant: true,
      shape: { select: { name: true } },
      ingredients: { select: { strength: true }, orderBy: { id: 'asc' } },
    },
  })
  return rows.map((m) => ({
    id: m.id,
    current: m.name,
    next: buildMedicineName(format, {
      baseName: m.baseName ?? m.name,
      strengths: m.ingredients.map((i) => i.strength),
      shape: m.shape.name,
      variant: m.variant,
    }),
  }))
}

/** Writes the names `plannedNames` worked out, where they changed. */
export const applyNames = async (db: Db, planned: { id: number; current: string; next: string }[]): Promise<number> => {
  const changed = planned.filter((p) => p.next !== p.current)
  for (const p of changed) await db.medicine.update({ where: { id: p.id }, data: { name: p.next } })
  return changed.length
}

/** Names used more than once (case-insensitive) among `names`. */
export const duplicateNames = (names: string[]): string[] => {
  const seen = new Map<string, number>()
  for (const n of names) seen.set(n.toLowerCase(), (seen.get(n.toLowerCase()) ?? 0) + 1)
  return [...new Set(names.filter((n) => (seen.get(n.toLowerCase()) ?? 0) > 1))]
}
