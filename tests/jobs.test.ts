import { beforeAll, describe, expect, it } from 'vitest'
import { JobTrigger, PrescriptionStatus } from '@prisma/client'
import { prisma } from '../src/config/db'
import { JOBS, findJob } from '../src/jobs/registry'
import { dueJobs, loadSettings } from '../src/jobs/settings'
import { runJob } from '../src/jobs/runner'
import { ADMIN, NEW_PASSWORD, PharmacyFixture, addStaff, as, createPharmacy, enter, login } from './helpers'

const DAY_MS = 86_400_000
const job = (name: string) => {
  const j = findJob(name)
  if (!j) throw new Error(`no job ${name}`)
  return j
}
const inDays = (days: number): string => new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10)

// One pharmacy with a cashier and one medicine in stock: 20 pieces that expire
// in 10 days (so the daily alert has something to report).
let f: PharmacyFixture
let pharmacyId: number
let cashier: { email: string; uuid: string }
let stockDetailUuid: string

beforeAll(async () => {
  f = await createPharmacy()
  pharmacyId = (await prisma.pharmacy.findUniqueOrThrow({ where: { uuid: f.pharmacyUuid }, select: { id: true } })).id
  await addStaff(f, 'HEAD_PHARMACIST') // staff other than the owner need one to enter
  const pharmacist = await addStaff(f, 'PHARMACIST')
  cashier = await addStaff(f, 'CASHIER')
  await as(f.owner).post('/api/catalog/import', {
    medicines: [{ name: 'Amoksisilin Job', unit: 'Strip', shape: 'Kapsul', type: 'Obat Keras', class: 'Antibiotik', ingredients: ['amoxicillin'] }],
  })
  await as(f.owner).post('/api/distributors', { name: 'PT Job Farma', phone: '021777' })
  const rows = [{ medicine: 'Amoksisilin Job', batchNumber: 'JOB-1', expiryDate: inDays(10), quantityPieces: 20, purchasePrice: 400, sellingPrice: 600, distributor: 'PT Job Farma' }]
  const imported = await as(f.owner).post('/api/data-transfer/opening-stock', { signedByUuid: pharmacist.uuid, rows })
  expect(imported.body.data.created).toBe(1)
  const medicine = (await as(f.owner).get('/api/medicines?search=Amoksisilin Job')).body.data[0]
  stockDetailUuid = (await as(f.owner).get(`/api/stock/details?medicineUuid=${medicine.uuid}`)).body.data[0].uuid
})

describe('cancel-held-sales', () => {
  it('cancels yesterday\'s holds and releases their stock, but leaves today\'s alone', async () => {
    const token = await enter(cashier.email, NEW_PASSWORD, f.pharmacyUuid)
    const held = await as(token).post('/api/sales', { isPending: true, details: [{ stockDetailUuid, quantityPieces: 2 }] })
    expect(held.status).toBe(201)
    const saleId = (await prisma.sale.findUniqueOrThrow({ where: { uuid: held.body.data.uuid }, select: { id: true } })).id
    expect(await prisma.stockReservation.count({ where: { saleId } })).toBe(1)

    // Same day: nothing happens.
    await runJob(job('cancel-held-sales'), JobTrigger.MANUAL, { now: new Date() })
    expect((await prisma.sale.findUniqueOrThrow({ where: { id: saleId } })).status).toBe('PENDING')

    // The next day: cancelled, reservation gone.
    const outcome = await runJob(job('cancel-held-sales'), JobTrigger.MANUAL, { now: new Date(Date.now() + 2 * DAY_MS) })
    expect(outcome.status).toBe('SUCCESS')
    const sale = await prisma.sale.findUniqueOrThrow({ where: { id: saleId } })
    expect(sale.status).toBe('CANCELLED')
    expect(sale.description).toContain('Auto-cancelled')
    expect(await prisma.stockReservation.count({ where: { saleId } })).toBe(0)
  })
})

describe('expire-prescriptions', () => {
  it('expires pending prescriptions older than PRESCRIPTION_VALID_DAYS, per pharmacy', async () => {
    const param = await prisma.businessParameter.findUnique({ where: { pharmacyId_key: { pharmacyId, key: 'PRESCRIPTION_VALID_DAYS' } } })
    expect(param?.value).toBe('30') // new pharmacies get the default

    await prisma.businessParameter.update({ where: { pharmacyId_key: { pharmacyId, key: 'PRESCRIPTION_VALID_DAYS' } }, data: { value: '5' } })
    const customer = await prisma.customer.findFirstOrThrow({ where: { pharmacyId, isWalkIn: true }, select: { id: true } })
    const make = (daysAgo: number, status: PrescriptionStatus) =>
      prisma.prescription.create({
        data: { pharmacyId, customerId: customer.id, prescribedAt: new Date(Date.now() - daysAgo * DAY_MS), status },
        select: { id: true },
      })
    const old = await make(6, PrescriptionStatus.PENDING)
    const oldPartial = await make(6, PrescriptionStatus.PARTIAL)
    const fresh = await make(2, PrescriptionStatus.PENDING)
    const dispensed = await make(40, PrescriptionStatus.DISPENSED)

    await runJob(job('expire-prescriptions'), JobTrigger.MANUAL)

    const status = async (id: number) => (await prisma.prescription.findUniqueOrThrow({ where: { id } })).status
    expect(await status(old.id)).toBe('EXPIRED')
    expect(await status(oldPartial.id)).toBe('EXPIRED')
    expect(await status(fresh.id)).toBe('PENDING')
    expect(await status(dispensed.id)).toBe('DISPENSED')
  })
})

describe('daily-alerts and the notification bell', () => {
  it('reports expiring batches once per day and tracks read state per user', async () => {
    await runJob(job('daily-alerts'), JobTrigger.MANUAL)
    await runJob(job('daily-alerts'), JobTrigger.MANUAL) // same day again: updates, no duplicate

    const list = await as(f.owner).get('/api/notifications')
    expect(list.status).toBe(200)
    const expiring = list.body.data.items.filter((n: { type: string }) => n.type === 'EXPIRING_BATCHES')
    expect(expiring).toHaveLength(1)
    expect(expiring[0]).toMatchObject({ count: 1, isRead: false, link: '/stock' })
    expect(list.body.data.unreadCount).toBeGreaterThan(0)

    expect((await as(f.owner).post(`/api/notifications/${expiring[0].uuid}/read`)).status).toBe(200)
    const afterOne = await as(f.owner).get('/api/notifications')
    expect(afterOne.body.data.items.find((n: { uuid: string }) => n.uuid === expiring[0].uuid).isRead).toBe(true)

    await as(f.owner).post('/api/notifications/read-all')
    expect((await as(f.owner).get('/api/notifications')).body.data.unreadCount).toBe(0)

    // Another user of the same pharmacy still has them unread.
    const token = await enter(cashier.email, NEW_PASSWORD, f.pharmacyUuid)
    const cashierView = await as(token).get('/api/notifications')
    expect(cashierView.status).toBe(200)
    // A cashier cannot read invoices, so payables alerts never reach them.
    expect(cashierView.body.data.items.some((n: { type: string }) => n.type === 'OVERDUE_PAYABLES')).toBe(false)
  })
})

describe('job runner', () => {
  it('skips a job whose lock another instance holds', async () => {
    const definition = job('purge-expired')
    const outcome = await prisma.$transaction(async (tx) => {
      // Stand in for a second server instance that is already running the job.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${definition.lockKey}::bigint)`
      return runJob(definition, JobTrigger.MANUAL)
    })
    expect(outcome.status).toBe('SKIPPED')
    const run = await prisma.jobRun.findUniqueOrThrow({ where: { uuid: outcome.uuid } })
    expect(run.error).toContain('another instance')
  })

  it('is listed and run by hand only by the platform admin', async () => {
    const admin = await login(ADMIN.email, ADMIN.password)
    const jobs = await as(admin).get('/api/jobs')
    expect(jobs.status).toBe(200)
    expect(jobs.body.data.map((j: { name: string }) => j.name)).toEqual(
      expect.arrayContaining(['cancel-held-sales', 'expire-prescriptions', 'purge-expired', 'daily-alerts'])
    )
    const run = await as(admin).post('/api/jobs/purge-expired/run')
    expect(run.body.data.status).toBe('SUCCESS')
    expect((await as(admin).post('/api/jobs/nope/run')).status).toBe(404)

    expect((await as(f.owner).get('/api/jobs')).status).toBe(403)
  })
})

describe('job settings', () => {
  it('validates and saves the time, switch and numbers; the scheduler follows them', async () => {
    const admin = await login(ADMIN.email, ADMIN.password)
    try {
      const bad = await as(admin).put('/api/jobs/purge-expired/settings', { enabled: true, time: '25:00', params: { notificationRetentionDays: 1 } })
      expect(bad.status).toBe(422)
      const unknown = await as(admin).put('/api/jobs/purge-expired/settings', { enabled: true, time: '02:15', params: { nope: 3 } })
      expect(unknown.status).toBe(422)

      const ok = await as(admin).put('/api/jobs/purge-expired/settings', { enabled: true, time: '02:15', params: { notificationRetentionDays: 14 } })
      expect(ok.status).toBe(200)
      expect(ok.body.data).toMatchObject({ enabled: true, time: '02:15' })
      expect(ok.body.data.params.find((p: { key: string }) => p.key === 'notificationRetentionDays').value).toBe(14)

      let settings = await loadSettings(JOBS)
      expect(dueJobs(JOBS, settings, '02:15').map((j) => j.name)).toEqual(['purge-expired'])
      expect(dueJobs(JOBS, settings, '01:30').map((j) => j.name)).not.toContain('purge-expired')

      await as(admin).put('/api/jobs/purge-expired/settings', { enabled: false, time: '02:15' })
      settings = await loadSettings(JOBS)
      expect(dueJobs(JOBS, settings, '02:15')).toEqual([])

      expect((await as(f.owner).put('/api/jobs/purge-expired/settings', { enabled: true, time: '01:30' })).status).toBe(403)
    } finally {
      // Settings are global; leave the defaults for other suites.
      await prisma.jobSetting.deleteMany({ where: { name: 'purge-expired' } })
    }
  })

  it('daily-alerts uses each pharmacy\'s EXPIRY_ALERT_DAYS', async () => {
    const where = { pharmacyId_key: { pharmacyId, key: 'EXPIRY_ALERT_DAYS' } }
    expect((await prisma.businessParameter.findUnique({ where }))?.value).toBe('30')
    const expiringToday = async () =>
      prisma.notification.findFirst({ where: { pharmacyId, type: 'EXPIRING_BATCHES' }, orderBy: { updatedAt: 'desc' } })

    await prisma.businessParameter.update({ where, data: { value: '5' } }) // the batch expires in 10 days
    await runJob(job('daily-alerts'), JobTrigger.MANUAL)
    expect(await expiringToday()).toBeNull()

    await prisma.businessParameter.update({ where, data: { value: '30' } })
    await runJob(job('daily-alerts'), JobTrigger.MANUAL)
    expect((await expiringToday())?.count).toBe(1)
  })
})
