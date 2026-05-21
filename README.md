# Pharmacy App — Backend

REST API for pharmacy management system built with Node.js, Express, TypeScript, Prisma, and PostgreSQL.

## Tech Stack
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt

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

### Run Development Server
```bash
npm run dev
```

### Prisma
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio
```

## Folder Structure
```
src/
├── config/         ← DB and env setup
├── constants/      ← HTTP status, roles
├── entity/         ← domain interfaces
├── interfaces/     ← request/response types
├── exceptions/     ← custom error classes
├── middlewares/    ← auth, roleGuard, rateLimiter, errorHandler
├── modules/        ← feature modules (auth, medicines, sales...)
├── utils/          ← helper functions
└── app.ts          ← entry point
```