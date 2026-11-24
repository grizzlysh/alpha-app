import { DataType, OrderLetterKind } from '@prisma/client'

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
export const DEFAULT_MEDICINE_TYPES: Array<{ name: string; requiredPrescription: boolean; isControlled?: boolean; orderLetterKind?: OrderLetterKind }> = [
  { name: 'Obat Bebas', requiredPrescription: false },
  { name: 'Obat Bebas Terbatas', requiredPrescription: false },
  { name: 'Obat Keras', requiredPrescription: true },
  { name: 'Psikotropika', requiredPrescription: true, isControlled: true, orderLetterKind: OrderLetterKind.PSYCHOTROPIC },
  { name: 'Narkotika', requiredPrescription: true, isControlled: true, orderLetterKind: OrderLetterKind.NARCOTIC },
  { name: 'Prekursor', requiredPrescription: true, isControlled: true, orderLetterKind: OrderLetterKind.PRECURSOR },
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

/** How a structured medicine name is put together (the variant always comes last). */
export const MEDICINE_NAME_FORMATS = ['NAME_STRENGTH_SHAPE', 'NAME_SHAPE_STRENGTH', 'NAME_STRENGTH'] as const
export type MedicineNameFormat = (typeof MEDICINE_NAME_FORMATS)[number]
export const MEDICINE_NAME_FORMAT_KEY = 'MEDICINE_NAME_FORMAT'

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
  { key: 'PRESCRIPTION_VALID_DAYS',   value: '30',    dataType: DataType.NUMBER,     description: 'Days a prescription stays valid for dispensing; older pending ones expire automatically' },
  { key: 'EXPIRY_ALERT_DAYS',         value: '30',    dataType: DataType.NUMBER,     description: 'Daily alert lists batches expiring within this many days' },
  { key: 'LICENSE_ALERT_DAYS',        value: '30',    dataType: DataType.NUMBER,     description: 'Daily alert lists business and practice licenses expiring within this many days' },
  { key: 'RECEIPT_HEADER',            value: '',      dataType: DataType.STRING,     description: 'Header text printed on patient receipts' },
  { key: 'NAME_DISPLAY_CASE',         value: 'UPPER', dataType: DataType.STRING,     description: 'How names are displayed and printed: UPPER, TITLE, LOWER or AS_TYPED' },
  { key: 'MEDICINE_NAME_FORMAT',      value: 'NAME_STRENGTH_SHAPE', dataType: DataType.STRING, description: 'How medicine names are put together: NAME_STRENGTH_SHAPE, NAME_SHAPE_STRENGTH or NAME_STRENGTH' },
  { key: 'RESTRICTED_SALE_LIMIT',     value: '10',    dataType: DataType.NUMBER,     description: 'Most pieces of one precursor or obat-obat tertentu medicine sold per sale without a prescription (0 = no limit)' },
  { key: 'CASHIER_SHIFT_ENABLED',     value: 'false', dataType: DataType.BOOLEAN,    description: 'Cashiers open a shift with the drawer cash before selling and close it by counting the drawer' },
  { key: 'CASHIER_SHIFT_OPENING_CASH', value: '0',    dataType: DataType.NUMBER,     description: 'Opening cash (float) suggested when a shift is opened' },
  { key: 'CASHIER_SHIFT_BLIND_CLOSE', value: 'false', dataType: DataType.BOOLEAN,    description: 'When closing, the cashier counts the drawer without seeing the expected cash' },
  { key: 'CASHIER_SHIFT_DIFFERENCE_TOLERANCE', value: '0', dataType: DataType.NUMBER, description: 'A cash difference larger than this (Rp) needs a note when the shift is closed' },
  { key: 'RECEIPT_FOOTER',            value: 'Terima kasih atas kepercayaan Anda. Semoga lekas sembuh!', dataType: DataType.STRING, description: 'Footer text printed on patient receipts' },
]
