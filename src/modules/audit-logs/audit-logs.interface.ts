import { Prisma } from '@prisma/client'

export interface AuditLogResponse {
  uuid: string
  action: string
  entityType: string
  entityUuid: string | null
  entityLabel: string | null
  changes: Prisma.JsonValue | null
  metadata: Prisma.JsonValue | null
  user: { uuid: string; name: string } | null
  ipAddress: string | null
  createdAt: Date
}

export interface AuditActionCount {
  action: string
  count: number
}
