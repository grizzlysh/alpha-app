import { AllergySeverity } from '@prisma/client'
import { prisma } from '@config/db'

export interface AllergyConflict {
  medicineName: string
  allergenName: string
  severity: AllergySeverity
  matchedOn: string
}

// ── Allergy check ─────────────────────────────────────
//
// Name-based screening: a prescription line is flagged when the allergen name
// and the medicine name, or one of its active ingredients, contain each other's
// words. It catches "Amoxicillin" vs an "Amoxsan" whose ingredient is
// amoxicillin; it does NOT know drug classes (penicillin ⊃ amoxicillin), so it
// supports — never replaces — the doctor's own check.

const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const words = (s: string): string[] => normalize(s).split(' ').filter((w) => w.length >= 4)

const namesOverlap = (allergen: string, candidate: string): boolean => {
  const a = normalize(allergen)
  const c = normalize(candidate)
  if (!a || !c) return false
  if (a === c || c.includes(a) || a.includes(c)) return true
  return words(allergen).some((w) => c.includes(w)) || words(candidate).some((w) => a.includes(w))
}

/** Used by the doctor's prescription, the prescription form and the POS. */
export const checkPrescriptionAllergies = async (
  customerId: number,
  pharmacyId: number,
  items: { medicineUuid?: string; medicineName: string }[]
): Promise<AllergyConflict[]> => {
  const record = await prisma.medicalRecord.findUnique({
    where: { customerId },
    select: {
      allergies: {
        // Every type is checked: allergies are often filed under the wrong type,
        // and a false alarm is cheaper than a missed one.
        where: { deletedAt: null },
        select: { allergenName: true, severity: true },
      },
    },
  })
  const allergies = record?.allergies ?? []
  if (allergies.length === 0 || items.length === 0) return []

  const conflicts: AllergyConflict[] = []
  for (const item of items) {
    const medicine = await prisma.medicine.findFirst({
      where: {
        pharmacyId,
        deletedAt: null,
        ...(item.medicineUuid
          ? { uuid: item.medicineUuid }
          : { name: { equals: item.medicineName.trim(), mode: 'insensitive' as const } }),
      },
      select: { name: true, ingredients: { select: { name: true } } },
    })
    const candidates = [item.medicineName, ...(medicine ? [medicine.name, ...medicine.ingredients.map((i) => i.name)] : [])]

    for (const allergy of allergies) {
      const hit = candidates.find((c) => namesOverlap(allergy.allergenName, c))
      if (hit) {
        conflicts.push({ medicineName: item.medicineName, allergenName: allergy.allergenName, severity: allergy.severity, matchedOn: hit })
      }
    }
  }
  return conflicts
}

