export const PERMISSIONS = {

  // medicine shapes
  MEDICINE_SHAPES_VIEW: 'medicine_shapes.view',
  MEDICINE_SHAPES_CREATE: 'medicine_shapes.create',
  MEDICINE_SHAPES_EDIT: 'medicine_shapes.edit',
  MEDICINE_SHAPES_DELETE: 'medicine_shapes.delete',

  // medicine types
  MEDICINE_TYPES_VIEW: 'medicine_types.view',
  MEDICINE_TYPES_CREATE: 'medicine_types.create',
  MEDICINE_TYPES_EDIT: 'medicine_types.edit',
  MEDICINE_TYPES_DELETE: 'medicine_types.delete',

  // medicine classes
  MEDICINE_CLASSES_VIEW: 'medicine_classes.view',
  MEDICINE_CLASSES_CREATE: 'medicine_classes.create',
  MEDICINE_CLASSES_EDIT: 'medicine_classes.edit',
  MEDICINE_CLASSES_DELETE: 'medicine_classes.delete',

  // medicines
  MEDICINES_VIEW: 'medicines.view',
  MEDICINES_CREATE: 'medicines.create',
  MEDICINES_EDIT: 'medicines.edit',
  MEDICINES_DELETE: 'medicines.delete',

  // distributors
  DISTRIBUTORS_VIEW: 'distributors.view',
  DISTRIBUTORS_CREATE: 'distributors.create',
  DISTRIBUTORS_EDIT: 'distributors.edit',
  DISTRIBUTORS_DELETE: 'distributors.delete',

  // customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_DELETE: 'customers.delete',

  // stock
  STOCK_VIEW: 'stock.view',
  STOCK_ADJUST: 'stock.adjust',

  // purchase orders
  PURCHASE_ORDERS_VIEW: 'purchase_orders.view',
  PURCHASE_ORDERS_CREATE: 'purchase_orders.create',
  PURCHASE_ORDERS_EDIT: 'purchase_orders.edit',
  PURCHASE_ORDERS_DELETE: 'purchase_orders.delete',

  // invoices
  INVOICES_VIEW: 'invoices.view',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_EDIT: 'invoices.edit',
  INVOICES_DELETE: 'invoices.delete',
  INVOICES_VERIFY: 'invoices.verify',

  // sales
  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_EDIT: 'sales.edit',
  SALES_DELETE: 'sales.delete',

  // stock return
  STOCK_RETURN_VIEW: 'stock_return.view',
  STOCK_RETURN_CREATE: 'stock_return.create',
  STOCK_RETURN_EDIT: 'stock_return.edit',
  STOCK_RETURN_DELETE: 'stock_return.delete',

  // stock disposal
  STOCK_DISPOSAL_VIEW: 'stock_disposal.view',
  STOCK_DISPOSAL_CREATE: 'stock_disposal.create',
  STOCK_DISPOSAL_EDIT: 'stock_disposal.edit',
  STOCK_DISPOSAL_DELETE: 'stock_disposal.delete',

  // reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',

  // oermission
  PERMISSIONS_VIEW: 'permissions.view',

  // roles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',

  // licenses
  LICENSES_VIEW: 'licenses.view',
  LICENSES_CREATE: 'licenses.create',
  LICENSES_EDIT: 'licenses.edit',
  LICENSES_DELETE: 'licenses.delete',

  // pharmacies
  PHARMACIES_VIEW: 'pharmacies.view',
  PHARMACIES_CREATE: 'pharmacies.create',
  PHARMACIES_EDIT: 'pharmacies.edit',
  PHARMACIES_DELETE: 'pharmacies.delete',

  // business parameters
  BUSINESS_PARAMETERS_VIEW: 'business_parameters.view',
  BUSINESS_PARAMETERS_EDIT: 'business_parameters.edit',

  // system parameters
  SYSTEM_PARAMETERS_VIEW: 'system_parameters.view',
  SYSTEM_PARAMETERS_EDIT: 'system_parameters.edit',

  // settings (kept for backward compatibility)
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',

  // signing
  SIGN_STANDARD: 'sign.standard',
  SIGN_FULL: 'sign.full',

} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]