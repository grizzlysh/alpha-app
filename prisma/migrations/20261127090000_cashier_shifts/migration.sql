-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ShiftCashMovementType" AS ENUM ('IN', 'OUT');

-- AlterTable
ALTER TABLE "trx_sale_payment_history" ADD COLUMN     "shift_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_sales" ADD COLUMN     "refund_shift_id" INTEGER,
ADD COLUMN     "shift_id" INTEGER;

-- CreateTable
CREATE TABLE "trx_cashier_shifts" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "shift_number" TEXT NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opening_cash" DECIMAL(12,2) NOT NULL,
    "opening_note" TEXT,
    "closed_at" TIMESTAMP(3),
    "closed_by_id" INTEGER,
    "counted_cash" DECIMAL(12,2),
    "expected_cash" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "closing_note" TEXT,
    "cash_sales" DECIMAL(12,2),
    "non_cash_sales" DECIMAL(12,2),
    "cash_refunds" DECIMAL(12,2),
    "cash_in" DECIMAL(12,2),
    "cash_out" DECIMAL(12,2),
    "sale_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trx_cashier_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_shift_cash_movements" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "shift_id" INTEGER NOT NULL,
    "type" "ShiftCashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER,

    CONSTRAINT "trx_shift_cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trx_cashier_shifts_uuid_key" ON "trx_cashier_shifts"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_cashier_shifts_shift_number_key" ON "trx_cashier_shifts"("shift_number");

-- CreateIndex
CREATE INDEX "trx_cashier_shifts_pharmacy_id_opened_at_idx" ON "trx_cashier_shifts"("pharmacy_id", "opened_at");

-- CreateIndex
CREATE INDEX "trx_cashier_shifts_pharmacy_id_status_idx" ON "trx_cashier_shifts"("pharmacy_id", "status");

-- CreateIndex
CREATE INDEX "trx_cashier_shifts_user_id_status_idx" ON "trx_cashier_shifts"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trx_shift_cash_movements_uuid_key" ON "trx_shift_cash_movements"("uuid");

-- CreateIndex
CREATE INDEX "trx_shift_cash_movements_shift_id_idx" ON "trx_shift_cash_movements"("shift_id");

-- CreateIndex
CREATE INDEX "trx_sale_payment_history_shift_id_idx" ON "trx_sale_payment_history"("shift_id");

-- CreateIndex
CREATE INDEX "trx_sales_shift_id_idx" ON "trx_sales"("shift_id");

-- CreateIndex
CREATE INDEX "trx_sales_refund_shift_id_idx" ON "trx_sales"("refund_shift_id");

-- AddForeignKey
ALTER TABLE "trx_sales" ADD CONSTRAINT "trx_sales_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "trx_cashier_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sales" ADD CONSTRAINT "trx_sales_refund_shift_id_fkey" FOREIGN KEY ("refund_shift_id") REFERENCES "trx_cashier_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_payment_history" ADD CONSTRAINT "trx_sale_payment_history_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "trx_cashier_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_cashier_shifts" ADD CONSTRAINT "trx_cashier_shifts_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_cashier_shifts" ADD CONSTRAINT "trx_cashier_shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mst_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_cashier_shifts" ADD CONSTRAINT "trx_cashier_shifts_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_shift_cash_movements" ADD CONSTRAINT "trx_shift_cash_movements_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "trx_cashier_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_shift_cash_movements" ADD CONSTRAINT "trx_shift_cash_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- One open shift per cashier per pharmacy.
CREATE UNIQUE INDEX "trx_cashier_shifts_one_open_per_cashier" ON "trx_cashier_shifts"("pharmacy_id", "user_id") WHERE "status" = 'OPEN';

-- Shift settings, off by default so nothing changes until a pharmacy turns them on.
INSERT INTO mst_business_parameters (uuid, pharmacy_id, key, value, data_type, description, created_at, updated_at)
SELECT gen_random_uuid()::text, p.id, v.key, v.value, v.data_type::"DataType", v.description, NOW(), NOW()
FROM mst_pharmacies p
CROSS JOIN (VALUES
  ('CASHIER_SHIFT_ENABLED', 'false', 'BOOLEAN', 'Cashiers open a shift with the drawer cash before selling and close it by counting the drawer'),
  ('CASHIER_SHIFT_OPENING_CASH', '0', 'NUMBER', 'Opening cash (float) suggested when a shift is opened'),
  ('CASHIER_SHIFT_BLIND_CLOSE', 'false', 'BOOLEAN', 'When closing, the cashier counts the drawer without seeing the expected cash'),
  ('CASHIER_SHIFT_DIFFERENCE_TOLERANCE', '0', 'NUMBER', 'A cash difference larger than this (Rp) needs a note when the shift is closed')
) AS v(key, value, data_type, description)
ON CONFLICT (pharmacy_id, key) DO NOTHING;
