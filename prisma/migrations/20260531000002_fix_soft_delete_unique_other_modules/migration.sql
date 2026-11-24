-- Replace hard unique indexes with partial unique indexes (WHERE deleted_at IS NULL)
-- so soft-deleted rows do not block re-creation of records with the same key fields.

-- Role
DROP INDEX IF EXISTS "mst_roles_pharmacy_id_name_key";
CREATE UNIQUE INDEX "mst_roles_pharmacy_id_name_active_key"
  ON "mst_roles" ("pharmacy_id", "name") WHERE "deleted_at" IS NULL;

-- Position
DROP INDEX IF EXISTS "mst_positions_pharmacy_id_name_key";
CREATE UNIQUE INDEX "mst_positions_pharmacy_id_name_active_key"
  ON "mst_positions" ("pharmacy_id", "name") WHERE "deleted_at" IS NULL;

-- UserPharmacy
DROP INDEX IF EXISTS "mst_user_pharmacies_user_id_pharmacy_id_key";
CREATE UNIQUE INDEX "mst_user_pharmacies_user_id_pharmacy_id_active_key"
  ON "mst_user_pharmacies" ("user_id", "pharmacy_id") WHERE "deleted_at" IS NULL;

-- EmployeePharmacy
DROP INDEX IF EXISTS "mst_employee_pharmacies_employee_id_pharmacy_id_key";
CREATE UNIQUE INDEX "mst_employee_pharmacies_employee_id_pharmacy_id_active_key"
  ON "mst_employee_pharmacies" ("employee_id", "pharmacy_id") WHERE "deleted_at" IS NULL;
