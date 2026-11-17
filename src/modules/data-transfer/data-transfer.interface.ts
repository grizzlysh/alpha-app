export type ImportInvalidReason =
  | 'NAME_REQUIRED'
  | 'PHONE_REQUIRED'
  | 'DUPLICATE_IN_FILE'
  | 'INVALID_DATE'
  | 'MEDICINE_NOT_FOUND'
  | 'DISTRIBUTOR_NOT_FOUND'
  | 'BATCH_REQUIRED'
  | 'EXPIRED'
  | 'QUANTITY_INVALID'
  | 'PRICE_INVALID'
  | 'BATCH_EXISTS'

export interface ImportInvalidRow {
  /** 1-based position in the submitted rows. */
  row: number
  name: string
  reason: ImportInvalidReason
}

export interface ImportResult {
  dryRun: boolean
  created: number
  /** Already present (matched by name/phone or batch) and left untouched. */
  existing: number
  invalid: ImportInvalidRow[]
}

export interface OpeningStockResult extends ImportResult {
  /** One receipt invoice per distributor. */
  invoices: number
  totalValue: number
}

export interface DistributorExportRow {
  name: string
  phone: string
  email: string | null
  address: string | null
  contactPerson: string | null
  permitNumber: string | null
}

export interface CustomerExportRow {
  name: string
  phone: string | null
  address: string | null
  gender: string | null
  dateOfBirth: string | null
  nik: string | null
  bpjsNumber: string | null
  medicalRecordNumber: string | null
}
