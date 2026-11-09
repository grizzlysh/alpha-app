-- Null existing signed_by_id values (they reference employee IDs, not user IDs)
UPDATE "trx_purchase_orders" SET signed_by_id = NULL;
UPDATE "trx_invoices" SET signed_by_id = NULL;
UPDATE "trx_stock_returns" SET signed_by_id = NULL;
UPDATE "trx_stock_disposals" SET signed_by_id = NULL;

-- Drop FK constraints pointing to mst_employees
ALTER TABLE "trx_purchase_orders" DROP CONSTRAINT IF EXISTS "trx_purchase_orders_signed_by_id_fkey";
ALTER TABLE "trx_invoices" DROP CONSTRAINT IF EXISTS "trx_invoices_signed_by_id_fkey";
ALTER TABLE "trx_stock_returns" DROP CONSTRAINT IF EXISTS "trx_stock_returns_signed_by_id_fkey";
ALTER TABLE "trx_stock_disposals" DROP CONSTRAINT IF EXISTS "trx_stock_disposals_signed_by_id_fkey";

-- Re-add FK constraints pointing to mst_users
ALTER TABLE "trx_purchase_orders" ADD CONSTRAINT "trx_purchase_orders_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trx_invoices" ADD CONSTRAINT "trx_invoices_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trx_stock_returns" ADD CONSTRAINT "trx_stock_returns_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trx_stock_disposals" ADD CONSTRAINT "trx_stock_disposals_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop employee-related tables (order matters: child → parent)
DROP TABLE IF EXISTS "mst_employee_pharmacies";
DROP TABLE IF EXISTS "mst_employees";
DROP TABLE IF EXISTS "mst_positions";

-- Drop SignAuthority enum
DROP TYPE IF EXISTS "SignAuthority";
