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
  { module: 'customers',         action: 'read' },
  { module: 'customers',         action: 'create' },
  { module: 'customers',         action: 'update' },
  { module: 'customers',         action: 'delete' },
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
  { module: 'sales',             action: 'override_price' },
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
  { module: 'medical_records',    action: 'read' },
  { module: 'medical_records',    action: 'write' },
  { module: 'examinations',      action: 'read' },
  { module: 'examinations',      action: 'checkin' },
  { module: 'examinations',      action: 'perform' },
  { module: 'examinations',      action: 'triage' },
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
]

// ── Role permission sets ──────────────────────────────────────────────────────

const all = PERMISSIONS.map((p) => `${p.module}.${p.action}`)

const excluded = (...modules: string[]) =>
  PERMISSIONS.filter((p) => !modules.includes(p.module)).map((p) => `${p.module}.${p.action}`)

const only = (...keys: string[]) => keys

const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: all,

  // Office staff: master data, purchasing and invoices, reports. No people or
  // role management, no pricing parameters, no POS/returns, no stock changes.
  ADMIN: only(
    'medicine_shapes.read', 'medicine_shapes.create', 'medicine_shapes.update', 'medicine_shapes.delete',
    'medicine_types.read', 'medicine_types.create', 'medicine_types.update', 'medicine_types.delete',
    'medicine_classes.read', 'medicine_classes.create', 'medicine_classes.update', 'medicine_classes.delete',
    'medicines.read', 'medicines.create', 'medicines.update', 'medicines.delete',
    'distributors.read', 'distributors.create', 'distributors.update', 'distributors.delete',
    'customers.read', 'customers.create', 'customers.update', 'customers.delete',
    'doctors.read', 'doctors.create', 'doctors.update', 'doctors.delete',
    'storage.read', 'storage.create', 'storage.update', 'storage.delete',
    'stock.read', 'stock_movements.read',
    'purchase_orders.read', 'purchase_orders.create', 'purchase_orders.update', 'purchase_orders.delete',
    'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete', 'invoices.verify',
    'sales.read', 'stock_return.read', 'stock_disposal.read', 'prescriptions.read',
    'examinations.read', 'examinations.checkin',
    'reports.read', 'reports.export',
    'business_parameters.read', 'pharmacies.read', 'licenses.read',
    'dashboard.read', 'dashboard.advanced',
  ),

  HEAD_PHARMACIST: excluded('system_parameters', 'pharmacies'),

  // Pharmacists run the queue but don't examine patients (that's the doctor's job).
  PHARMACIST: excluded('users', 'roles', 'permissions', 'pharmacies', 'system_parameters').filter((k) => k !== 'examinations.perform'),

  CASHIER: only(
    'customers.read', 'customers.create', 'customers.update',
    'medicines.read',
    'stock.read',
    'sales.read', 'sales.create', 'sales.update', 'sales.delete',
    'prescriptions.read',
    'doctors.read',
    'storage.read',
    'medical_records.read',
    'examinations.read', 'examinations.checkin',
    'dashboard.read',
  ),

  DOCTOR: only(
    'customers.read',
    'medicines.read',
    'doctors.read', 'doctors.create', 'doctors.update', 'doctors.delete',
    'prescriptions.read', 'prescriptions.create', 'prescriptions.update', 'prescriptions.delete',
    'medical_records.read', 'medical_records.write',
    'examinations.read', 'examinations.checkin', 'examinations.triage', 'examinations.perform',
    'dashboard.read',
  ),

  NURSE: only(
    'customers.read', 'customers.create', 'customers.update',
    'medicines.read', 'doctors.read', 'prescriptions.read',
    'medical_records.read', 'medical_records.write',
    'examinations.read', 'examinations.checkin', 'examinations.triage',
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
    { name: 'Admin',           type: AppRole.ADMIN,           description: 'Office staff: master data, purchasing, invoices and reports', requiresLicense: false },
    { name: 'Head Pharmacist', type: AppRole.HEAD_PHARMACIST, description: 'Senior licensed pharmacist with staff and license management access', requiresLicense: true  },
    { name: 'Pharmacist',      type: AppRole.PHARMACIST,      description: 'Licensed pharmacist with dispensing access',                        requiresLicense: true  },
    { name: 'Cashier',         type: AppRole.CASHIER,         description: 'Cashier with sales and patient access',                            requiresLicense: false },
    { name: 'Doctor',          type: AppRole.DOCTOR,          description: 'Doctor with prescription management access',                        requiresLicense: true  },
    { name: 'Nurse',           type: AppRole.NURSE,           description: 'Nurse: patient registration, vital signs and allergies',             requiresLicense: false },
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

    // Full sync: wipe global assignments then re-insert the authoritative set
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id, pharmacyId: null } })

    const permIds = permKeys.map((key) => permMap.get(key)).filter(Boolean) as number[]
    for (const permId of permIds) {
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permId, pharmacyId: null, isEnabled: true },
      })
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
