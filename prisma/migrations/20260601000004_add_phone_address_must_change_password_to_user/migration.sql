-- AlterTable: User — add phone, address, must_change_password fields
ALTER TABLE "mst_users"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
