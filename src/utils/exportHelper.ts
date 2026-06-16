import ExcelJS from 'exceljs'

export interface ExportColumn<T> {
  header: string
  key: string
  width?: number
  formatter?: (row: T) => string | number | null | undefined
}

export async function buildExcel<T>(
  sheetName: string,
  columns: ExportColumn<T>[],
  rows: T[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetName)

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 20,
  }))

  // Bold header row
  ws.getRow(1).font = { bold: true }

  for (const row of rows) {
    const rowData: Record<string, unknown> = {}
    for (const col of columns) {
      rowData[col.key] = col.formatter
        ? col.formatter(row)
        : (row as Record<string, unknown>)[col.key]
    }
    ws.addRow(rowData)
  }

  return Buffer.from(await wb.xlsx.writeBuffer())
}

export function buildCsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const escape = (val: unknown): string =>
    `"${String(val ?? '').replace(/"/g, '""')}"`

  const headers = columns.map((c) => escape(c.header)).join(',')
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const val = col.formatter
          ? col.formatter(row)
          : (row as Record<string, unknown>)[col.key]
        return escape(val)
      })
      .join(',')
  )
  return [headers, ...dataRows].join('\n')
}
