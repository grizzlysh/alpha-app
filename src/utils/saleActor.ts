import { PlatformRole } from '@prisma/client'
import { PERMISSIONS } from '@constants/permissions'
import type { SaleActor } from '@modules/sales/sales.service'

/** Who is selling, and whether they may change prices / exceed the discount cap. */
export const saleActorOf = (req: { user?: Express.Request['user'] }): SaleActor => ({
  userId: req.user!.id,
  canOverridePrice:
    req.user!.platformRole === PlatformRole.PLATFORM_ADMIN ||
    req.user!.permissions.includes(PERMISSIONS.SALES_OVERRIDE_PRICE),
})
