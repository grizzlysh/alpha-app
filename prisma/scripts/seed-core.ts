import { PrismaClient, PlatformRole, AppRole, RecordStatus, DataType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ── Permission definitions ────────────────────────────────────────────────────

const PERMISSIONS = [
  { module: 'medicine_shapes',    action: 'read' },
  { module: 'medicine_shapes',    action: 'create' },
  { module: 'medicine_shapes',    action: 'update' },
  { module: 'medicine_shapes',    action: 'delete' },
  { module: 'medicine_types',     action: 'read' },
  { module: 'medicine_types',     action: 'create' },
  { module: 'medicine_types',     action: 'update' },
  { module: 'medicine_types',     action: 'delete' },
  { module: 'medicine_classes',   action: 'read' },
  { module: 'medicine_classes',   action: 'create' },
  { module: 'medicine_classes',   action: 'update' },
  { module: 'medicine_classes',   action: 'delete' },
  { module: 'medicines',          action: 'read' },
  { module: 'medicines',          action: 'create' },
  { module: 'medicines',          action: 'update' },
  { module: 'medicines',          action: 'delete' },
  { module: 'distributors',       action: 'read' },
  { module: 'distributors',       action: 'create' },
  { module: 'distributors',       action: 'update' },
  { module: 'distributors',       action: 'delete' },
  { module: 'customers',          action: 'read' },
  { module: 'customers',          action: 'create' },
  { module: 'customers',          action: 'update' },
  { module: 'customers',          action: 'delete' },
  { module: 'stock',              action: 'read' },
  { module: 'stock',              action: 'adjust' },
  { module: 'stock_movements',    action: 'read' },
  { module: 'purchase_orders',    action: 'read' },
  { module: 'purchase_orders',    action: 'create' },
  { module: 'purchase_orders',    action: 'update' },
  { module: 'purchase_orders',    action: 'delete' },
  { module: 'invoices',           action: 'read' },
  { module: 'invoices',           action: 'create' },
  { module: 'invoices',           action: 'update' },
  { module: 'invoices',           action: 'delete' },
  { module: 'invoices',           action: 'verify' },
  { module: 'sales',              action: 'read' },
  { module: 'sales',              action: 'create' },
  { module: 'sales',              action: 'update' },
  { module: 'sales',              action: 'delete' },
  { module: 'stock_return',       action: 'read' },
  { module: 'stock_return',       action: 'create' },
  { module: 'stock_return',       action: 'update' },
  { module: 'stock_return',       action: 'delete' },
  { module: 'stock_disposal',     action: 'read' },
  { module: 'stock_disposal',     action: 'create' },
  { module: 'stock_disposal',     action: 'update' },
  { module: 'stock_disposal',     action: 'delete' },
  { module: 'storage',            action: 'read' },
  { module: 'storage',            action: 'create' },
  { module: 'storage',            action: 'update' },
  { module: 'storage',            action: 'delete' },
  { module: 'doctors',            action: 'read' },
  { module: 'doctors',            action: 'create' },
  { module: 'doctors',            action: 'update' },
  { module: 'doctors',            action: 'delete' },
  { module: 'prescriptions',      action: 'read' },
  { module: 'prescriptions',      action: 'create' },
  { module: 'prescriptions',      action: 'update' },
  { module: 'prescriptions',      action: 'delete' },
  { module: 'reports',            action: 'read' },
  { module: 'reports',            action: 'export' },
  { module: 'users',              action: 'read' },
  { module: 'users',              action: 'create' },
  { module: 'users',              action: 'update' },
  { module: 'users',              action: 'delete' },
  { module: 'permissions',        action: 'read' },
  { module: 'roles',              action: 'read' },
  { module: 'roles',              action: 'create' },
  { module: 'roles',              action: 'update' },
  { module: 'roles',              action: 'delete' },
  { module: 'licenses',           action: 'read' },
  { module: 'licenses',           action: 'create' },
  { module: 'licenses',           action: 'update' },
  { module: 'licenses',           action: 'delete' },
  { module: 'pharmacies',         action: 'read' },
  { module: 'pharmacies',         action: 'create' },
  { module: 'pharmacies',         action: 'update' },
  { module: 'pharmacies',         action: 'delete' },
  { module: 'business_parameters',action: 'read' },
  { module: 'business_parameters',action: 'update' },
  { module: 'system_parameters',  action: 'read' },
  { module: 'system_parameters',  action: 'update' },
  { module: 'settings',           action: 'read' },
  { module: 'settings',           action: 'update' },
  { module: 'dashboard',          action: 'read' },
  { module: 'dashboard',          action: 'advanced' },
  { module: 'sign',               action: 'standard' },
  { module: 'sign',               action: 'full' },
]

// ── Role permission sets ──────────────────────────────────────────────────────

const all = PERMISSIONS.map((p) => `${p.module}.${p.action}`)

const excluded = (...modules: string[]) =>
  PERMISSIONS.filter((p) => !modules.includes(p.module)).map((p) => `${p.module}.${p.action}`)

const only = (...keys: string[]) => keys

const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: all,

  ADMIN: excluded('system_parameters', 'pharmacies'),

  HEAD_PHARMACIST: excluded('system_parameters', 'pharmacies'),

  PHARMACIST: excluded('users', 'roles', 'permissions', 'pharmacies', 'system_parameters'),

  CASHIER: only(
    'customers.read', 'customers.create', 'customers.update',
    'medicines.read',
    'stock.read',
    'sales.read', 'sales.create', 'sales.update', 'sales.delete',
    'prescriptions.read',
    'doctors.read',
    'storage.read',
    'dashboard.read',
    'sign.standard',
  ),

  DOCTOR: only(
    'customers.read',
    'medicines.read',
    'doctors.read', 'doctors.create', 'doctors.update', 'doctors.delete',
    'prescriptions.read', 'prescriptions.create', 'prescriptions.update', 'prescriptions.delete',
    'dashboard.read',
  ),
}

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

  // ── 3. Global roles ───────────────────────────────────────────────────────
  console.log('Creating global roles...')

  const roleDefs: { name: string; type: AppRole; description: string; requiresLicense: boolean }[] = [
    { name: 'Owner',           type: AppRole.OWNER,           description: 'Pharmacy owner with full access',                                  requiresLicense: false },
    { name: 'Admin',           type: AppRole.ADMIN,           description: 'Pharmacy administrator with full operational access',               requiresLicense: false },
    { name: 'Head Pharmacist', type: AppRole.HEAD_PHARMACIST, description: 'Senior licensed pharmacist with staff and license management access', requiresLicense: true  },
    { name: 'Pharmacist',      type: AppRole.PHARMACIST,      description: 'Licensed pharmacist with dispensing access',                        requiresLicense: true  },
    { name: 'Cashier',         type: AppRole.CASHIER,         description: 'Cashier with sales and customer access',                            requiresLicense: false },
    { name: 'Doctor',          type: AppRole.DOCTOR,          description: 'Doctor with prescription management access',                        requiresLicense: true  },
  ]

  const roles: Record<string, { id: number }> = {}
  for (const def of roleDefs) {
    const existing = await prisma.role.findFirst({ where: { pharmacyId: null, name: def.name } })
    roles[def.type] = existing ?? await prisma.role.create({
      data: {
        pharmacyId: null,
        name: def.name,
        type: def.type,
        description: def.description,
        requiresLicense: def.requiresLicense,
        status: RecordStatus.ACTIVE,
      },
    })
  }

  // ── 4. Role permissions ───────────────────────────────────────────────────
  console.log('Assigning permissions to roles...')
  for (const [roleType, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roles[roleType]
    if (!role) continue
    for (const key of permKeys) {
      const permId = permMap.get(key)
      if (!permId) continue
      const exists = await prisma.rolePermission.findFirst({
        where: { roleId: role.id, permissionId: permId, pharmacyId: null },
      })
      if (!exists) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: permId, pharmacyId: null, isEnabled: true },
        })
      }
    }
  }

  // ── 5. System parameters ──────────────────────────────────────────────────
  console.log('Creating system parameters...')
  const systemParams = [
    { key: 'APP_NAME',                    value: 'Alpha Pharmacy',         dataType: DataType.STRING,  description: 'Application display name' },
    { key: 'APP_VERSION',                 value: '1.0.0',                  dataType: DataType.STRING,  description: 'Current application version' },
    { key: 'SUPPORT_EMAIL',               value: 'support@alphapharma.id', dataType: DataType.STRING,  description: 'Support contact email shown to users' },
    { key: 'DEFAULT_LANGUAGE',            value: 'id',                     dataType: DataType.STRING,  description: 'Default UI language (id = Bahasa Indonesia)' },
    { key: 'DEFAULT_TIMEZONE',            value: 'Asia/Jakarta',           dataType: DataType.STRING,  description: 'Default timezone for date/time display' },
    { key: 'DEFAULT_CURRENCY',            value: 'IDR',                    dataType: DataType.STRING,  description: 'Currency code used across the platform' },
    { key: 'DEFAULT_PASSWORD',            value: 'password',               dataType: DataType.STRING,  description: 'Default password for all created users' },
    { key: 'MAX_LOGIN_ATTEMPTS',          value: '5',                      dataType: DataType.NUMBER,  description: 'Maximum consecutive failed login attempts before lockout' },
    { key: 'SESSION_TIMEOUT_MINUTES',     value: '480',                    dataType: DataType.NUMBER,  description: 'Access token lifetime in minutes (8 hours)' },
    { key: 'PASSWORD_MIN_LENGTH',         value: '8',                      dataType: DataType.NUMBER,  description: 'Minimum password length required for all users' },
    { key: 'ALLOW_EXPIRED_MEDICINE_SALE', value: 'false',                  dataType: DataType.BOOLEAN, description: 'Allow pharmacies to sell medicines past their expiry date' },
    { key: 'MAINTENANCE_MODE',            value: 'false',                  dataType: DataType.BOOLEAN, description: 'When true, only platform admins can access the system' },
  ]
  for (const sp of systemParams) {
    await prisma.systemParameter.upsert({
      where: { key: sp.key },
      update: {},
      create: { ...sp, createdById: platformAdmin.id, updatedById: platformAdmin.id },
    })
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\nCore seed complete!')
  console.log('─────────────────────────────────────────────────────────────')
  console.log('Platform Admin  →  admin@pharma.com  /  Admin@123')
  console.log('Global roles    →  Owner, Admin, Head Pharmacist, Pharmacist, Cashier, Doctor')
  console.log('Permissions     →  ' + PERMISSIONS.length + ' entries')
  console.log('System params   →  ' + systemParams.length + ' entries')
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
