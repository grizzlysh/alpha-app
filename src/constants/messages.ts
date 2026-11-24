import { MessageCode } from './messageCodes'

interface BilingualMessage {
  en: string
  id: string
}

export const MESSAGES: Record<MessageCode, BilingualMessage> = {

  // ─── Auth ──────────────────────────────────────────────────────────────────
  LOGIN_SUCCESS: {
    en: 'Login successful',
    id: 'Login berhasil',
  },
  LOGOUT_SUCCESS: {
    en: 'Logout successful',
    id: 'Logout berhasil',
  },
  TOKEN_REFRESHED: {
    en: 'Token refreshed successfully',
    id: 'Token berhasil diperbarui',
  },
  PHARMACY_SELECTED: {
    en: 'Pharmacy selected successfully',
    id: 'Apotek berhasil dipilih',
  },
  PHARMACY_NOT_SELECTED: {
    en: 'Please select a pharmacy first',
    id: 'Silakan pilih apotek terlebih dahulu',
  },
  ME_FETCHED: {
    en: 'Profile fetched successfully',
    id: 'Data profil berhasil diambil',
  },
  UNAUTHORIZED: {
    en: 'Unauthorized',
    id: 'Tidak terautentikasi',
  },
  INVALID_CREDENTIALS: {
    en: 'Invalid email or password',
    id: 'Email atau kata sandi salah',
  },
  TOKEN_EXPIRED: {
    en: 'Token has expired',
    id: 'Token telah kadaluarsa',
  },
  TOKEN_INVALID: {
    en: 'Invalid token',
    id: 'Token tidak valid',
  },

  // ─── Common errors ─────────────────────────────────────────────────────────
  FORBIDDEN: {
    en: 'Forbidden',
    id: 'Akses ditolak',
  },
  NOT_FOUND: {
    en: 'Resource not found',
    id: 'Data tidak ditemukan',
  },
  VALIDATION_ERROR: {
    en: 'Validation failed',
    id: 'Validasi gagal',
  },
  INTERNAL_SERVER_ERROR: {
    en: 'Internal server error',
    id: 'Terjadi kesalahan pada server',
  },
  PHARMACY_CONTEXT_REQUIRED: {
    en: 'Pharmacy context is required',
    id: 'Konteks apotek diperlukan',
  },
  CONFLICT: {
    en: 'Resource already exists',
    id: 'Data sudah ada',
  },
  INTERNAL_ERROR: {
    en: 'Internal server error',
    id: 'Terjadi kesalahan pada server',
  },
  TOO_MANY_REQUESTS: {
    en: 'Too many requests, please try again later',
    id: 'Terlalu banyak permintaan, coba lagi nanti',
  },

  // ─── Medicines ─────────────────────────────────────────────────────────────
  MEDICINES_FETCHED: {
    en: 'Medicines fetched successfully',
    id: 'Data obat berhasil diambil',
  },
  MEDICINE_FETCHED: {
    en: 'Medicine fetched successfully',
    id: 'Data obat berhasil diambil',
  },
  MEDICINE_CREATED: {
    en: 'Medicine created successfully',
    id: 'Obat berhasil dibuat',
  },
  MEDICINE_UPDATED: {
    en: 'Medicine updated successfully',
    id: 'Obat berhasil diperbarui',
  },
  MEDICINE_DELETED: {
    en: 'Medicine deleted successfully',
    id: 'Obat berhasil dihapus',
  },
  MEDICINE_NOT_FOUND: {
    en: 'Medicine not found',
    id: 'Obat tidak ditemukan',
  },
  MEDICINE_ALREADY_EXISTS: {
    en: 'Medicine already exists',
    id: 'Obat sudah ada',
  },

  // ─── Distributors ──────────────────────────────────────────────────────────
  DISTRIBUTORS_FETCHED: {
    en: 'Distributors fetched successfully',
    id: 'Data distributor berhasil diambil',
  },
  DISTRIBUTOR_FETCHED: {
    en: 'Distributor fetched successfully',
    id: 'Data distributor berhasil diambil',
  },
  DISTRIBUTOR_CREATED: {
    en: 'Distributor created successfully',
    id: 'Distributor berhasil dibuat',
  },
  DISTRIBUTOR_UPDATED: {
    en: 'Distributor updated successfully',
    id: 'Distributor berhasil diperbarui',
  },
  DISTRIBUTOR_DELETED: {
    en: 'Distributor deleted successfully',
    id: 'Distributor berhasil dihapus',
  },
  DISTRIBUTOR_NOT_FOUND: {
    en: 'Distributor not found',
    id: 'Distributor tidak ditemukan',
  },

  // ─── parties ──────────────────────────────────────────────────────────────
  CUSTOMERS_FETCHED: {
    en: 'Customers fetched successfully',
    id: 'Data pelanggan berhasil diambil',
  },
  DATA_EXPORTED: {
    en: 'Data exported',
    id: 'Data berhasil diekspor',
  },
  DATA_IMPORT_PREVIEWED: {
    en: 'Import checked',
    id: 'Impor sudah diperiksa',
  },
  DATA_IMPORTED: {
    en: 'Data imported',
    id: 'Data berhasil diimpor',
  },
  CATALOG_EXPORTED: {
    en: 'Medicine catalog exported',
    id: 'Daftar obat berhasil diekspor',
  },
  CATALOG_IMPORT_PREVIEWED: {
    en: 'Import checked',
    id: 'Impor sudah diperiksa',
  },
  CATALOG_IMPORTED: {
    en: 'Medicine catalog imported',
    id: 'Daftar obat berhasil diimpor',
  },
  CUSTOMER_PURCHASES_FETCHED: {
    en: 'Purchase history retrieved',
    id: 'Riwayat pembelian berhasil diambil',
  },
  CUSTOMER_FETCHED: {
    en: 'Customer fetched successfully',
    id: 'Data pelanggan berhasil diambil',
  },
  CUSTOMER_CREATED: {
    en: 'Customer created successfully',
    id: 'Pelanggan berhasil dibuat',
  },
  CUSTOMER_UPDATED: {
    en: 'Customer updated successfully',
    id: 'Pelanggan berhasil diperbarui',
  },
  CUSTOMER_DELETED: {
    en: 'Customer deleted successfully',
    id: 'Pelanggan berhasil dihapus',
  },
  CUSTOMER_NOT_FOUND: {
    en: 'Customer not found',
    id: 'Pelanggan tidak ditemukan',
  },

  // ─── Medicine shapes ───────────────────────────────────────────────────────
  MEDICINE_SHAPES_FETCHED: {
    en: 'Medicine shapes fetched successfully',
    id: 'Data bentuk obat berhasil diambil',
  },
  MEDICINE_SHAPE_FETCHED: {
    en: 'Medicine shape fetched successfully',
    id: 'Data bentuk obat berhasil diambil',
  },
  MEDICINE_SHAPE_CREATED: {
    en: 'Medicine shape created successfully',
    id: 'Bentuk obat berhasil dibuat',
  },
  MEDICINE_SHAPE_UPDATED: {
    en: 'Medicine shape updated successfully',
    id: 'Bentuk obat berhasil diperbarui',
  },
  MEDICINE_SHAPE_DELETED: {
    en: 'Medicine shape deleted successfully',
    id: 'Bentuk obat berhasil dihapus',
  },
  MEDICINE_SHAPE_NOT_FOUND: {
    en: 'Medicine shape not found',
    id: 'Bentuk obat tidak ditemukan',
  },

  // ─── Medicine types ────────────────────────────────────────────────────────
  MEDICINE_TYPES_FETCHED: {
    en: 'Medicine types fetched successfully',
    id: 'Data jenis obat berhasil diambil',
  },
  MEDICINE_TYPE_FETCHED: {
    en: 'Medicine type fetched successfully',
    id: 'Data jenis obat berhasil diambil',
  },
  MEDICINE_TYPE_CREATED: {
    en: 'Medicine type created successfully',
    id: 'Jenis obat berhasil dibuat',
  },
  MEDICINE_TYPE_UPDATED: {
    en: 'Medicine type updated successfully',
    id: 'Jenis obat berhasil diperbarui',
  },
  MEDICINE_TYPE_DELETED: {
    en: 'Medicine type deleted successfully',
    id: 'Jenis obat berhasil dihapus',
  },
  MEDICINE_TYPE_NOT_FOUND: {
    en: 'Medicine type not found',
    id: 'Jenis obat tidak ditemukan',
  },

  // ─── Medicine classes ──────────────────────────────────────────────────────
  MEDICINE_CLASSES_FETCHED: {
    en: 'Medicine classes fetched successfully',
    id: 'Data kelas obat berhasil diambil',
  },
  MEDICINE_CLASS_FETCHED: {
    en: 'Medicine class fetched successfully',
    id: 'Data kelas obat berhasil diambil',
  },
  MEDICINE_CLASS_CREATED: {
    en: 'Medicine class created successfully',
    id: 'Kelas obat berhasil dibuat',
  },
  MEDICINE_CLASS_UPDATED: {
    en: 'Medicine class updated successfully',
    id: 'Kelas obat berhasil diperbarui',
  },
  MEDICINE_CLASS_DELETED: {
    en: 'Medicine class deleted successfully',
    id: 'Kelas obat berhasil dihapus',
  },
  MEDICINE_CLASS_NOT_FOUND: {
    en: 'Medicine class not found',
    id: 'Kelas obat tidak ditemukan',
  },

  // ─── Purchase orders ───────────────────────────────────────────────────────
  PURCHASE_ORDERS_FETCHED: {
    en: 'Purchase orders fetched successfully',
    id: 'Data purchase order berhasil diambil',
  },
  PURCHASE_ORDER_FETCHED: {
    en: 'Purchase order fetched successfully',
    id: 'Data purchase order berhasil diambil',
  },
  PURCHASE_ORDER_CREATED: {
    en: 'Purchase order created successfully',
    id: 'Purchase order berhasil dibuat',
  },
  PURCHASE_ORDER_UPDATED: {
    en: 'Purchase order updated successfully',
    id: 'Purchase order berhasil diperbarui',
  },
  PURCHASE_ORDER_DELETED: {
    en: 'Purchase order deleted successfully',
    id: 'Purchase order berhasil dihapus',
  },
  PURCHASE_ORDER_PRINT_FETCHED: {
    en: 'Purchase order print data fetched successfully',
    id: 'Data cetak purchase order berhasil diambil',
  },
  PURCHASE_ORDER_SUBMITTED: {
    en: 'Purchase order submitted successfully',
    id: 'Purchase order berhasil diajukan',
  },
  PURCHASE_ORDER_COMPLETED: {
    en: 'Purchase order completed successfully',
    id: 'Purchase order berhasil diselesaikan',
  },
  PURCHASE_ORDER_CANCELLED: {
    en: 'Purchase order cancelled successfully',
    id: 'Purchase order berhasil dibatalkan',
  },
  PURCHASE_ORDER_NOT_FOUND: {
    en: 'Purchase order not found',
    id: 'Purchase order tidak ditemukan',
  },

  // ─── Invoices ──────────────────────────────────────────────────────────────
  INVOICES_FETCHED: {
    en: 'Invoices fetched successfully',
    id: 'Data invoice berhasil diambil',
  },
  INVOICE_FETCHED: {
    en: 'Invoice fetched successfully',
    id: 'Data invoice berhasil diambil',
  },
  INVOICE_CREATED: {
    en: 'Invoice created successfully',
    id: 'Invoice berhasil dibuat',
  },
  INVOICE_DELETED: {
    en: 'Invoice deleted successfully',
    id: 'Invoice berhasil dihapus',
  },
  INVOICE_PAYMENT_FETCHED: {
    en: 'Invoice payment fetched successfully',
    id: 'Data pembayaran invoice berhasil diambil',
  },
  INVOICE_PAYMENT_ADDED: {
    en: 'Invoice payment added successfully',
    id: 'Pembayaran invoice berhasil ditambahkan',
  },
  INVOICE_PAYMENT_HISTORY_UPDATED: {
    en: 'Payment record updated successfully',
    id: 'Data pembayaran berhasil diperbarui',
  },
  INVOICE_PAYMENT_HISTORY_DELETED: {
    en: 'Payment record reversed successfully',
    id: 'Data pembayaran berhasil dibatalkan',
  },
  INVOICE_NOT_FOUND: {
    en: 'Invoice not found',
    id: 'Invoice tidak ditemukan',
  },

  // ─── Stock ─────────────────────────────────────────────────────────────────
  STOCKS_FETCHED: {
    en: 'Stocks fetched successfully',
    id: 'Data stok berhasil diambil',
  },
  STOCK_FETCHED: {
    en: 'Stock fetched successfully',
    id: 'Data stok berhasil diambil',
  },
  STOCK_DETAIL_FETCHED: {
    en: 'Stock detail fetched successfully',
    id: 'Detail stok berhasil diambil',
  },
  STOCK_CATALOG_FETCHED: {
    en: 'Stock catalog fetched successfully',
    id: 'Katalog stok berhasil diambil',
  },
  STOCK_MOVEMENTS_FETCHED: {
    en: 'Stock movements fetched successfully',
    id: 'Data pergerakan stok berhasil diambil',
  },
  STOCK_MOVEMENT_FETCHED: {
    en: 'Stock movement fetched successfully',
    id: 'Detail pergerakan stok berhasil diambil',
  },
  STOCK_ALERTS_FETCHED: {
    en: 'Stock alerts fetched successfully',
    id: 'Peringatan stok berhasil diambil',
  },
  STOCK_ADJUSTED: {
    en: 'Stock adjusted successfully',
    id: 'Stok berhasil disesuaikan',
  },
  STOCK_PRICE_UPDATED: {
    en: 'Stock price updated successfully',
    id: 'Harga stok berhasil diperbarui',
  },
  STOCK_NOT_FOUND: {
    en: 'Stock not found',
    id: 'Stok tidak ditemukan',
  },
  STOCK_UPDATED: {
    en: 'Stock updated successfully',
    id: 'Stok berhasil diperbarui',
  },
  STOCK_INSUFFICIENT: {
    en: 'Insufficient stock',
    id: 'Stok tidak mencukupi',
  },

  // ─── Sales ─────────────────────────────────────────────────────────────────
  SALES_FETCHED: {
    en: 'Sales fetched successfully',
    id: 'Data penjualan berhasil diambil',
  },
  SALE_FETCHED: {
    en: 'Sale fetched successfully',
    id: 'Data penjualan berhasil diambil',
  },
  SALE_CREATED: {
    en: 'Sale created successfully',
    id: 'Penjualan berhasil dibuat',
  },
  SALE_UPDATED: {
    en: 'Sale updated successfully',
    id: 'Penjualan berhasil diperbarui',
  },
  SALE_COMPLETED: {
    en: 'Sale completed successfully',
    id: 'Penjualan berhasil diselesaikan',
  },
  SALE_CANCELLED: {
    en: 'Sale cancelled successfully',
    id: 'Penjualan berhasil dibatalkan',
  },
  SALE_REFUNDED: {
    en: 'Sale refunded successfully',
    id: 'Penjualan berhasil direfund',
  },
  SALE_PAYMENT_FETCHED: {
    en: 'Sale payment fetched successfully',
    id: 'Data pembayaran penjualan berhasil diambil',
  },
  SALE_PAYMENT_ADDED: {
    en: 'Payment added successfully',
    id: 'Pembayaran berhasil ditambahkan',
  },
  SALE_PAYMENT_HISTORY_UPDATED: {
    en: 'Payment record updated successfully',
    id: 'Data pembayaran berhasil diperbarui',
  },
  SALE_PAYMENT_HISTORY_DELETED: {
    en: 'Payment record reversed successfully',
    id: 'Data pembayaran berhasil dibatalkan',
  },
  SALE_NOT_FOUND: {
    en: 'Sale not found',
    id: 'Penjualan tidak ditemukan',
  },

  // ─── Stock returns ─────────────────────────────────────────────────────────
  STOCK_RETURNS_FETCHED: {
    en: 'Stock returns fetched successfully',
    id: 'Data retur stok berhasil diambil',
  },
  STOCK_RETURN_FETCHED: {
    en: 'Stock return fetched successfully',
    id: 'Data retur stok berhasil diambil',
  },
  STOCK_RETURN_CREATED: {
    en: 'Stock return created successfully',
    id: 'Retur stok berhasil dibuat',
  },
  STOCK_RETURN_UPDATED: {
    en: 'Stock return updated successfully',
    id: 'Retur stok berhasil diperbarui',
  },
  STOCK_RETURN_DELETED: {
    en: 'Stock return deleted successfully',
    id: 'Retur stok berhasil dihapus',
  },
  STOCK_RETURN_COMPLETED: {
    en: 'Stock return completed successfully',
    id: 'Retur stok berhasil diselesaikan',
  },
  STOCK_RETURN_REJECTED: {
    en: 'Stock return rejected successfully',
    id: 'Retur stok berhasil ditolak',
  },
  STOCK_RETURN_CANCELLED: {
    en: 'Stock return cancelled successfully',
    id: 'Retur stok berhasil dibatalkan',
  },
  STOCK_RETURN_NOT_FOUND: {
    en: 'Stock return not found',
    id: 'Retur stok tidak ditemukan',
  },

  // ─── Stock disposals ───────────────────────────────────────────────────────
  STOCK_DISPOSALS_FETCHED: {
    en: 'Stock disposals fetched successfully',
    id: 'Data pemusnahan stok berhasil diambil',
  },
  STOCK_DISPOSAL_FETCHED: {
    en: 'Stock disposal fetched successfully',
    id: 'Data pemusnahan stok berhasil diambil',
  },
  STOCK_DISPOSAL_CREATED: {
    en: 'Stock disposal created successfully',
    id: 'Pemusnahan stok berhasil dibuat',
  },
  STOCK_DISPOSAL_UPDATED: {
    en: 'Stock disposal updated successfully',
    id: 'Pemusnahan stok berhasil diperbarui',
  },
  STOCK_DISPOSAL_DELETED: {
    en: 'Stock disposal deleted successfully',
    id: 'Pemusnahan stok berhasil dihapus',
  },
  STOCK_DISPOSAL_SUBMITTED: {
    en: 'Stock disposal submitted successfully',
    id: 'Pemusnahan stok berhasil diajukan',
  },
  STOCK_DISPOSAL_COMPLETED: {
    en: 'Stock disposal completed successfully',
    id: 'Pemusnahan stok berhasil diselesaikan',
  },
  STOCK_DISPOSAL_CANCELLED: {
    en: 'Stock disposal cancelled successfully',
    id: 'Pemusnahan stok berhasil dibatalkan',
  },
  STOCK_DISPOSAL_NOT_FOUND: {
    en: 'Stock disposal not found',
    id: 'Pemusnahan stok tidak ditemukan',
  },

  // ─── Permissions ───────────────────────────────────────────────────────────
  PERMISSIONS_FETCHED: {
    en: 'Permissions fetched successfully',
    id: 'Data izin berhasil diambil',
  },
  PERMISSION_FETCHED: {
    en: 'Permission fetched successfully',
    id: 'Data izin berhasil diambil',
  },
  PERMISSION_NOT_FOUND: {
    en: 'Permission not found',
    id: 'Izin tidak ditemukan',
  },

  // ─── Roles ─────────────────────────────────────────────────────────────────
  ROLES_FETCHED: {
    en: 'Roles fetched successfully',
    id: 'Data peran berhasil diambil',
  },
  ROLE_FETCHED: {
    en: 'Role fetched successfully',
    id: 'Data peran berhasil diambil',
  },
  ROLE_CREATED: {
    en: 'Role created successfully',
    id: 'Peran berhasil dibuat',
  },
  ROLE_UPDATED: {
    en: 'Role updated successfully',
    id: 'Peran berhasil diperbarui',
  },
  ROLE_DELETED: {
    en: 'Role deleted successfully',
    id: 'Peran berhasil dihapus',
  },
  ROLE_PERMISSIONS_UPDATED: {
    en: 'Role permissions updated successfully',
    id: 'Izin peran berhasil diperbarui',
  },
  ROLE_NOT_FOUND: {
    en: 'Role not found',
    id: 'Peran tidak ditemukan',
  },
  CANNOT_ASSIGN_OWNER_ROLE: {
    en: 'Only platform admin can assign the owner role',
    id: 'Hanya platform admin yang dapat menetapkan peran pemilik',
  },
  ROLE_NAME_ALREADY_EXISTS: {
    en: 'Role name already exists',
    id: 'Nama peran sudah ada',
  },
  ROLE_IN_USE: {
    en: 'Role is currently in use and cannot be deleted',
    id: 'Peran sedang digunakan dan tidak dapat dihapus',
  },
  ONE_OR_MORE_PERMISSIONS_NOT_FOUND: {
    en: 'One or more permissions not found',
    id: 'Satu atau lebih izin tidak ditemukan',
  },
  ONLY_PLATFORM_ADMIN_CAN_CREATE_GLOBAL_ROLE: {
    en: 'Only platform admin can create global roles',
    id: 'Hanya admin platform yang dapat membuat peran global',
  },
  ONLY_PLATFORM_ADMIN_CAN_UPDATE_GLOBAL_ROLE: {
    en: 'Only platform admin can update global roles',
    id: 'Hanya admin platform yang dapat memperbarui peran global',
  },
  ONLY_PLATFORM_ADMIN_CAN_DELETE_GLOBAL_ROLE: {
    en: 'Only platform admin can delete global roles',
    id: 'Hanya admin platform yang dapat menghapus peran global',
  },
  ONLY_PLATFORM_ADMIN_CAN_MANAGE_GLOBAL_ROLE_PERMISSIONS: {
    en: 'Only platform admin can manage global role permissions',
    id: 'Hanya admin platform yang dapat mengelola izin peran global',
  },

  // ─── Me ────────────────────────────────────────────────────────────────────
  ME_UPDATED: {
    en: 'Profile updated successfully',
    id: 'Profil berhasil diperbarui',
  },
  PASSWORD_CHANGED: {
    en: 'Password changed successfully',
    id: 'Kata sandi berhasil diubah',
  },
  PASSWORD_RESET: {
    en: 'Password reset successfully',
    id: 'Kata sandi berhasil direset',
  },
  CURRENT_PASSWORD_INCORRECT: {
    en: 'Current password is incorrect',
    id: 'Kata sandi saat ini salah',
  },
  NEW_PASSWORD_MUST_BE_DIFFERENT: {
    en: 'New password must be different from the current password',
    id: 'Kata sandi baru harus berbeda dari kata sandi saat ini',
  },

  // ─── Users ─────────────────────────────────────────────────────────────────
  USERS_FETCHED: {
    en: 'Users fetched successfully',
    id: 'Data pengguna berhasil diambil',
  },
  USER_FETCHED: {
    en: 'User fetched successfully',
    id: 'Data pengguna berhasil diambil',
  },
  USER_CREATED: {
    en: 'User created successfully',
    id: 'Pengguna berhasil dibuat',
  },
  USER_UPDATED: {
    en: 'User updated successfully',
    id: 'Pengguna berhasil diperbarui',
  },
  USER_DELETED: {
    en: 'User deleted successfully',
    id: 'Pengguna berhasil dihapus',
  },
  USER_NOT_FOUND: {
    en: 'User not found',
    id: 'Pengguna tidak ditemukan',
  },
  USER_HAS_ACTIVE_PLACEMENTS: {
    en: 'User has active placements and cannot be deleted',
    id: 'Pengguna memiliki penempatan aktif dan tidak dapat dihapus',
  },
  CANNOT_DELETE_YOURSELF: {
    en: 'You cannot delete your own account',
    id: 'Tidak dapat menghapus akun sendiri',
  },
  EMAIL_ALREADY_EXISTS: {
    en: 'Email address is already in use',
    id: 'Alamat email sudah digunakan',
  },
  EMAIL_BELONGS_TO_DELETED_USER: {
    en: 'This email belonged to a deleted account and cannot be reused. Use another email.',
    id: 'Email ini pernah dipakai akun yang sudah dihapus dan tidak bisa dipakai lagi. Gunakan email lain.',
  },
  DEFAULT_PASSWORD_NOT_CONFIGURED: {
    en: 'Default password has not been configured',
    id: 'Kata sandi default belum dikonfigurasi',
  },

  // ─── Placements ────────────────────────────────────────────────────────────
  PLACEMENTS_FETCHED: {
    en: 'Placements fetched successfully',
    id: 'Data penempatan berhasil diambil',
  },
  PLACEMENT_FETCHED: {
    en: 'Placement fetched successfully',
    id: 'Data penempatan berhasil diambil',
  },
  PLACEMENT_CREATED: {
    en: 'Placement created successfully',
    id: 'Penempatan berhasil dibuat',
  },
  PLACEMENT_UPDATED: {
    en: 'Placement updated successfully',
    id: 'Penempatan berhasil diperbarui',
  },
  PLACEMENT_DELETED: {
    en: 'Placement deleted successfully',
    id: 'Penempatan berhasil dihapus',
  },
  PLACEMENT_NOT_FOUND: {
    en: 'Placement not found',
    id: 'Penempatan tidak ditemukan',
  },
  MAX_PLACEMENTS_REACHED: {
    en: 'This person already works at 3 pharmacies. End one placement first.',
    id: 'Orang ini sudah bertugas di 3 apotek. Akhiri salah satu penempatannya dulu.',
  },
  USER_ALREADY_PLACED_AT_PHARMACY: {
    en: 'User is already placed at this pharmacy',
    id: 'Pengguna sudah ditempatkan di apotek ini',
  },
  PHARMACY_ALREADY_HAS_HEAD_PHARMACIST: {
    en: 'This pharmacy already has a Head Pharmacist. Unmark the current one first.',
    id: 'Apotek ini sudah memiliki Head Pharmacist. Lepaskan penanda Head Pharmacist yang lama terlebih dahulu.',
  },
  PHARMACY_NO_HEAD_PHARMACIST: {
    en: 'This pharmacy does not have a Head Pharmacist yet. Please contact the pharmacy owner.',
    id: 'Apotek ini belum memiliki Head Pharmacist. Silakan hubungi pemilik apotek.',
  },
  PLACEMENT_DATE_OVERLAP: {
    en: 'Placement dates overlap with an existing tenure at this pharmacy',
    id: 'Tanggal penempatan bertumpang tindih dengan masa tugas yang sudah ada di apotek ini',
  },
  LICENSE_REQUIRED_FOR_ROLE: {
    en: 'A practice license is required for this role',
    id: 'SIPA wajib diisi untuk peran ini',
  },

  // ─── Licenses ──────────────────────────────────────────────────────────────
  LICENSES_FETCHED: {
    en: 'Licenses fetched successfully',
    id: 'Data lisensi berhasil diambil',
  },
  LICENSE_FETCHED: {
    en: 'License fetched successfully',
    id: 'Data lisensi berhasil diambil',
  },
  LICENSE_CREATED: {
    en: 'License created successfully',
    id: 'Lisensi berhasil dibuat',
  },
  LICENSE_UPDATED: {
    en: 'License updated successfully',
    id: 'Lisensi berhasil diperbarui',
  },
  LICENSE_DELETED: {
    en: 'License deleted successfully',
    id: 'Lisensi berhasil dihapus',
  },
  LICENSE_NOT_FOUND: {
    en: 'License not found',
    id: 'Lisensi tidak ditemukan',
  },
  LICENSE_NUMBER_ALREADY_EXISTS: {
    en: 'License number already exists',
    id: 'Nomor lisensi sudah ada',
  },

  // ─── Business Licenses ─────────────────────────────────────────────────────
  BUSINESS_LICENSES_FETCHED: {
    en: 'Business licenses fetched successfully',
    id: 'Data SIA berhasil diambil',
  },
  BUSINESS_LICENSE_FETCHED: {
    en: 'Business license fetched successfully',
    id: 'Data SIA berhasil diambil',
  },
  BUSINESS_LICENSE_CREATED: {
    en: 'Business license created successfully',
    id: 'SIA berhasil dibuat',
  },
  BUSINESS_LICENSE_UPDATED: {
    en: 'Business license updated successfully',
    id: 'SIA berhasil diperbarui',
  },
  BUSINESS_LICENSE_DELETED: {
    en: 'Business license deleted successfully',
    id: 'SIA berhasil dihapus',
  },
  BUSINESS_LICENSE_NOT_FOUND: {
    en: 'Business license not found',
    id: 'SIA tidak ditemukan',
  },
  BUSINESS_LICENSE_NUMBER_ALREADY_EXISTS: {
    en: 'Business license number already exists for this pharmacy',
    id: 'Nomor SIA sudah ada untuk apotek ini',
  },

  // ─── Practice Licenses ──────────────────────────────────────────────────────
  PRACTICE_LICENSES_FETCHED: {
    en: 'Practice licenses fetched successfully',
    id: 'Data SIPA berhasil diambil',
  },
  PRACTICE_LICENSE_FETCHED: {
    en: 'Practice license fetched successfully',
    id: 'Data SIPA berhasil diambil',
  },
  PRACTICE_LICENSE_CREATED: {
    en: 'Practice license created successfully',
    id: 'SIPA berhasil dibuat',
  },
  PRACTICE_LICENSE_UPDATED: {
    en: 'Practice license updated successfully',
    id: 'SIPA berhasil diperbarui',
  },
  PRACTICE_LICENSE_DELETED: {
    en: 'Practice license deleted successfully',
    id: 'SIPA berhasil dihapus',
  },
  PRACTICE_LICENSE_NOT_FOUND: {
    en: 'Practice license not found',
    id: 'SIPA tidak ditemukan',
  },
  PRACTICE_LICENSE_NUMBER_ALREADY_EXISTS: {
    en: 'Practice license number already exists for this placement',
    id: 'Nomor SIPA sudah ada untuk penempatan ini',
  },
  PRACTICE_LICENSE_PLACEMENT_NOT_FOUND: {
    en: 'Placement not found',
    id: 'Penempatan tidak ditemukan',
  },

  // ─── Reports ───────────────────────────────────────────────────────────────
  REPORT_SALES_FETCHED: {
    en: 'Sales report fetched successfully',
    id: 'Laporan penjualan berhasil diambil',
  },
  REPORT_PURCHASES_FETCHED: {
    en: 'Purchase report fetched successfully',
    id: 'Laporan pembelian berhasil diambil',
  },
  REPORT_INVENTORY_FETCHED: {
    en: 'Inventory report fetched successfully',
    id: 'Laporan inventori berhasil diambil',
  },
  REPORT_STOCK_MOVEMENTS_FETCHED: {
    en: 'Stock movement report fetched successfully',
    id: 'Laporan pergerakan stok berhasil diambil',
  },
  REPORT_DISPOSALS_FETCHED: {
    en: 'Disposal report fetched successfully',
    id: 'Laporan pemusnahan berhasil diambil',
  },
  REPORT_RETURNS_FETCHED: {
    en: 'Return report fetched successfully',
    id: 'Laporan retur berhasil diambil',
  },

  // ─── Storage ───────────────────────────────────────────────────────────────
  STORAGE_CABINETS_FETCHED: {
    en: 'Storage cabinets fetched successfully',
    id: 'Data lemari penyimpanan berhasil diambil',
  },
  STORAGE_CABINET_FETCHED: {
    en: 'Storage cabinet fetched successfully',
    id: 'Data lemari penyimpanan berhasil diambil',
  },
  STORAGE_CABINET_CREATED: {
    en: 'Storage cabinet created successfully',
    id: 'Lemari penyimpanan berhasil dibuat',
  },
  STORAGE_CABINET_UPDATED: {
    en: 'Storage cabinet updated successfully',
    id: 'Lemari penyimpanan berhasil diperbarui',
  },
  STORAGE_CABINET_DELETED: {
    en: 'Storage cabinet deleted successfully',
    id: 'Lemari penyimpanan berhasil dihapus',
  },
  STORAGE_CABINET_NOT_FOUND: {
    en: 'Storage cabinet not found',
    id: 'Lemari penyimpanan tidak ditemukan',
  },
  STORAGE_CABINET_CODE_EXISTS: {
    en: 'A cabinet with this code already exists',
    id: 'Lemari dengan kode ini sudah ada',
  },
  STORAGE_CABINET_HAS_SHELVES: {
    en: 'Cabinet cannot be deleted because it has shelves',
    id: 'Lemari tidak dapat dihapus karena masih memiliki rak',
  },

  STORAGE_SHELVES_FETCHED: {
    en: 'Storage shelves fetched successfully',
    id: 'Data rak penyimpanan berhasil diambil',
  },
  STORAGE_SHELF_FETCHED: {
    en: 'Storage shelf fetched successfully',
    id: 'Data rak penyimpanan berhasil diambil',
  },
  STORAGE_SHELF_CREATED: {
    en: 'Storage shelf created successfully',
    id: 'Rak penyimpanan berhasil dibuat',
  },
  STORAGE_SHELF_UPDATED: {
    en: 'Storage shelf updated successfully',
    id: 'Rak penyimpanan berhasil diperbarui',
  },
  STORAGE_SHELF_DELETED: {
    en: 'Storage shelf deleted successfully',
    id: 'Rak penyimpanan berhasil dihapus',
  },
  STORAGE_SHELF_NOT_FOUND: {
    en: 'Storage shelf not found',
    id: 'Rak penyimpanan tidak ditemukan',
  },
  STORAGE_SHELF_CODE_EXISTS: {
    en: 'A shelf with this code already exists in this cabinet',
    id: 'Rak dengan kode ini sudah ada di lemari ini',
  },
  STORAGE_SHELF_HAS_BINS: {
    en: 'Shelf cannot be deleted because it has bins',
    id: 'Rak tidak dapat dihapus karena masih memiliki bin',
  },

  STORAGE_BINS_FETCHED: {
    en: 'Storage bins fetched successfully',
    id: 'Data bin penyimpanan berhasil diambil',
  },
  STORAGE_BIN_FETCHED: {
    en: 'Storage bin fetched successfully',
    id: 'Data bin penyimpanan berhasil diambil',
  },
  STORAGE_BIN_CREATED: {
    en: 'Storage bin created successfully',
    id: 'Bin penyimpanan berhasil dibuat',
  },
  STORAGE_BIN_UPDATED: {
    en: 'Storage bin updated successfully',
    id: 'Bin penyimpanan berhasil diperbarui',
  },
  STORAGE_BIN_DELETED: {
    en: 'Storage bin deleted successfully',
    id: 'Bin penyimpanan berhasil dihapus',
  },
  STORAGE_BIN_NOT_FOUND: {
    en: 'Storage bin not found',
    id: 'Bin penyimpanan tidak ditemukan',
  },
  STORAGE_BIN_CODE_EXISTS: {
    en: 'A bin with this code already exists on this shelf',
    id: 'Bin dengan kode ini sudah ada di rak ini',
  },
  STORAGE_BIN_IN_USE: {
    en: 'Bin cannot be deleted because it is assigned to medicines or stock batches',
    id: 'Bin tidak dapat dihapus karena masih digunakan oleh obat atau batch stok',
  },

  // ─── Doctors ───────────────────────────────────────────────────────────────
  DOCTORS_FETCHED: {
    en: 'Doctors fetched successfully',
    id: 'Data dokter berhasil diambil',
  },
  DOCTOR_FETCHED: {
    en: 'Doctor fetched successfully',
    id: 'Data dokter berhasil diambil',
  },
  DOCTOR_CREATED: {
    en: 'Doctor created successfully',
    id: 'Dokter berhasil ditambahkan',
  },
  DOCTOR_UPDATED: {
    en: 'Doctor updated successfully',
    id: 'Dokter berhasil diperbarui',
  },
  DOCTOR_DELETED: {
    en: 'Doctor deleted successfully',
    id: 'Dokter berhasil dihapus',
  },
  DOCTOR_NOT_FOUND: {
    en: 'Doctor not found',
    id: 'Dokter tidak ditemukan',
  },
  DOCTOR_LICENSE_EXISTS: {
    en: 'A doctor with this license number already exists',
    id: 'Dokter dengan nomor SIP ini sudah terdaftar',
  },
  DOCTOR_USER_ALREADY_LINKED: {
    en: 'This user account is already linked to a doctor profile',
    id: 'Akun pengguna ini sudah terhubung ke profil dokter',
  },
  DOCTOR_HAS_PRESCRIPTIONS: {
    en: 'Doctor cannot be deleted because they have prescriptions',
    id: 'Dokter tidak dapat dihapus karena masih memiliki resep',
  },

  // ─── Prescriptions ─────────────────────────────────────────────────────────
  PRESCRIPTIONS_FETCHED: {
    en: 'Prescriptions fetched successfully',
    id: 'Data resep berhasil diambil',
  },
  PRESCRIPTION_FETCHED: {
    en: 'Prescription fetched successfully',
    id: 'Data resep berhasil diambil',
  },
  PRESCRIPTION_CREATED: {
    en: 'Prescription created successfully',
    id: 'Resep berhasil ditambahkan',
  },
  PRESCRIPTION_UPDATED: {
    en: 'Prescription updated successfully',
    id: 'Resep berhasil diperbarui',
  },
  PRESCRIPTION_DELETED: {
    en: 'Prescription deleted successfully',
    id: 'Resep berhasil dihapus',
  },
  PRESCRIPTION_DISPENSED: {
    en: 'Prescription dispensed successfully',
    id: 'Resep berhasil dilayani',
  },
  PRESCRIPTION_CANCELLED: {
    en: 'Prescription cancelled successfully',
    id: 'Resep berhasil dibatalkan',
  },
  PRESCRIPTION_NOT_FOUND: {
    en: 'Prescription not found',
    id: 'Resep tidak ditemukan',
  },
  PRESCRIPTION_ALREADY_DISPENSED: {
    en: 'Prescription has already been fully dispensed',
    id: 'Resep sudah sepenuhnya dilayani',
  },
  PRESCRIPTION_ALREADY_CANCELLED: {
    en: 'Prescription has already been cancelled',
    id: 'Resep sudah dibatalkan',
  },
  PRESCRIPTION_CANNOT_EDIT: {
    en: 'Only pending prescriptions can be edited',
    id: 'Hanya resep dengan status menunggu yang dapat diedit',
  },
  PRESCRIPTION_CANNOT_DELETE: {
    en: 'Only pending prescriptions can be deleted',
    id: 'Hanya resep dengan status menunggu yang dapat dihapus',
  },
  PRESCRIPTION_NO_ITEMS_TO_DISPENSE: {
    en: 'No pending items to dispense in this prescription',
    id: 'Tidak ada item yang perlu dilayani pada resep ini',
  },

  // ─── Medical Records ───────────────────────────────────────────────────────
  MEDICAL_RECORD_FETCHED: {
    en: 'Medical record fetched successfully',
    id: 'Rekam medis berhasil diambil',
  },
  MEDICAL_RECORD_UPDATED: {
    en: 'Medical record updated successfully',
    id: 'Rekam medis berhasil diperbarui',
  },
  MEDICAL_RECORD_NOT_FOUND: {
    en: 'Medical record not found',
    id: 'Rekam medis tidak ditemukan',
  },
  MEDICAL_RECORD_PATIENT_ONLY: {
    en: 'Medical records are only available for patients',
    id: 'Rekam medis hanya tersedia untuk pasien',
  },
  MEDICAL_VISITS_FETCHED: {
    en: 'Medical visits fetched successfully',
    id: 'Data kunjungan berhasil diambil',
  },
  MEDICAL_VISIT_FETCHED: {
    en: 'Medical visit fetched successfully',
    id: 'Data kunjungan berhasil diambil',
  },
  MEDICAL_VISIT_CREATED: {
    en: 'Medical visit created successfully',
    id: 'Kunjungan berhasil ditambahkan',
  },
  MEDICAL_VISIT_UPDATED: {
    en: 'Medical visit updated successfully',
    id: 'Kunjungan berhasil diperbarui',
  },
  MEDICAL_VISIT_DELETED: {
    en: 'Medical visit deleted successfully',
    id: 'Kunjungan berhasil dihapus',
  },
  MEDICAL_VISIT_NOT_FOUND: {
    en: 'Medical visit not found',
    id: 'Kunjungan tidak ditemukan',
  },
  MEDICAL_ALLERGY_CREATED: {
    en: 'Allergy record added successfully',
    id: 'Data alergi berhasil ditambahkan',
  },
  MEDICAL_ALLERGY_DELETED: {
    en: 'Allergy record removed successfully',
    id: 'Data alergi berhasil dihapus',
  },
  EXAMINATION_QUEUE_FETCHED: {
    en: 'Examination queue fetched',
    id: 'Antrean pemeriksaan berhasil diambil',
  },
  EXAMINATION_FETCHED: {
    en: 'Examination fetched',
    id: 'Data pemeriksaan berhasil diambil',
  },
  EXAMINATION_CHECKED_IN: {
    en: 'Patient added to the queue',
    id: 'Pasien berhasil didaftarkan ke antrean',
  },
  EXAMINATION_STARTED: {
    en: 'Examination started',
    id: 'Pemeriksaan dimulai',
  },
  EXAMINATION_TRIAGED: {
    en: 'Vital signs saved',
    id: 'Tanda vital berhasil disimpan',
  },
  EXAMINATION_SAVED: {
    en: 'Examination saved',
    id: 'Pemeriksaan berhasil disimpan',
  },
  EXAMINATION_COMPLETED: {
    en: 'Examination completed',
    id: 'Pemeriksaan selesai',
  },
  EXAMINATION_CANCELLED: {
    en: 'Examination cancelled',
    id: 'Pemeriksaan dibatalkan',
  },
  EXAMINATION_ALLERGY_CHECKED: {
    en: 'Allergy check done',
    id: 'Pengecekan alergi selesai',
  },
  MEDICAL_ALLERGY_UPDATED: {
    en: 'Allergy record updated successfully',
    id: 'Data alergi berhasil diperbarui',
  },
  MEDICAL_ALLERGY_NOT_FOUND: {
    en: 'Allergy record not found',
    id: 'Data alergi tidak ditemukan',
  },

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  DASHBOARD_FETCHED: {
    en: 'Dashboard data fetched successfully',
    id: 'Data dashboard berhasil diambil',
  },
  DASHBOARD_ADVANCED_FETCHED: {
    en: 'Advanced dashboard data fetched successfully',
    id: 'Data dashboard lanjutan berhasil diambil',
  },

  // ─── Pharmacies ────────────────────────────────────────────────────────────
  PHARMACIES_FETCHED: {
    en: 'Pharmacies fetched successfully',
    id: 'Data apotek berhasil diambil',
  },
  PHARMACY_FETCHED: {
    en: 'Pharmacy fetched successfully',
    id: 'Data apotek berhasil diambil',
  },
  PHARMACY_CREATED: {
    en: 'Pharmacy created successfully',
    id: 'Apotek berhasil dibuat',
  },
  PHARMACY_UPDATED: {
    en: 'Pharmacy updated successfully',
    id: 'Apotek berhasil diperbarui',
  },
  PHARMACY_DELETED: {
    en: 'Pharmacy deleted successfully',
    id: 'Apotek berhasil dihapus',
  },
  PHARMACY_NOT_FOUND: {
    en: 'Pharmacy not found',
    id: 'Apotek tidak ditemukan',
  },
  PHARMACY_CODE_ALREADY_EXISTS: {
    en: 'Pharmacy code already exists',
    id: 'Kode apotek sudah ada',
  },
  PHARMACY_PARAMETERS_FETCHED: {
    en: 'Pharmacy parameters fetched successfully',
    id: 'Parameter apotek berhasil diambil',
  },
  PHARMACY_PARAMETERS_UPDATED: {
    en: 'Pharmacy parameters updated successfully',
    id: 'Parameter apotek berhasil diperbarui',
  },

  INVENTORY_TREE_FETCHED: {
    en: 'Inventory tree fetched successfully',
    id: 'Struktur inventaris berhasil diambil',
  },
  INVENTORY_BIN_ITEMS_FETCHED: {
    en: 'Bin items fetched successfully',
    id: 'Isi bin berhasil diambil',
  },
  INVENTORY_CABINET_POSITION_UPDATED: {
    en: 'Cabinet position updated successfully',
    id: 'Posisi lemari berhasil diperbarui',
  },

  PLACEMENT_REQUIRED: {
    en: 'A placement in your pharmacy is required to create a user',
    id: 'Penempatan di apotek Anda wajib diisi untuk membuat pengguna',
  },
  PLACEMENT_OUTSIDE_PHARMACY: {
    en: 'You can only manage placements in your own pharmacy',
    id: 'Anda hanya dapat mengelola penempatan di apotek Anda sendiri',
  },
  ROLE_NOT_IN_PHARMACY: {
    en: 'This role does not belong to the selected pharmacy',
    id: 'Peran ini bukan milik apotek yang dipilih',
  },
  PLATFORM_USER_CANNOT_OWN_PHARMACY: {
    en: 'A platform account cannot be a pharmacy owner',
    id: 'Akun platform tidak bisa dijadikan pemilik apotek',
  },
  PASSWORD_CHANGE_REQUIRED: {
    en: 'Please replace your temporary password first',
    id: 'Ganti kata sandi sementara Anda terlebih dahulu',
  },
  USER_INACTIVE: {
    en: 'This account is inactive',
    id: 'Akun ini tidak aktif',
  },
  CANNOT_MANAGE_PLATFORM_USER: {
    en: 'Only a platform admin can modify platform accounts',
    id: 'Hanya platform admin yang dapat mengubah akun platform',
  },
  CANNOT_MANAGE_OWNER: {
    en: "Only the pharmacy owner can modify the owner's account",
    id: 'Hanya pemilik apotek yang dapat mengubah akun pemilik',
  },
  CANNOT_MODIFY_OWN_PLACEMENT: {
    en: 'You cannot change your own role, status, or placement',
    id: 'Anda tidak dapat mengubah peran, status, atau penempatan Anda sendiri',
  },
  CANNOT_CHANGE_OWN_STATUS: {
    en: 'You cannot change your own account status',
    id: 'Anda tidak dapat mengubah status akun Anda sendiri',
  },
  USER_HAS_OTHER_PHARMACIES: {
    en: 'This user also works at other pharmacies. End their placement here instead.',
    id: 'Pengguna ini juga bekerja di apotek lain. Akhiri penempatannya di apotek ini saja.',
  },
  CANNOT_RESET_OWN_PASSWORD: {
    en: 'Use "Change password" in your profile to change your own password',
    id: 'Gunakan "Ubah kata sandi" di profil untuk mengganti kata sandi Anda sendiri',
  },
  CANNOT_GRANT_UNHELD_PERMISSION: {
    en: 'You cannot grant permissions that you do not have yourself',
    id: 'Anda tidak dapat memberikan izin yang tidak Anda miliki sendiri',
  },
  INVALID_JSON: {
    en: 'The request data is malformed. Please refresh the page and try again.',
    id: 'Format data yang dikirim tidak valid. Muat ulang halaman lalu coba lagi.',
  },
  PAYLOAD_TOO_LARGE: {
    en: 'The data sent is too large',
    id: 'Data yang dikirim terlalu besar',
  },
  INVALID_REQUEST: {
    en: 'The request could not be processed. Please check the input and try again.',
    id: 'Permintaan tidak dapat diproses. Periksa kembali isian lalu coba lagi.',
  },
  DUPLICATE_ENTRY: {
    en: 'This data already exists',
    id: 'Data ini sudah ada',
  },
  RECORD_IN_USE: {
    en: 'This data is still used by other records and cannot be changed or deleted',
    id: 'Data ini masih dipakai oleh data lain sehingga tidak dapat diubah atau dihapus',
  },
  CONCURRENT_UPDATE: {
    en: 'This data was changed by someone else at the same time. Please try again.',
    id: 'Data ini sedang diubah oleh pengguna lain pada saat yang sama. Silakan coba lagi.',
  },
  SERVER_BUSY: {
    en: 'The server is busy. Please wait a moment and try again.',
    id: 'Server sedang sibuk. Tunggu sebentar lalu coba lagi.',
  },
  DATABASE_UNAVAILABLE: {
    en: 'Cannot connect to the database. Please try again shortly.',
    id: 'Tidak dapat terhubung ke database. Silakan coba beberapa saat lagi.',
  },
  PRICE_OVERRIDE_NOT_ALLOWED: {
    en: "You don't have permission to change the price. Ask a pharmacist or the owner.",
    id: "Anda tidak memiliki izin mengubah harga. Minta bantuan apoteker atau pemilik.",
  },
  GRAND_TOTAL_MUST_BE_POSITIVE: {
    en: "The total must be greater than 0",
    id: "Total harus lebih dari 0",
  },
  REQUEST_IN_PROGRESS: {
    en: "This request is still being processed. Please wait a moment.",
    id: "Permintaan ini masih diproses. Mohon tunggu sebentar.",
  },

  // ── Notifications ──────────────────────────────
  NOTIFICATIONS_FETCHED: {
    en: "Notifications retrieved successfully",
    id: "Notifikasi berhasil diambil",
  },
  NOTIFICATION_MARKED_READ: {
    en: "Notification marked as read",
    id: "Notifikasi ditandai sudah dibaca",
  },
  NOTIFICATIONS_ALL_MARKED_READ: {
    en: "All notifications marked as read",
    id: "Semua notifikasi ditandai sudah dibaca",
  },
  NOTIFICATION_NOT_FOUND: {
    en: "Notification not found",
    id: "Notifikasi tidak ditemukan",
  },

  // ── Background jobs ────────────────────────────
  JOBS_FETCHED: {
    en: "Background jobs retrieved successfully",
    id: "Daftar job latar belakang berhasil diambil",
  },
  JOB_RUNS_FETCHED: {
    en: "Job runs retrieved successfully",
    id: "Riwayat job berhasil diambil",
  },
  JOB_RUN_FINISHED: {
    en: "Job run finished",
    id: "Job selesai dijalankan",
  },
  JOB_NOT_FOUND: {
    en: "Background job not found",
    id: "Job latar belakang tidak ditemukan",
  },
}