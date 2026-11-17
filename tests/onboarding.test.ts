import { describe, expect, it } from 'vitest'
import { ADMIN, NEW_PASSWORD, addStaff, api, as, createPharmacy, login, selectPharmacy, uid } from './helpers'

describe('pharmacy onboarding', () => {
  it('creates pharmacy, owner and starting data in one call', async () => {
    const f = await createPharmacy()
    const params = await as(f.owner).get('/api/business-parameters?limit=50')
    const keys = params.body.data.map((p: { key: string }) => p.key)
    expect(keys).toEqual(expect.arrayContaining(['MARGIN_PERCENTAGE', 'RECEIPT_HEADER', 'NAME_DISPLAY_CASE']))

    const types = await as(f.owner).get('/api/medicine-types/dropdown')
    const narkotika = types.body.data.find((t: { name: string }) => t.name === 'Narkotika')
    expect(narkotika).toMatchObject({ requiredPrescription: true, isControlled: true })
  })

  it('leaves nothing behind when a step fails', async () => {
    const adminToken = await login(ADMIN.email, ADMIN.password)
    const code = uid().slice(-5)
    const taken = await createPharmacy()
    const res = await as(adminToken).post('/api/pharmacies', {
      name: 'Gagal', code, category: 'APOTEK', phone: '1', address: 'x', location: 'x',
      owner: { mode: 'new', name: 'Dup', email: taken.ownerEmail },
    })
    expect(res.status).toBe(409)
    const list = await as(adminToken).get(`/api/pharmacies?search=Gagal`)
    expect(list.body.data.find((p: { code: string }) => p.code === code)).toBeUndefined()
  })

  it('rejects a reused pharmacy code with 409, not 500', async () => {
    const f = await createPharmacy()
    const res = await as(f.adminToken).post('/api/pharmacies', { name: 'x', code: f.code, category: 'APOTEK', phone: '1', address: 'x', location: 'x' })
    expect(res.status).toBe(409)
  })

  it('copies medicines, classifications and parameters from a branch', async () => {
    const a = await createPharmacy()
    const shape = (await as(a.owner).get('/api/medicine-shapes/dropdown')).body.data[0].uuid
    const type = (await as(a.owner).get('/api/medicine-types/dropdown')).body.data[0].uuid
    const cls = (await as(a.owner).get('/api/medicine-classes/dropdown')).body.data[0].uuid
    await as(a.owner).post('/api/medicines', { name: 'Obat Cabang A', unit: 'Strip', medicineShapeUuid: shape, medicineTypeUuid: type, medicineClassUuid: cls, ingredients: ['zat a'] })
    const b = await createPharmacy({ copyFromPharmacyUuid: a.pharmacyUuid })
    const meds = await as(b.owner).get('/api/medicines?search=Cabang')
    expect(meds.body.data.map((m: { name: string }) => m.name)).toEqual(['Obat Cabang A'])
  })
})

describe('sign-in rules', () => {
  it('is case-insensitive on email', async () => {
    await expect(login(ADMIN.email.toUpperCase(), ADMIN.password)).resolves.toBeTruthy()
  })

  it('requires replacing a temporary password before entering a pharmacy', async () => {
    const adminToken = await login(ADMIN.email, ADMIN.password)
    const code = uid().slice(-5)
    const email = `fresh.${code.toLowerCase()}@test.local`
    const res = await as(adminToken).post('/api/pharmacies', {
      name: 'Baru', code, category: 'APOTEK', phone: '1', address: 'x', location: 'x', owner: { mode: 'new', name: 'Baru', email },
    })
    const token = await login(email, res.body.data.owner.temporaryPassword)
    const sel = await selectPharmacy(token, res.body.data.pharmacy.uuid)
    expect(sel.status).toBe(403)
    expect(sel.body.code).toBe('PASSWORD_CHANGE_REQUIRED')
  })

  it('lets the owner into a pharmacy without a Head Pharmacist, but not other staff', async () => {
    const f = await createPharmacy()
    const cashier = await addStaff(f, 'CASHIER')
    const blocked = await selectPharmacy(await login(cashier.email, NEW_PASSWORD), f.pharmacyUuid)
    expect(blocked.status).toBe(403)

    await addStaff(f, 'HEAD_PHARMACIST')
    const allowed = await selectPharmacy(await login(cashier.email, NEW_PASSWORD), f.pharmacyUuid)
    expect(allowed.status).toBe(200)
  })

  it('returns the name display setting with the pharmacy', async () => {
    const f = await createPharmacy()
    const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${f.owner}`)
    expect(res.body.data.currentPharmacy.nameCase).toBe('UPPER')
  })
})
