/**
 * Converts medicines with a typed name ("Amlodipin 10mg") into structured ones:
 * base name "Amlodipin", ingredient strength "10 mg", and the name rebuilt with
 * the pharmacy's MEDICINE_NAME_FORMAT ("Amlodipin 10 mg Tablet").
 *
 * Only clear cases are converted: exactly one strength in the name and at most
 * one ingredient (none: one is created from the base name). Anything else, or
 * a result that would clash with another name, stays a custom name and is listed.
 *
 *   npm run medicines:structure            # dry run: prints the plan
 *   npm run medicines:structure -- --apply # writes it
 */
import { PrismaClient } from '@prisma/client'
import { STRENGTH_IN_TEXT, buildMedicineName, getMedicineNameFormat, normalizeStrength } from '@utils/medicineName'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

interface Plan {
  id: number
  ingredientId: number | null
  from: string
  to: string
  baseName: string
  variant: string | null
  strength: string
}

const removeWord = (text: string, word: string): string =>
  text.replace(new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'i'), ' ').replace(/\s+/g, ' ').trim()

async function main(): Promise<void> {
  const pharmacies = await prisma.pharmacy.findMany({ where: { deletedAt: null }, select: { id: true, name: true } })
  for (const pharmacy of pharmacies) {
    const format = await getMedicineNameFormat(pharmacy.id, prisma)
    const medicines = await prisma.medicine.findMany({
      where: { pharmacyId: pharmacy.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        isCustomName: true,
        shape: { select: { name: true } },
        ingredients: { select: { id: true, name: true, strength: true }, orderBy: { id: 'asc' } },
      },
      orderBy: { name: 'asc' },
    })
    if (medicines.length === 0) continue

    const plans: Plan[] = []
    const skipped: { name: string; reason: string }[] = []
    for (const m of medicines.filter((x) => x.isCustomName)) {
      const matches = [...m.name.matchAll(new RegExp(STRENGTH_IN_TEXT.source, 'gi'))]
      if (matches.length !== 1) {
        skipped.push({ name: m.name, reason: matches.length ? 'several strengths' : 'no strength in the name' })
        continue
      }
      if (m.ingredients.length > 1) {
        skipped.push({ name: m.name, reason: `${m.ingredients.length} ingredients: which one has the strength?` })
        continue
      }
      const match = matches[0]
      const before = m.name.slice(0, match.index).trim()
      const after = m.name.slice(match.index! + match[0].length).trim()
      // The shape is added by the format, so a shape word typed in the name is dropped.
      const baseName = removeWord(before, m.shape.name)
      const variant = removeWord(after, m.shape.name) || null
      if (!baseName) {
        skipped.push({ name: m.name, reason: 'nothing before the strength' })
        continue
      }
      const strength = normalizeStrength(match[0])
      const to = buildMedicineName(format, { baseName, strengths: [strength], shape: m.shape.name, variant })
      plans.push({ id: m.id, ingredientId: m.ingredients[0]?.id ?? null, from: m.name, to, baseName, variant, strength })
    }

    // Two medicines must not end up with the same name.
    const taken = new Map<string, number>()
    for (const m of medicines) if (!plans.some((p) => p.id === m.id)) taken.set(m.name.toLowerCase(), m.id)
    const ok: Plan[] = []
    for (const p of plans) {
      const k = p.to.toLowerCase()
      if (taken.has(k)) skipped.push({ name: p.from, reason: `"${p.to}" is already used` })
      else {
        taken.set(k, p.id)
        ok.push(p)
      }
    }

    console.log(`\n${pharmacy.name} (${format})`)
    for (const p of ok) console.log(`  ✓ ${p.from}  →  ${p.to}`)
    for (const s of skipped) console.log(`  · kept as typed: ${s.name} (${s.reason})`)

    if (!apply) continue
    await prisma.$transaction(async (tx) => {
      for (const p of ok) {
        await tx.medicine.update({
          where: { id: p.id },
          data: { name: p.to, baseName: p.baseName, variant: p.variant, isCustomName: false },
        })
        if (p.ingredientId) await tx.medicineIngredient.update({ where: { id: p.ingredientId }, data: { strength: p.strength } })
        else await tx.medicineIngredient.create({ data: { medicineId: p.id, name: p.baseName, strength: p.strength } })
      }
    })
  }
  console.log(apply ? '\nApplied.' : '\nDry run: nothing written. Run again with --apply to write it.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
