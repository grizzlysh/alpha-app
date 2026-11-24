import { OrderLetterKind } from '@prisma/client'

// A pharmacy's medicine master, portable between pharmacies. Classifications are
// referenced by name, so a file exported at one branch imports cleanly at another.

export interface CatalogMedicine {
  /** The full name as shown. */
  name: string
  /** Set for a structured name: the name part only. */
  baseName: string | null
  variant: string | null
  isCustomName: boolean
  /** Own order letter kind; null follows the type. */
  orderLetterKind: OrderLetterKind | null
  unit: string
  shape: string
  type: string
  class: string
  ingredients: { name: string; strength: string | null }[]
}

export interface CatalogExport {
  pharmacy: { name: string; code: string }
  exportedAt: Date
  shapes: { name: string }[]
  types: { name: string; requiredPrescription: boolean; isControlled: boolean; orderLetterKind: OrderLetterKind }[]
  classes: { name: string }[]
  medicines: CatalogMedicine[]
}

export interface CatalogCount {
  created: number
  existing: number
}

export interface CatalogInvalidRow {
  /** 1-based position in the submitted medicines list. */
  row: number
  name: string
  reason: 'NAME_REQUIRED' | 'UNIT_REQUIRED' | 'SHAPE_REQUIRED' | 'TYPE_REQUIRED' | 'CLASS_REQUIRED' | 'DUPLICATE_IN_FILE'
}

export interface CatalogImportResult {
  dryRun: boolean
  shapes: CatalogCount
  types: CatalogCount
  classes: CatalogCount
  medicines: CatalogCount & { invalid: CatalogInvalidRow[] }
}
