import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaLogLevels: Prisma.LogLevel[] = ['query', 'error', 'warn']

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({
    log: prismaLogLevels,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}