// Indonesian translations for the English messages that services throw directly
// (e.g. `throw new NotFoundException('Sale not found')`). The error handler looks
// a message up here so users always get a real Indonesian message instead of a
// generic one. New code should prefer MESSAGE_CODES; this table covers the
// existing literal throws.

export const EXACT_TRANSLATIONS: Record<string, string> = {
  // ── Auth ──────────────────────────────────────────
  'Invalid email or password': 'Email atau kata sandi salah',
  'Account is temporarily locked. Please try again later.': 'Akun dikunci sementara. Silakan coba lagi nanti.',
  'Too many failed attempts. Account locked for 30 minutes.': 'Terlalu banyak percobaan gagal. Akun dikunci selama 30 menit.',
  'Invalid or expired refresh token': 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  'No refresh token provided': 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  'No token provided': 'Anda belum masuk. Silakan masuk terlebih dahulu.',
  'User is inactive': 'Akun pengguna tidak aktif',
  'User not found or inactive': 'Akun tidak ditemukan atau tidak aktif',
  'User not found': 'Pengguna tidak ditemukan',
  'You do not have access to this pharmacy': 'Anda tidak memiliki akses ke apotek ini',

  // ── Not found ─────────────────────────────────────
  'Allergy record not found': 'Data alergi tidak ditemukan',
  'Business license not found': 'Izin usaha tidak ditemukan',
  'Business parameter not found': 'Parameter usaha tidak ditemukan',
  'Customer not found': 'Pelanggan tidak ditemukan',
  'Distributor not found': 'Distributor tidak ditemukan',
  'Doctor not found': 'Dokter tidak ditemukan',
  'Invoice not found': 'Faktur tidak ditemukan',
  'Invoice payment record not found': 'Data pembayaran faktur tidak ditemukan',
  'Medical record not found': 'Rekam medis tidak ditemukan',
  'Medical visit not found': 'Data kunjungan tidak ditemukan',
  'Medicine class not found': 'Kelas obat tidak ditemukan',
  'Medicine not found': 'Obat tidak ditemukan',
  'Medicine shape not found': 'Bentuk obat tidak ditemukan',
  'Medicine type not found': 'Jenis obat tidak ditemukan',
  'Party not found': 'Pelanggan tidak ditemukan',
  'Payment record not found': 'Data pembayaran tidak ditemukan',
  'Permission not found': 'Izin akses tidak ditemukan',
  'One or more permissions not found': 'Satu atau lebih izin akses tidak ditemukan',
  'Pharmacy not found': 'Apotek tidak ditemukan',
  'Prescription not found': 'Resep tidak ditemukan',
  'The prescription belongs to a different patient': 'Resep ini milik pasien lain',
  'The prescription is already linked to another visit': 'Resep ini sudah terhubung ke kunjungan lain',
  'This visit already has a prescription': 'Kunjungan ini sudah memiliki resep',
  'This patient is already in the examination queue': 'Pasien ini sudah ada di antrean pemeriksaan',
  'Only waiting patients can be called in': 'Hanya pasien yang sedang menunggu yang bisa dipanggil',
  'Choose the examining doctor': 'Pilih dokter yang memeriksa',
  'This patient has just been called in by someone else': 'Pasien ini baru saja dipanggil oleh pengguna lain',
  'The examination is not in progress': 'Pemeriksaan ini tidak sedang berlangsung',
  'Vital signs can only be recorded before the examination is finished': 'Tanda vital hanya bisa dicatat sebelum pemeriksaan selesai',
  'The examination was changed by someone else, please refresh': 'Pemeriksaan ini baru diubah pengguna lain, silakan muat ulang',
  'Only waiting or ongoing examinations can be cancelled': 'Hanya pemeriksaan yang menunggu atau berlangsung yang bisa dibatalkan',
  'Invalid date': 'Tanggal tidak valid',
  'The visit belongs to a different patient': 'Kunjungan ini milik pasien lain',
  'Purchase order not found': 'Surat pesanan tidak ditemukan',
  'Role not found': 'Peran tidak ditemukan',
  'Sale not found': 'Penjualan tidak ditemukan',
  'Sale payment not found': 'Pembayaran penjualan tidak ditemukan',
  'Sale payment record not found': 'Data pembayaran penjualan tidak ditemukan',
  'Signer not found at this pharmacy': 'Penanda tangan tidak terdaftar di apotek ini',
  'Stock detail not found': 'Batch stok tidak ditemukan',
  'Stock disposal not found': 'Data pemusnahan tidak ditemukan',
  'Stock movement not found': 'Data pergerakan stok tidak ditemukan',
  'Stock not found': 'Stok tidak ditemukan',
  'Stock return not found': 'Data retur tidak ditemukan',
  'Storage bin not found': 'Tempat penyimpanan tidak ditemukan',
  'Storage cabinet not found': 'Lemari tidak ditemukan',
  'Storage shelf not found': 'Rak tidak ditemukan',
  'System parameter not found': 'Parameter sistem tidak ditemukan',
  'Walk-in customer not found': 'Pelanggan umum tidak ditemukan',
  'Walk-in party not found': 'Pelanggan umum tidak ditemukan',

  // ── Duplicates ────────────────────────────────────
  'A bin with this code already exists on this shelf': 'Kode tempat penyimpanan sudah dipakai di rak ini',
  'A cabinet with this code already exists': 'Kode lemari sudah dipakai',
  'A doctor with this license number already exists': 'Nomor SIP dokter sudah terdaftar',
  'A shelf with this code already exists in this cabinet': 'Kode rak sudah dipakai di lemari ini',
  'Business license number already exists': 'Nomor izin usaha sudah terdaftar',
  'Customer with this phone already exists': 'Nomor telepon pelanggan sudah terdaftar',
  'Distributor with this name already exists': 'Nama distributor sudah terdaftar',
  'Invoice number already exists': 'Nomor faktur sudah terdaftar',
  'Medicine class with this name already exists': 'Nama kelas obat sudah terdaftar',
  'Medicine shape with this name already exists': 'Nama bentuk obat sudah terdaftar',
  'Value must be a number of 0 or more': 'Nilai harus berupa angka 0 atau lebih',
  'Percentage must be between 0 and 100': 'Persentase harus antara 0 sampai 100',
  'Value must be true or false': 'Nilai harus true atau false',
  'Invoice has recorded payments and cannot be deleted': 'Faktur sudah ada pembayarannya dan tidak bisa dihapus',
  'Stock from this invoice has already been used and the invoice cannot be deleted': 'Stok dari faktur ini sudah terpakai (terjual, diretur, dimusnahkan, atau disesuaikan), jadi faktur tidak bisa dihapus',
  'Value must be one of UPPER, TITLE, LOWER, AS_TYPED': 'Pilihan harus UPPER, TITLE, LOWER, atau AS_TYPED',
  'Value must be one of NAME_STRENGTH_SHAPE, NAME_SHAPE_STRENGTH, NAME_STRENGTH': 'Pilihan harus NAME_STRENGTH_SHAPE, NAME_SHAPE_STRENGTH, atau NAME_STRENGTH',
  'Medicine type with this name already exists': 'Nama jenis obat sudah terdaftar',
  'Medicine with this name already exists': 'Nama obat sudah terdaftar',
  'Pharmacy code already exists': 'Kode apotek sudah dipakai',
  'Role with this name already exists': 'Nama peran sudah dipakai',
  'This user account is already linked to a doctor profile': 'Akun pengguna ini sudah terhubung ke profil dokter lain',

  // ── Cannot delete (still in use) ──────────────────
  'Bin cannot be deleted because it is assigned to medicines or stock batches': 'Tempat penyimpanan tidak dapat dihapus karena masih berisi obat atau batch stok',
  'Cabinet cannot be deleted because it has shelves': 'Lemari tidak dapat dihapus karena masih memiliki rak',
  'Shelf cannot be deleted because it has bins': 'Rak tidak dapat dihapus karena masih memiliki tempat penyimpanan',
  'Doctor cannot be deleted because they have prescriptions': 'Dokter tidak dapat dihapus karena sudah memiliki resep',
  'Role is still assigned to active users': 'Peran masih dipakai oleh pengguna aktif',
  'Walk-in customer cannot be modified or deleted': 'Pelanggan umum tidak dapat diubah atau dihapus',

  // ── Stock & sales rules ───────────────────────────
  'Adjustment would result in negative total stock': 'Penyesuaian akan membuat total stok menjadi minus',
  'Quantity cannot be negative': 'Jumlah tidak boleh minus',
  'Selling price must be positive': 'Harga jual harus lebih dari 0',
  'FEFO override is not allowed. Items must be sold in expiry order.': 'Penjualan harus mengikuti urutan kedaluwarsa (FEFO). Pilih batch dengan tanggal kedaluwarsa paling dekat.',
  'Can only add installment to CREDIT sales': 'Cicilan hanya dapat ditambahkan ke penjualan kredit',
  'Cannot add payment to non-completed sale': 'Pembayaran hanya dapat ditambahkan ke penjualan yang sudah selesai',
  'Sale is already fully paid': 'Penjualan sudah lunas',
  'Invoice is already fully paid': 'Faktur sudah lunas',
  'Only completed or pending sales can be cancelled': 'Hanya penjualan selesai atau tertunda yang dapat dibatalkan',
  'Only completed sales can be refunded': 'Hanya penjualan yang sudah selesai yang dapat direfund',
  'Only pending sales can be completed': 'Hanya penjualan tertunda yang dapat diselesaikan',
  'Only pending sales can be updated': 'Hanya penjualan tertunda yang dapat diubah',
  'Omit partyUuid for walk-in sales': 'Penjualan pelanggan umum tidak perlu memilih pelanggan',

  // ── Prescriptions & medical records ───────────────
  'Prescription cannot be dispensed': 'Resep tidak dapat diserahkan',
  'Prescription has already been cancelled': 'Resep sudah dibatalkan',
  'Prescription has already been fully dispensed': 'Resep sudah diserahkan seluruhnya',
  'Prescription is not available for use': 'Resep sudah tidak dapat dipakai (sudah diserahkan, dibatalkan, atau kedaluwarsa)',
  'Only pending prescriptions can be deleted': 'Hanya resep yang masih menunggu yang dapat dihapus',
  'Only pending prescriptions can be edited': 'Hanya resep yang masih menunggu yang dapat diubah',
  'Medical records are only available for patients': 'Rekam medis hanya tersedia untuk pelanggan bertipe pasien',

  // ── Document workflows ────────────────────────────
  'Only DRAFT purchase orders can be deleted': 'Hanya surat pesanan berstatus draf yang dapat dihapus',
  'Only SENT purchase orders can be completed': 'Hanya surat pesanan yang sudah dikirim yang dapat diselesaikan',
  'Only DRAFT stock disposals can be deleted': 'Hanya pemusnahan berstatus draf yang dapat dihapus',
  'Stock disposal can only be completed from DRAFT status': 'Pemusnahan hanya dapat diselesaikan dari status draf',
  'Stock disposal can only be edited in DRAFT status': 'Pemusnahan hanya dapat diubah saat berstatus draf',
  'Stock disposal is already cancelled': 'Pemusnahan sudah dibatalkan',
  'Stock disposal must be signed before completing': 'Pemusnahan harus ditandatangani sebelum diselesaikan',
  'Only IN_PROCESS stock returns can be deleted': 'Hanya retur yang sedang diproses yang dapat dihapus',
  'Stock return can only be cancelled while IN_PROCESS': 'Retur hanya dapat dibatalkan saat sedang diproses',
  'Stock return can only be completed from IN_PROCESS status': 'Retur hanya dapat diselesaikan saat sedang diproses',
  'Stock return can only be edited in IN_PROCESS status': 'Retur hanya dapat diubah saat sedang diproses',
  'Stock return can only be rejected while IN_PROCESS': 'Retur hanya dapat ditolak saat sedang diproses',
  'Stock return must be signed before completing': 'Retur harus ditandatangani sebelum diselesaikan',

  // ── Signing ───────────────────────────────────────
  'Only the Head Pharmacist with an active practice license can sign this document': 'Dokumen ini hanya bisa ditandatangani Head Pharmacist dengan izin praktik (SIPA) aktif',
  'Only a pharmacist with an active practice license can sign this document': 'Dokumen ini hanya bisa ditandatangani apoteker dengan izin praktik (SIPA) aktif',

  // ── Ownership ─────────────────────────────────────
  'Global roles can only be modified by platform admin': 'Peran global hanya dapat diubah oleh platform admin',
  'Only platform admin can change pharmacy code': 'Hanya platform admin yang dapat mengubah kode apotek',
  'You can only delete your own pharmacy records': 'Anda hanya dapat menghapus data milik apotek Anda',
  'You can only delete your own pharmacy roles': 'Anda hanya dapat menghapus peran milik apotek Anda',
  'You can only edit your own pharmacy records': 'Anda hanya dapat mengubah data milik apotek Anda',
  'You can only edit your own pharmacy roles': 'Anda hanya dapat mengubah peran milik apotek Anda',
  'You can only manage licenses for your own pharmacy': 'Anda hanya dapat mengelola izin milik apotek Anda',
  'You can only manage your own pharmacy role permissions': 'Anda hanya dapat mengelola izin peran milik apotek Anda',
  'You can only update your own pharmacy parameters': 'Anda hanya dapat mengubah parameter milik apotek Anda',
  'You can only update your own pharmacy': 'Anda hanya dapat mengubah data apotek Anda sendiri',
}

/**
 * Messages built from templates. `en` replaces the raw message too, because the
 * originals embed internal UUIDs that mean nothing to a cashier.
 */
export const PATTERN_TRANSLATIONS: Array<{ pattern: RegExp; en: (m: RegExpMatchArray) => string; id: (m: RegExpMatchArray) => string }> = [
  {
    pattern: /^This format would give several medicines the same name: (.+)$/,
    en: (m) => `This format would give several medicines the same name: ${m[1]}`,
    id: (m) => `Format ini membuat beberapa obat bernama sama: ${m[1]}. Bedakan dulu (misalnya dengan varian) sebelum mengganti format.`,
  },
  {
    pattern: /^Medicine (shape|type|class) is still used by (\d+) medicine\(s\)$/,
    en: (m) => `This medicine ${m[1]} is still used by ${m[2]} medicine(s)`,
    id: (m) => `Masih dipakai oleh ${m[2]} obat — pindahkan obatnya dulu sebelum menghapus`,
  },
  {
    pattern: /^Allergy warning: (.+)$/,
    en: (m) => `Allergy warning: ${m[1]}. Confirm to continue.`,
    id: (m) => `Peringatan alergi: ${m[1]}. Konfirmasi untuk melanjutkan.`,
  },
  {
    pattern: /^Insufficient stock for (.+): stock changed, please refresh$/,
    en: (m) => `Stock for ${m[1]} just changed. Refresh and try again.`,
    id: (m) => `Stok ${m[1]} baru saja berubah. Muat ulang lalu coba lagi.`,
  },
  {
    pattern: /^Insufficient stock for (.+): (\d+) available$/,
    en: (m) => `Not enough stock for ${m[1]} — only ${m[2]} available`,
    id: (m) => `Stok ${m[1]} tidak cukup — hanya tersedia ${m[2]}`,
  },
  {
    pattern: /^Discount exceeds the (.+)% limit for your role$/,
    en: (m) => `Discount exceeds the ${m[1]}% limit for your role. Ask a pharmacist or the owner.`,
    id: (m) => `Diskon melebihi batas ${m[1]}% untuk peran Anda. Minta bantuan apoteker atau pemilik.`,
  },
  {
    pattern: /^Insufficient stock for (.+)$/,
    en: (m) => (isUuid(m[1]) ? 'Insufficient stock for one of the items' : `Insufficient stock for ${m[1]}`),
    id: (m) => (isUuid(m[1]) ? 'Stok salah satu item tidak mencukupi' : `Stok tidak mencukupi untuk ${m[1]}`),
  },
  {
    pattern: /^Medicine batch (?:is|has) expired: (.+)$/,
    en: (m) => (isUuid(m[1]) ? 'One of the items has expired' : `Expired: ${m[1]}`),
    id: (m) => (isUuid(m[1]) ? 'Salah satu item sudah kedaluwarsa' : `Sudah kedaluwarsa: ${m[1]}`),
  },
  { pattern: /^Stock detail not found: .+$/, en: () => 'One of the stock batches was not found', id: () => 'Salah satu batch stok tidak ditemukan' },
  { pattern: /^Medicine not found: .+$/, en: () => 'One of the medicines was not found', id: () => 'Salah satu obat tidak ditemukan' },
  { pattern: /^Storage bin not found: .+$/, en: () => 'One of the storage bins was not found', id: () => 'Salah satu tempat penyimpanan tidak ditemukan' },
  { pattern: /^Prescription detail not found: .+$/, en: () => 'One of the prescription items was not found', id: () => 'Salah satu item resep tidak ditemukan' },
  { pattern: /^Item already dispensed: .+$/, en: () => 'One of the prescription items was already dispensed', id: () => 'Salah satu item resep sudah diserahkan' },
  { pattern: /^Missing permission: (.+)$/, en: () => 'You do not have permission for this action', id: () => 'Anda tidak memiliki izin untuk tindakan ini' },
  { pattern: /^Cabinet position overlaps with cabinet "(.+)"$/, en: (m) => `Position overlaps with cabinet "${m[1]}"`, id: (m) => `Posisi bertumpuk dengan lemari "${m[1]}"` },
  { pattern: /^Invalid (.+)$/, en: (m) => `Invalid ${m[1]}`, id: (m) => `${m[1]} tidak valid` },
]

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

function isUuid(s: string): boolean {
  return UUID_RE.test(s)
}


export function translateMessage(message: string): { en: string; id: string } | null {
  const exact = EXACT_TRANSLATIONS[message]
  if (exact) return { en: message, id: exact }
  for (const { pattern, en, id } of PATTERN_TRANSLATIONS) {
    const m = message.match(pattern)
    if (m) return { en: en(m), id: id(m) }
  }
  return null
}
