# Pharmacy App — Backend

REST API for a multi-tenant pharmacy SaaS built with Node.js, Express, TypeScript, Prisma, and PostgreSQL.

## Tech Stack
- **Runtime**: Node.js 20+
- **Framework**: Express 5
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt
- **Validation**: Zod
- **Excel generation**: ExcelJS (cronjob only)
- **Date utilities**: Luxon

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL

### Installation
```bash
npm install
```

### Environment Variables
Copy `.env.example` and fill in your values:
```bash
cp .env.example .env
```

### Commands
```bash
# Development (hot reload + path aliases)
npm run dev

# Build & Production
npm run build
npm start

# Database
npm run prisma:migrate   # prisma migrate dev
npm run prisma:studio    # open Prisma Studio GUI
npx prisma generate      # regenerate client after schema changes
```

## Folder Structure
```
server/
├── prisma/
│   ├── schema.prisma           ← database schema
│   ├── seed.ts                 ← seed script
│   └── migrations/             ← migration history (gitignored)
├── src/
│   ├── app.ts                  ← Express app setup and route registration
│   ├── config/
│   │   ├── db.ts               ← Prisma client singleton
│   │   └── env.ts              ← environment variable validation
│   ├── constants/
│   │   ├── httpStatus.ts       ← HTTP status code constants
│   │   ├── messageCodes.ts     ← response message code keys
│   │   ├── messages.ts         ← bilingual (EN/ID) message strings
│   │   └── permissions.ts      ← PERMISSIONS.* constants
│   ├── exceptions/
│   │   ├── AppError.ts         ← base error class
│   │   ├── BadRequestException.ts
│   │   ├── ConflictException.ts
│   │   ├── ForbiddenException.ts
│   │   ├── NotFoundException.ts
│   │   ├── UnauthorizedException.ts
│   │   └── ValidationException.ts  ← 422 with field-keyed bilingual errors
│   ├── interfaces/
│   │   ├── common.interface.ts ← shared pagination and response types
│   │   └── pharmacy.interface.ts
│   ├── middlewares/
│   │   ├── auth.ts             ← authenticate, requirePharmacyAccess, requirePermission
│   │   ├── errorHandler.ts     ← global error handler
│   │   ├── maintenanceMode.ts
│   │   ├── rateLimiter.ts
│   │   ├── roleGuard.ts
│   │   └── validate.ts         ← Zod request validation (body / query)
│   ├── modules/
│   │   ├── auth/
│   │   ├── business-parameters/
│   │   ├── customers/
│   │   ├── distributors/
│   │   ├── invoices/
│   │   ├── medicine-classes/
│   │   ├── medicine-shapes/
│   │   ├── medicine-types/
│   │   ├── medicines/
│   │   ├── permissions/
│   │   ├── pharmacies/
│   │   ├── purchase-orders/
│   │   ├── reports/
│   │   │   └── reports.generator.ts  ← cronjob Excel file generator
│   │   ├── roles/
│   │   ├── sales/
│   │   ├── stock/
│   │   ├── stock-disposals/
│   │   ├── stock-returns/
│   │   ├── system-parameters/
│   │   └── users/
│   │       (each module contains: *.routes.ts · *.controller.ts · *.service.ts · *.validation.ts · *.interface.ts)
│   ├── types/
│   │   └── express.d.ts        ← Express Request augmentation (req.user)
│   └── utils/
│       ├── cache.ts            ← in-memory cache (swappable to Redis)
│       ├── exportHelper.ts     ← Excel/CSV builder for the report generator
│       ├── generateDocNumbers.ts ← sequential daily doc number generator
│       ├── parseUuid.ts        ← uuid → id lookup helper
│       ├── responseHelper.ts   ← sendSuccess, sendCreated, sendPaginated, sendNoContent
│       └── stockMovementRules.ts ← valid (type, reason) combinations
└── storage/                    ← generated report files (gitignored)
    └── reports/
        └── pharmacy-{id}/
            └── {type}-{yyyyMMdd}-{yyyyMMdd}.xlsx
```

## API Modules

| Base Path | Description |
|---|---|
| `/api/auth` | Login, register, select pharmacy |
| `/api/me` | Current user profile and password change |
| `/api/users` | User management and pharmacy placement |
| `/api/pharmacies` | Pharmacy management |
| `/api/roles` | Role management |
| `/api/permissions` | Permission management |
| `/api/system-parameters` | System-level configuration |
| `/api/business-parameters` | Pharmacy-level config (margin %, tax, etc.) |
| `/api/distributors` | Distributor management |
| `/api/customers` | Customer management |
| `/api/medicines` | Medicine catalog |
| `/api/medicine-shapes` | Medicine shape lookup data |
| `/api/medicine-types` | Medicine type lookup data |
| `/api/medicine-classes` | Medicine class lookup data |
| `/api/purchase-orders` | Purchase order creation and management |
| `/api/invoices` | Purchase invoices and stock intake |
| `/api/stock` | Stock levels and movement history |
| `/api/stock-returns` | Purchase returns to distributor |
| `/api/stock-disposals` | Expired / damaged stock disposal |
| `/api/sales` | Sales transactions |
| `/api/reports` | Analytics and reporting |

## Reports

All endpoints are read-only and require the `reports.read` permission.

| Endpoint | Description |
|---|---|
| `GET /api/reports/sales` | Revenue summary, top medicines, daily revenue breakdown |
| `GET /api/reports/purchases` | Purchase summary grouped by distributor + invoice list |
| `GET /api/reports/inventory` | Stock levels, low stock alerts, expiry alerts |
| `GET /api/reports/stock-movements` | Movement log with before/after quantities |
| `GET /api/reports/disposals` | Disposal summary grouped by reason + detail list |
| `GET /api/reports/returns` | Return summary grouped by distributor + detail list |

**Date range** — pass `dateFrom` / `dateTo` (ISO strings) for an explicit range, or `period=monthly` for the current calendar month. Omitting both returns all-time data.

**Extra filters** — `purchases` and `returns` accept `distributorUuid`; `stock-movements` accepts `medicineUuid`, `type`, and `reason`.

**Caching** — responses with no date filter are cached in-memory (5 min, per pharmacy). Date-filtered queries always hit the database. `src/utils/cache.ts` is designed to swap in Redis without changing callers.

**Excel export** — the API returns JSON; clients generate Excel client-side. `reports.generator.ts` is used by cronjobs to pre-generate `.xlsx` files on the server (see below).

## Scheduled Report Generation

`reports.generator.ts` exposes:

```ts
generateReport(pharmacyId: number, type: ReportType, dateFrom: Date, dateTo: Date): Promise<GeneratedReportMeta>
```

Wire this into a cronjob (e.g. first day of month) passing the previous period's start/end dates. Files are written to `storage/reports/pharmacy-{id}/{type}-{yyyyMMdd}-{yyyyMMdd}.xlsx`. The `storage/` directory is gitignored.

## Auth & Authorization

1. `POST /api/auth/login` → JWT without `pharmacyId`
2. `POST /api/auth/select-pharmacy` → JWT with `pharmacyId` + permissions baked in
3. All module routes require `authenticate` + `requirePharmacyAccess`
4. Per-route `requirePermission(PERMISSIONS.X)` checks the JWT claims — no DB hit at request time
5. `PLATFORM_ADMIN` bypasses all permission and pharmacy-access checks

## Document Numbering

Auto-generated sequential daily doc numbers: `{TYPE}-{PHARMACY_CODE}-{YYYYMMDD}-{SEQ}` (e.g. `INV-APK1-20240115-001`). Types: `PO`, `INV`, `SL`, `SR`, `SD`. Sequence resets daily.

## Stock System

- `Stock` — one record per `(pharmacyId, medicineId)` tracking aggregate `totalPieces` and pricing
- `StockDetail` — per invoice line item (batch/barcode level)
- `StockMovement` — immutable audit log of every IN/OUT with `quantityBefore`/`quantityAfter`

Selling price: if `Stock.isManualPrice = true`, use `sellingPrice`; otherwise `calculatedPrice = finalPrice + margin%`. Margin is read from `BusinessParameter` key `MARGIN_PERCENTAGE`.
