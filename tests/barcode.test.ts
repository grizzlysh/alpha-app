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

    expect((await as(token).get('/api/stock/details?barcode=NOPE-404')).body.data).toEqual([])
  })
})

describe('stock card', () => {
  it('lists each movement with its document and a running balance', async () => {
    const token = await enter(cashier.email, NEW_PASSWORD, f.pharmacyUuid)
    const early = (await as(token).get(`/api/stock/details?barcode=${EAN}`)).body.data[0]
    const sale = await as(token).post('/api/sales', {
      details: [{ stockDetailUuid: early.uuid, quantityPieces: 3 }],
      paidAmount: 100000,
      payment: { paymentMethod: 'CASH' },
    })
    expect(sale.status).toBe(201)

    const card = (await as(f.owner).get(`/api/stock/details/${early.uuid}/card`)).body.data
    expect(card.batch.batchNumber.toUpperCase()).toBe('EARLY-1')
    expect(card.batch.quantityPieces).toBe(5)
    expect(card.medicine.barcode).toBe(EAN)
    const last = card.lines[card.lines.length - 1]
    expect(last).toMatchObject({ type: 'OUT', quantity: 3, balance: 5, documentNumber: sale.body.data.saleNumber })
    expect(card.lines[0]).toMatchObject({ type: 'IN', balance: 8 })
    expect(card.openingBalance).toBe(0)

    expect((await as(f.owner).get('/api/stock/details/00000000-0000-4000-8000-000000000000/card')).status).toBe(404)
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
