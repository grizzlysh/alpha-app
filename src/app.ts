import express, { Application, Request, Response } from 'express'
import cors, { CorsOptions } from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import { env } from '@config/env'
import { rateLimiter } from '@middlewares/rateLimiter'
import { errorHandler } from '@middlewares/errorHandler'
import { maintenanceMode } from '@middlewares/maintenanceMode'

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



const app: Application = express()
const PORT: number = Number(env.PORT) || 5000

const corsOptions: CorsOptions = {
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

// ── Security Middlewares ─────────────────────
app.use(cors(corsOptions))
app.options('/{*path}', cors(corsOptions))
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(rateLimiter)

// ── Body Parser ──────────────────────────────
app.use(cookieParser()) 
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Maintenance Mode ─────────────────────────
app.use(maintenanceMode)

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
app.use('/api/purchase-orders', purchaseOrderRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/stock-returns', stockReturnRoutes)
app.use('/api/stock-disposals', stockDisposalRoutes)
app.use('/api/sales', salesRoutes)

// ── Health Check ─────────────────────────────
app.get('/', (req: Request, res: Response): void => {
  res.json({ message: 'Pharmacy API is running' })
})

// ── Global Error Handler ──────────────────────
app.use(errorHandler)

// ── Server ──────────────────────
app.listen(PORT, (): void => {
  console.log(`Server running on port ${PORT}`)
})

export default app