# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # ts-node-dev with hot reload + path aliases

# Build & Production
npm run build            # tsc + tsc-alias (resolves path aliases in dist/)
npm start                # node dist/app.js

# Database
npm run prisma:migrate   # prisma migrate dev
npm run prisma:studio    # open Prisma Studio GUI
npx prisma generate      # regenerate Prisma client after schema changes
```

There are no test scripts configured.

## Architecture

### Multi-tenant Pharmacy SaaS
Each resource is scoped to a `pharmacyId`. Users belong to one or more pharmacies via the `UserPharmacy` join table. When a user authenticates, they receive a JWT without a `pharmacyId`; a second call (`POST /api/auth/select-pharmacy`) re-issues the token with the selected pharmacy baked in. All module routes enforce `requirePharmacyAccess` to block requests with no pharmacy in the token.

### Module Layout (`src/modules/<name>/`)
Every feature module contains exactly five files:
- `*.routes.ts` — Express Router; applies `authenticate`, `requirePharmacyAccess`, and per-route `requirePermission` guards
- `*.controller.ts` — thin layer; parses/validates request, calls service, calls `sendSuccess`/`sendPaginated`/etc.
- `*.service.ts` — all business logic and Prisma queries; exported as plain async functions (no class)
- `*.validation.ts` — Zod schemas; types are inferred via `z.infer<>` and re-exported for use in service/controller
- `*.interface.ts` — TypeScript interfaces for response shapes

### Path Aliases (tsconfig.json)
Imports use aliases instead of relative paths:
`@modules/*`, `@config/*`, `@constants`, `@constants/*`, `@exceptions`, `@exceptions/*`, `@middlewares/*`, `@utils`, `@utils/*`, `@interfaces`, `@interfaces/*`, `@entity/*`, `@types/*`

`tsc-alias` rewrites these in the compiled output so `npm start` works without `tsconfig-paths`.

### Auth & Authorization Flow
1. `authenticate` middleware verifies the Bearer JWT and attaches `req.user` (id, uuid, pharmacyId, roleId, platformRole, permissions[]).
2. `requirePharmacyAccess` checks that `req.user.pharmacyId` is set.
3. `requirePermission(PERMISSIONS.X)` checks the `permissions` array in the JWT — no DB hit at request time.
4. Permissions are loaded into the JWT at `select-pharmacy` time using a two-layer system: global `RolePermission` rows (pharmacyId = null) merged with per-pharmacy overrides (pharmacyId set), with pharmacy-level rows taking precedence.
5. `PLATFORM_ADMIN` bypasses all permission and pharmacy-access checks.

### Permission Constants
All permission strings are in `src/constants/permissions.ts` as `PERMISSIONS.<KEY>` (format: `module.action`, e.g. `invoices.create`). Always reference the constant, never a raw string.

### Response Shape
All responses go through helpers in `src/utils/responseHelper.ts`:
```ts
sendSuccess(res, MESSAGE_CODE, data)
sendCreated(res, MESSAGE_CODE, data)
sendPaginated(res, MESSAGE_CODE, data[], meta)
sendNoContent(res, MESSAGE_CODE)
```
Shape: `{ success, code, message: { en, id }, data, errors, meta }`. Messages are bilingual (English + Indonesian). Message codes live in `src/constants/messageCodes.ts`; their bilingual strings in `src/constants/messages.ts`.

### Error Handling
Throw subclasses of `AppError` from services/controllers — they propagate to the global `errorHandler` middleware:
- `BadRequestException` (400), `UnauthorizedException` (401), `ForbiddenException` (403), `NotFoundException` (404), `ConflictException` (409)
- `ValidationException` receives a field-keyed bilingual error map and returns HTTP 422.
- Unexpected errors are caught and returned as HTTP 500 without leaking stack traces.

### Stock System
The inventory uses a two-layer model:
- `Stock` — one record per `(pharmacyId, medicineId)` tracking aggregate `totalPieces` and pricing
- `StockDetail` — one record per invoice line item (batch/barcode level), linked to an `InvoiceDetail`
- `StockMovement` — immutable audit log of every IN/OUT with `quantityBefore`/`quantityAfter`

`src/utils/stockMovementRules.ts` enforces valid `(type, reason)` combinations (e.g., PURCHASE can only be IN, SALE can only be OUT).

Selling price logic: if `Stock.isManualPrice = true`, use `sellingPrice`; otherwise use `calculatedPrice` (= `finalPrice + margin%`). Margin percentage is read from `BusinessParameter` key `MARGIN_PERCENTAGE`.

### Document Numbers
`src/utils/generateDocNumbers.ts` generates sequential daily doc numbers in the format `{TYPE}-{PHARMACY_CODE}-{YYYYMMDD}-{SEQ}` (e.g., `INV-APK1-20240115-001`). Types: `PO`, `INV`, `SL`, `SR`, `SD`. The sequence resets daily and is drawn from `sys_doc_sequences` with an atomic upsert, so concurrent requests never get the same number (gaps are possible when a transaction rolls back).

### Database Schema Conventions
- All models have `id` (int PK) + `uuid` (public-facing, used in API routes, never expose raw `id`)
- Soft deletes via `deletedAt` + `status: RecordStatus` (ACTIVE/INACTIVE/DELETED)
- Full audit trail: `createdById`, `updatedById`, `deletedById` on every model
- Table prefixes: `mst_` (master/config), `trx_` (transactions), `inv_` (inventory)
- Decimal monetary fields use `@db.Decimal(12, 2)`; always use Prisma's `Decimal` type, not JS floats

### Express Version Note
The project uses Express 5 (`"express": "^5.2.1"`). Async route handlers throw directly to Express without needing try/catch or `next(err)` in controllers — but the codebase currently wraps calls in try/catch anyway for explicit control.
