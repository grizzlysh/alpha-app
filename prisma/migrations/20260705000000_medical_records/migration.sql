-- ── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE "AllergyType" AS ENUM ('MEDICINE', 'FOOD', 'ENVIRONMENT', 'OTHER');
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- ── Drop old medicalRecordNumber column ───────────────────────────────────

ALTER TABLE "mst_party_patient_details" DROP COLUMN IF EXISTS "medical_record_number";

-- ── Create trx_medical_records ────────────────────────────────────────────

CREATE TABLE "trx_medical_records" (
    "id"                       SERIAL PRIMARY KEY,
    "uuid"                     TEXT NOT NULL,
    "party_id"                 INTEGER NOT NULL,
    "pharmacy_id"              INTEGER NOT NULL,
    "number"                   TEXT NOT NULL,
    "blood_type"               TEXT,
    "emergency_contact_name"   TEXT,
    "emergency_contact_phone"  TEXT,
    "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"               TIMESTAMP(3) NOT NULL,
    "created_by_id"            INTEGER,
    "updated_by_id"            INTEGER,
    CONSTRAINT "trx_medical_records_uuid_key" UNIQUE ("uuid"),
    CONSTRAINT "trx_medical_records_party_id_key" UNIQUE ("party_id"),
    CONSTRAINT "trx_medical_records_number_key" UNIQUE ("number")
);

ALTER TABLE "trx_medical_records"
    ADD CONSTRAINT "trx_medical_records_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "mst_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "trx_medical_records_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "trx_medical_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "trx_medical_records_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Create trx_medical_record_allergies ───────────────────────────────────

CREATE TABLE "trx_medical_record_allergies" (
    "id"               SERIAL PRIMARY KEY,
    "uuid"             TEXT NOT NULL,
    "medical_record_id" INTEGER NOT NULL,
    "allergen_name"    TEXT NOT NULL,
    "allergen_type"    "AllergyType" NOT NULL,
    "reaction"         TEXT,
    "severity"         "AllergySeverity" NOT NULL,
    "notes"            TEXT,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,
    "created_by_id"    INTEGER,
    "updated_by_id"    INTEGER,
    CONSTRAINT "trx_medical_record_allergies_uuid_key" UNIQUE ("uuid")
);

ALTER TABLE "trx_medical_record_allergies"
    ADD CONSTRAINT "trx_medical_record_allergies_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "trx_medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "trx_medical_record_allergies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "trx_medical_record_allergies_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Create trx_medical_visits ─────────────────────────────────────────────

CREATE TABLE "trx_medical_visits" (
    "id"                   SERIAL PRIMARY KEY,
    "uuid"                 TEXT NOT NULL,
    "medical_record_id"    INTEGER NOT NULL,
    "pharmacy_id"          INTEGER NOT NULL,
    "visit_date"           TIMESTAMP(3) NOT NULL,
    "chief_complaint"      TEXT,
    "diagnosis"            TEXT,
    "notes"                TEXT,
    "weight_kg"            DECIMAL(5,2),
    "height_cm"            DECIMAL(5,2),
    "blood_pressure"       TEXT,
    "temperature_celsius"  DECIMAL(4,1),
    "pulse_per_minute"     INTEGER,
    "prescription_id"      INTEGER,
    "doctor_id"            INTEGER,
    "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3) NOT NULL,
    "deleted_at"           TIMESTAMP(3),
    "created_by_id"        INTEGER,
    "updated_by_id"        INTEGER,
    "deleted_by_id"        INTEGER,
    CONSTRAINT "trx_medical_visits_uuid_key" UNIQUE ("uuid"),
    CONSTRAINT "trx_medical_visits_prescription_id_key" UNIQUE ("prescription_id")
);

ALTER TABLE "trx_medical_visits"
    ADD CONSTRAINT "trx_medical_visits_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "trx_medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "trx_medical_visits_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "trx_medical_visits_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "trx_prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "trx_medical_visits_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mst_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "trx_medical_visits_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "trx_medical_visits_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "trx_medical_visits_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
