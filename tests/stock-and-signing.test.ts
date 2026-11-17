import { beforeAll, describe, expect, it } from 'vitest'
import { NEW_PASSWORD, PharmacyFixture, addStaff, as, createPharmacy, enter, futureDate } from './helpers'

// One pharmacy with a Head Pharmacist, a Pharmacist, a Cashier and an Admin,
// two medicines (one controlled) and a distributor.
let f: PharmacyFixture
let hp: { email: string; uuid: string }
let pharmacist: { email: string; uuid: string }
let cashier: { email: string; uuid: string }
let admin: { email: string; uuid: string }
let distributorUuid: string
let regularUuid: string
let controlledUuid: string

beforeAll(async () => {
  f = await createPharmacy()
  hp = await addStaff(f, 'HEAD_PHARMACIST')
  pharmacist = await addStaff(f, 'PHARMACIST')
  cashier = await addStaff(f, 'CASHIER')
  admin = await addStaff(f, 'ADMIN')
  await as(f.owner).post('/api/catalog/import', {
    medicines: [
      { name: 'Paracetamol Tes', unit: 'Strip', shape: 'Tablet', type: 'Obat Bebas', class: 'Analgesik & Antipiretik', ingredients: ['paracetamol'] },
      { name: 'Kodein Tes', unit: 'Strip', shape: 'Tablet', type: 'Narkotika', class: 'Obat Batuk & Flu', ingredients: ['codeine'] },
    ],
  })
  const meds = (await as(f.owner).get('/api/medicines?search=Tes')).body.data
  regularUuid = meds.find((m: { name: string }) => m.name === 'Paracetamol Tes').uuid
  controlledUuid = meds.find((m: { name: string }) => m.name === 'Kodein Tes').uuid
  const dist = await as(f.owner).post('/api/distributors', { name: 'PT Tes Farma', phone: '021555' })
  distributorUuid = dist.body.data.uuid
})

const po = (signedByUuid: string, medicineUuid: string) =>
  as(f.owner).post('/api/purchase-orders', { distributorUuid, signedByUuid, details: [{ medicineUuid, quantity: 1, unit: 'box' }] })

describe('document signing', () => {
  it('lists only licensed pharmacists as signers', async () => {
    const res = await as(f.owner).get('/api/users/signers?level=PHARMACIST')
    const emails = res.body.data.map((u: { email: string }) => u.email).sort()
    expect(emails).toEqual([hp.email, pharmacist.email].sort())
    const head = await as(f.owner).get('/api/users/signers?level=HEAD_PHARMACIST')
    expect(head.body.data.map((u: { email: string }) => u.email)).toEqual([hp.email])
  })

  it('a Pharmacist signs a regular order; a controlled one needs the Head Pharmacist', async () => {
    expect((await po(pharmacist.uuid, regularUuid)).status).toBe(201)
    expect((await po(pharmacist.uuid, controlledUuid)).status).toBe(403)
    expect((await po(hp.uuid, controlledUuid)).status).toBe(201)
  })

  it('an owner without a license cannot sign', async () => {
    const owner = (await as(f.owner).get(`/api/users?search=${f.ownerEmail}`)).body.data[0]
    expect((await po(owner.uuid, regularUuid)).status).toBe(403)
  })
})

describe('Admin is office staff', () => {
  it('manages purchasing but not people, pricing or the POS', async () => {
    const token = await enter(admin.email, NEW_PASSWORD, f.pharmacyUuid)
    expect((await as(token).get('/api/users')).status).toBe(403)
    expect((await as(token).get('/api/users/signers?level=PHARMACIST')).status).toBe(200)
    expect((await as(token).post('/api/purchase-orders', { distributorUuid, details: [{ medicineUuid: regularUuid, quantity: 1, unit: 'box' }] })).status).toBe(201)
    const margin = (await as(token).get('/api/business-parameters?search=MARGIN')).body.data[0]
    expect((await as(token).put(`/api/business-parameters/${margin.uuid}`, { value: '25' })).status).toBe(403)
    expect((await as(token).post('/api/sales', {})).status).toBe(403)
  })
})

describe('opening stock, sale and invoice deletion', () => {
  it('imports opening stock as a paid receipt and skips it on re-import', async () => {
    const rows = [
      { medicine: 'paracetamol tes', batchNumber: 'OPEN-1', expiryDate: futureDate(), quantityPieces: 20, purchasePrice: 400, sellingPrice: 600, distributor: 'PT Tes Farma' },
      { medicine: 'Tidak Ada', batchNumber: 'X', expiryDate: futureDate(), quantityPieces: 1, purchasePrice: 1 },
    ]
    const res = await as(f.owner).post('/api/data-transfer/opening-stock', { signedByUuid: pharmacist.uuid, rows })
    expect(res.body.data).toMatchObject({ created: 1, invoices: 1, totalValue: 8000 })
    expect(res.body.data.invalid[0].reason).toBe('MEDICINE_NOT_FOUND')

    const stock = (await as(f.owner).get('/api/stock?search=Paracetamol Tes')).body.data[0]
    expect(stock.totalPieces).toBe(20)
    const invoice = (await as(f.owner).get('/api/invoices?search=saldo-awal')).body.data[0]
    expect(invoice.paymentStatus).toBe('PAID')

    const again = await as(f.owner).post('/api/data-transfer/opening-stock', { dryRun: true, signedByUuid: pharmacist.uuid, rows: rows.slice(0, 1) })
    expect(again.body.data).toMatchObject({ created: 0, existing: 1 })
  })

  it('needs the Head Pharmacist to sign opening stock of a controlled medicine', async () => {
    const rows = [{ medicine: 'Kodein Tes', batchNumber: 'OPEN-K', expiryDate: futureDate(), quantityPieces: 5, purchasePrice: 1000, distributor: 'PT Tes Farma' }]
    expect((await as(f.owner).post('/api/data-transfer/opening-stock', { signedByUuid: pharmacist.uuid, rows })).status).toBe(403)
  })

  it('sells from stock, and then refuses to delete the invoice it came from', async () => {
    const detail = (await as(f.owner).get(`/api/stock/details?medicineUuid=${regularUuid}`)).body.data[0]
    const token = await enter(cashier.email, NEW_PASSWORD, f.pharmacyUuid)
    const sale = await as(token).post('/api/sales', {
      details: [{ stockDetailUuid: detail.uuid, quantityPieces: 3 }],
      paidAmount: 100000,
      payment: { paymentMethod: 'CASH' },
    })
    expect(sale.status).toBe(201)
    const stock = (await as(f.owner).get('/api/stock?search=Paracetamol Tes')).body.data[0]
    expect(stock.totalPieces).toBe(17)

    const invoice = (await as(f.owner).get('/api/invoices?search=saldo-awal')).body.data[0]
    expect((await as(f.owner).delete(`/api/invoices/${invoice.uuid}`)).status).toBe(409)
  })

  it('deleting an untouched invoice takes its stock back out', async () => {
    const rows = [{ medicine: 'Paracetamol Tes', batchNumber: 'OPEN-2', expiryDate: futureDate(), quantityPieces: 10, purchasePrice: 400, distributor: 'PT Tes Farma' }]
    await as(f.owner).post('/api/data-transfer/opening-stock', { signedByUuid: pharmacist.uuid, rows })
    const before = (await as(f.owner).get('/api/stock?search=Paracetamol Tes')).body.data[0].totalPieces
    const invoices = (await as(f.owner).get('/api/invoices?search=saldo-awal')).body.data
    const latest = invoices.sort((a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt))[0]
    expect((await as(f.owner).delete(`/api/invoices/${latest.uuid}`)).status).toBeLessThan(300)
    const after = (await as(f.owner).get('/api/stock?search=Paracetamol Tes')).body.data[0].totalPieces
    expect(before - after).toBe(10)
  })
})

describe('allergy check', () => {
  it('flags a medicine whose ingredient matches a recorded allergy', async () => {
    const patient = await as(f.owner).post('/api/customers', { customerType: 'PATIENT', name: 'Pasien Alergi', phone: '0899111' })
    const customerUuid = patient.body.data.uuid
    await as(f.owner).post(`/api/medical-records/${customerUuid}/allergies`, { allergenName: 'Paracetamol', allergenType: 'MEDICINE', severity: 'SEVERE' })
    const res = await as(f.owner).post(`/api/customers/${customerUuid}/allergy-check`, { items: [{ medicineUuid: regularUuid }] })
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({ allergenName: 'Paracetamol', severity: 'SEVERE' })
  })
})
