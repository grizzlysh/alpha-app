-- Party model migration: replaces mst_patients with mst_parties + extension tables
-- Existing transactional data is cleared (dev environment — data is re-seeded)

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('PATIENT', 'PROFESSIONAL');

-- Clear dependent transactional data before structural changes
TRUNCATE TABLE "trx_sale_details" CASCADE;
TRUNCATE TABLE "trx_sales" CASCADE;
TRUNCATE TABLE "trx_prescriptions" CASCADE;
TRUNCATE TABLE "trx_prescription_details" CASCADE;

-- Drop old FK references to mst_patients
ALTER TABLE "trx_sales" DROP COLUMN IF EXISTS "patient_id";
ALTER TABLE "trx_prescriptions" DROP COLUMN IF EXISTS "patient_id";

-- Drop old patients table
DROP TABLE IF EXISTS "mst_patients";

-- CreateTable: mst_parties
CREATE TABLE "mst_parties" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "party_type" "PartyType" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "description" TEXT,
    "is_walk_in" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "mst_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable: mst_party_patient_details
CREATE TABLE "mst_party_patient_details" (
    "id" SERIAL NOT NULL,
    "party_id" INTEGER NOT NULL,
    "nik" TEXT,
    "gender" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "bpjs_number" TEXT,
    "medical_record_number" TEXT,

    CONSTRAINT "mst_party_patient_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable: mst_party_professional_details
CREATE TABLE "mst_party_professional_details" (
    "id" SERIAL NOT NULL,
    "party_id" INTEGER NOT NULL,
    "str_number" TEXT,
    "sip_number" TEXT,
    "profession" TEXT,

    CONSTRAINT "mst_party_professional_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mst_parties_uuid_key" ON "mst_parties"("uuid");
CREATE UNIQUE INDEX "mst_party_patient_details_party_id_key" ON "mst_party_patient_details"("party_id");
CREATE UNIQUE INDEX "mst_party_professional_details_party_id_key" ON "mst_party_professional_details"("party_id");

-- AddColumn: party_id to trx_sales
ALTER TABLE "trx_sales" ADD COLUMN "party_id" INTEGER NOT NULL;

-- AddColumn: party_id to trx_prescriptions
ALTER TABLE "trx_prescriptions" ADD COLUMN "party_id" INTEGER NOT NULL;

-- AddForeignKey: mst_parties -> mst_pharmacies
ALTER TABLE "mst_parties" ADD CONSTRAINT "mst_parties_pharmacy_id_fkey"
    FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: mst_parties audit trail
ALTER TABLE "mst_parties" ADD CONSTRAINT "mst_parties_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mst_parties" ADD CONSTRAINT "mst_parties_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mst_parties" ADD CONSTRAINT "mst_parties_deleted_by_id_fkey"
    FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: mst_party_patient_details -> mst_parties
ALTER TABLE "mst_party_patient_details" ADD CONSTRAINT "mst_party_patient_details_party_id_fkey"
    FOREIGN KEY ("party_id") REFERENCES "mst_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: mst_party_professional_details -> mst_parties
ALTER TABLE "mst_party_professional_details" ADD CONSTRAINT "mst_party_professional_details_party_id_fkey"
    FOREIGN KEY ("party_id") REFERENCES "mst_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: trx_sales.party_id -> mst_parties
ALTER TABLE "trx_sales" ADD CONSTRAINT "trx_sales_party_id_fkey"
    FOREIGN KEY ("party_id") REFERENCES "mst_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: trx_prescriptions.party_id -> mst_parties
ALTER TABLE "trx_prescriptions" ADD CONSTRAINT "trx_prescriptions_party_id_fkey"
    FOREIGN KEY ("party_id") REFERENCES "mst_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
