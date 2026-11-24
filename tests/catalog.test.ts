import { describe, expect, it } from 'vitest'
import { as, createPharmacy } from './helpers'

describe('medicine catalog import', () => {
  it('previews, then adds only what is missing, matching names case-insensitively', async () => {
    const f = await createPharmacy()
    const file = {
      types: [{ name: 'Narkotika Khusus', requiredPrescription: true, isControlled: true }],
      medicines: [
        { name: 'Bisolvon Sirup', unit: 'Botol', shape: 'sirup', type: 'Obat Bebas', class: 'Obat Batuk & Flu', ingredients: ['Bromhexine'] },
        { name: 'Morfin 10mg', unit: 'Ampul', shape: 'Injeksi', type: 'Narkotika Khusus', class: 'Lainnya' },
        { name: 'BISOLVON SIRUP', unit: 'Botol', shape: 'Sirup', type: 'Obat Bebas', class: 'Lainnya' },
        { name: '', unit: 'x' },
      ],
    }
    const preview = await as(f.owner).post('/api/catalog/import', { ...file, dryRun: true })
    expect(preview.body.data.medicines).toMatchObject({ created: 2, existing: 0 })
    expect(preview.body.data.medicines.invalid.map((r: { reason: string }) => r.reason)).toEqual(['DUPLICATE_IN_FILE', 'NAME_REQUIRED'])
    expect((await as(f.owner).get('/api/medicines?search=Bisolvon')).body.data).toHaveLength(0)

    await as(f.owner).post('/api/catalog/import', file)
    const meds = await as(f.owner).get('/api/medicines?search=Bisolvon')
    expect(meds.body.data.map((m: { name: string }) => m.name)).toEqual(['Bisolvon Sirup'])

    const types = await as(f.owner).get('/api/medicine-types/dropdown')
    expect(types.body.data.find((t: { name: string }) => t.name === 'Narkotika Khusus')).toMatchObject({ isControlled: true })

    const again = await as(f.owner).post('/api/catalog/import', { ...file, dryRun: true })
    expect(again.body.data.medicines).toMatchObject({ created: 0, existing: 2 })
  })

  it('keeps each pharmacy\'s classifications separate', async () => {
    const a = await createPharmacy()
    const b = await createPharmacy()
    await as(a.owner).post('/api/medicine-shapes', { name: 'Bentuk Khusus A', status: 'ACTIVE' })
    const inB = await as(b.owner).get('/api/medicine-shapes/dropdown')
    expect(inB.body.data.some((s: { name: string }) => s.name === 'Bentuk Khusus A')).toBe(false)
  })

  it('refuses to delete a classification still in use', async () => {
    const f = await createPharmacy()
    await as(f.owner).post('/api/catalog/import', { medicines: [{ name: 'Obat X', unit: 'Strip', shape: 'Bentuk Dipakai', type: 'Obat Bebas', class: 'Lainnya' }] })
    const shape = (await as(f.owner).get('/api/medicine-shapes?search=Bentuk Dipakai')).body.data[0]
    const res = await as(f.owner).delete(`/api/medicine-shapes/${shape.uuid}`)
    expect(res.status).toBe(409)
  })
})

describe('business parameters', () => {
  it('validates values by type', async () => {
    const f = await createPharmacy()
    const params = (await as(f.owner).get('/api/business-parameters?limit=50')).body.data
    const margin = params.find((p: { key: string }) => p.key === 'MARGIN_PERCENTAGE')
    const nameCase = params.find((p: { key: string }) => p.key === 'NAME_DISPLAY_CASE')
    expect((await as(f.owner).put(`/api/business-parameters/${margin.uuid}`, { value: 'abc' })).status).toBe(400)
    expect((await as(f.owner).put(`/api/business-parameters/${margin.uuid}`, { value: '150' })).status).toBe(400)
    expect((await as(f.owner).put(`/api/business-parameters/${nameCase.uuid}`, { value: 'camel' })).status).toBe(400)
    expect((await as(f.owner).put(`/api/business-parameters/${nameCase.uuid}`, { value: 'TITLE' })).status).toBe(200)
  })
})
