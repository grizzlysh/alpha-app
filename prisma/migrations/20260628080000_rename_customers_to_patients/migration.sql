-- Rename the customers table to patients
ALTER TABLE "mst_customers" RENAME TO "mst_patients";

-- Rename customer_id column in trx_prescriptions
ALTER TABLE "trx_prescriptions" RENAME COLUMN "customer_id" TO "patient_id";

-- Rename customer_id column in trx_sales
ALTER TABLE "trx_sales" RENAME COLUMN "customer_id" TO "patient_id";

-- Rename audit relation columns in User table (no DB changes needed — these are Prisma-only)
-- Rename FK constraint names to match new naming (PostgreSQL auto-renames on table rename, but explicit for clarity)
