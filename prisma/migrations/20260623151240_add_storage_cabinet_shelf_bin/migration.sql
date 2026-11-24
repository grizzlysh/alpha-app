-- AlterTable
ALTER TABLE "inv_stock_details" ADD COLUMN     "bin_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_medicines" ADD COLUMN     "default_bin_id" INTEGER;

-- CreateTable
CREATE TABLE "mst_storage_cabinets" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "mst_storage_cabinets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_storage_shelves" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "cabinet_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "level" INTEGER,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "mst_storage_shelves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_storage_bins" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "shelf_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "mst_storage_bins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mst_storage_cabinets_uuid_key" ON "mst_storage_cabinets"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_storage_cabinets_pharmacy_id_code_key" ON "mst_storage_cabinets"("pharmacy_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "mst_storage_shelves_uuid_key" ON "mst_storage_shelves"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_storage_shelves_cabinet_id_code_key" ON "mst_storage_shelves"("cabinet_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "mst_storage_bins_uuid_key" ON "mst_storage_bins"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_storage_bins_shelf_id_code_key" ON "mst_storage_bins"("shelf_id", "code");

-- AddForeignKey
ALTER TABLE "mst_storage_cabinets" ADD CONSTRAINT "mst_storage_cabinets_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_storage_cabinets" ADD CONSTRAINT "mst_storage_cabinets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_storage_cabinets" ADD CONSTRAINT "mst_storage_cabinets_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_storage_cabinets" ADD CONSTRAINT "mst_storage_cabinets_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_storage_shelves" ADD CONSTRAINT "mst_storage_shelves_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "mst_storage_cabinets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_storage_shelves" ADD CONSTRAINT "mst_storage_shelves_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_storage_shelves" ADD CONSTRAINT "mst_storage_shelves_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_storage_shelves" ADD CONSTRAINT "mst_storage_shelves_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_storage_bins" ADD CONSTRAINT "mst_storage_bins_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "mst_storage_shelves"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_storage_bins" ADD CONSTRAINT "mst_storage_bins_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_storage_bins" ADD CONSTRAINT "mst_storage_bins_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_storage_bins" ADD CONSTRAINT "mst_storage_bins_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicines" ADD CONSTRAINT "mst_medicines_default_bin_id_fkey" FOREIGN KEY ("default_bin_id") REFERENCES "mst_storage_bins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_details" ADD CONSTRAINT "inv_stock_details_bin_id_fkey" FOREIGN KEY ("bin_id") REFERENCES "mst_storage_bins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
