import { PrescriptionStatus } from '@prisma/client'
import { prisma } from '@config/db'
import { DEFAULT_BUSINESS_PARAMS } from '@constants/defaultCatalog'
import { JobContext, JobResult } from './types'

const PARAM_KEY = 'PRESCRIPTION_VALID_DAYS'
const DAY_MS = 86_400_000

const defaultValidDays = (): number =>
  Number(DEFAULT_BUSINESS_PARAMS.find((p) => p.key === PARAM_KEY)?.value ?? 30)

/**
 * Marks prescriptions that were never (fully) dispensed as EXPIRED once they
 * are older than the pharmacy's PRESCRIPTION_VALID_DAYS.
 */
export async function expirePrescriptions({ now }: JobContext): Promise<JobResult> {
  const [pharmacies, params] = await Promise.all([
    prisma.pharmacy.findMany({ where: { deletedAt: null }, select: { id: true } }),
    prisma.businessParameter.findMany({ where: { key: PARAM_KEY }, select: { pharmacyId: true, value: true } }),
  ])
  const validDaysByPharmacy = new Map(params.map((p) => [p.pharmacyId, Number(p.value)]))

  let affected = 0
  const perPharmacy: Record<string, number> = {}
  for (const { id: pharmacyId } of pharmacies) {
    const configured = validDaysByPharmacy.get(pharmacyId)
    const validDays = configured !== undefined && Number.isFinite(configured) && configured > 0 ? configured : defaultValidDays()
    const cutoff = new Date(now.getTime() - validDays * DAY_MS)

    const { count } = await prisma.prescription.updateMany({
      where: {
        pharmacyId,
        deletedAt: null,
        status: { in: [PrescriptionStatus.PENDING, PrescriptionStatus.PARTIAL] },
        prescribedAt: { lt: cutoff },
      },
      data: { status: PrescriptionStatus.EXPIRED },
    })
    if (count > 0) perPharmacy[pharmacyId] = count
    affected += count
  }

  return { affected, details: { perPharmacy } }
}
