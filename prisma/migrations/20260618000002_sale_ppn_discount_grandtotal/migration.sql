-- Rename tax columns to ppn on trx_sales
ALTER TABLE "trx_sales" RENAME COLUMN "tax_percentage" TO "ppn_percentage";
ALTER TABLE "trx_sales" RENAME COLUMN "tax_amount" TO "ppn_amount";

-- Add header-level discount and grand_total columns
ALTER TABLE "trx_sales"
  ADD COLUMN "discount_percentage" DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN "discount_amount"     DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "grand_total"         DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill grand_total: existing totalAmount already included tax, so use it as-is
UPDATE "trx_sales" SET "grand_total" = "total_amount";

-- Rename TAX_PERCENTAGE -> PPN_PERCENTAGE_SELL per pharmacy
UPDATE "mst_business_parameters"
  SET key = 'PPN_PERCENTAGE_SELL',
      description = 'PPN percentage charged to customers on sales'
  WHERE key = 'TAX_PERCENTAGE';

-- Add PPN_PERCENTAGE_BUY for each pharmacy that does not have it yet
INSERT INTO "mst_business_parameters" (uuid, pharmacy_id, key, value, data_type, description, created_at, updated_at)
SELECT gen_random_uuid(), p.id, 'PPN_PERCENTAGE_BUY', '11', 'PERCENTAGE',
       'PPN percentage on purchases from distributors (input VAT)', NOW(), NOW()
FROM "mst_pharmacies" p
WHERE NOT EXISTS (
  SELECT 1 FROM "mst_business_parameters"
  WHERE pharmacy_id = p.id AND key = 'PPN_PERCENTAGE_BUY'
);
