import { beforeAll, describe, expect, it } from 'vitest'
import { NEW_PASSWORD, PharmacyFixture, addStaff, as, createPharmacy, enter, futureDate } from './helpers'

// Cashier shifts: off by default; once on, money is only taken inside an open
// shift, and closing freezes what the drawer should hold against what was counted.
let f: PharmacyFixture
let cashier: string
let otherCashier: string
let batchUuid: string

const setParam = async (key: string, value: string): Promise<void> => {
  const param = (await as(f.owner).get(`/api/business-parameters?search=${key}`)).body.data.find((p: { key: string }) => p.key === key)
  expect((await as(f.owner).put(`/api/business-parameters/${param.uuid}`, { value })).status).toBe(200)
}

const sell = (token: string, quantityPieces = 2) =>
  as(token).post('/api/sales', {
    details: [{ stockDetailUuid: batchUuid, quantityPieces }],
    paidAmount: 100000,
    payment: { paymentMethod: 'CASH' },
  })

beforeAll(async () => {
  f = await createPharmacy()
  await addStaff(f, 'HEAD_PHARMACIST') // staff other than the owner need one to enter
  const pharmacist = await addStaff(f, 'PHARMACIST')
  const c1 = await addStaff(f, 'CASHIER')
  const c2 = await addStaff(f, 'CASHIER')
  cashier = await enter(c1.email, NEW_PASSWORD, f.pharmacyUuid)
  otherCashier = await enter(c2.email, NEW_PASSWORD, f.pharmacyUuid)
  await as(f.owner).post('/api/catalog/import', {
    medicines: [{ name: 'Parasetamol Shift', unit: 'Strip', shape: 'Tablet', type: 'Obat Bebas', class: 'Analgesik', ingredients: ['paracetamol 500 mg'] }],
  })
  await as(f.owner).post('/api/distributors', { name: 'PT Shift Farma', phone: '021555' })
  const rows = [{ medicine: 'Parasetamol Shift', batchNumber: 'SH-1', expiryDate: futureDate(1), quantityPieces: 100, purchasePrice: 1000, sellingPrice: 2000, distributor: 'PT Shift Farma' }]
  expect((await as(f.owner).post('/api/data-transfer/opening-stock', { signedByUuid: pharmacist.uuid, rows })).body.data.created).toBe(1)
  const medicine = (await as(f.owner).get('/api/medicines?search=Parasetamol Shift')).body.data[0]
  batchUuid = (await as(f.owner).get(`/api/stock/details?medicineUuid=${medicine.uuid}`)).body.data[0].uuid
})

describe('cashier shifts', () => {
  it('are off by default: selling needs no shift and none can be opened', async () => {
    const current = await as(cashier).get('/api/shifts/current')
    expect(current.body.data).toMatchObject({ settings: { enabled: false }, shift: null })
    expect((await sell(cashier)).status).toBe(201)
    expect((await as(cashier).post('/api/shifts', { openingCash: 0 })).body.code).toBe('SHIFT_DISABLED')
  })

  let shiftUuid: string
  let saleUuid: string
  let grandTotal: number

  it('once turned on, payments need an open shift; one open shift per cashier', async () => {
    await setParam('CASHIER_SHIFT_ENABLED', 'true')
    await setParam('CASHIER_SHIFT_DIFFERENCE_TOLERANCE', '500')

    const blocked = await sell(cashier)
    expect(blocked.status).toBe(400)
    expect(blocked.body.code).toBe('SHIFT_NOT_OPEN')
    expect(blocked.body.message.id).toContain('Buka shift')

    const opened = await as(cashier).post('/api/shifts', { openingCash: 100000, note: 'Modal pagi' })
    expect(opened.status).toBe(201)
    expect(opened.body.data).toMatchObject({ status: 'OPEN', openingCash: 100000, shiftNumber: expect.stringMatching(/^SH-/) })
    shiftUuid = opened.body.data.uuid
    expect((await as(cashier).post('/api/shifts', { openingCash: 0 })).status).toBe(409)

    const sale = await sell(cashier, 5)
    expect(sale.status).toBe(201)
    saleUuid = sale.body.data.uuid
    grandTotal = sale.body.data.grandTotal
  })

  it('tracks cash in and out, and never lets more cash out than the drawer holds', async () => {
    expect((await as(cashier).post(`/api/shifts/${shiftUuid}/cash-movements`, { type: 'IN', amount: 50000, note: 'Tambah kembalian' })).status).toBe(201)
    expect((await as(cashier).post(`/api/shifts/${shiftUuid}/cash-movements`, { type: 'OUT', amount: 20000, note: 'Beli galon' })).status).toBe(201)
    const tooMuch = await as(cashier).post(`/api/shifts/${shiftUuid}/cash-movements`, { type: 'OUT', amount: 10_000_000, note: 'x' })
    expect(tooMuch.body.code).toBe('SHIFT_CASH_OUT_EXCEEDS')

    const detail = (await as(cashier).get(`/api/shifts/${shiftUuid}`)).body.data
    expect(detail.summary).toMatchObject({ saleCount: 1, cashSales: grandTotal, cashIn: 50000, cashOut: 20000, cashRefunds: 0 })
    expect(detail.summary.expectedCash).toBeCloseTo(100000 + grandTotal + 30000, 2)
    expect(detail.cashMovements).toHaveLength(2)
  })

  it('a refund pays the cash back out of the current shift', async () => {
    expect((await as(cashier).patch(`/api/sales/${saleUuid}/refund`, { description: 'Salah obat' })).status).toBe(200)
    const s = (await as(cashier).get(`/api/shifts/${shiftUuid}`)).body.data.summary
    expect(s.cashRefunds).toBe(grandTotal)
    expect(s.expectedCash).toBeCloseTo(130000, 2)
  })

  it("other cashiers can't see or close it; the owner sees everyone's shifts", async () => {
    expect((await as(otherCashier).get(`/api/shifts/${shiftUuid}`)).status).toBe(403)
    expect((await as(otherCashier).post(`/api/shifts/${shiftUuid}/close`, { countedCash: 0 })).status).toBe(403)
    expect((await as(otherCashier).get('/api/shifts')).body.data).toHaveLength(0)
    expect((await as(f.owner).get('/api/shifts')).body.data.map((s: { uuid: string }) => s.uuid)).toContain(shiftUuid)
  })

  it('closing with a difference over the tolerance needs a note, then freezes the totals', async () => {
    const noNote = await as(cashier).post(`/api/shifts/${shiftUuid}/close`, { countedCash: 129000 })
    expect(noNote.body.code).toBe('SHIFT_DIFFERENCE_NOTE_REQUIRED')

    const closed = await as(cashier).post(`/api/shifts/${shiftUuid}/close`, { countedCash: 129000, note: 'Kurang 1.000' })
    expect(closed.status).toBe(200)
    expect(closed.body.data).toMatchObject({ status: 'CLOSED', countedCash: 129000, difference: -1000, closingNote: 'Kurang 1.000' })
    expect(closed.body.data.summary.expectedCash).toBeCloseTo(130000, 2)

    expect((await as(cashier).post(`/api/shifts/${shiftUuid}/close`, { countedCash: 1 })).body.code).toBe('SHIFT_ALREADY_CLOSED')
    expect((await sell(cashier)).body.code).toBe('SHIFT_NOT_OPEN')
  })

  it('blind close hides the expected cash from the cashier, not from the owner', async () => {
    await setParam('CASHIER_SHIFT_BLIND_CLOSE', 'true')
    const opened = (await as(cashier).post('/api/shifts', { openingCash: 0 })).body.data
    expect(opened.summary).toBeNull()
    expect((await sell(cashier)).status).toBe(201)
    expect((await as(cashier).get('/api/shifts/current')).body.data.shift.summary).toBeNull()
    expect((await as(f.owner).get(`/api/shifts/${opened.uuid}`)).body.data.summary.saleCount).toBe(1)
    // The figures show once it is closed.
    const closed = (await as(cashier).post(`/api/shifts/${opened.uuid}/close`, { countedCash: 0, note: 'Uang disetor ke owner' })).body.data
    expect(closed.summary.saleCount).toBe(1)
    expect(closed.difference).toBeLessThan(0)
  })
})
