-- ── Rename PartyType enum → CustomerType ─────────────────────────────────────
ALTER TYPE "PartyType" RENAME TO "CustomerType";

-- ── Rename mst_parties → mst_customers ───────────────────────────────────────
ALTER TABLE "mst_parties" RENAME TO "mst_customers";
ALTER TABLE "mst_customers" RENAME COLUMN "party_type" TO "customer_type";

-- ── Rename mst_party_patient_details → mst_customer_patient_details ──────────
ALTER TABLE "mst_party_patient_details" RENAME TO "mst_customer_patient_details";
ALTER TABLE "mst_customer_patient_details" RENAME COLUMN "party_id" TO "customer_id";

-- ── Rename mst_party_professional_details → mst_customer_professional_details ─
ALTER TABLE "mst_party_professional_details" RENAME TO "mst_customer_professional_details";
ALTER TABLE "mst_customer_professional_details" RENAME COLUMN "party_id" TO "customer_id";

-- ── Rename party_id → customer_id on trx_medical_records ─────────────────────
ALTER TABLE "trx_medical_records" RENAME COLUMN "party_id" TO "customer_id";

-- ── Rename party_id → customer_id on trx_prescriptions ───────────────────────
ALTER TABLE "trx_prescriptions" RENAME COLUMN "party_id" TO "customer_id";

-- ── Rename party_id → customer_id on trx_sales ───────────────────────────────
ALTER TABLE "trx_sales" RENAME COLUMN "party_id" TO "customer_id";
