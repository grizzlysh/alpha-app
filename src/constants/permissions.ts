export const PERMISSIONS = {

  // medicine shapes
  MEDICINE_SHAPES_READ: 'medicine_shapes.read',
  MEDICINE_SHAPES_CREATE: 'medicine_shapes.create',
  MEDICINE_SHAPES_UPDATE: 'medicine_shapes.update',
  MEDICINE_SHAPES_DELETE: 'medicine_shapes.delete',

  // medicine types
  MEDICINE_TYPES_READ: 'medicine_types.read',
  MEDICINE_TYPES_CREATE: 'medicine_types.create',
  MEDICINE_TYPES_UPDATE: 'medicine_types.update',
  MEDICINE_TYPES_DELETE: 'medicine_types.delete',

  // medicine classes
  MEDICINE_CLASSES_READ: 'medicine_classes.read',
  MEDICINE_CLASSES_CREATE: 'medicine_classes.create',
  MEDICINE_CLASSES_UPDATE: 'medicine_classes.update',
  MEDICINE_CLASSES_DELETE: 'medicine_classes.delete',

  // medicines
  MEDICINES_READ: 'medicines.read',
  MEDICINES_CREATE: 'medicines.create',
  MEDICINES_UPDATE: 'medicines.update',
  MEDICINES_DELETE: 'medicines.delete',

  // distributors
  DISTRIBUTORS_READ: 'distributors.read',
  DISTRIBUTORS_CREATE: 'distributors.create',
  DISTRIBUTORS_UPDATE: 'distributors.update',
  DISTRIBUTORS_DELETE: 'distributors.delete',

  // customers
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_DELETE: 'customers.delete',

  // stock
  STOCK_READ: 'stock.read',
  STOCK_ADJUST: 'stock.adjust',

  // stock movements
  STOCK_MOVEMENTS_READ: 'stock_movements.read',

  // purchase orders
  PURCHASE_ORDERS_READ: 'purchase_orders.read',
  PURCHASE_ORDERS_CREATE: 'purchase_orders.create',
  PURCHASE_ORDERS_UPDATE: 'purchase_orders.update',
  PURCHASE_ORDERS_DELETE: 'purchase_orders.delete',

  // invoices
  INVOICES_READ: 'invoices.read',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_UPDATE: 'invoices.update',
  INVOICES_DELETE: 'invoices.delete',
  INVOICES_VERIFY: 'invoices.verify',

  // sales
  SALES_READ: 'sales.read',
  SALES_CREATE: 'sales.create',
  SALES_UPDATE: 'sales.update',
  SALES_DELETE: 'sales.delete',

  // stock return
  STOCK_RETURN_READ: 'stock_return.read',
  STOCK_RETURN_CREATE: 'stock_return.create',
  STOCK_RETURN_UPDATE: 'stock_return.update',
  STOCK_RETURN_DELETE: 'stock_return.delete',

  // stock disposal
  STOCK_DISPOSAL_READ: 'stock_disposal.read',
  STOCK_DISPOSAL_CREATE: 'stock_disposal.create',
  STOCK_DISPOSAL_UPDATE: 'stock_disposal.update',
  STOCK_DISPOSAL_DELETE: 'stock_disposal.delete',

  // reports
  REPORTS_READ: 'reports.read',
  REPORTS_EXPORT: 'reports.export',

  // users
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  // permissions
  PERMISSIONS_READ: 'permissions.read',

  // roles
  ROLES_READ: 'roles.read',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',

  // licenses
  LICENSES_READ: 'licenses.read',
  LICENSES_CREATE: 'licenses.create',
  LICENSES_UPDATE: 'licenses.update',
  LICENSES_DELETE: 'licenses.delete',

  // pharmacies
  PHARMACIES_READ: 'pharmacies.read',
  PHARMACIES_CREATE: 'pharmacies.create',
  PHARMACIES_UPDATE: 'pharmacies.update',
  PHARMACIES_DELETE: 'pharmacies.delete',

  // business parameters
  BUSINESS_PARAMETERS_READ: 'business_parameters.read',
  BUSINESS_PARAMETERS_UPDATE: 'business_parameters.update',

  // system parameters
  SYSTEM_PARAMETERS_READ: 'system_parameters.read',
  SYSTEM_PARAMETERS_UPDATE: 'system_parameters.update',

  // settings
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',

  // storage
  STORAGE_READ: 'storage.read',
  STORAGE_CREATE: 'storage.create',
  STORAGE_UPDATE: 'storage.update',
  STORAGE_DELETE: 'storage.delete',

  // doctors
  DOCTORS_READ: 'doctors.read',
  DOCTORS_CREATE: 'doctors.create',
  DOCTORS_UPDATE: 'doctors.update',
  DOCTORS_DELETE: 'doctors.delete',

  // prescriptions
  PRESCRIPTIONS_READ: 'prescriptions.read',
  PRESCRIPTIONS_CREATE: 'prescriptions.create',
  PRESCRIPTIONS_UPDATE: 'prescriptions.update',
  PRESCRIPTIONS_DELETE: 'prescriptions.delete',

  // dashboard
  DASHBOARD_READ: 'dashboard.read',
  DASHBOARD_ADVANCED: 'dashboard.advanced',

  // signing
  SIGN_STANDARD: 'sign.standard',
  SIGN_FULL: 'sign.full',

} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]
