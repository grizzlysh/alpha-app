-- AlterTable: UserPharmacy — add joined_at and left_at fields
ALTER TABLE "mst_user_pharmacies"
  ADD COLUMN "joined_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  ADD COLUMN "left_at" TIMESTAMP(3);
