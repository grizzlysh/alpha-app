import { beforeAll, describe, expect, it } from 'vitest'
import { NEW_PASSWORD, PharmacyFixture, addStaff, as, createPharmacy, enter, futureDate } from './helpers'

// One medicine with two batches: the one expiring first must be picked when
// the medicine barcode is scanned (FEFO).
let f: PharmacyFixture
let medicineUuid: string
let cashier: { email: string; uuid: string }
const EAN = '8992772110136'

beforeAll(async () => {
  f = await createPharmacy()
  const pharmacist = await addStaff(f, 'PHARMACIST')
  cashier = await addStaff(f, 'CASHIER')
  await addStaff(f, 'HEAD_PHARMACIST')
  await as(f.owner).post('/api/catalog/import', {
    medicines: [{ name: 'Amlodipin Barcode', unit: 'Strip', shape: 'Tablet', type: 'Obat Bebas', class: 'Antihipertensi', ingredients: ['amlodipine'] }],
  })
  await as(f.owner).post('/api/distributors', { name: 'PT Barcode Farma', phone: '021888' })
  const rows = [
    { medicine: 'Amlodipin Barcode', batchNumber: 'LATE-1', expiryDate: futureDate(2), quantityPieces: 10, purchasePrice: 400, sellingPrice: 600, distributor: 'PT Barcode Farma' },
    { medicine: 'Amlodipin Barcode', batchNumber: 'EARLY-1', expiryDate: futureDate(1), quantityPieces: 8, purchasePrice: 400, sellingPrice: 600, distributor: 'PT Barcode Farma' },
  ]
  const imported = await as(f.owner).post('/api/data-transfer/opening-stock', { signedByUuid: pharmacist.uuid, rows })
  expect(imported.body.data.created).toBe(2)
  medicineUuid = (await as(f.owner).get('/api/medicines?search=Amlodipin Barcode')).body.data[0].uuid
})

describe('medicine barcode', () => {
  it('is saved, searchable and unique among medicines and batches', async () => {
    const saved = await as(f.owner).put(`/api/medicines/${medicineUuid}`, { barcode: EAN })
    expect(saved.status).toBe(200)
    expect(saved.body.data.barcode).toBe(EAN)
    expect((await as(f.owner).get(`/api/medicines?search=${EAN}`)).body.data[0].uuid).toBe(medicineUuid)

    const other = await as(f.owner).post('/api/medicines', {
      name: 'Obat Lain Barcode', unit: 'Strip', barcode: EAN,
      ...(await refs()),
      ingredients: ['x'],
    })
    expect(other.status).toBe(409)

    const batch = (await as(f.owner).get(`/api/stock/details?medicineUuid=${medicineUuid}`)).body.data[0]
    const clash = await as(f.owner).put(`/api/medicines/${medicineUuid}`, { barcode: batch.barcode })
    expect(clash.status).toBe(409)

    expect((await as(f.owner).put(`/api/medicines/${medicineUuid}`, { barcode: 'bad code!' })).status).toBe(422)
  })

  it('a scan finds the exact batch, or the medicine\'s batches earliest expiry first', async () => {
    const token = await enter(cashier.email, NEW_PASSWORD, f.pharmacyUuid)
    const byMedicine = (await as(token).get(`/api/stock/details?barcode=${EAN}`)).body.data
    expect(byMedicine.map((d: { batchNumber: string }) => d.batchNumber.toUpperCase())).toEqual(['EARLY-1', 'LATE-1'])
    expect(byMedicine[0].medicine.barcode).toBe(EAN)

    const late = byMedicine[1]
    const byBatch = (await as(token).get(`/api/stock/details?barcode=${late.barcode}`)).body.data
    expect(byBatch.map((d: { batchNumber: string }) => d.batchNumber.toUpperCase())).toEqual(['LATE-1'])

    expect(byMedicine[0].scanMatch).toBe('MEDICINE')
    expect(byBatch[0].scanMatch).toBe('BATCH')

    // One item of a batch: the batch code plus "-" and the item number.
    const byItem = (await as(token).get(`/api/stock/details?barcode=${late.barcode}-007`)).body.data
    expect(byItem).toHaveLength(1)
    expect(byItem[0]).toMatchObject({ uuid: late.uuid, scanMatch: 'ITEM' })

    expect((await as(token).get('/api/stock/details?barcode=NOPE-404')).body.data).toEqual([])
  })
})

describe('batch label and stock card', () => {
  it('the label carries the batch and the medicine total', async () => {
    const early = (await as(f.owner).get(`/api/stock/details?barcode=${EAN}`)).body.data[0]
    const label = (await as(f.owner).get(`/api/stock/details/${early.uuid}/label`)).body.data
    expect(label.batch.batchNumber.toUpperCase()).toBe('EARLY-1')
    expect(label.medicine.barcode).toBe(EAN)
    expect(label.medicineTotalPieces).toBe(18)
    expect(label.lines).toBeUndefined()
    expect((await as(f.owner).get('/api/stock/details/00000000-0000-4000-8000-000000000000/label')).status).toBe(404)
  })

  it('labels for many batches: by medicine (in-stock batches, earliest expiry first) or by batch', async () => {
    const byMedicine = await as(f.owner).post('/api/stock/labels', { medicineUuids: [medicineUuid] })
    expect(byMedicine.status).toBe(200)
    const batches = byMedicine.body.data.map((l: { batch: { batchNumber: string } }) => l.batch.batchNumber.toUpperCase())
    expect(batches).toEqual(['EARLY-1', 'LATE-1'])
    expect(byMedicine.body.data[0]).toMatchObject({ medicine: { uuid: medicineUuid }, sellingPrice: expect.any(Number) })

    const late = byMedicine.body.data[1].batch.uuid
    const byBatch = (await as(f.owner).post('/api/stock/labels', { stockDetailUuids: [late] })).body.data
    expect(byBatch).toHaveLength(1)
    expect((await as(f.owner).post('/api/stock/labels', {})).status).toBe(422)
    // Another pharmacy's batch is never returned.
    const other = await createPharmacy()
    expect((await as(other.owner).post('/api/stock/labels', { stockDetailUuids: [late] })).body.data).toEqual([])
  })

  it('the medicine card has one row per day over all batches', async () => {
    const token = await enter(cashier.email, NEW_PASSWORD, f.pharmacyUuid)
    const [early, late] = (await as(token).get(`/api/stock/details?barcode=${EAN}`)).body.data
    for (const [uuid, qty] of [[early.uuid, 3], [late.uuid, 2]] as const) {
      const sale = await as(token).post('/api/sales', {
        details: [{ stockDetailUuid: uuid, quantityPieces: qty }],
        paidAmount: 100000,
        payment: { paymentMethod: 'CASH' },
      })
      expect(sale.status).toBe(201)
    }

    const card = (await as(f.owner).get(`/api/stock/medicines/${medicineUuid}/card`)).body.data
    expect(card.totalPieces).toBe(13)
    expect(card.closingBalance).toBe(13)
    expect(card.batches.map((b: { batchNumber: string }) => b.batchNumber.toUpperCase())).toEqual(['EARLY-1', 'LATE-1'])
    // Opening stock and both sales happen today: one row.
    expect(card.days).toHaveLength(1)
    expect(card.days[0]).toMatchObject({ in: 18, out: 5, balance: 13, sales: 2 })
    expect(card.openingBalance).toBe(0)

    // A period before anything happened: no rows, balance 0.
    const old = (await as(f.owner).get(`/api/stock/medicines/${medicineUuid}/card?from=2020-01-01&to=2020-01-31`)).body.data
    expect(old).toMatchObject({ days: [], openingBalance: 0, closingBalance: 0 })

    expect((await as(f.owner).get(`/api/stock/medicines/${medicineUuid}/card?from=2026-02-01&to=2026-01-01`)).status).toBe(422)
    expect((await as(f.owner).get('/api/stock/medicines/00000000-0000-4000-8000-000000000000/card')).status).toBe(404)
  })
})

async function refs(): Promise<Record<string, string>> {
  const m = (await as(f.owner).get(`/api/medicines/${medicineUuid}`)).body.data
  return {
    medicineShapeUuid: m.medicineShape.uuid,
    medicineTypeUuid: m.medicineType.uuid,
    medicineClassUuid: m.medicineClass.uuid,
  }
}
