-- A prescription can be dispensed over several sales (partial fills, refunds).
-- DropIndex
DROP INDEX "trx_sales_prescription_id_key";

-- CreateIndex
CREATE INDEX "trx_sales_prescription_id_idx" ON "trx_sales"("prescription_id");

