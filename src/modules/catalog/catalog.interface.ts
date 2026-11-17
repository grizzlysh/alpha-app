// A pharmacy's medicine master, portable between pharmacies. Classifications are
// referenced by name, so a file exported at one branch imports cleanly at another.

export interface CatalogMedicine {
  name: string
  unit: string
  shape: string
  type: string
  class: string
  ingredients: string[]
}

export interface CatalogExport {
  pharmacy: { name: string; code: string }
  exportedAt: Date
  shapes: { name: string }[]
  types: { name: string; requiredPrescription: boolean }[]
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
