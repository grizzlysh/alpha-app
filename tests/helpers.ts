import request from 'supertest'
import app from '../src/app'

export const api = request(app)

export const ADMIN = { email: 'admin@pharma.com', password: 'Admin@123' }
export const NEW_PASSWORD = 'Rahasia123'

let seq = 0
/** Unique suffix so every test creates its own pharmacy/users. */
export const uid = (): string => `${Date.now().toString(36)}${(seq++).toString(36)}`.toUpperCase()

export async function login(email: string, password: string): Promise<string> {
  const res = await api.post('/api/auth/login').send({ email, password })
  if (res.status !== 200) throw new Error(`login ${email} failed: ${res.status} ${JSON.stringify(res.body.message)}`)
  return res.body.data.accessToken
}

export async function selectPharmacy(token: string, pharmacyUuid: string): Promise<request.Response> {
  return api.post('/api/auth/select-pharmacy').set('Authorization', `Bearer ${token}`).send({ pharmacyUuid })
}

/** Signed in and inside the pharmacy; throws when that is refused. */
export async function enter(email: string, password: string, pharmacyUuid: string): Promise<string> {
  const res = await selectPharmacy(await login(email, password), pharmacyUuid)
  if (res.status !== 200) throw new Error(`select ${email} failed: ${res.status} ${res.body.code}`)
  return res.body.data.accessToken
}

/** First sign-in with a temporary password: replace it, then sign in again. */
export async function activate(email: string, temporaryPassword: string): Promise<void> {
  const token = await login(email, temporaryPassword)
  const res = await api.put('/api/me/password').set('Authorization', `Bearer ${token}`).send({ currentPassword: temporaryPassword, newPassword: NEW_PASSWORD })
  if (res.status >= 300) throw new Error(`password change failed: ${res.status}`)
}

export const as = (token: string) => ({
  get: (url: string) => api.get(url).set('Authorization', `Bearer ${token}`),
  post: (url: string, body?: object) => api.post(url).set('Authorization', `Bearer ${token}`).send(body ?? {}),
  put: (url: string, body?: object) => api.put(url).set('Authorization', `Bearer ${token}`).send(body ?? {}),
  delete: (url: string) => api.delete(url).set('Authorization', `Bearer ${token}`),
})

const inYears = (n: number) => new Date(Date.now() + n * 365 * 86_400_000).toISOString()

export interface PharmacyFixture {
  pharmacyUuid: string
  code: string
  ownerEmail: string
  /** Owner, inside the pharmacy. */
  owner: string
  adminToken: string
}

/** A fresh pharmacy with its owner activated (password changed). */
export async function createPharmacy(extra: Record<string, unknown> = {}): Promise<PharmacyFixture> {
  const code = uid().slice(-5)
  const ownerEmail = `owner.${code.toLowerCase()}@test.local`
  const adminToken = await login(ADMIN.email, ADMIN.password)
  const res = await as(adminToken).post('/api/pharmacies', {
    name: `Apotek Tes ${code}`,
    code,
    category: 'APOTEK',
    phone: '0211234567',
    address: 'Jl. Tes 1',
    location: 'Jakarta',
    owner: { mode: 'new', name: `Owner ${code}`, email: ownerEmail },
    ...extra,
  })
  if (res.status !== 201) throw new Error(`create pharmacy failed: ${res.status} ${JSON.stringify(res.body)}`)
  await activate(ownerEmail, res.body.data.owner.temporaryPassword)
  const pharmacyUuid = res.body.data.pharmacy.uuid
  return { pharmacyUuid, code, ownerEmail, owner: await enter(ownerEmail, NEW_PASSWORD, pharmacyUuid), adminToken }
}

export async function roleUuid(token: string, type: string): Promise<string> {
  const res = await as(token).get('/api/roles/dropdown')
  const role = res.body.data.find((r: { type: string }) => r.type === type)
  if (!role) throw new Error(`role ${type} not found`)
  return role.uuid
}

/**
 * Adds an activated staff member. Licensed roles (and the Head Pharmacist) get
 * an active practice license.
 */
export async function addStaff(
  f: PharmacyFixture,
  type: 'HEAD_PHARMACIST' | 'PHARMACIST' | 'CASHIER' | 'ADMIN' | 'DOCTOR' | 'NURSE'
): Promise<{ email: string; uuid: string }> {
  const email = `${type.toLowerCase()}.${uid().toLowerCase()}@test.local`
  const licensed = ['HEAD_PHARMACIST', 'PHARMACIST', 'DOCTOR'].includes(type)
  const res = await as(f.adminToken).post('/api/users', {
    name: `${type} ${f.code}`,
    email,
    placement: {
      pharmacyUuid: f.pharmacyUuid,
      roleUuid: await roleUuid(f.adminToken, type),
      joinedAt: new Date().toISOString(),
      ...(licensed && { license: { licenseNumber: `SIPA-${uid()}`, validFrom: inYears(-1), validUntil: inYears(3) } }),
    },
  })
  if (res.status !== 201) throw new Error(`add ${type} failed: ${res.status} ${JSON.stringify(res.body)}`)
  await activate(email, res.body.data.temporaryPassword)
  return { email, uuid: res.body.data.uuid }
}

export const futureDate = (years = 2): string => inYears(years).slice(0, 10)
