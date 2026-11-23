import { beforeAll, describe, expect, it } from 'vitest'
import { PharmacyFixture, addStaff, as, createPharmacy, futureDate } from './helpers'

// Narcotics/psychotropics are prescription-only; precursors and obat-obat
// tertentu sold without a prescription are capped per sale; the SIPNAP report
// balances each medicine month by month.
let f: PharmacyFixture
let ootUuid: string
let batchUuid: string

const month = (): string => new Date().toISOString().slice(0, 7)

beforeAll(async () => {
  f = await createPharmacy()
  // Controlled stock is received by the Head Pharmacist.
  const hp = await addStaff(f, 'HEAD_PHARMACIST')
  await as(f.owner).post('/api/catalog/import', {
    medicines: [
      { name: 'Dekstro Kontrol', unit: 'Tablet', shape: 'Tablet', type: 'Obat Bebas', class: 'Antitusif', ingredients: ['dekstrometorfan 15 mg'] },
      { name: 'Kodein Kontrol', unit: 'Tablet', shape: 'Tablet', type: 'Narkotika', class: 'Antitusif', ingredients: ['kodein 10 mg'] },
    ],
  })
  ootUuid = (await as(f.owner).get('/api/medicines?search=Dekstro Kontrol')).body.data[0].uuid
  expect((await as(f.owner).put(`/api/medicines/${ootUuid}`, { orderLetterKind: 'CERTAIN_DRUG' })).status).toBe(200)
  await as(f.owner).post('/api/distributors', { name: 'PT Kontrol Farma', phone: '021999' })
  const row = (medicine: string) => ({ medicine, batchNumber: `B-${medicine.slice(0, 3)}`, expiryDate: futureDate(1), quantityPieces: 30, purchasePrice: 100, sellingPrice: 200, distributor: 'PT Kontrol Farma' })
  const imported = await as(f.owner).post('/api/data-transfer/opening-stock', { signedByUuid: hp.uuid, rows: [row('Dekstro Kontrol'), row('Kodein Kontrol')] })
  expect(imported.body.data.created).toBe(2)
  batchUuid = (await as(f.owner).get(`/api/stock/details?medicineUuid=${ootUuid}`)).body.data[0].uuid
})

const sell = (quantityPieces: number) =>
  as(f.owner).post('/api/sales', {
    details: [{ stockDetailUuid: batchUuid, quantityPieces }],
    paidAmount: 100000,
    payment: { paymentMethod: 'CASH' },
  })

describe('controlled medicines', () => {
  it('narcotics and psychotropics must sit in a prescription-only type', async () => {
    const res = await as(f.owner).put(`/api/medicines/${ootUuid}`, { orderLetterKind: 'NARCOTIC' })
    expect(res.status).toBe(400)
    expect(res.body.message.id).toContain('wajib resep')
  })

  it('caps obat-obat tertentu sold without a prescription', async () => {
    const over = await sell(11)
    expect(over.status).toBe(400)
    expect(over.body.message.id).toContain('Tanpa resep')
    expect((await sell(4)).status).toBe(201)
  })

  it('the SIPNAP report balances each medicine for the month', async () => {
    const oot = (await as(f.owner).get(`/api/reports/controlled?kind=CERTAIN_DRUG&month=${month()}`)).body.data
    expect(oot.rows).toHaveLength(1)
    const r = oot.rows[0]
    expect(r).toMatchObject({ medicineName: 'Dekstro Kontrol', openingBalance: 0, outSales: 4, closingBalance: 26 })
    expect(r.inFromDistributor + r.inOther).toBe(30)

    const narcotic = (await as(f.owner).get('/api/reports/controlled?kind=NARCOTIC')).body.data
    expect(narcotic.rows.map((x: { medicineName: string }) => x.medicineName)).toEqual(['Kodein Kontrol'])
    expect(narcotic.rows[0].closingBalance).toBe(30)

    // An earlier month: nothing had happened yet.
    const before = (await as(f.owner).get('/api/reports/controlled?kind=CERTAIN_DRUG&month=2020-01')).body.data
    expect(before.rows[0]).toMatchObject({ openingBalance: 0, closingBalance: 0, outSales: 0 })

    expect((await as(f.owner).get('/api/reports/controlled?month=2026-13')).status).toBe(422)
  })
})
