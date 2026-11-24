-- AlterTable: User — login lockout fields
ALTER TABLE "mst_users"
  ADD COLUMN "failed_login_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locked_until" TIMESTAMP(3);

-- AlterTable: Sale — tax and due date fields
ALTER TABLE "trx_sales"
  ADD COLUMN "tax_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "due_date" TIMESTAMP(3);
