-- CreateTable: License
CREATE TABLE "mst_licenses" (
  "id"               SERIAL NOT NULL,
  "uuid"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "user_pharmacy_id" INTEGER NOT NULL,
  "license_number"   TEXT NOT NULL,
  "valid_from"       TIMESTAMP(3) NOT NULL,
  "valid_until"      TIMESTAMP(3) NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "deleted_at"       TIMESTAMP(3),
  "created_by_id"    INTEGER,
  "updated_by_id"    INTEGER,
  "deleted_by_id"    INTEGER,

  CONSTRAINT "mst_licenses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mst_licenses_uuid_key" ON "mst_licenses"("uuid");

ALTER TABLE "mst_licenses"
  ADD CONSTRAINT "mst_licenses_user_pharmacy_id_fkey"
    FOREIGN KEY ("user_pharmacy_id") REFERENCES "mst_user_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "mst_licenses_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "mst_licenses_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "mst_licenses_deleted_by_id_fkey"
    FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
