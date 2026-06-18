import fs from 'fs'
import path from 'path'
import { DateTime } from 'luxon'
import ExcelJS from 'exceljs'
import {
  getSalesExportRows,
  getPurchaseReport,
  getInventoryReport,
  getStockMovementReport,
  getDisposalReport,
  getReturnReport,
} from './reports.service'
import {
  SalesExportRow,
  PurchaseInvoiceRow,
  InventoryStockLevel,
  InventoryExpiryAlert,
  StockMovementRow,
  DisposalDetailRow,
  ReturnDetailRow,
} from './reports.interface'
import { ExportColumn, buildExcel } from '@utils/exportHelper'

// ── Types ─────────────────────────────────────────────────────

export type ReportType =
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'stock-movements'
  | 'disposals'
  | 'returns'

export interface GeneratedReportMeta {
  filePath: string
  filename: string
  type: ReportType
  dateFrom: Date
  dateTo: Date
  generatedAt: Date
}

// ── Storage ───────────────────────────────────────────────────

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'reports')

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function buildFilename(type: ReportType, dateFrom: Date, dateTo: Date): string {
  const from = DateTime.fromJSDate(dateFrom).toFormat('yyyyMMdd')
  const to = DateTime.fromJSDate(dateTo).toFormat('yyyyMMdd')
  return `${type}-${from}-${to}.xlsx`
}

async function saveBuffer(pharmacyId: number, filename: string, buffer: Buffer): Promise<string> {
  const dir = path.join(STORAGE_ROOT, `pharmacy-${pharmacyId}`)
  ensureDir(dir)
  const filePath = path.join(dir, filename)
  await fs.promises.writeFile(filePath, buffer)
  return filePath
}

// ── Column definitions ────────────────────────────────────────

const salesColumns: ExportColumn<SalesExportRow>[] = [
  { header: 'Sale Number',    key: 'saleNumber',     width: 22 },
  { header: 'Date',           key: 'soldAt',         width: 20 },
  { header: 'Customer',       key: 'customerName',   width: 25 },
  { header: 'Type',           key: 'saleType',       width: 12 },
  { header: 'Status',         key: 'status',         width: 14 },
  { header: 'Subtotal',         key: 'totalAmount',        width: 16 },
  { header: 'Discount %',       key: 'discountPercentage', width: 12 },
  { header: 'Discount Amount',  key: 'discountAmount',     width: 16 },
  { header: 'PPN Amount',       key: 'ppnAmount',          width: 14 },
  { header: 'Grand Total',      key: 'grandTotal',         width: 16 },
  { header: 'Paid Amount',      key: 'paidAmount',         width: 14 },
  { header: 'Payment Status', key: 'paymentStatus',  width: 16 },
]

const purchaseColumns: ExportColumn<PurchaseInvoiceRow>[] = [
  { header: 'Invoice Number',  key: 'invoiceNumber',       width: 22 },
  { header: 'Invoice Date',    key: 'invoiceDate',         width: 18,
    formatter: (r) => DateTime.fromJSDate(r.invoiceDate).toFormat('yyyy-MM-dd') },
  { header: 'Distributor',     key: 'distributorName',     width: 25 },
  { header: 'PO Number',       key: 'purchaseOrderNumber', width: 22 },
  { header: 'Total Amount',    key: 'totalAmount',         width: 16 },
  { header: 'Paid Amount',     key: 'paidAmount',          width: 14 },
  { header: 'Payment Status',  key: 'paymentStatus',       width: 16 },
]

const stockLevelColumns: ExportColumn<InventoryStockLevel>[] = [
  { header: 'Medicine',      key: 'medicineName',  width: 30 },
  { header: 'Unit',          key: 'unit',          width: 10 },
  { header: 'Total Pieces',  key: 'totalPieces',   width: 14 },
  { header: 'Reorder Level', key: 'reorderLevel',  width: 14 },
  { header: 'Low Stock',     key: 'isLowStock',    width: 12,
    formatter: (r) => r.isLowStock ? 'Yes' : 'No' },
  { header: 'Base Price',    key: 'basePrice',     width: 14 },
  { header: 'Selling Price', key: 'sellingPrice',  width: 14 },
]

const expiryColumns: ExportColumn<InventoryExpiryAlert>[] = [
  { header: 'Medicine',          key: 'medicineName',    width: 30 },
  { header: 'Batch Number',      key: 'batchNumber',     width: 18 },
  { header: 'Expiry Date',       key: 'expiryDate',      width: 14,
    formatter: (r) => DateTime.fromJSDate(r.expiryDate).toFormat('yyyy-MM-dd') },
  { header: 'Days Until Expiry', key: 'daysUntilExpiry', width: 18 },
  { header: 'Qty Pieces',        key: 'quantityPieces',  width: 12 },
  { header: 'Distributor',       key: 'distributorName', width: 25 },
]

const movementColumns: ExportColumn<StockMovementRow>[] = [
  { header: 'Date',        key: 'createdAt',      width: 20,
    formatter: (r) => DateTime.fromJSDate(r.createdAt).toFormat('yyyy-MM-dd HH:mm') },
  { header: 'Medicine',    key: 'medicineName',   width: 30 },
  { header: 'Type',        key: 'type',           width: 8 },
  { header: 'Reason',      key: 'reason',         width: 14 },
  { header: 'Quantity',    key: 'quantity',       width: 10 },
  { header: 'Qty Before',  key: 'quantityBefore', width: 12 },
  { header: 'Qty After',   key: 'quantityAfter',  width: 12 },
  { header: 'Batch',       key: 'batchNumber',    width: 18 },
  { header: 'Reference',   key: 'referenceNumber',width: 22 },
  { header: 'Description', key: 'description',   width: 30 },
]

const disposalColumns: ExportColumn<DisposalDetailRow>[] = [
  { header: 'Disposal Number', key: 'disposalNumber', width: 22 },
  { header: 'Disposed At',     key: 'disposedAt',     width: 18,
    formatter: (r) => r.disposedAt ? DateTime.fromJSDate(r.disposedAt).toFormat('yyyy-MM-dd') : '-' },
  { header: 'Medicine',        key: 'medicineName',   width: 30 },
  { header: 'Batch Number',    key: 'batchNumber',    width: 18 },
  { header: 'Qty Pieces',      key: 'quantityPieces', width: 12 },
  { header: 'Reason',          key: 'reason',         width: 16 },
  { header: 'Status',          key: 'status',         width: 14 },
]

const returnColumns: ExportColumn<ReturnDetailRow>[] = [
  { header: 'Return Number', key: 'returnNumber',   width: 22 },
  { header: 'Returned At',   key: 'returnedAt',     width: 18,
    formatter: (r) => r.returnedAt ? DateTime.fromJSDate(r.returnedAt).toFormat('yyyy-MM-dd') : '-' },
  { header: 'Distributor',   key: 'distributorName',width: 25 },
  { header: 'Medicine',      key: 'medicineName',   width: 30 },
  { header: 'Batch Number',  key: 'batchNumber',    width: 18 },
  { header: 'Qty Pieces',    key: 'quantityPieces', width: 12 },
  { header: 'Reason',        key: 'reason',         width: 25 },
  { header: 'Status',        key: 'status',         width: 14 },
]

// ── Builders ──────────────────────────────────────────────────

async function buildInventoryExcel(pharmacyId: number): Promise<Buffer> {
  const report = await getInventoryReport(pharmacyId, { expiryDays: 30 })

  const wb = new ExcelJS.Workbook()

  const wsStock = wb.addWorksheet('Stock Levels')
  wsStock.columns = stockLevelColumns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }))
  wsStock.getRow(1).font = { bold: true }
  for (const row of report.stockLevels) {
    const rd: Record<string, unknown> = {}
    for (const col of stockLevelColumns) {
      rd[col.key] = col.formatter ? col.formatter(row) : (row as unknown as Record<string, unknown>)[col.key]
    }
    wsStock.addRow(rd)
  }

  const wsExpiry = wb.addWorksheet('Expiry Alerts')
  wsExpiry.columns = expiryColumns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }))
  wsExpiry.getRow(1).font = { bold: true }
  for (const row of [...report.expiringSoon, ...report.expired]) {
    const rd: Record<string, unknown> = {}
    for (const col of expiryColumns) {
      rd[col.key] = col.formatter ? col.formatter(row) : (row as unknown as Record<string, unknown>)[col.key]
    }
    wsExpiry.addRow(rd)
  }

  return Buffer.from(await wb.xlsx.writeBuffer())
}

// ── Main entry point (called by cronjob) ─────────────────────

export async function generateReport(
  pharmacyId: number,
  type: ReportType,
  dateFrom: Date,
  dateTo: Date
): Promise<GeneratedReportMeta> {
  const query = { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() }

  let buffer: Buffer

  switch (type) {
    case 'sales': {
      const rows = await getSalesExportRows(pharmacyId, query)
      buffer = await buildExcel('Sales', salesColumns, rows)
      break
    }
    case 'purchases': {
      const report = await getPurchaseReport(pharmacyId, query)
      buffer = await buildExcel('Purchases', purchaseColumns, report.invoiceList)
      break
    }
    case 'inventory': {
      buffer = await buildInventoryExcel(pharmacyId)
      break
    }
    case 'stock-movements': {
      const report = await getStockMovementReport(pharmacyId, query)
      buffer = await buildExcel('Stock Movements', movementColumns, report.movements)
      break
    }
    case 'disposals': {
      const report = await getDisposalReport(pharmacyId, query)
      buffer = await buildExcel('Disposals', disposalColumns, report.disposals)
      break
    }
    case 'returns': {
      const report = await getReturnReport(pharmacyId, query)
      buffer = await buildExcel('Returns', returnColumns, report.returns)
      break
    }
  }

  const filename = buildFilename(type, dateFrom, dateTo)
  const filePath = await saveBuffer(pharmacyId, filename, buffer)

  return {
    filePath,
    filename,
    type,
    dateFrom,
    dateTo,
    generatedAt: new Date(),
  }
}
