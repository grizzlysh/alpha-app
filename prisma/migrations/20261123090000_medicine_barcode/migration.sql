-- Optional per-medicine barcode (maker's EAN-13 or in-house), unique within a pharmacy.

-- AlterTable
ALTER TABLE "mst_medicines" ADD COLUMN     "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "mst_medicines_pharmacy_id_barcode_key" ON "mst_medicines"("pharmacy_id", "barcode");

