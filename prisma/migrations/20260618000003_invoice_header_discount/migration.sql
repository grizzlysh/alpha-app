-- Add header-level discount columns to trx_invoices
ALTER TABLE "trx_invoices"
  ADD COLUMN "discount_percentage" DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN "discount_amount"     DECIMAL(12,2) NOT NULL DEFAULT 0;
