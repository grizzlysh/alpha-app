import { beforeAll, describe, expect, it } from 'vitest'
import { NEW_PASSWORD, PharmacyFixture, addStaff, as, createPharmacy, enter } from './helpers'

// The audit log records who changed what in a pharmacy, and only that
// pharmacy's managers can read it.
let f: PharmacyFixture
let other: PharmacyFixture
let cashier: { email: string; uuid: string }

interface Entry {
  action: string
  entityLabel: string | null
  entityUuid: string | null
  changes: Record<string, { from: unknown; to: unknown }> | null
  metadata: Record<string, unknown> | null
  user: { name: string } | null
}

const logs = async (query = ''): Promise<Entry[]> => {
  const res = await as(f.owner).get(`/api/audit-logs?limit=100${query}`)
  expect(res.status).toBe(200)
  return res.body.data
}

beforeAll(async () => {
  f = await createPharmacy()
  other = await createPharmacy()
  await addStaff(f, 'HEAD_PHARMACIST')
  cashier = await addStaff(f, 'CASHIER')
})

describe('audit log', () => {
  it('records a business parameter change with its old and new value', async () => {
    const param = (await as(f.owner).get('/api/business-parameters?search=MARGIN_PERCENTAGE')).body.data[0]
    await as(f.owner).put(`/api/business-parameters/${param.uuid}`, { value: '27' })
    const [entry] = await logs('&action=business_parameters')
    expect(entry).toMatchObject({
      action: 'business_parameters.update',
      entityLabel: 'MARGIN_PERCENTAGE',
      changes: { value: { from: param.value, to: '27' } },
    })
    expect(entry.user?.name).toContain('Owner')
  })

  it('records staff changes without ever storing a password', async () => {
    await as(f.owner).put(`/api/users/${cashier.uuid}`, { phone: '08123456789' })
    const reset = await as(f.owner).post(`/api/users/${cashier.uuid}/reset-password`)
    expect(reset.status).toBe(200)

    const entries = await logs(`&entityUuid=${cashier.uuid}`)
    const actions = entries.map((e) => e.action)
    expect(actions).toEqual(expect.arrayContaining(['users.create', 'users.update', 'users.reset_password']))
    expect(entries.find((e) => e.action === 'users.update')?.changes).toMatchObject({ phone: { to: '08123456789' } })
    expect(JSON.stringify(entries)).not.toContain(reset.body.data.temporaryPassword)
  })

  it('lists the permissions added to and removed from a role', async () => {
    const created = await as(f.owner).post('/api/roles', { name: 'Gudang', type: 'ADMIN' })
    expect(created.status).toBe(201)
    const role = created.body.data
    const grouped = (await as(f.owner).get('/api/permissions')).body.data as { permissions: { uuid: string; name: string }[] }[]
    const pick = (key: string) => grouped.flatMap((g) => g.permissions).find((p) => p.name === key)!.uuid
    await as(f.owner).put(`/api/roles/${role.uuid}/permissions`, { permissionUuids: [pick('stock.read'), pick('medicines.read')] })
    await as(f.owner).put(`/api/roles/${role.uuid}/permissions`, { permissionUuids: [pick('stock.read')] })

    const entries = await logs('&action=roles.set_permissions')
    expect(entries[0].metadata).toEqual({ added: [], removed: ['medicines.read'] })
    expect(entries[1].metadata).toEqual({ added: ['medicines.read', 'stock.read'], removed: [] })
  })

  it('records entering the pharmacy', async () => {
    expect((await logs('&action=auth.enter_pharmacy')).length).toBeGreaterThan(0)
  })

  it("is closed to cashiers and to other pharmacies", async () => {
    const token = await enter(cashier.email, NEW_PASSWORD, f.pharmacyUuid).catch(() => null)
    if (token) expect((await as(token).get('/api/audit-logs')).status).toBe(403)
    const theirs = (await as(other.owner).get('/api/audit-logs?limit=100')).body.data as Entry[]
    expect(theirs.some((e) => e.entityUuid === cashier.uuid)).toBe(false)
    expect((await as(f.owner).get('/api/audit-logs?action=Bad Action')).status).toBe(422)
  })

  it('lists the actions present for the filter', async () => {
    const actions = (await as(f.owner).get('/api/audit-logs/actions')).body.data as { action: string; count: number }[]
    expect(actions.map((a) => a.action)).toEqual(expect.arrayContaining(['users.reset_password', 'roles.create']))
  })
})
