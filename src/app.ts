import express, { Application, Request, Response } from 'express'
import cors, { CorsOptions } from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import { env } from '@config/env'
import { rateLimiter } from '@middlewares/rateLimiter'
import { errorHandler } from '@middlewares/errorHandler'

import medicineRoutes from '@modules/medicines/medicines.routes'
import authRoutes from '@modules/auth/auth.routes'
import distributorRoutes from '@modules/distributors/distributors.routes'
import customerRoutes from '@modules/customers/customers.routes'


const app: Application = express()
const PORT: number = Number(env.PORT) || 5000

const corsOptions: CorsOptions = {
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

// ── Security Middlewares ─────────────────────
app.use(helmet())
app.use(cors(corsOptions))
app.use(rateLimiter)

// ── Body Parser ──────────────────────────────
app.use(cookieParser()) 
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Routes ───────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/medicines', medicineRoutes)
app.use('/api/distributors', distributorRoutes)
app.use('/api/customers', customerRoutes)
// app.use('/api/inventory', inventoryRoutes)
// app.use('/api/sales', salesRoutes)
// app.use('/api/restock', restockRoutes)
// app.use('/api/reports', reportRoutes)

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