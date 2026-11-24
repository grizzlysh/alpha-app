-- Rename table: mst_user_pharmacies → mst_placements
ALTER TABLE "mst_user_pharmacies" RENAME TO "mst_placements";

-- Rename sequence
ALTER SEQUENCE "mst_user_pharmacies_id_seq" RENAME TO "mst_placements_id_seq";

-- Rename indexes
ALTER INDEX "mst_user_pharmacies_pkey" RENAME TO "mst_placements_pkey";
ALTER INDEX "mst_user_pharmacies_uuid_key" RENAME TO "mst_placements_uuid_key";
