import { DataType } from '@prisma/client'

// Starting data every new pharmacy gets. Each pharmacy owns its own copy and
// may rename, add or remove entries afterwards — nothing here is shared.

export const DEFAULT_MEDICINE_SHAPES: string[] = [
  'Tablet',
  'Kaplet',
  'Kapsul',
  'Sirup',
  'Suspensi',
  'Tetes',
  'Salep',
  'Krim',
  'Gel',
  'Injeksi',
  'Suppositoria',
  'Inhaler',
  'Serbuk',
]

/** Regulatory groups. `requiredPrescription` drives the prescription check at the POS. */
export const DEFAULT_MEDICINE_TYPES: Array<{ name: string; requiredPrescription: boolean; isControlled?: boolean }> = [
  { name: 'Obat Bebas', requiredPrescription: false },
  { name: 'Obat Bebas Terbatas', requiredPrescription: false },
  { name: 'Obat Keras', requiredPrescription: true },
  { name: 'Psikotropika', requiredPrescription: true, isControlled: true },
  { name: 'Narkotika', requiredPrescription: true, isControlled: true },
  { name: 'Prekursor', requiredPrescription: true, isControlled: true },
  { name: 'Jamu & Herbal', requiredPrescription: false },
  { name: 'Suplemen', requiredPrescription: false },
  { name: 'Alat Kesehatan', requiredPrescription: false },
]

/** Therapeutic classes. */
export const DEFAULT_MEDICINE_CLASSES: string[] = [
  'Analgesik & Antipiretik',
  'Antiinflamasi Nonsteroid',
  'Antibiotik',
  'Antijamur',
  'Antivirus',
  'Antihistamin',
  'Obat Batuk & Flu',
  'Antasida & Obat Lambung',
  'Antidiare & Pencahar',
  'Antihipertensi',
  'Antidiabetes',
  'Kolesterol',
  'Vitamin & Suplemen',
  'Obat Kulit',
  'Obat Mata & Telinga',
  'Lainnya',
]

export interface DefaultBusinessParam {
  key: string
  value: string
  dataType: DataType
  description: string
}

/** How names (medicines, distributors, patients…) are shown and printed. */
export const NAME_CASES = ['UPPER', 'TITLE', 'LOWER', 'AS_TYPED'] as const
export type NameCase = (typeof NAME_CASES)[number]
export const NAME_DISPLAY_CASE_KEY = 'NAME_DISPLAY_CASE'

export const DEFAULT_BUSINESS_PARAMS: DefaultBusinessParam[] = [
  { key: 'MARGIN_PERCENTAGE',         value: '20',    dataType: DataType.PERCENTAGE, description: 'Default selling price margin applied over purchase price' },
  { key: 'PPN_PERCENTAGE_SELL',       value: '11',    dataType: DataType.PERCENTAGE, description: 'PPN percentage charged to patients on sales (output VAT)' },
  { key: 'PPN_PERCENTAGE_BUY',        value: '11',    dataType: DataType.PERCENTAGE, description: 'PPN percentage on purchases from distributors (input VAT)' },
  { key: 'MAX_DISCOUNT_PERCENTAGE',   value: '30',    dataType: DataType.PERCENTAGE, description: 'Maximum discount percentage staff can apply to a sale item' },
  { key: 'REORDER_LEVEL_DEFAULT',     value: '10',    dataType: DataType.NUMBER,     description: 'Default low-stock alert threshold in pieces' },
  { key: 'LOW_STOCK_ALERT_THRESHOLD', value: '5',     dataType: DataType.NUMBER,     description: 'Critical stock threshold in pieces before urgent reorder alert' },
  { key: 'ALLOW_FEFO_OVERRIDE',       value: 'true',  dataType: DataType.BOOLEAN,    description: 'Allow staff to select non-FEFO batches during sale' },
  { key: 'CREDIT_PAYMENT_DAYS',       value: '30',    dataType: DataType.NUMBER,     description: 'Default credit term in days for non-cash sales' },
  { key: 'RETURN_POLICY_DAYS',        value: '7',     dataType: DataType.NUMBER,     description: 'Number of days after sale within which a return is accepted' },
  { key: 'RECEIPT_HEADER',            value: '',      dataType: DataType.STRING,     description: 'Header text printed on patient receipts' },
  { key: 'NAME_DISPLAY_CASE',         value: 'UPPER', dataType: DataType.STRING,     description: 'How names are displayed and printed: UPPER, TITLE, LOWER or AS_TYPED' },
  { key: 'RECEIPT_FOOTER',            value: 'Terima kasih atas kepercayaan Anda. Semoga lekas sembuh!', dataType: DataType.STRING, description: 'Footer text printed on patient receipts' },
]
