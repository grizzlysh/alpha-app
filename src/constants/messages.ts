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
  STOCK_MOVEMENTS_FETCHED: {
    en: 'Stock movements fetched successfully',
    id: 'Data pergerakan stok berhasil diambil',
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