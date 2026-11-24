-- CreateTable
CREATE TABLE "inv_stock_reservations" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "stock_detail_id" INTEGER NOT NULL,
    "medicine_id" INTEGER NOT NULL,
    "quantity_pieces" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER,

    CONSTRAINT "inv_stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inv_stock_reservations_uuid_key" ON "inv_stock_reservations"("uuid");

-- AddForeignKey
ALTER TABLE "inv_stock_reservations" ADD CONSTRAINT "inv_stock_reservations_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_reservations" ADD CONSTRAINT "inv_stock_reservations_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "trx_sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_reservations" ADD CONSTRAINT "inv_stock_reservations_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "inv_stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_reservations" ADD CONSTRAINT "inv_stock_reservations_stock_detail_id_fkey" FOREIGN KEY ("stock_detail_id") REFERENCES "inv_stock_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_reservations" ADD CONSTRAINT "inv_stock_reservations_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "mst_medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_reservations" ADD CONSTRAINT "inv_stock_reservations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
