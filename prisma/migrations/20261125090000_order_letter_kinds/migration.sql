-- Order letter (surat pesanan) kinds: regular, narcotic, psychotropic,
-- pharmaceutical precursor and "obat-obat tertentu". A medicine type carries
-- one, a medicine may override it, and a purchase order holds one kind only.

-- CreateEnum
CREATE TYPE "OrderLetterKind" AS ENUM ('REGULAR', 'NARCOTIC', 'PSYCHOTROPIC', 'PRECURSOR', 'CERTAIN_DRUG');

-- AlterTable
ALTER TABLE "mst_medicine_types" ADD COLUMN     "order_letter_kind" "OrderLetterKind" NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE "mst_medicines" ADD COLUMN     "order_letter_kind" "OrderLetterKind";

-- AlterTable
ALTER TABLE "trx_purchase_orders" ADD COLUMN     "kind" "OrderLetterKind" NOT NULL DEFAULT 'REGULAR';

-- Existing types by name (the default catalog's Narkotika, Psikotropika, Prekursor).
UPDATE "mst_medicine_types" SET "order_letter_kind" = 'NARCOTIC' WHERE "name" ILIKE '%narkotik%';
UPDATE "mst_medicine_types" SET "order_letter_kind" = 'PSYCHOTROPIC' WHERE "name" ILIKE '%psikotropik%';
UPDATE "mst_medicine_types" SET "order_letter_kind" = 'PRECURSOR' WHERE "name" ILIKE '%prekursor%';
UPDATE "mst_medicine_types" SET "order_letter_kind" = 'CERTAIN_DRUG' WHERE "name" ILIKE '%obat-obat tertentu%' OR "name" ILIKE '%obat obat tertentu%' OR "name" ILIKE 'OOT';

-- Existing orders whose items are all of one special kind take that kind.
UPDATE "trx_purchase_orders" po SET "kind" = k.kind
FROM (
  SELECT d.purchase_order_id, MIN(t.order_letter_kind::text)::"OrderLetterKind" AS kind
  FROM "trx_purchase_order_details" d
  JOIN "mst_medicines" m ON m.id = d.medicine_id
  JOIN "mst_medicine_types" t ON t.id = m.type_id
  WHERE d.deleted_at IS NULL
  GROUP BY d.purchase_order_id
  HAVING COUNT(DISTINCT t.order_letter_kind) = 1
) k
WHERE po.id = k.purchase_order_id;
