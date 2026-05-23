export const PERMISSIONS = {
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

  // inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',

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

  // stock disposal
  STOCK_DISPOSAL_VIEW: 'stock_disposal.view',
  STOCK_DISPOSAL_CREATE: 'stock_disposal.create',
  STOCK_DISPOSAL_EDIT: 'stock_disposal.edit',

  // reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',

  // settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]