-- AlterTable
ALTER TABLE "mst_users" ADD COLUMN "last_selected_pharmacy_id" INTEGER;

-- AddForeignKey
ALTER TABLE "mst_users" ADD CONSTRAINT "mst_users_last_selected_pharmacy_id_fkey" FOREIGN KEY ("last_selected_pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
