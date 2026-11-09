-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('OWNER', 'ADMIN', 'PHARMACIST', 'HEAD_PHARMACIST', 'CASHIER', 'DOCTOR');

-- AlterTable: cast existing "type" column from PharmacyRole to AppRole (preserves data)
ALTER TABLE "mst_roles" ALTER COLUMN "type" TYPE "AppRole" USING ("type"::text::"AppRole");

-- DropEnum
DROP TYPE "PharmacyRole";
