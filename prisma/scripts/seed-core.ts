import {
  PrismaClient,
  PlatformRole,
  AppRole,
  PharmacyCategory,
  RecordStatus,
  DataType,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ── Permission definitions ────────────────────────────────────────────────────

const PERMISSIONS = [
  { module: 'medicine_shapes', action: 'read' },
  { module: 'medicine_shapes', action: 'create' },
  { module: 'medicine_shapes', action: 'update' },
  { module: 'medicine_shapes', action: 'delete' },
  { module: 'medicine_types', action: 'read' },
  { module: 'medicine_types', action: 'create' },
  { module: 'medicine_types', action: 'update' },
  { module: 'medicine_types', action: 'delete' },
  { module: 'medicine_classes', action: 'read' },
  { module: 'medicine_classes', action: 'create' },
  { module: 'medicine_classes', action: 'update' },
  { module: 'medicine_classes', action: 'delete' },
  { module: 'medicines', action: 'read' },
  { module: 'medicines', action: 'create' },
  { module: 'medicines', action: 'update' },
  { module: 'medicines', action: 'delete' },
  { module: 'distributors', action: 'read' },
  { module: 'distributors', action: 'create' },
  { module: 'distributors', action: 'update' },
  { module: 'distributors', action: 'delete' },
  { module: 'customers', action: 'read' },
  { module: 'customers', action: 'create' },
  { module: 'customers', action: 'update' },
  { module: 'customers', action: 'delete' },
  { module: 'stock', action: 'read' },
  { module: 'stock', action: 'adjust' },
  { module: 'purchase_orders', action: 'read' },
  { module: 'purchase_orders', action: 'create' },
  { module: 'purchase_orders', action: 'update' },
  { module: 'purchase_orders', action: 'delete' },
  { module: 'invoices', action: 'read' },
  { module: 'invoices', action: 'create' },
  { module: 'invoices', action: 'update' },
  { module: 'invoices', action: 'delete' },
  { module: 'invoices', action: 'verify' },
  { module: 'sales', action: 'read' },
  { module: 'sales', action: 'create' },
  { module: 'sales', action: 'update' },
  { module: 'sales', action: 'delete' },
  { module: 'stock_return', action: 'read' },
  { module: 'stock_return', action: 'create' },
  { module: 'stock_return', action: 'update' },
  { module: 'stock_return', action: 'delete' },
  { module: 'stock_disposal', action: 'read' },
  { module: 'stock_disposal', action: 'create' },
  { module: 'stock_disposal', action: 'update' },
  { module: 'reports', action: 'read' },
  { module: 'reports', action: 'export' },
  { module: 'users', action: 'read' },
  { module: 'users', action: 'create' },
  { module: 'users', action: 'update' },
  { module: 'users', action: 'delete' },
  { module: 'permissions', action: 'read' },
  { module: 'roles', action: 'read' },
  { module: 'roles', action: 'create' },
  { module: 'roles', action: 'update' },
  { module: 'roles', action: 'delete' },
  { module: 'licenses', action: 'read' },
  { module: 'licenses', action: 'create' },
  { module: 'licenses', action: 'update' },
  { module: 'licenses', action: 'delete' },
  { module: 'pharmacies', action: 'read' },
  { module: 'pharmacies', action: 'create' },
  { module: 'pharmacies', action: 'update' },
  { module: 'pharmacies', action: 'delete' },
  { module: 'business_parameters', action: 'read' },
  { module: 'business_parameters', action: 'update' },
  { module: 'system_parameters', action: 'read' },
  { module: 'system_parameters', action: 'update' },
  { module: 'settings', action: 'read' },
  { module: 'settings', action: 'update' },
  { module: 'sign', action: 'standard' },
  { module: 'sign', action: 'full' },
  { module: 'dashboard', action: 'read' },
  { module: 'dashboard', action: 'advanced' },
]

const OWNER_PERMISSIONS = PERMISSIONS.map((p) => `${p.module}.${p.action}`)

const PHARMACY_USER_EXCLUDED_MODULES = ['users', 'roles', 'permissions', 'pharmacies', 'system_parameters']
const PHARMACY_USER_PERMISSIONS = PERMISSIONS
  .filter((p) => !PHARMACY_USER_EXCLUDED_MODULES.includes(p.module))
  .map((p) => `${p.module}.${p.action}`)

const HEAD_PHARMACIST_EXCLUDED_MODULES = ['pharmacies', 'system_parameters']
const HEAD_PHARMACIST_PERMISSIONS = PERMISSIONS
  .filter((p) => !HEAD_PHARMACIST_EXCLUDED_MODULES.includes(p.module))
  .map((p) => `${p.module}.${p.action}`)

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding core data...')

  // ── 1. Permissions ────────────────────────────────────────────────────────
  console.log('Creating permissions...')
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      update: {},
      create: { module: p.module, action: p.action },
    })
  }
  const allPermissions = await prisma.permission.findMany()
  const permMap = new Map(allPermissions.map((p) => [`${p.module}.${p.action}`, p.id]))

  // ── 2. Platform admin ─────────────────────────────────────────────────────
  console.log('Creating platform admin...')
  const adminPassword = await bcrypt.hash('Admin@123', 10)
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@pharma.com' },
    update: {},
    create: {
      name: 'Platform Admin',
      email: 'admin@pharma.com',
      password: adminPassword,
      platformRole: PlatformRole.PLATFORM_ADMIN,
      status: RecordStatus.ACTIVE,
    },
  })

  // ── 3. Owner ──────────────────────────────────────────────────────────────
  console.log('Creating owner...')
  const ownerPassword = await bcrypt.hash('Owner@123', 10)
  const owner = await prisma.user.upsert({
    where: { email: 'owner@pharma.com' },
    update: {},
    create: {
      name: 'Pharmacy Owner',
      email: 'owner@pharma.com',
      password: ownerPassword,
      status: RecordStatus.ACTIVE,
    },
  })

  // ── 4. Pharmacist ─────────────────────────────────────────────────────────
  console.log('Creating pharmacist...')
  const pharmacistPassword = await bcrypt.hash('Pharmacist@123', 10)
  const pharmacist = await prisma.user.upsert({
    where: { email: 'pharmacist@pharma.com' },
    update: {},
    create: {
      name: 'Ahmad Yusuf',
      email: 'pharmacist@pharma.com',
      password: pharmacistPassword,
      status: RecordStatus.ACTIVE,
    },
  })

  // ── 4b. Head pharmacist ───────────────────────────────────────────────────
  console.log('Creating head pharmacist...')
  const headPharmacistPassword = await bcrypt.hash('HeadPharmacist@123', 10)
  const headPharmacist = await prisma.user.upsert({
    where: { email: 'headpharmacist@pharma.com' },
    update: {},
    create: {
      name: 'Dr. Siti Rahayu',
      email: 'headpharmacist@pharma.com',
      password: headPharmacistPassword,
      status: RecordStatus.ACTIVE,
    },
  })

  // ── 5. Roles ──────────────────────────────────────────────────────────────
  console.log('Creating roles...')
  const ownerRole =
    (await prisma.role.findFirst({ where: { pharmacyId: null, name: 'Owner' } })) ??
    (await prisma.role.create({
      data: {
        pharmacyId: null,
        name: 'Owner',
        type: AppRole.OWNER,
        description: 'Pharmacy owner with full access',
        requiresLicense: false,
        status: RecordStatus.ACTIVE,
      },
    }))

  const pharmacistRole =
    (await prisma.role.findFirst({ where: { pharmacyId: null, name: 'Pharmacist' } })) ??
    (await prisma.role.create({
      data: {
        pharmacyId: null,
        name: 'Pharmacist',
        type: AppRole.PHARMACIST,
        description: 'Licensed pharmacist with dispensing access',
        requiresLicense: true,
        status: RecordStatus.ACTIVE,
      },
    }))

  const headPharmacistRole =
    (await prisma.role.findFirst({ where: { pharmacyId: null, name: 'Head Pharmacist' } })) ??
    (await prisma.role.create({
      data: {
        pharmacyId: null,
        name: 'Head Pharmacist',
        type: AppRole.HEAD_PHARMACIST,
        description: 'Senior licensed pharmacist with staff and license management access',
        requiresLicense: true,
        status: RecordStatus.ACTIVE,
      },
    }))

  // ── 6. Role permissions ───────────────────────────────────────────────────
  console.log('Assigning permissions to roles...')
  for (const key of OWNER_PERMISSIONS) {
    const permId = permMap.get(key)
    if (!permId) continue
    const exists = await prisma.rolePermission.findFirst({
      where: { roleId: ownerRole.id, permissionId: permId, pharmacyId: null },
    })
    if (!exists) {
      await prisma.rolePermission.create({
        data: { roleId: ownerRole.id, permissionId: permId, pharmacyId: null, isEnabled: true },
      })
    }
  }
  for (const key of PHARMACY_USER_PERMISSIONS) {
    const permId = permMap.get(key)
    if (!permId) continue
    const exists = await prisma.rolePermission.findFirst({
      where: { roleId: pharmacistRole.id, permissionId: permId, pharmacyId: null },
    })
    if (!exists) {
      await prisma.rolePermission.create({
        data: { roleId: pharmacistRole.id, permissionId: permId, pharmacyId: null, isEnabled: true },
      })
    }
  }
  for (const key of HEAD_PHARMACIST_PERMISSIONS) {
    const permId = permMap.get(key)
    if (!permId) continue
    const exists = await prisma.rolePermission.findFirst({
      where: { roleId: headPharmacistRole.id, permissionId: permId, pharmacyId: null },
    })
    if (!exists) {
      await prisma.rolePermission.create({
        data: { roleId: headPharmacistRole.id, permissionId: permId, pharmacyId: null, isEnabled: true },
      })
    }
  }

  // ── 7. Pharmacy (required for business parameters and placements) ─────────
  console.log('Creating pharmacy...')
  const pharmacy = await prisma.pharmacy.upsert({
    where: { code: 'APK1' },
    update: {},
    create: {
      name: 'Apotek Sejahtera',
      code: 'APK1',
      category: PharmacyCategory.APOTEK,
      address: 'Jl. Merdeka No. 1, Jakarta Pusat 10110',
      phone: '021-12345678',
      email: 'apotek@pharma.com',
      status: RecordStatus.ACTIVE,
      createdById: platformAdmin.id,
      updatedById: platformAdmin.id,
    },
  })

  // ── 8. Placements ─────────────────────────────────────────────────────────
  console.log('Assigning users to pharmacy...')
  const ownerPlacementExists = await prisma.placement.findFirst({
    where: { userId: owner.id, pharmacyId: pharmacy.id, status: RecordStatus.ACTIVE },
  })
  if (!ownerPlacementExists) {
    await prisma.placement.create({
      data: { userId: owner.id, pharmacyId: pharmacy.id, roleId: ownerRole.id, status: RecordStatus.ACTIVE },
    })
  }
  const pharmacistPlacementExists = await prisma.placement.findFirst({
    where: { userId: pharmacist.id, pharmacyId: pharmacy.id, status: RecordStatus.ACTIVE },
  })
  if (!pharmacistPlacementExists) {
    await prisma.placement.create({
      data: { userId: pharmacist.id, pharmacyId: pharmacy.id, roleId: pharmacistRole.id, status: RecordStatus.ACTIVE },
    })
  }
  const headPharmacistPlacementExists = await prisma.placement.findFirst({
    where: { userId: headPharmacist.id, pharmacyId: pharmacy.id, status: RecordStatus.ACTIVE },
  })
  if (!headPharmacistPlacementExists) {
    await prisma.placement.create({
      data: { userId: headPharmacist.id, pharmacyId: pharmacy.id, roleId: headPharmacistRole.id, status: RecordStatus.ACTIVE },
    })
  }

  // ── 9. System parameters ──────────────────────────────────────────────────
  console.log('Creating system parameters...')
  const systemParams = [
    { key: 'APP_NAME',                    value: 'Alpha Pharmacy',          dataType: DataType.STRING,  description: 'Application display name' },
    { key: 'APP_VERSION',                 value: '1.0.0',                   dataType: DataType.STRING,  description: 'Current application version' },
    { key: 'SUPPORT_EMAIL',               value: 'support@alphapharma.id',  dataType: DataType.STRING,  description: 'Support contact email shown to users' },
    { key: 'DEFAULT_LANGUAGE',            value: 'id',                      dataType: DataType.STRING,  description: 'Default UI language (id = Bahasa Indonesia)' },
    { key: 'DEFAULT_TIMEZONE',            value: 'Asia/Jakarta',            dataType: DataType.STRING,  description: 'Default timezone for date/time display' },
    { key: 'DEFAULT_CURRENCY',            value: 'IDR',                     dataType: DataType.STRING,  description: 'Currency code used across the platform' },
    { key: 'DEFAULT_PASSWORD',            value: 'password',                dataType: DataType.STRING,  description: 'Default password for all created users' },
    { key: 'MAX_LOGIN_ATTEMPTS',          value: '5',                       dataType: DataType.NUMBER,  description: 'Maximum consecutive failed login attempts before lockout' },
    { key: 'SESSION_TIMEOUT_MINUTES',     value: '480',                     dataType: DataType.NUMBER,  description: 'Access token lifetime in minutes (8 hours)' },
    { key: 'PASSWORD_MIN_LENGTH',         value: '8',                       dataType: DataType.NUMBER,  description: 'Minimum password length required for all users' },
    { key: 'ALLOW_EXPIRED_MEDICINE_SALE', value: 'false',                   dataType: DataType.BOOLEAN, description: 'Allow pharmacies to sell medicines past their expiry date' },
    { key: 'MAINTENANCE_MODE',            value: 'false',                   dataType: DataType.BOOLEAN, description: 'When true, only platform admins can access the system' },
  ]
  for (const sp of systemParams) {
    await prisma.systemParameter.upsert({
      where: { key: sp.key },
      update: {},
      create: { ...sp, createdById: platformAdmin.id, updatedById: platformAdmin.id },
    })
  }

  // ── 10. Business parameters ───────────────────────────────────────────────
  console.log('Creating business parameters...')
  const businessParams = [
    { key: 'MARGIN_PERCENTAGE',         value: '20',  dataType: DataType.PERCENTAGE, description: 'Default selling price margin applied over purchase price' },
    { key: 'PPN_PERCENTAGE_SELL',       value: '11',  dataType: DataType.PERCENTAGE, description: 'PPN percentage charged to customers on sales (output VAT)' },
    { key: 'PPN_PERCENTAGE_BUY',        value: '11',  dataType: DataType.PERCENTAGE, description: 'PPN percentage on purchases from distributors (input VAT)' },
    { key: 'MAX_DISCOUNT_PERCENTAGE',   value: '30',  dataType: DataType.PERCENTAGE, description: 'Maximum discount percentage staff can apply to a sale item' },
    { key: 'REORDER_LEVEL_DEFAULT',     value: '10',  dataType: DataType.NUMBER,     description: 'Default low-stock alert threshold in pieces' },
    { key: 'LOW_STOCK_ALERT_THRESHOLD', value: '5',   dataType: DataType.NUMBER,     description: 'Critical stock threshold in pieces before urgent reorder alert' },
    { key: 'ALLOW_FEFO_OVERRIDE',       value: 'true',dataType: DataType.BOOLEAN,    description: 'Allow staff to select non-FEFO batches during sale' },
    { key: 'CREDIT_PAYMENT_DAYS',       value: '30',  dataType: DataType.NUMBER,     description: 'Default credit term in days for non-cash sales' },
    { key: 'RETURN_POLICY_DAYS',        value: '7',   dataType: DataType.NUMBER,     description: 'Number of days after sale within which a return is accepted' },
    { key: 'RECEIPT_HEADER',            value: 'Apotek Sejahtera', dataType: DataType.STRING, description: 'Header text printed on customer receipts' },
    { key: 'RECEIPT_FOOTER',            value: 'Terima kasih atas kepercayaan Anda. Semoga lekas sembuh!', dataType: DataType.STRING, description: 'Footer text printed on customer receipts' },
  ]
  for (const bp of businessParams) {
    const exists = await prisma.businessParameter.findUnique({
      where: { pharmacyId_key: { pharmacyId: pharmacy.id, key: bp.key } },
    })
    if (!exists) {
      await prisma.businessParameter.create({
        data: { pharmacyId: pharmacy.id, ...bp, createdById: owner.id, updatedById: owner.id },
      })
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\nCore seed complete!')
  console.log('─────────────────────────────────────────────────────────────')
  console.log('Platform Admin   →  admin@pharma.com             /  Admin@123')
  console.log('Owner            →  owner@pharma.com             /  Owner@123')
  console.log('Head Pharmacist  →  headpharmacist@pharma.com    /  HeadPharmacist@123')
  console.log('Pharmacist       →  pharmacist@pharma.com        /  Pharmacist@123')
  console.log('Pharmacy         →  Apotek Sejahtera (APK1)')
  console.log('Roles            →  Owner (all), Head Pharmacist (staff+ops, license required), Pharmacist (limited, license required)')
  console.log('System params    →  12 entries')
  console.log('Business params  →  11 entries (scoped to APK1)')
  console.log('─────────────────────────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
