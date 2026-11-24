-- Rename discount (percentage) and add discount_amount to trx_sale_details

ALTER TABLE "trx_sale_details" RENAME COLUMN "discount" TO "discount_percentage";

ALTER TABLE "trx_sale_details"
  ALTER COLUMN "discount_percentage" TYPE DECIMAL(5,2),
  ALTER COLUMN "discount_percentage" SET DEFAULT 0;

ALTER TABLE "trx_sale_details"
  ADD COLUMN "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
