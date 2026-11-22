import express, { Application, Request, Response } from 'express'
import cors, { CorsOptions } from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import { env } from '@config/env'
import { rateLimiter } from '@middlewares/rateLimiter'
import { errorHandler } from '@middlewares/errorHandler'
import { maintenanceMode } from '@middlewares/maintenanceMode'
import { idempotency } from '@middlewares/idempotency'
import { startScheduler } from '@jobs/scheduler'

import authRoutes from '@modules/auth/auth.routes'
import pharmacyRoutes from '@modules/pharmacies/pharmacies.routes'
import distributorRoutes from '@modules/distributors/distributors.routes'
import customerRoutes from '@modules/customers/customers.routes'
import medicineRoutes from '@modules/medicines/medicines.routes'
import medicineShapeRoutes from '@modules/medicine-shapes/medicine-shapes.routes'
import medicineTypeRoutes from '@modules/medicine-types/medicine-types.routes'
import medicineClassRoutes from '@modules/medicine-classes/medicine-classes.routes'
import purchaseOrderRoutes from '@modules/purchase-orders/purchase-orders.routes'
import invoiceRoutes from '@modules/invoices/invoices.routes'
import stockRoutes from '@modules/stock/stock.routes'
import stockReturnRoutes from '@modules/stock-returns/stock-returns.routes'
import stockDisposalRoutes from '@modules/stock-disposals/stock-disposals.routes'
import salesRoutes from '@modules/sales/sales.routes'
import roleRoutes from '@modules/roles/roles.routes'
import permissionRoutes from '@modules/permissions/permissions.routes'
import systemParameterRoutes from '@modules/system-parameters/system-parameters.routes'
import businessParameterRoutes from '@modules/business-parameters/business-parameters.routes'
import { meRouter, userRouter } from '@modules/users/users.routes'
import stockMovementRoutes from '@modules/stock-movements/stock-movements.routes'
import reportRoutes from '@modules/reports/reports.routes'
import dashboardRoutes from '@modules/dashboard/dashboard.routes'
import storageRoutes from '@modules/storage/storage.routes'
import doctorRoutes from '@modules/doctors/doctors.routes'
import prescriptionRoutes from '@modules/prescriptions/prescriptions.routes'
import inventoryRoutes from '@modules/inventory/inventory.routes'
import medicalRecordRoutes from '@modules/medical-records/medical-records.routes'
import examinationRoutes from '@modules/examinations/examinations.routes'
import catalogRoutes from '@modules/catalog/catalog.routes'
import dataTransferRoutes from '@modules/data-transfer/data-transfer.routes'
import notificationRoutes from '@modules/notifications/notifications.routes'
import jobRoutes from '@modules/jobs/jobs.routes'



const app: Application = express()
const PORT: number = Number(env.PORT) || 5000

const corsOptions: CorsOptions = {
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}

// ── Security Middlewares ─────────────────────
// Behind a reverse proxy, trust its X-Forwarded-For so req.ip is the client.
if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY)
app.use(cors(corsOptions))
app.options('/{*path}', cors(corsOptions))
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(rateLimiter)

// ── Body Parser ──────────────────────────────
app.use(cookieParser()) 
// A whole medicine catalog can exceed the default 100kb body limit.
app.use('/api/catalog', express.json({ limit: '5mb' }))
app.use('/api/data-transfer', express.json({ limit: '5mb' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Maintenance Mode ─────────────────────────
app.use(maintenanceMode)

// ── Idempotency ──────────────────────────────
app.use(idempotency)

// ── Routes ───────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/me', meRouter)
app.use('/api/users', userRouter)
app.use('/api/pharmacies', pharmacyRoutes)

app.use('/api/roles', roleRoutes)
app.use('/api/permissions', permissionRoutes)
app.use('/api/system-parameters', systemParameterRoutes)
app.use('/api/business-parameters', businessParameterRoutes)
app.use('/api/distributors', distributorRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/medicines', medicineRoutes)
app.use('/api/medicine-shapes', medicineShapeRoutes)
app.use('/api/medicine-types', medicineTypeRoutes)
app.use('/api/medicine-classes', medicineClassRoutes)
app.use('/api/catalog', catalogRoutes)
app.use('/api/data-transfer', dataTransferRoutes)
app.use('/api/purchase-orders', purchaseOrderRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/stock-returns', stockReturnRoutes)
app.use('/api/stock-disposals', stockDisposalRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/stock-movements', stockMovementRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/storage', storageRoutes)
app.use('/api/doctors', doctorRoutes)
app.use('/api/prescriptions', prescriptionRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/medical-records', medicalRecordRoutes)
app.use('/api/examinations', examinationRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/jobs', jobRoutes)

// ── Health Check ─────────────────────────────
app.get('/', (req: Request, res: Response): void => {
  res.json({ message: 'Pharmacy API is running' })
})

// ── Global Error Handler ──────────────────────
app.use(errorHandler)

// ── Server ──────────────────────
// Tests drive the app in-process (supertest), without binding a port.
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, (error?: Error): void => {
    if (error) {
      console.error(`Failed to start server on port ${PORT}:`, error.message)
      process.exit(1)
    }
    console.log(`Server running on port ${PORT}`)
    startScheduler()
  })
}

export default app