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

  // ─── Customers ─────────────────────────────────────────────────────────────
  CUSTOMERS_FETCHED: {
    en: 'Customers fetched successfully',
    id: 'Data pelanggan berhasil diambil',
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
    en: 'Maximum number of placements has been reached',
    id: 'Batas maksimal penempatan telah tercapai',
  },
  USER_ALREADY_PLACED_AT_PHARMACY: {
    en: 'User is already placed at this pharmacy',
    id: 'Pengguna sudah ditempatkan di apotek ini',
  },
  PHARMACY_ALREADY_HAS_SIGN_FULL_USER: {
    en: 'Pharmacy already has a user with full signing authority',
    id: 'Apotek sudah memiliki pengguna dengan otoritas tanda tangan penuh',
  },
  PHARMACY_ALREADY_HAS_HEAD_PHARMACIST: {
    en: 'Pharmacy already has a pharmacist in charge',
    id: 'Apotek sudah memiliki apoteker penanggung jawab',
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

}