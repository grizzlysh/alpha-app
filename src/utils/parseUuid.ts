import { BadRequestException } from '@exceptions/BadRequestException'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseUuid(value: string, label = 'UUID'): string {
  if (!UUID_RE.test(value)) {
    throw new BadRequestException(`Invalid ${label}`)
  }
  return value
}
