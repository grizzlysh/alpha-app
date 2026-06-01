import {
  PrismaClient,
  PlatformRole,
  PharmacyRole,
  PharmacyCategory,
  RecordStatus,
  DataType,
  PurchaseOrderStatus,
  PaymentStatus,
  PaymentMethod,
  SaleStatus,
  SaleType,
  SignAuthority,
} from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

// ── Permission Definitions ────────────────────────────────────────────────────

const PERMISSIONS = [
  { module: 'medicine_shapes', action: 'view' },
  { module: 'medicine_shapes', action: 'create' },
  { module: 'medicine_shapes', action: 'edit' },
  { module: 'medicine_shapes', action: 'delete' },
  { module: 'medicine_types', action: 'view' },
  { module: 'medicine_types', action: 'create' },
  { module: 'medicine_types', action: 'edit' },
  { module: 'medicine_types', action: 'delete' },
  { module: 'medicine_classes', action: 'view' },
  { module: 'medicine_classes', action: 'create' },
  { module: 'medicine_classes', action: 'edit' },
  { module: 'medicine_classes', action: 'delete' },
  { module: 'medicines', action: 'view' },
  { module: 'medicines', action: 'create' },
  { module: 'medicines', action: 'edit' },
  { module: 'medicines', action: 'delete' },
  { module: 'distributors', action: 'view' },
  { module: 'distributors', action: 'create' },
  { module: 'distributors', action: 'edit' },
  { module: 'distributors', action: 'delete' },
  { module: 'customers', action: 'view' },
  { module: 'customers', action: 'create' },
  { module: 'customers', action: 'edit' },
  { module: 'customers', action: 'delete' },
  { module: 'stock', action: 'view' },
  { module: 'stock', action: 'adjust' },
  { module: 'purchase_orders', action: 'view' },
  { module: 'purchase_orders', action: 'create' },
  { module: 'purchase_orders', action: 'edit' },
  { module: 'purchase_orders', action: 'delete' },
  { module: 'invoices', action: 'view' },
  { module: 'invoices', action: 'create' },
  { module: 'invoices', action: 'edit' },
  { module: 'invoices', action: 'delete' },
  { module: 'invoices', action: 'verify' },
  { module: 'sales', action: 'view' },
  { module: 'sales', action: 'create' },
  { module: 'sales', action: 'edit' },
  { module: 'sales', action: 'delete' },
  { module: 'stock_return', action: 'view' },
  { module: 'stock_return', action: 'create' },
  { module: 'stock_return', action: 'edit' },
  { module: 'stock_return', action: 'delete' },
  { module: 'stock_disposal', action: 'view' },
  { module: 'stock_disposal', action: 'create' },
  { module: 'stock_disposal', action: 'edit' },
  { module: 'reports', action: 'view' },
  { module: 'reports', action: 'export' },
  { module: 'users', action: 'view' },
  { module: 'users', action: 'create' },
  { module: 'users', action: 'edit' },
  { module: 'users', action: 'delete' },
  { module: 'permissions', action: 'view' },
  { module: 'roles', action: 'view' },
  { module: 'roles', action: 'create' },
  { module: 'roles', action: 'edit' },
  { module: 'roles', action: 'delete' },
  { module: 'licenses', action: 'view' },
  { module: 'licenses', action: 'create' },
  { module: 'licenses', action: 'edit' },
  { module: 'licenses', action: 'delete' },
  { module: 'pharmacies', action: 'view' },
  { module: 'pharmacies', action: 'create' },
  { module: 'pharmacies', action: 'edit' },
  { module: 'pharmacies', action: 'delete' },
  { module: 'business_parameters', action: 'view' },
  { module: 'business_parameters', action: 'edit' },
  { module: 'system_parameters', action: 'view' },
  { module: 'system_parameters', action: 'edit' },
  { module: 'settings', action: 'view' },
  { module: 'settings', action: 'edit' },
  { module: 'sign', action: 'standard' },
  { module: 'sign', action: 'full' },
]

const OWNER_PERMISSIONS = PERMISSIONS.map((p) => `${p.module}.${p.action}`)

const PHARMACIST_PERMISSIONS = [
  'medicine_shapes.view',
  'medicine_types.view',
  'medicine_classes.view',
  'medicines.view',
  'distributors.view',
  'customers.view',
  'customers.create',
  'customers.edit',
  'stock.view',
  'purchase_orders.view',
  'invoices.view',
  'sales.view',
  'sales.create',
  'stock_return.view',
  'stock_return.create',
  'stock_disposal.view',
  'reports.view',
  'sign.standard',
]

// ── Price helpers ─────────────────────────────────────────────────────────────

function calcPrices(pricePerPiece: number, discPct: number, marginPct: number) {
  const discountAmount = (pricePerPiece * discPct) / 100
  const finalPrice = pricePerPiece - discountAmount
  const calculatedPrice = finalPrice + (finalPrice * marginPct) / 100
  return {
    discountAmount: new Decimal(discountAmount.toFixed(2)),
    finalPrice: new Decimal(finalPrice.toFixed(2)),
    calculatedPrice: new Decimal(calculatedPrice.toFixed(2)),
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding database...')

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

  // ── 5. Pharmacy ───────────────────────────────────────────────────────────
  console.log('Creating pharmacy...')
  const pharmacy = await prisma.pharmacy.upsert({
    where: { code: 'APK1' },
    update: {},
    create: {
      ownerId: owner.id,
      name: 'Apotek Sejahtera',
      code: 'APK1',
      category: PharmacyCategory.APOTEK,
      address: 'Jl. Merdeka No. 1, Jakarta Pusat 10110',
      phone: '021-12345678',
      email: 'apotek@pharma.com',
      permitNumber: 'SIA-JKT-2024-001',
      status: RecordStatus.ACTIVE,
      createdById: platformAdmin.id,
      updatedById: platformAdmin.id,
    },
  })

  // ── 6. Roles ──────────────────────────────────────────────────────────────
  console.log('Creating roles...')
  const ownerRole =
    (await prisma.role.findFirst({ where: { pharmacyId: null, name: 'Owner' } })) ??
    (await prisma.role.create({
      data: {
        pharmacyId: null,
        name: 'Owner',
        type: PharmacyRole.OWNER,
        description: 'Pharmacy owner with full access',
        status: RecordStatus.ACTIVE,
      },
    }))

  const pharmacistRole =
    (await prisma.role.findFirst({ where: { pharmacyId: null, name: 'Pharmacist' } })) ??
    (await prisma.role.create({
      data: {
        pharmacyId: null,
        name: 'Pharmacist',
        type: PharmacyRole.PHARMACIST,
        description: 'Licensed pharmacist with dispensing access',
        status: RecordStatus.ACTIVE,
      },
    }))

  // ── 7. Role permissions ───────────────────────────────────────────────────
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
  for (const key of PHARMACIST_PERMISSIONS) {
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

  // ── 8. UserPharmacy memberships ───────────────────────────────────────────
  console.log('Assigning users to pharmacy...')
  const ownerMembership = await prisma.userPharmacy.findFirst({
    where: { userId: owner.id, pharmacyId: pharmacy.id },
  })
  if (!ownerMembership) {
    await prisma.userPharmacy.create({
      data: { userId: owner.id, pharmacyId: pharmacy.id, roleId: ownerRole.id, status: RecordStatus.ACTIVE },
    })
  }
  const pharmacistMembership = await prisma.userPharmacy.findFirst({
    where: { userId: pharmacist.id, pharmacyId: pharmacy.id },
  })
  if (!pharmacistMembership) {
    await prisma.userPharmacy.create({
      data: { userId: pharmacist.id, pharmacyId: pharmacy.id, roleId: pharmacistRole.id, status: RecordStatus.ACTIVE },
    })
  }

  // ── 9. System parameters ──────────────────────────────────────────────────
  console.log('Creating system parameters...')
  const systemParams = [
    // Application identity
    { key: 'APP_NAME',                  value: 'Alpha Pharmacy',        dataType: DataType.STRING,  description: 'Application display name' },
    { key: 'APP_VERSION',               value: '1.0.0',                 dataType: DataType.STRING,  description: 'Current application version' },
    { key: 'SUPPORT_EMAIL',             value: 'support@alphapharma.id',dataType: DataType.STRING,  description: 'Support contact email shown to users' },
    // Locale
    { key: 'DEFAULT_LANGUAGE',          value: 'id',                    dataType: DataType.STRING,  description: 'Default UI language (id = Bahasa Indonesia)' },
    { key: 'DEFAULT_TIMEZONE',          value: 'Asia/Jakarta',          dataType: DataType.STRING,  description: 'Default timezone for date/time display' },
    { key: 'DEFAULT_CURRENCY',          value: 'IDR',                   dataType: DataType.STRING,  description: 'Currency code used across the platform' },
    { key: 'DEFAULT_PASSWORD',       value: 'password',                     dataType: DataType.STRING,  description: 'Default password for all created users' },
    // Security
    { key: 'MAX_LOGIN_ATTEMPTS',        value: '5',                     dataType: DataType.NUMBER,  description: 'Maximum consecutive failed login attempts before lockout' },
    { key: 'SESSION_TIMEOUT_MINUTES',   value: '480',                   dataType: DataType.NUMBER,  description: 'Access token lifetime in minutes (8 hours)' },
    { key: 'PASSWORD_MIN_LENGTH',       value: '8',                     dataType: DataType.NUMBER,  description: 'Minimum password length required for all users' },

    // Platform policy
    { key: 'ALLOW_EXPIRED_MEDICINE_SALE', value: 'false',              dataType: DataType.BOOLEAN, description: 'Allow pharmacies to sell medicines past their expiry date' },
    { key: 'MAINTENANCE_MODE',          value: 'false',                 dataType: DataType.BOOLEAN, description: 'When true, only platform admins can access the system' },
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
    // Pricing
    { key: 'MARGIN_PERCENTAGE',         value: '20',                    dataType: DataType.PERCENTAGE, description: 'Default selling price margin applied over purchase price' },
    { key: 'TAX_PERCENTAGE',            value: '11',                    dataType: DataType.PERCENTAGE, description: 'VAT/PPN percentage applied to sales (Indonesian standard 11%)' },
    { key: 'MAX_DISCOUNT_PERCENTAGE',   value: '30',                    dataType: DataType.PERCENTAGE, description: 'Maximum discount percentage staff can apply to a sale item' },
    // Stock management
    { key: 'REORDER_LEVEL_DEFAULT',     value: '10',                    dataType: DataType.NUMBER,  description: 'Default low-stock alert threshold in pieces' },
    { key: 'LOW_STOCK_ALERT_THRESHOLD', value: '5',                     dataType: DataType.NUMBER,  description: 'Critical stock threshold in pieces before urgent reorder alert' },
    { key: 'ALLOW_FEFO_OVERRIDE',       value: 'true',                  dataType: DataType.BOOLEAN, description: 'Allow staff to select non-FEFO batches during sale' },
    // Sales & payment
    { key: 'CREDIT_PAYMENT_DAYS',       value: '30',                    dataType: DataType.NUMBER,  description: 'Default credit term in days for non-cash sales' },
    { key: 'RETURN_POLICY_DAYS',        value: '7',                     dataType: DataType.NUMBER,  description: 'Number of days after sale within which a return is accepted' },
    // Receipt
    { key: 'RECEIPT_HEADER',            value: 'Apotek Sejahtera',       dataType: DataType.STRING,  description: 'Header text printed on customer receipts' },
    { key: 'RECEIPT_FOOTER',            value: 'Terima kasih atas kepercayaan Anda. Semoga lekas sembuh!', dataType: DataType.STRING, description: 'Footer text printed on customer receipts' },
  ]
  for (const bp of businessParams) {
    const existing = await prisma.businessParameter.findUnique({
      where: { pharmacyId_key: { pharmacyId: pharmacy.id, key: bp.key } },
    })
    if (!existing) {
      await prisma.businessParameter.create({
        data: {
          pharmacyId: pharmacy.id,
          ...bp,
          createdById: owner.id,
          updatedById: owner.id,
        },
      })
    }
  }

  // ── 11. Medicine master data ──────────────────────────────────────────────
  console.log('Creating medicine master data...')

  const shapeNames = ['Tablet', 'Kapsul', 'Sirup', 'Salep', 'Injeksi']
  const shapes: Record<string, { id: number }> = {}
  for (const name of shapeNames) {
    const existing = await prisma.medicineShape.findFirst({
      where: { name, pharmacyId: null, status: { not: 'DELETED' } },
    })
    const shape = existing ?? await prisma.medicineShape.create({
      data: { name, pharmacyId: null, status: RecordStatus.ACTIVE, createdById: platformAdmin.id, updatedById: platformAdmin.id },
    })
    shapes[name] = shape
  }

  const typeNames = ['Obat Bebas', 'Obat Bebas Terbatas', 'Obat Keras', 'Narkotika']
  const types: Record<string, { id: number }> = {}
  for (const name of typeNames) {
    const existing = await prisma.medicineType.findFirst({
      where: { name, pharmacyId: null, status: { not: 'DELETED' } },
    })
    const type = existing ?? await prisma.medicineType.create({
      data: { name, pharmacyId: null, status: RecordStatus.ACTIVE, createdById: platformAdmin.id, updatedById: platformAdmin.id },
    })
    types[name] = type
  }

  const classNames = [
    'Analgesik & Antipiretik',
    'Antibiotik',
    'Antihipertensi',
    'Vitamin & Suplemen',
    'Antiinflamasi Nonsteroid',
  ]
  const classes: Record<string, { id: number }> = {}
  for (const name of classNames) {
    const existing = await prisma.medicineClass.findFirst({
      where: { name, pharmacyId: null, status: { not: 'DELETED' } },
    })
    const cls = existing ?? await prisma.medicineClass.create({
      data: { name, pharmacyId: null, status: RecordStatus.ACTIVE, createdById: platformAdmin.id, updatedById: platformAdmin.id },
    })
    classes[name] = cls
  }

  // ── 12. Medicines ─────────────────────────────────────────────────────────
  console.log('Creating medicines...')
  const medicineDefs = [
    { name: 'Paracetamol 500mg', shape: 'Tablet', type: 'Obat Bebas', cls: 'Analgesik & Antipiretik', unit: 'Strip' },
    { name: 'Amoxicillin 500mg', shape: 'Kapsul', type: 'Obat Keras', cls: 'Antibiotik', unit: 'Strip' },
    { name: 'Vitamin C 1000mg', shape: 'Tablet', type: 'Obat Bebas', cls: 'Vitamin & Suplemen', unit: 'Botol' },
    { name: 'Ibuprofen 400mg', shape: 'Tablet', type: 'Obat Bebas Terbatas', cls: 'Antiinflamasi Nonsteroid', unit: 'Strip' },
    { name: 'Amlodipin 10mg', shape: 'Tablet', type: 'Obat Keras', cls: 'Antihipertensi', unit: 'Strip' },
  ]
  const medicines: Record<string, { id: number }> = {}
  for (const def of medicineDefs) {
    const existing = await prisma.medicine.findFirst({
      where: { name: def.name, pharmacyId: pharmacy.id, status: { not: 'DELETED' } },
    })
    const medicine = existing ?? await prisma.medicine.create({
      data: {
        pharmacyId: pharmacy.id,
        name: def.name,
        shapeId: shapes[def.shape].id,
        typeId: types[def.type].id,
        medicineClassId: classes[def.cls].id,
        unit: def.unit,
        status: RecordStatus.ACTIVE,
        createdById: owner.id,
        updatedById: owner.id,
      },
    })
    medicines[def.name] = medicine
  }

  // ── 13. Distributors ──────────────────────────────────────────────────────
  console.log('Creating distributors...')
  const distributorDefs = [
    {
      name: 'PT. Kimia Farma Trading & Distribution',
      phone: '021-5550001',
      email: 'order@kimiafarma.co.id',
      address: 'Jl. Veteran No. 9, Jakarta Pusat',
      contactPerson: 'Budi Kusuma',
      permitNumber: 'PBF-JKT-2024-001',
    },
    {
      name: 'PT. Enseval Putera Megatrading',
      phone: '021-5550002',
      email: 'order@enseval.com',
      address: 'Jl. Pulo Lentut No. 1, Jakarta Timur',
      contactPerson: 'Dewi Sartika',
      permitNumber: 'PBF-JKT-2024-002',
    },
  ]
  const distributors: Record<string, { id: number }> = {}
  for (const def of distributorDefs) {
    const existing = await prisma.distributor.findFirst({
      where: { name: def.name, pharmacyId: pharmacy.id, status: { not: 'DELETED' } },
    })
    const dist = existing ?? await prisma.distributor.create({
      data: {
        pharmacyId: pharmacy.id,
        ...def,
        status: RecordStatus.ACTIVE,
        createdById: owner.id,
        updatedById: owner.id,
      },
    })
    distributors[def.name] = dist
  }

  // ── 14. Customers ─────────────────────────────────────────────────────────
  console.log('Creating customers...')
  const customerDefs = [
    { name: 'Walk-in Customer', phone: null, address: null, isWalkIn: true },
    { name: 'Budi Santoso', phone: '081234567890', address: 'Jl. Kenanga No. 5, Jakarta', isWalkIn: false },
    { name: 'Siti Rahayu', phone: '081298765432', address: 'Jl. Melati No. 12, Depok', isWalkIn: false },
  ]
  const customers: Record<string, { id: number }> = {}
  for (const def of customerDefs) {
    const existing = await prisma.customer.findFirst({
      where: { name: def.name, pharmacyId: pharmacy.id, status: { not: 'DELETED' } },
    })
    const customer = existing ?? await prisma.customer.create({
      data: {
        pharmacyId: pharmacy.id,
        name: def.name,
        phone: def.phone,
        address: def.address,
        isWalkIn: def.isWalkIn,
        status: RecordStatus.ACTIVE,
        createdById: owner.id,
        updatedById: owner.id,
      },
    })
    customers[def.name] = customer
  }

  // ── 15. Positions & Employees ─────────────────────────────────────────────
  console.log('Creating positions and employees...')
  const positionDefs = [
    { name: 'Apoteker Penanggung Jawab', signAuthority: SignAuthority.FULL, description: 'Licensed pharmacist responsible for the pharmacy' },
    { name: 'Apoteker Pendamping', signAuthority: SignAuthority.STANDARD, description: 'Supporting licensed pharmacist' },
    { name: 'Asisten Apoteker', signAuthority: SignAuthority.NONE, description: 'Pharmacy assistant' },
    { name: 'Kasir', signAuthority: SignAuthority.NONE, description: 'Cashier' },
  ]
  const positions: Record<string, { id: number }> = {}
  for (const def of positionDefs) {
    const existing = await prisma.position.findFirst({
      where: { name: def.name, pharmacyId: null, status: { not: 'DELETED' } },
    })
    const pos = existing ?? await prisma.position.create({
      data: {
        pharmacyId: null,
        name: def.name,
        signAuthority: def.signAuthority,
        description: def.description,
        status: RecordStatus.ACTIVE,
        createdById: platformAdmin.id,
        updatedById: platformAdmin.id,
      },
    })
    positions[def.name] = pos
  }

  // Create licensed pharmacist employee linked to pharmacist user
  let pharmacistEmployee = await prisma.employee.findFirst({
    where: { userId: pharmacist.id, pharmacyId: pharmacy.id, status: { not: 'DELETED' } },
  })
  if (!pharmacistEmployee) {
    pharmacistEmployee = await prisma.employee.create({
      data: {
        pharmacyId: pharmacy.id,
        userId: pharmacist.id,
        positionId: positions['Apoteker Penanggung Jawab'].id,
        name: 'Ahmad Yusuf, S.Farm., Apt.',
        phone: '081300000001',
        status: RecordStatus.ACTIVE,
        createdById: owner.id,
        updatedById: owner.id,
        employeePharmacies: {
          create: {
            pharmacyId: pharmacy.id,
            licenseNumber: 'SIPA-JKT-2024-001',
            isPrimary: true,
            validFrom: new Date('2024-01-01'),
            validUntil: new Date('2027-12-31'),
            status: RecordStatus.ACTIVE,
            createdById: owner.id,
            updatedById: owner.id,
          },
        },
      },
    })
  }

  // ── 16. Purchase order ────────────────────────────────────────────────────
  console.log('Creating purchase order...')
  const kimiaFarma = distributors['PT. Kimia Farma Trading & Distribution']
  const poNumber = 'PO-APK1-20260101-001'
  let purchaseOrder = await prisma.purchaseOrder.findFirst({
    where: { orderNumber: poNumber },
  })
  if (!purchaseOrder) {
    purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        pharmacyId: pharmacy.id,
        distributorId: kimiaFarma.id,
        signedById: pharmacistEmployee.id,
        orderNumber: poNumber,
        status: PurchaseOrderStatus.COMPLETED,
        description: 'Monthly restocking order',
        orderedAt: new Date('2026-01-01'),
        createdById: owner.id,
        updatedById: owner.id,
        details: {
          create: [
            { medicineId: medicines['Paracetamol 500mg'].id, quantity: 200, unit: 'Pcs', createdById: owner.id },
            { medicineId: medicines['Amoxicillin 500mg'].id, quantity: 100, unit: 'Pcs', createdById: owner.id },
            { medicineId: medicines['Vitamin C 1000mg'].id, quantity: 150, unit: 'Pcs', createdById: owner.id },
            { medicineId: medicines['Ibuprofen 400mg'].id, quantity: 120, unit: 'Pcs', createdById: owner.id },
            { medicineId: medicines['Amlodipin 10mg'].id, quantity: 60, unit: 'Pcs', createdById: owner.id },
          ],
        },
      },
    })
  }

  // ── 17. Invoice + Stock ───────────────────────────────────────────────────
  console.log('Creating invoice and stock...')
  const MARGIN = 20

  // Pre-compute all line prices (calculatedPrice lives on Stock, not InvoiceDetail)
  const invoiceLines = [
    { medicine: 'Paracetamol 500mg', batch: 'BTH-PCT-2024-001', expiry: '2026-12-31', boxes: 20, perBox: 10, pricePerPiece: 500, discPct: 0 },
    { medicine: 'Amoxicillin 500mg', batch: 'BTH-AMX-2024-001', expiry: '2026-06-30', boxes: 10, perBox: 10, pricePerPiece: 3000, discPct: 5 },
    { medicine: 'Vitamin C 1000mg', batch: 'BTH-VTC-2024-001', expiry: '2027-03-31', boxes: 15, perBox: 10, pricePerPiece: 2000, discPct: 0 },
    { medicine: 'Ibuprofen 400mg', batch: 'BTH-IBU-2024-001', expiry: '2026-09-30', boxes: 12, perBox: 10, pricePerPiece: 1500, discPct: 0 },
    { medicine: 'Amlodipin 10mg', batch: 'BTH-AML-2024-001', expiry: '2027-01-31', boxes: 6, perBox: 10, pricePerPiece: 5000, discPct: 0 },
  ]

  const invoiceLinesCalc = invoiceLines.map((line) => {
    const pieces = line.boxes * line.perBox
    const { discountAmount, finalPrice, calculatedPrice } = calcPrices(line.pricePerPiece, line.discPct, MARGIN)
    const totalAmount = new Decimal((pieces * parseFloat(finalPrice.toString())).toFixed(2))
    return { ...line, pieces, discountAmount, finalPrice, calculatedPrice, totalAmount }
  })

  const invoiceNumber = 'INV-APK1-20260101-001'
  const existingInvoice = await prisma.invoice.findFirst({ where: { invoiceNumber } })

  const stockDetailMap: Record<string, { id: number; stockId: number }> = {}

  if (!existingInvoice) {
    // InvoiceDetail has no calculatedPrice column — omit it from the create payload
    const detailsData = invoiceLinesCalc.map((line) => ({
      medicineId: medicines[line.medicine].id,
      batchNumber: line.batch,
      expiryDate: new Date(line.expiry),
      quantityBox: line.boxes,
      quantityPerBox: line.perBox,
      quantityPieces: line.pieces,
      price: new Decimal(line.pricePerPiece.toFixed(2)),
      discountPercentage: new Decimal(line.discPct.toFixed(2)),
      discountAmount: line.discountAmount,
      finalPrice: line.finalPrice,
      totalAmount: line.totalAmount,
      createdById: owner.id,
    }))

    const invoiceTotalAmount = invoiceLinesCalc.reduce(
      (sum, l) => sum + parseFloat(l.totalAmount.toString()),
      0
    )

    const invoice = await prisma.invoice.create({
      data: {
        pharmacyId: pharmacy.id,
        distributorId: kimiaFarma.id,
        purchaseOrderId: purchaseOrder.id,
        signedById: pharmacistEmployee.id,
        invoiceNumber,
        paymentStatus: PaymentStatus.PAID,
        invoiceDate: new Date('2026-01-01'),
        dueDate: new Date('2026-01-31'),
        totalAmount: new Decimal(invoiceTotalAmount.toFixed(2)),
        paidAmount: new Decimal(invoiceTotalAmount.toFixed(2)),
        description: 'Monthly restocking invoice',
        createdById: owner.id,
        updatedById: owner.id,
        details: { create: detailsData },
      },
      include: {
        details: {
          select: { id: true, medicineId: true, batchNumber: true, expiryDate: true, quantityBox: true, quantityPerBox: true, quantityPieces: true, finalPrice: true },
        },
      },
    })

    // Create invoice payment
    await prisma.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.totalAmount,
        paymentStatus: PaymentStatus.PAID,
        createdById: owner.id,
        updatedById: owner.id,
        history: {
          create: {
            amount: invoice.totalAmount,
            paymentMethod: PaymentMethod.TRANSFER,
            paymentDate: new Date('2026-01-03'),
            description: 'Full payment via bank transfer',
            createdById: owner.id,
          },
        },
      },
    })

    // Create stock entries per invoice detail (mirrors invoice verification logic)
    for (const detail of invoice.details) {
      const lineCalc = invoiceLinesCalc.find((l) => medicines[l.medicine].id === detail.medicineId)!
      const quantityBefore = 0
      const quantityAfter = detail.quantityPieces

      const stock = await prisma.stock.upsert({
        where: { pharmacyId_medicineId: { pharmacyId: pharmacy.id, medicineId: detail.medicineId } },
        create: {
          pharmacyId: pharmacy.id,
          medicineId: detail.medicineId,
          totalPieces: detail.quantityPieces,
          basePrice: detail.finalPrice,
          calculatedPrice: lineCalc.calculatedPrice,
          createdById: owner.id,
        },
        update: {
          totalPieces: { increment: detail.quantityPieces },
          basePrice: detail.finalPrice,
          calculatedPrice: lineCalc.calculatedPrice,
          updatedById: owner.id,
        },
      })

      const stockDetail = await prisma.stockDetail.create({
        data: {
          stockId: stock.id,
          distributorId: kimiaFarma.id,
          invoiceDetailId: detail.id,
          batchNumber: detail.batchNumber,
          expiryDate: detail.expiryDate,
          quantityPieces: detail.quantityPieces,
          quantityBox: detail.quantityBox,
          quantityPerBox: detail.quantityPerBox,
          createdById: owner.id,
        },
      })

      await prisma.stockMovement.create({
        data: {
          pharmacyId: pharmacy.id,
          medicineId: detail.medicineId,
          stockId: stock.id,
          stockDetailId: stockDetail.id,
          invoiceDetailId: detail.id,
          type: 'IN',
          reason: 'PURCHASE',
          quantity: detail.quantityPieces,
          quantityBefore,
          quantityAfter,
          description: `Purchase from invoice ${invoiceNumber}`,
          createdById: owner.id,
        },
      })

      stockDetailMap[lineCalc.medicine] = { id: stockDetail.id, stockId: stock.id }
    }
  } else {
    // Invoice already exists — populate stockDetailMap for sale seeding
    const existingDetails = await prisma.invoiceDetail.findMany({
      where: { invoiceId: existingInvoice.id },
      include: { stockDetail: { select: { id: true, stockId: true } } },
    })
    for (const d of existingDetails) {
      const medicineName = invoiceLines.find((l) => medicines[l.medicine].id === d.medicineId)?.medicine
      if (medicineName && d.stockDetail) {
        stockDetailMap[medicineName] = { id: d.stockDetail.id, stockId: d.stockDetail.stockId }
      }
    }
  }

  // ── 18. Sale ──────────────────────────────────────────────────────────────
  console.log('Creating sample sale...')
  const saleNumber = 'SL-APK1-20260115-001'
  const saleExists = await prisma.sale.findFirst({ where: { saleNumber } })

  if (!saleExists) {
    const saleLines = [
      { medicine: 'Paracetamol 500mg', pieces: 10 },
      { medicine: 'Vitamin C 1000mg', pieces: 5 },
    ]

    // Fetch selling prices from stock
    const saleLinesData = await Promise.all(
      saleLines.map(async (line) => {
        const stockDetailRef = stockDetailMap[line.medicine]
        if (!stockDetailRef) throw new Error(`No stock detail found for ${line.medicine}`)

        const stock = await prisma.stock.findUnique({
          where: { id: stockDetailRef.stockId },
          select: { calculatedPrice: true, sellingPrice: true, isManualPrice: true, totalPieces: true, medicineId: true },
        })
        if (!stock) throw new Error(`Stock not found for ${line.medicine}`)

        const stockDetailRec = await prisma.stockDetail.findUnique({
          where: { id: stockDetailRef.id },
          select: { quantityPerBox: true },
        })
        if (!stockDetailRec) throw new Error(`StockDetail not found for ${line.medicine}`)

        const unitPrice = stock.isManualPrice && stock.sellingPrice
          ? stock.sellingPrice
          : stock.calculatedPrice
        const totalAmount = new Decimal((line.pieces * parseFloat(unitPrice.toString())).toFixed(2))
        const quantityBox = Math.floor(line.pieces / stockDetailRec.quantityPerBox)

        return {
          medicine: line.medicine,
          medicineId: stock.medicineId,
          stockDetailId: stockDetailRef.id,
          stockId: stockDetailRef.stockId,
          quantityPieces: line.pieces,
          quantityBox,
          sellingPrice: unitPrice,
          totalAmount,
          stockTotalBefore: stock.totalPieces,
        }
      })
    )

    const saleTotalAmount = saleLinesData.reduce(
      (sum, l) => sum + parseFloat(l.totalAmount.toString()),
      0
    )

    const sale = await prisma.sale.create({
      data: {
        pharmacyId: pharmacy.id,
        customerId: customers['Budi Santoso'].id,
        saleNumber,
        saleType: SaleType.CASH,
        status: SaleStatus.COMPLETED,
        totalAmount: new Decimal(saleTotalAmount.toFixed(2)),
        paidAmount: new Decimal(saleTotalAmount.toFixed(2)),
        soldAt: new Date('2026-01-15T10:30:00Z'),
        description: 'Walk-in cash sale',
        createdById: pharmacist.id,
        updatedById: pharmacist.id,
        details: {
          create: saleLinesData.map((l) => ({
            medicineId: l.medicineId,
            stockDetailId: l.stockDetailId,
            quantityPieces: l.quantityPieces,
            quantityBox: l.quantityBox,
            sellingPrice: l.sellingPrice,
            discount: new Decimal('0.00'),
            totalAmount: l.totalAmount,
            createdById: pharmacist.id,
          })),
        },
        payment: {
          create: {
            totalAmount: new Decimal(saleTotalAmount.toFixed(2)),
            paidAmount: new Decimal(saleTotalAmount.toFixed(2)),
            paymentStatus: PaymentStatus.PAID,
            createdById: pharmacist.id,
            history: {
              create: {
                amount: new Decimal(saleTotalAmount.toFixed(2)),
                paymentMethod: PaymentMethod.CASH,
                paymentDate: new Date('2026-01-15T10:30:00Z'),
                description: 'Cash payment',
                createdById: pharmacist.id,
              },
            },
          },
        },
      },
      include: { details: { select: { id: true, medicineId: true, stockDetailId: true, quantityPieces: true } } },
    })

    // Deduct stock after sale
    let offset = 0
    for (const detail of sale.details) {
      const line = saleLinesData.find((l) => l.stockDetailId === detail.stockDetailId)!
      const quantityBefore = line.stockTotalBefore - offset
      const quantityAfter = quantityBefore - detail.quantityPieces
      offset += detail.quantityPieces

      await prisma.stock.update({
        where: { id: line.stockId },
        data: { totalPieces: { decrement: detail.quantityPieces }, updatedById: pharmacist.id },
      })
      await prisma.stockDetail.update({
        where: { id: detail.stockDetailId },
        data: { quantityPieces: { decrement: detail.quantityPieces } },
      })
      await prisma.stockMovement.create({
        data: {
          pharmacyId: pharmacy.id,
          medicineId: detail.medicineId,
          stockId: line.stockId,
          stockDetailId: detail.stockDetailId,
          saleDetailId: detail.id,
          type: 'OUT',
          reason: 'SALE',
          quantity: detail.quantityPieces,
          quantityBefore,
          quantityAfter,
          description: `Sale from ${saleNumber}`,
          createdById: pharmacist.id,
        },
      })
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\nSeed complete!')
  console.log('─────────────────────────────────────────────────────────────')
  console.log('Platform Admin  →  admin@pharma.com        /  Admin@123')
  console.log('Owner           →  owner@pharma.com        /  Owner@123')
  console.log('Pharmacist      →  pharmacist@pharma.com   /  Pharmacist@123')
  console.log('Pharmacy        →  Apotek Sejahtera (APK1)')
  console.log('Medicines       →  5 (Paracetamol, Amoxicillin, Vitamin C, Ibuprofen, Amlodipin)')
  console.log('Distributor     →  Kimia Farma, Enseval')
  console.log('Invoice         →  INV-APK1-20260101-001 (PAID, stock loaded)')
  console.log('Sale            →  SL-APK1-20260115-001 (COMPLETED, cash)')
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
