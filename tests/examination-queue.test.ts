import { beforeAll, describe, expect, it } from 'vitest'
import { NEW_PASSWORD, PharmacyFixture, addStaff, as, createPharmacy, enter } from './helpers'

// Two in-house doctors (with user accounts) and one visiting doctor who only
// writes prescriptions. Three patients: one for dr. A, one for anyone, one for dr. B.
let f: PharmacyFixture
let doctorA: { uuid: string; token: string }
let doctorB: { uuid: string }
let visitingUuid: string
const patients: string[] = []

beforeAll(async () => {
  f = await createPharmacy()
  await addStaff(f, 'HEAD_PHARMACIST')
  const userA = await addStaff(f, 'DOCTOR')
  const userB = await addStaff(f, 'DOCTOR')
  const a = await as(f.owner).post('/api/doctors', { name: 'Dr. Queue A', userUuid: userA.uuid })
  const b = await as(f.owner).post('/api/doctors', { name: 'Dr. Queue B', userUuid: userB.uuid })
  const visiting = await as(f.owner).post('/api/doctors', { name: 'Dr. Visiting' })
  expect([a.status, b.status, visiting.status]).toEqual([201, 201, 201])
  doctorA = { uuid: a.body.data.uuid, token: await enter(userA.email, NEW_PASSWORD, f.pharmacyUuid) }
  doctorB = { uuid: b.body.data.uuid }
  visitingUuid = visiting.body.data.uuid

  for (const name of ['Pasien Satu', 'Pasien Dua', 'Pasien Tiga']) {
    const res = await as(f.owner).post('/api/customers', { customerType: 'PATIENT', name })
    patients.push(res.body.data.uuid)
  }
  await as(f.owner).post('/api/examinations', { customerUuid: patients[0], doctorUuid: doctorA.uuid })
  await as(f.owner).post('/api/examinations', { customerUuid: patients[1] })
  await as(f.owner).post('/api/examinations', { customerUuid: patients[2], doctorUuid: doctorB.uuid })
})

describe('examination queue per doctor', () => {
  it('lists the in-house doctors and marks the signed-in one', async () => {
    const queue = (await as(doctorA.token).get('/api/examinations')).body.data
    const byUuid = Object.fromEntries(queue.doctors.map((d: { uuid: string; isMe: boolean }) => [d.uuid, d.isMe]))
    expect(byUuid).toEqual({ [doctorA.uuid]: true, [doctorB.uuid]: false })
    expect(byUuid[visitingUuid]).toBeUndefined()

    const owner = (await as(f.owner).get('/api/examinations')).body.data
    expect(owner.doctors.every((d: { isMe: boolean }) => !d.isMe)).toBe(true)
  })

  it('lets either doctor take an "any doctor" patient, only once', async () => {
    const queue = (await as(f.owner).get('/api/examinations')).body.data
    const anyDoctor = queue.items.find((e: { doctor: unknown }) => e.doctor === null)
    expect(anyDoctor).toBeDefined()

    const first = await as(doctorA.token).post(`/api/examinations/${anyDoctor.uuid}/start`, { doctorUuid: doctorA.uuid })
    expect(first.status).toBe(200)
    expect(first.body.data.doctor.uuid).toBe(doctorA.uuid)

    const second = await as(f.owner).post(`/api/examinations/${anyDoctor.uuid}/start`, { doctorUuid: doctorB.uuid })
    expect(second.status).toBe(400) // no longer waiting
  })
})
