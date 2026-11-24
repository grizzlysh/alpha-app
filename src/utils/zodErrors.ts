import { ZodError } from 'zod'

type Bilingual = { en: string; id: string }

// Zod's own messages are English and technical ("Invalid input: expected string,
// received undefined"). We build both languages from the issue code instead, and
// keep a schema's custom English message when it set one.

type Issue = ZodError['issues'][number] & Record<string, unknown>

const DEFAULT_PREFIXES = ['Invalid input', 'Too small', 'Too big', 'Invalid string', 'Invalid option', 'Invalid']

const isDefaultZodMessage = (msg: string): boolean => DEFAULT_PREFIXES.some((p) => msg.startsWith(p))

const describe = (issue: Issue): Bilingual => {
  const origin = issue.origin as string | undefined
  switch (issue.code) {
    case 'invalid_type':
      if (issue.input === undefined || issue.input === null) return { en: 'Required', id: 'Wajib diisi' }
      return { en: `Must be a ${issue.expected}`, id: `Harus berupa ${typeName(String(issue.expected))}` }
    case 'too_small': {
      const min = issue.minimum as number | bigint
      if (origin === 'string') {
        return Number(min) <= 1
          ? { en: 'Required', id: 'Wajib diisi' }
          : { en: `Must be at least ${min} characters`, id: `Minimal ${min} karakter` }
      }
      if (origin === 'array') return { en: `Select at least ${min}`, id: `Pilih minimal ${min}` }
      return issue.inclusive === false
        ? { en: `Must be greater than ${min}`, id: `Harus lebih dari ${min}` }
        : { en: `Must be at least ${min}`, id: `Minimal ${min}` }
    }
    case 'too_big': {
      const max = issue.maximum as number | bigint
      if (origin === 'string') return { en: `At most ${max} characters`, id: `Maksimal ${max} karakter` }
      if (origin === 'array') return { en: `At most ${max} items`, id: `Maksimal ${max} item` }
      return { en: `Must be at most ${max}`, id: `Maksimal ${max}` }
    }
    case 'invalid_format': {
      const format = issue.format as string
      const formats: Record<string, Bilingual> = {
        email: { en: 'Invalid email address', id: 'Alamat email tidak valid' },
        uuid: { en: 'Invalid selection', id: 'Pilihan tidak valid' },
        datetime: { en: 'Invalid date', id: 'Tanggal tidak valid' },
        date: { en: 'Invalid date', id: 'Tanggal tidak valid' },
        url: { en: 'Invalid URL', id: 'URL tidak valid' },
        regex: { en: 'Invalid format', id: 'Format tidak valid' },
      }
      return formats[format] ?? { en: 'Invalid format', id: 'Format tidak valid' }
    }
    case 'invalid_value':
      return { en: 'Invalid option', id: 'Pilihan tidak valid' }
    case 'not_multiple_of':
      return { en: `Must be a multiple of ${issue.divisor}`, id: `Harus kelipatan ${issue.divisor}` }
    case 'unrecognized_keys':
      return { en: 'Unknown field', id: 'Field tidak dikenal' }
    default:
      return { en: 'Invalid value', id: 'Nilai tidak valid' }
  }
}

const typeName = (t: string): string =>
  ({ string: 'teks', number: 'angka', boolean: 'ya/tidak', array: 'daftar', object: 'objek', date: 'tanggal' } as Record<string, string>)[t] ?? t

/** Field-keyed bilingual errors (first issue per field), matching the client's BilingualErrors type. */
export const formatZodErrors = (error: ZodError): Record<string, Bilingual> => {
  const out: Record<string, Bilingual> = {}
  for (const raw of error.issues) {
    const issue = raw as Issue
    const field = issue.path.length ? issue.path.join('.') : '_root'
    if (out[field]) continue
    const generic = describe(issue)
    const custom = issue.message && !isDefaultZodMessage(issue.message) ? issue.message : null
    // A schema's custom message is English; pair it with the generic Indonesian text.
    out[field] = custom ? { en: custom, id: generic.id } : generic
  }
  return out
}

const FIELD_NAMES: Record<string, Bilingual> = {
  name: { en: 'name', id: 'nama' },
  email: { en: 'email', id: 'email' },
  password: { en: 'password', id: 'kata sandi' },
  currentPassword: { en: 'current password', id: 'kata sandi saat ini' },
  newPassword: { en: 'new password', id: 'kata sandi baru' },
  phone: { en: 'phone', id: 'nomor telepon' },
  address: { en: 'address', id: 'alamat' },
  code: { en: 'code', id: 'kode' },
  description: { en: 'description', id: 'keterangan' },
  notes: { en: 'notes', id: 'catatan' },
  quantity: { en: 'quantity', id: 'jumlah' },
  quantityPieces: { en: 'quantity', id: 'jumlah' },
  qty: { en: 'quantity', id: 'jumlah' },
  sellingPrice: { en: 'selling price', id: 'harga jual' },
  originalPrice: { en: 'original price', id: 'harga asli' },
  price: { en: 'price', id: 'harga' },
  discountPercentage: { en: 'discount (%)', id: 'diskon (%)' },
  discountAmount: { en: 'discount', id: 'diskon' },
  grandTotal: { en: 'grand total', id: 'total akhir' },
  totalAmount: { en: 'subtotal', id: 'subtotal' },
  ppnAmount: { en: 'VAT', id: 'PPN' },
  ppnPercentage: { en: 'VAT (%)', id: 'PPN (%)' },
  amount: { en: 'amount', id: 'nominal' },
  paymentMethod: { en: 'payment method', id: 'metode pembayaran' },
  batchNumber: { en: 'batch number', id: 'nomor batch' },
  expiryDate: { en: 'expiry date', id: 'tanggal kedaluwarsa' },
  licenseNumber: { en: 'license number', id: 'nomor izin' },
  validFrom: { en: 'valid from', id: 'berlaku mulai' },
  validUntil: { en: 'valid until', id: 'berlaku sampai' },
  joinedAt: { en: 'join date', id: 'tanggal bergabung' },
  visitDate: { en: 'visit date', id: 'tanggal kunjungan' },
  birthDate: { en: 'birth date', id: 'tanggal lahir' },
  dateOfBirth: { en: 'birth date', id: 'tanggal lahir' },
  nik: { en: 'NIK', id: 'NIK' },
  details: { en: 'items', id: 'item' },
  items: { en: 'items', id: 'item' },
  customer: { en: 'customer', id: 'pelanggan' },
  medicine: { en: 'medicine', id: 'obat' },
  doctor: { en: 'doctor', id: 'dokter' },
  role: { en: 'role', id: 'peran' },
  pharmacy: { en: 'pharmacy', id: 'apotek' },
  distributor: { en: 'distributor', id: 'distributor' },
  value: { en: 'value', id: 'nilai' },
}

/** Humanise a field path for the summary message: "details.0.quantityPieces" → "quantity (item 1)" / "jumlah (item 1)". */
export const fieldLabel = (path: string): Bilingual => {
  const parts = path.split('.')
  const raw = parts.filter((p) => !/^\d+$/.test(p)).pop() ?? path
  const index = parts.find((p) => /^\d+$/.test(p))
  const key = raw.replace(/Uuid$/, '')
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase()
  const label = FIELD_NAMES[raw] ?? FIELD_NAMES[key] ?? { en: words, id: words }
  const suffix = index !== undefined ? ` (item ${Number(index) + 1})` : ''
  return { en: label.en + suffix, id: label.id + suffix }
}
