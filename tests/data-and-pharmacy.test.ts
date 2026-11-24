import { describe, expect, it } from 'vitest'
import { NEW_PASSWORD, addStaff, as, createPharmacy, login, selectPharmacy } from './helpers'

describe('distributor and patient import', () => {
  it('adds new distributors and skips existing ones by name', async () => {
    const f = await createPharmacy()
    await as(f.owner).post('/api/distributors', { name: 'PT Sudah Ada', phone: '1' })
    const rows = [{ name: 'pt sudah ada', phone: '2' }, { name: 'PT Baru', phone: '3' }, { name: 'Tanpa Telepon' }]
    const res = await as(f.owner).post('/api/data-transfer/distributors', { rows })
    expect(res.body.data).toMatchObject({ created: 1, existing: 1 })
    expect(res.body.data.invalid[0].reason).toBe('PHONE_REQUIRED')
    const exported = (await as(f.owner).get('/api/data-transfer/distributors')).body.data.map((d: { name: string }) => d.name)
    expect(exported).toEqual(['PT Baru', 'PT Sudah Ada'])
  })

  it('creates patients with medical record numbers and matches by phone', async () => {
    const f = await createPharmacy()
    const rows = [
      { name: 'Siti', phone: '0812-1111', gender: 'P', dateOfBirth: '21/04/1985' },
      { name: 'Siti Lain', phone: '08121111' },
      { name: 'Tgl Salah', dateOfBirth: '2020-02-31' },
    ]
    const res = await as(f.owner).post('/api/data-transfer/customers', { rows })
    expect(res.body.data).toMatchObject({ created: 1 })
    expect(res.body.data.invalid.map((r: { reason: string }) => r.reason)).toEqual(['DUPLICATE_IN_FILE', 'INVALID_DATE'])
    const exported = (await as(f.owner).get('/api/data-transfer/customers')).body.data
    expect(exported[0]).toMatchObject({ name: 'Siti', gender: 'FEMALE', dateOfBirth: '1985-04-21' })
    expect(exported[0].medicalRecordNumber).toMatch(/^MR-/)
  })
})

describe('closing a pharmacy', () => {
  it('ends staff placements so nobody can enter it', async () => {
    const f = await createPharmacy()
    const cashier = await addStaff(f, 'CASHIER')
    await addStaff(f, 'HEAD_PHARMACIST')
    expect((await selectPharmacy(await login(cashier.email, NEW_PASSWORD), f.pharmacyUuid)).status).toBe(200)

    expect((await as(f.adminToken).delete(`/api/pharmacies/${f.pharmacyUuid}`)).status).toBeLessThan(300)
    const res = await selectPharmacy(await login(cashier.email, NEW_PASSWORD), f.pharmacyUuid)
    expect(res.status).toBeGreaterThanOrEqual(400)
    const ddl = (await as(f.adminToken).get('/api/pharmacies/dropdown')).body.data
    expect(ddl.some((p: { uuid: string }) => p.uuid === f.pharmacyUuid)).toBe(false)
  })
})

describe('user accounts', () => {
  it('stores emails lowercase and rejects duplicates in any case', async () => {
    const f = await createPharmacy()
    const res = await as(f.adminToken).post('/api/users', { name: 'Dup', email: f.ownerEmail.toUpperCase() })
    expect(res.status).toBe(409)
  })
})
