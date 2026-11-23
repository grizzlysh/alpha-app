import { beforeAll, describe, expect, it } from 'vitest'
import { PharmacyFixture, as, createPharmacy } from './helpers'

// Structured medicine names: base name + ingredient strengths + shape + variant,
// joined by the pharmacy's MEDICINE_NAME_FORMAT; or a custom name typed as is.
let f: PharmacyFixture
let refs: Record<string, string>

const create = (body: Record<string, unknown>) =>
  as(f.owner).post('/api/medicines', { unit: 'Strip', ...refs, ...body })

const setFormat = async (value: string) => {
  const param = (await as(f.owner).get('/api/business-parameters?search=MEDICINE_NAME_FORMAT')).body.data[0]
  return as(f.owner).put(`/api/business-parameters/${param.uuid}`, { value })
}

beforeAll(async () => {
  f = await createPharmacy()
  await as(f.owner).post('/api/catalog/import', {
    medicines: [{ name: 'Seed Obat', unit: 'Strip', shape: 'Tablet', type: 'Obat Bebas', class: 'Analgesik', ingredients: ['x'] }],
  })
  const seed = (await as(f.owner).get('/api/medicines?search=Seed Obat')).body.data[0]
  refs = {
    medicineShapeUuid: seed.medicineShape.uuid,
    medicineTypeUuid: seed.medicineType.uuid,
    medicineClassUuid: seed.medicineClass.uuid,
  }
})

describe('structured medicine names', () => {
  it('builds the name from its parts and normalizes the strength', async () => {
    const res = await create({ baseName: 'Amlodipin', ingredients: [{ name: 'Amlodipine', strength: '10mg' }] })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      name: 'Amlodipin 10 mg Tablet',
      baseName: 'Amlodipin',
      isCustomName: false,
      strength: '10 mg',
      ingredients: [{ name: 'Amlodipine', strength: '10 mg' }],
    })
  })

  it('joins several strengths and adds the variant last', async () => {
    const res = await create({
      baseName: 'Paramex',
      variant: 'Forte',
      ingredients: [{ name: 'Paracetamol', strength: '500 mg' }, { name: 'Kafein', strength: '50mg' }],
    })
    expect(res.body.data.name).toBe('Paramex 500/50 mg Tablet Forte')
  })

  it('leaves out an empty strength and keeps a custom name as typed', async () => {
    expect((await create({ baseName: 'Oralit', ingredients: ['Natrium klorida'] })).body.data.name).toBe('Oralit Tablet')
    const custom = await create({ name: 'Racikan Batuk Anak', isCustomName: true, ingredients: ['Ambroxol'] })
    expect(custom.body.data).toMatchObject({ name: 'Racikan Batuk Anak', isCustomName: true, baseName: null })
  })

  it('rejects a second medicine that builds the same name', async () => {
    const res = await create({ baseName: 'amlodipin', ingredients: [{ name: 'Amlodipine', strength: '10 mg' }] })
    expect(res.status).toBe(409)
  })

  it('renames when parts change, and on update a plain name means a custom name', async () => {
    const med = (await create({ baseName: 'Cetirizine', ingredients: [{ name: 'Cetirizine', strength: '10 mg' }] })).body.data
    const updated = await as(f.owner).put(`/api/medicines/${med.uuid}`, { variant: 'Sirup 60 ml' })
    expect(updated.body.data.name).toBe('Cetirizine 10 mg Tablet Sirup 60 ml')
    const custom = await as(f.owner).put(`/api/medicines/${med.uuid}`, { name: 'Cetirizine Anak' })
    expect(custom.body.data).toMatchObject({ name: 'Cetirizine Anak', isCustomName: true })
  })

  it('a new format renames every structured medicine, unless names would clash', async () => {
    expect((await setFormat('NAME_SHAPE_STRENGTH')).status).toBe(200)
    expect((await as(f.owner).get('/api/medicines?search=Amlodipin')).body.data[0].name).toBe('Amlodipin Tablet 10 mg')
    expect((await setFormat('WHATEVER')).status).toBe(400)

    // Same base and strength in another shape: without the shape both read "Ibuprofen 400 mg".
    const shape = await as(f.owner).post('/api/medicine-shapes', { name: 'Kaplet Uji', status: 'ACTIVE' })
    await create({ baseName: 'Ibuprofen', ingredients: [{ name: 'Ibuprofen', strength: '400 mg' }] })
    await create({ baseName: 'Ibuprofen', medicineShapeUuid: shape.body.data.uuid, ingredients: [{ name: 'Ibuprofen', strength: '400 mg' }] })
    const clash = await setFormat('NAME_STRENGTH')
    expect(clash.status).toBe(400)
    expect(clash.body.message.en).toContain('Ibuprofen 400 mg')
    expect((await setFormat('NAME_STRENGTH_SHAPE')).status).toBe(200)
  })

  it('renaming a shape renames its structured medicines', async () => {
    const shape = (await as(f.owner).get('/api/medicine-shapes?search=Kaplet Uji')).body.data[0]
    await as(f.owner).put(`/api/medicine-shapes/${shape.uuid}`, { name: 'Kaplet Salut Uji' })
    const names = (await as(f.owner).get('/api/medicines?search=Ibuprofen')).body.data.map((m: { name: string }) => m.name)
    expect(names.sort()).toEqual(['Ibuprofen 400 mg Kaplet Salut Uji', 'Ibuprofen 400 mg Tablet'])
  })

  it('catalog import reads strengths from the ingredients and builds the name', async () => {
    const res = await as(f.owner).post('/api/catalog/import', {
      medicines: [
        { name: '', baseName: 'Sanmol', unit: 'Strip', shape: 'Tablet', type: 'Obat Bebas', class: 'Analgesik', ingredients: ['Paracetamol 500mg'] },
        { name: 'Salep Racik', unit: 'Tube', shape: 'Tablet', type: 'Obat Bebas', class: 'Analgesik', ingredients: ['Asam salisilat 2 %'] },
      ],
    })
    expect(res.body.data.medicines.created).toBe(2)
    const sanmol = (await as(f.owner).get('/api/medicines?search=Sanmol')).body.data[0]
    expect(sanmol).toMatchObject({ name: 'Sanmol 500 mg Tablet', isCustomName: false, ingredients: [{ name: 'Paracetamol', strength: '500 mg' }] })
    const salep = (await as(f.owner).get('/api/medicines?search=Salep Racik')).body.data[0]
    expect(salep).toMatchObject({ name: 'Salep Racik', isCustomName: true, ingredients: [{ name: 'Asam salisilat', strength: '2 %' }] })
  })
})
