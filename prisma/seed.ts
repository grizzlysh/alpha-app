import {
  PrismaClient,
  PlatformRole,
  AppRole,
  PharmacyCategory,
  RecordStatus, // ACTIVE | INACTIVE (DELETED removed)
  DataType,
  PurchaseOrderStatus,
  PaymentStatus,
  PaymentMethod,
  SaleStatus,
  SaleType,
} from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

// ── Permission Definitions ────────────────────────────────────────────────────

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

const PHARMACIST_PERMISSIONS = [
  'medicine_shapes.read',
  'medicine_types.read',
  'medicine_classes.read',
  'medicines.read',
  'distributors.read',
  'customers.read',
  'customers.create',
  'customers.update',
  'stock.read',
  'purchase_orders.read',
  'invoices.read',
  'sales.read',
  'sales.create',
  'stock_return.read',
  'stock_return.create',
  'stock_disposal.read',
  'reports.read',
  'sign.standard',
  'dashboard.read',
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

// ── Sale helper ───────────────────────────────────────────────────────────────

async function createSale(params: {
  pharmacyId: number
  customerId: number
  saleNumber: string
  saleDate: Date
  saleType: SaleType
  lines: { medicine: string; pieces: number }[]
  stockDetailMap: Record<string, { id: number; stockId: number }>
  createdById: number
  description?: string
}): Promise<void> {
  const PPN_PCT = 11

  const lineData = await Promise.all(
    params.lines.map(async (line) => {
      const ref = params.stockDetailMap[line.medicine]
      if (!ref) throw new Error(`No stock detail for ${line.medicine}`)

      const stock = await prisma.stock.findUnique({
        where: { id: ref.stockId },
        select: { calculatedPrice: true, sellingPrice: true, isManualPrice: true, totalPieces: true, medicineId: true },
      })
      if (!stock) throw new Error(`Stock not found for ${line.medicine}`)

      const stockDetail = await prisma.stockDetail.findUnique({
        where: { id: ref.id },
        select: { quantityPerBox: true },
      })
      if (!stockDetail) throw new Error(`StockDetail not found for ${line.medicine}`)

      const unitPrice = stock.isManualPrice && stock.sellingPrice ? stock.sellingPrice : stock.calculatedPrice
      const totalAmount = new Decimal((line.pieces * parseFloat(unitPrice.toString())).toFixed(2))
      const quantityBox = Math.floor(line.pieces / stockDetail.quantityPerBox)

      return {
        medicine: line.medicine,
        medicineId: stock.medicineId,
        stockDetailId: ref.id,
        stockId: ref.stockId,
        quantityPieces: line.pieces,
        quantityBox,
        sellingPrice: unitPrice,
        totalAmount,
        stockTotalBefore: parseFloat(stock.totalPieces.toString()),
      }
    })
  )

  const subtotal = lineData.reduce((sum, l) => sum + parseFloat(l.totalAmount.toString()), 0)
  const ppnAmount = (subtotal * PPN_PCT) / 100
  const grandTotal = subtotal + ppnAmount

  const sale = await prisma.sale.create({
    data: {
      pharmacyId: params.pharmacyId,
      customerId: params.customerId,
      saleNumber: params.saleNumber,
      saleType: params.saleType,
      status: SaleStatus.COMPLETED,
      totalAmount: new Decimal(subtotal.toFixed(2)),
      discountPercentage: new Decimal('0.00'),
      discountAmount: new Decimal('0.00'),
      ppnPercentage: new Decimal(PPN_PCT.toFixed(2)),
      ppnAmount: new Decimal(ppnAmount.toFixed(2)),
      grandTotal: new Decimal(grandTotal.toFixed(2)),
      paidAmount: new Decimal(grandTotal.toFixed(2)),
      soldAt: params.saleDate,
      description: params.description ?? 'Sale',
      createdById: params.createdById,
      updatedById: params.createdById,
      details: {
        create: lineData.map((l) => ({
          medicineId: l.medicineId,
          stockDetailId: l.stockDetailId,
          quantityPieces: l.quantityPieces,
          quantityBox: l.quantityBox,
          sellingPrice: l.sellingPrice,
          discountPercentage: new Decimal('0.00'),
          discountAmount: new Decimal('0.00'),
          totalAmount: l.totalAmount,
          createdById: params.createdById,
        })),
      },
      payment: {
        create: {
          totalAmount: new Decimal(grandTotal.toFixed(2)),
          paidAmount: new Decimal(grandTotal.toFixed(2)),
          paymentStatus: PaymentStatus.PAID,
          createdById: params.createdById,
          history: {
            create: {
              amount: new Decimal(grandTotal.toFixed(2)),
              paymentMethod: PaymentMethod.CASH,
              paymentDate: params.saleDate,
              description: 'Cash payment',
              createdById: params.createdById,
            },
          },
        },
      },
    },
    include: { details: { select: { id: true, medicineId: true, stockDetailId: true, quantityPieces: true } } },
  })

  for (const detail of sale.details) {
    const ld = lineData.find((l) => l.stockDetailId === detail.stockDetailId)!
    const quantityBefore = ld.stockTotalBefore
    const quantityAfter = quantityBefore - detail.quantityPieces

    await prisma.stock.update({
      where: { id: ld.stockId },
      data: { totalPieces: { decrement: detail.quantityPieces }, updatedById: params.createdById },
    })
    await prisma.stockDetail.update({
      where: { id: detail.stockDetailId },
      data: { quantityPieces: { decrement: detail.quantityPieces } },
    })
    await prisma.stockMovement.create({
      data: {
        pharmacyId: params.pharmacyId,
        medicineId: detail.medicineId,
        stockId: ld.stockId,
        stockDetailId: detail.stockDetailId,
        saleDetailId: detail.id,
        type: 'OUT',
        reason: 'SALE',
        quantity: detail.quantityPieces,
        quantityBefore,
        quantityAfter,
        description: `Sale from ${params.saleNumber}`,
        createdById: params.createdById,
      },
    })
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

  // ── 5a. Business license ──────────────────────────────────────────────────
  console.log('Creating business license...')
  const existingBl = await prisma.businessLicense.findFirst({
    where: { pharmacyId: pharmacy.id, licenseNumber: 'SIA-JKT-2024-001', status: RecordStatus.ACTIVE },
  })
  if (!existingBl) {
    await prisma.businessLicense.create({
      data: {
        pharmacyId: pharmacy.id,
        licenseNumber: 'SIA-JKT-2024-001',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2027-12-31'),
        status: RecordStatus.ACTIVE,
        createdById: platformAdmin.id,
        updatedById: platformAdmin.id,
      },
    })
  }

  // ── 6. Roles ──────────────────────────────────────────────────────────────
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

  // ── 8. Placement memberships ──────────────────────────────────────────────
  console.log('Assigning users to pharmacy...')
  const ownerPlacement = await prisma.placement.findFirst({
    where: { userId: owner.id, pharmacyId: pharmacy.id, status: RecordStatus.ACTIVE },
  })
  if (!ownerPlacement) {
    await prisma.placement.create({
      data: { userId: owner.id, pharmacyId: pharmacy.id, roleId: ownerRole.id, status: RecordStatus.ACTIVE },
    })
  }
  const pharmacistPlacement = await prisma.placement.findFirst({
    where: { userId: pharmacist.id, pharmacyId: pharmacy.id, status: RecordStatus.ACTIVE },
  })
  if (!pharmacistPlacement) {
    await prisma.placement.create({
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
    { key: 'PPN_PERCENTAGE_SELL',       value: '11',                    dataType: DataType.PERCENTAGE, description: 'PPN percentage charged to customers on sales (output VAT)' },
    { key: 'PPN_PERCENTAGE_BUY',        value: '11',                    dataType: DataType.PERCENTAGE, description: 'PPN percentage on purchases from distributors (input VAT)' },
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
      where: { name, pharmacyId: null, status: RecordStatus.ACTIVE },
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
      where: { name, pharmacyId: null, status: RecordStatus.ACTIVE },
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
      where: { name, pharmacyId: null, status: RecordStatus.ACTIVE },
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
      where: { name: def.name, pharmacyId: pharmacy.id, status: RecordStatus.ACTIVE },
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
      where: { name: def.name, pharmacyId: pharmacy.id, status: RecordStatus.ACTIVE },
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
      where: { name: def.name, pharmacyId: pharmacy.id, status: RecordStatus.ACTIVE },
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
        signedById: pharmacist.id,
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
        signedById: pharmacist.id,
        invoiceNumber,
        paymentStatus: PaymentStatus.PAID,
        invoiceDate: new Date('2026-01-01'),
        dueDate: new Date('2026-01-31'),
        totalAmount: new Decimal(invoiceTotalAmount.toFixed(2)),
        grandTotal: new Decimal(invoiceTotalAmount.toFixed(2)),
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
          barcode: `BC-${detail.batchNumber}`,
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

  // ── 18. Initial reference sale (Jan 15) ──────────────────────────────────
  console.log('Creating initial reference sale...')
  const saleNumber = 'SL-APK1-20260115-001'
  if (!(await prisma.sale.findFirst({ where: { saleNumber } }))) {
    await createSale({
      pharmacyId: pharmacy.id,
      customerId: customers['Budi Santoso'].id,
      saleNumber,
      saleDate: new Date('2026-01-15T10:30:00Z'),
      saleType: SaleType.CASH,
      lines: [
        { medicine: 'Paracetamol 500mg', pieces: 10 },
        { medicine: 'Vitamin C 1000mg',  pieces: 5 },
      ],
      stockDetailMap,
      createdById: pharmacist.id,
      description: 'Walk-in cash sale',
    })
  }

  // ── 19. 30-day sales for dashboard testing ────────────────────────────────
  console.log('Creating 30-day sales for dashboard testing...')

  // 5 rotating patterns; over 30 days each appears 6×
  // Total usage: Paracetamol 96, Vitamin C 42, Ibuprofen 30, Amoxicillin 12, Amlodipin 6
  // All fit within the stock loaded by the invoice
  const SALE_PATTERNS = [
    { lines: [{ medicine: 'Paracetamol 500mg', pieces: 5 }, { medicine: 'Vitamin C 1000mg',   pieces: 3 }], customer: 'Walk-in Customer' },
    { lines: [{ medicine: 'Paracetamol 500mg', pieces: 3 }, { medicine: 'Ibuprofen 400mg',     pieces: 2 }], customer: 'Budi Santoso'     },
    { lines: [{ medicine: 'Amoxicillin 500mg', pieces: 2 }, { medicine: 'Paracetamol 500mg',   pieces: 4 }], customer: 'Siti Rahayu'      },
    { lines: [{ medicine: 'Vitamin C 1000mg',  pieces: 4 }, { medicine: 'Amlodipin 10mg',      pieces: 1 }], customer: 'Walk-in Customer' },
    { lines: [{ medicine: 'Paracetamol 500mg', pieces: 4 }, { medicine: 'Ibuprofen 400mg',     pieces: 3 }], customer: 'Budi Santoso'     },
  ]

  const existingSaleNumbers = new Set(
    (await prisma.sale.findMany({ where: { pharmacyId: pharmacy.id }, select: { saleNumber: true } }))
      .map((s) => s.saleNumber)
  )

  // Days 0–29 → 2026-05-20 to 2026-06-18 (today)
  for (let dayIdx = 0; dayIdx < 30; dayIdx++) {
    const saleDate = new Date('2026-05-20T09:00:00Z')
    saleDate.setUTCDate(saleDate.getUTCDate() + dayIdx)

    const dateStr = saleDate.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
    const saleNum  = `SL-APK1-${dateStr}-001`

    if (existingSaleNumbers.has(saleNum)) continue

    const pattern = SALE_PATTERNS[dayIdx % SALE_PATTERNS.length]

    await createSale({
      pharmacyId: pharmacy.id,
      customerId: customers[pattern.customer].id,
      saleNumber: saleNum,
      saleDate,
      saleType: SaleType.CASH,
      lines: pattern.lines,
      stockDetailMap,
      createdById: pharmacist.id,
      description: 'Daily sale',
    })
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
  console.log('Sales           →  SL-APK1-20260115-001 + 30 daily (2026-05-20 → 2026-06-18)')
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
