import { beforeAll, describe, expect, it } from 'vitest'
import { PharmacyFixture, addStaff, as, createPharmacy } from './helpers'

// Surat pesanan kinds: each kind of medicine is ordered on its own letter,
// and a narcotics letter holds one medicine only.
let f: PharmacyFixture
let hp: { email: string; uuid: string }
let pharmacist: { email: string; uuid: string }
let distributorUuid: string
const uuids: Record<string, string> = {}

const order = (names: string[], signedByUuid?: string) =>
  as(f.owner).post('/api/purchase-orders', {
    distributorUuid,
    ...(signedByUuid && { signedByUuid }),
    details: names.map((n) => ({ medicineUuid: uuids[n], quantity: 2, unit: 'box' })),
  })

beforeAll(async () => {
  f = await createPharmacy()
  hp = await addStaff(f, 'HEAD_PHARMACIST')
  pharmacist = await addStaff(f, 'PHARMACIST')
  const row = (name: string, type: string) => ({ name, unit: 'Strip', shape: 'Tablet', type, class: 'Analgesik & Antipiretik', ingredients: ['x'] })
  await as(f.owner).post('/api/catalog/import', {
    medicines: [
      row('Paracetamol SP', 'Obat Bebas'),
      row('Ibuprofen SP', 'Obat Keras'),
      row('Kodein SP', 'Narkotika'),
      row('Morfin SP', 'Narkotika'),
      row('Diazepam SP', 'Psikotropika'),
      row('Alprazolam SP', 'Psikotropika'),
      row('Efedrin SP', 'Prekursor'),
      row('Tramadol SP', 'Obat Keras'),
    ],
  })
  for (const m of (await as(f.owner).get('/api/medicines?search=SP&limit=50')).body.data) uuids[m.name] = m.uuid
  distributorUuid = (await as(f.owner).post('/api/distributors', { name: 'PBF SP', phone: '021777' })).body.data.uuid
})

describe('order letter kinds', () => {
  it('takes the kind from the medicine type, or the medicine override', async () => {
    const tramadol = await as(f.owner).put(`/api/medicines/${uuids['Tramadol SP']}`, { orderLetterKind: 'CERTAIN_DRUG' })
    expect(tramadol.body.data).toMatchObject({ orderLetterKind: 'CERTAIN_DRUG', effectiveOrderLetterKind: 'CERTAIN_DRUG' })
    const diazepam = (await as(f.owner).get(`/api/medicines/${uuids['Diazepam SP']}`)).body.data
    expect(diazepam).toMatchObject({ orderLetterKind: null, effectiveOrderLetterKind: 'PSYCHOTROPIC' })

    expect((await order(['Paracetamol SP', 'Ibuprofen SP'])).body.data.kind).toBe('REGULAR')
    expect((await order(['Diazepam SP', 'Alprazolam SP'])).body.data.kind).toBe('PSYCHOTROPIC')
    expect((await order(['Efedrin SP'])).body.data.kind).toBe('PRECURSOR')
    expect((await order(['Tramadol SP'])).body.data.kind).toBe('CERTAIN_DRUG')
    const narcotic = await order(['Kodein SP'])
    expect(narcotic.body.data.kind).toBe('NARCOTIC')
    expect(narcotic.body.data.details[0].medicine).toMatchObject({ shape: { name: 'Tablet' }, ingredients: [{ name: 'x', strength: null }] })
  })

  it('numbers each kind in its own series', async () => {
    const num = async (names: string[]) => (await order(names)).body.data.orderNumber as string
    const [regular, n, p, pf, oot] = [
      await num(['Paracetamol SP']),
      await num(['Kodein SP']),
      await num(['Diazepam SP']),
      await num(['Efedrin SP']),
      await num(['Tramadol SP']),
    ]
    expect(regular).not.toMatch(/^PO-(N|P|PF|OOT)-/)
    expect(n).toMatch(/^PO-N-/)
    expect(p).toMatch(/^PO-P-/)
    expect(pf).toMatch(/^PO-PF-/)
    expect(oot).toMatch(/^PO-OOT-/)
    // The first test made one narcotics letter today, so this is the second in that series.
    expect(n).toMatch(/-002$/)
  })

  it('refuses mixed kinds and more than one narcotic on a letter', async () => {
    const mixed = await order(['Paracetamol SP', 'Diazepam SP'])
    expect(mixed.status).toBe(400)
    expect(mixed.body.message.id).toContain('terpisah')
    expect((await order(['Tramadol SP', 'Ibuprofen SP'])).status).toBe(400)
    const twoNarcotics = await order(['Kodein SP', 'Morfin SP'])
    expect(twoNarcotics.status).toBe(400)
    expect(twoNarcotics.body.message.id).toBe('Satu surat pesanan narkotika hanya untuk satu jenis obat')
  })

  it('re-checks the kind when the items change', async () => {
    const po = (await order(['Paracetamol SP'])).body.data
    const toPsy = await as(f.owner).put(`/api/purchase-orders/${po.uuid}`, {
      details: [{ medicineUuid: uuids['Diazepam SP'], quantity: 1, unit: 'box' }],
    })
    expect(toPsy.body.data.kind).toBe('PSYCHOTROPIC')
    expect(po.orderNumber).not.toMatch(/^PO-(N|P|PF|OOT)-/)
    expect(toPsy.body.data.orderNumber).toMatch(/^PO-P-/)
    const mix = await as(f.owner).put(`/api/purchase-orders/${po.uuid}`, {
      details: [uuids['Diazepam SP'], uuids['Paracetamol SP']].map((medicineUuid) => ({ medicineUuid, quantity: 1, unit: 'box' })),
    })
    expect(mix.status).toBe(400)
  })

  it('special letters need the Head Pharmacist, including "obat-obat tertentu"', async () => {
    expect((await order(['Tramadol SP'], pharmacist.uuid)).status).toBe(403)
    expect((await order(['Tramadol SP'], hp.uuid)).status).toBe(201)
    expect((await order(['Paracetamol SP'], pharmacist.uuid)).status).toBe(201)
  })

  it('print data carries the kind and the distributor details', async () => {
    const po = (await order(['Efedrin SP'])).body.data
    const print = (await as(f.owner).get(`/api/purchase-orders/${po.uuid}/print`)).body.data
    expect(print).toMatchObject({ kind: 'PRECURSOR', distributor: { name: 'PBF SP', phone: '021777' } })
  })
})
