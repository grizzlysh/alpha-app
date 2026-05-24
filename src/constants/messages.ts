// src/constants/messages.ts
import { MessageCode } from './messageCodes'

interface BilingualMessage {
  en: string
  id: string
}

export const MESSAGES: Record<MessageCode, BilingualMessage> = {
  // general
  SUCCESS: {
    en: 'Success',
    id: 'Berhasil'
  },
  CREATED: {
    en: 'Created successfully',
    id: 'Berhasil dibuat'
  },
  UPDATED: {
    en: 'Updated successfully',
    id: 'Berhasil diperbarui'
  },
  DELETED: {
    en: 'Deleted successfully',
    id: 'Berhasil dihapus'
  },
  VALIDATION_ERROR: {
    en: 'Validation failed',
    id: 'Validasi gagal'
  },
  NOT_FOUND: {
    en: 'Resource not found',
    id: 'Data tidak ditemukan'
  },
  UNAUTHORIZED: {
    en: 'Unauthorized',
    id: 'Tidak terautentikasi'
  },
  FORBIDDEN: {
    en: 'Forbidden',
    id: 'Akses ditolak'
  },
  CONFLICT: {
    en: 'Resource already exists',
    id: 'Data sudah ada'
  },
  INTERNAL_ERROR: {
    en: 'Internal server error',
    id: 'Terjadi kesalahan pada server'
  },
  TOO_MANY_REQUESTS: {
    en: 'Too many requests, please try again later',
    id: 'Terlalu banyak permintaan, coba lagi nanti',
  },
  PHARMACY_NOT_SELECTED: {
    en: 'Please select a pharmacy first',
    id: 'Silakan pilih apotek terlebih dahulu',
  },

  // auth
  LOGIN_SUCCESS: {
    en: 'Login successful',
    id: 'Login berhasil'
  },
  LOGOUT_SUCCESS: {
    en: 'Logout successful',
    id: 'Logout berhasil'
  },
  INVALID_CREDENTIALS: {
    en: 'Invalid email or password',
    id: 'Email atau kata sandi salah'
  },
  TOKEN_EXPIRED: {
    en: 'Token has expired',
    id: 'Token telah kadaluarsa'
  },
  TOKEN_INVALID: {
    en: 'Invalid token',
    id: 'Token tidak valid'
  },

  // medicine shapes
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

  // medicine types
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
  
  // medicine classes
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

  // medicines
  MEDICINE_FETCHED: {
    en: 'Medicine fetched successfully',
    id: 'Data obat berhasil diambil'
  },
  MEDICINES_FETCHED: {
    en: 'Medicines fetched successfully',
    id: 'Data obat berhasil diambil'
  },
  MEDICINE_CREATED: {
    en: 'Medicine created successfully',
    id: 'Obat berhasil dibuat'
  },
  MEDICINE_UPDATED: {
    en: 'Medicine updated successfully',
    id: 'Obat berhasil diperbarui'
  },
  MEDICINE_DELETED: {
    en: 'Medicine deleted successfully',
    id: 'Obat berhasil dihapus'
  },
  MEDICINE_NOT_FOUND: {
    en: 'Medicine not found',
    id: 'Obat tidak ditemukan'
  },
  MEDICINE_ALREADY_EXISTS: {
    en: 'Medicine already exists',
    id: 'Obat sudah ada'
  },

  // distributors
  DISTRIBUTOR_FETCHED: {
    en: 'Distributor fetched successfully',
    id: 'Data distributor berhasil diambil'
  },
  DISTRIBUTORS_FETCHED: {
    en: 'Distributors fetched successfully',
    id: 'Data distributor berhasil diambil'
  },
  DISTRIBUTOR_CREATED: {
    en: 'Distributor created successfully',
    id: 'Distributor berhasil dibuat'
  },
  DISTRIBUTOR_UPDATED: {
    en: 'Distributor updated successfully',
    id: 'Distributor berhasil diperbarui'
  },
  DISTRIBUTOR_DELETED: {
    en: 'Distributor deleted successfully',
    id: 'Distributor berhasil dihapus'
  },
  DISTRIBUTOR_NOT_FOUND: {
    en: 'Distributor not found',
    id: 'Distributor tidak ditemukan'
  },

  // purchase orders
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
  PURCHASE_ORDER_SUBMITTED: {
    en: 'Purchase order submitted successfully',
    id: 'Purchase order berhasil disubmit',
  },
  PURCHASE_ORDER_CANCELLED: {
    en: 'Purchase order cancelled successfully',
    id: 'Purchase order berhasil dibatalkan',
  },
  PURCHASE_ORDER_DELETED: {
    en: 'Purchase order deleted successfully',
    id: 'Purchase order berhasil dihapus',
  },
  PURCHASE_ORDER_NOT_FOUND: {
    en: 'Purchase order not found',
    id: 'Purchase order tidak ditemukan',
  },

  // invoices
  INVOICE_FETCHED: {
    en: 'Invoice fetched successfully',
    id: 'Data invoice berhasil diambil'
  },
  INVOICES_FETCHED: {
    en: 'Invoices fetched successfully',
    id: 'Data invoice berhasil diambil'
  },
  INVOICE_CREATED: {
    en: 'Invoice created successfully',
    id: 'Invoice berhasil dibuat'
  },
  INVOICE_UPDATED: {
    en: 'Invoice updated successfully',
    id: 'Invoice berhasil diperbarui'
  },
  INVOICE_DELETED: {
    en: 'Invoice deleted successfully',
    id: 'Invoice berhasil dihapus'
  },
  INVOICE_NOT_FOUND: {
    en: 'Invoice not found',
    id: 'Invoice tidak ditemukan'
  },
  INVOICE_VERIFIED: {
    en: 'Invoice verified successfully',
    id: 'Invoice berhasil diverifikasi'
  },

  // sales
  SALE_FETCHED: {
    en: 'Sale fetched successfully',
    id: 'Data penjualan berhasil diambil'
  },
  SALES_FETCHED: {
    en: 'Sales fetched successfully',
    id: 'Data penjualan berhasil diambil'
  },
  SALE_CREATED: {
    en: 'Sale created successfully',
    id: 'Penjualan berhasil dibuat'
  },
  SALE_UPDATED: {
    en: 'Sale updated successfully',
    id: 'Penjualan berhasil diperbarui'
  },
  SALE_DELETED: {
    en: 'Sale deleted successfully',
    id: 'Penjualan berhasil dihapus'
  },
  SALE_NOT_FOUND: {
    en: 'Sale not found',
    id: 'Penjualan tidak ditemukan'
  },

  // stock
  STOCK_FETCHED: {
    en: 'Stock fetched successfully',
    id: 'Data stok berhasil diambil'
  },
  STOCK_ADJUSTED: {
    en: 'Stock adjusted successfully',
    id: 'Stok berhasil disesuaikan'
  },
  STOCK_NOT_FOUND: {
    en: 'Stock not found',
    id: 'Stok tidak ditemukan'
  },
  STOCK_INSUFFICIENT: {
    en: 'Insufficient stock',
    id: 'Stok tidak mencukupi'
  },
  STOCK_RETURN_CREATED: {
    en: 'Stock return created successfully',
    id: 'Retur stok berhasil dibuat'
  },
  STOCK_DISPOSAL_CREATED: {
    en: 'Stock disposal created successfully',
    id: 'Pemusnahan stok berhasil dibuat'
  },

  // customers
  CUSTOMER_FETCHED: {
    en: 'Customer fetched successfully',
    id: 'Data pelanggan berhasil diambil',
  },
  CUSTOMERS_FETCHED: {
    en: 'Customers fetched successfully',
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
}