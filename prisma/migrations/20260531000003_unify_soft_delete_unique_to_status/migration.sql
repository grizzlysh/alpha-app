-- Consolidate all soft-delete partial unique indexes to use
-- WHERE status != 'DELETED' instead of WHERE deleted_at IS NULL.
-- This aligns DB enforcement with the app-layer checkDuplicate filter.

-- MedicineShape
DROP INDEX IF EXISTS "mst_medicine_shapes_pharmacy_id_name_active_key";
CREATE UNIQUE INDEX "mst_medicine_shapes_pharmacy_id_name_active_key"
  ON "mst_medicine_shapes" ("pharmacy_id", "name") WHERE status != 'DELETED';

-- MedicineType
DROP INDEX IF EXISTS "mst_medicine_types_pharmacy_id_name_active_key";
CREATE UNIQUE INDEX "mst_medicine_types_pharmacy_id_name_active_key"
  ON "mst_medicine_types" ("pharmacy_id", "name") WHERE status != 'DELETED';

-- MedicineClass
DROP INDEX IF EXISTS "mst_medicine_classes_pharmacy_id_name_active_key";
CREATE UNIQUE INDEX "mst_medicine_classes_pharmacy_id_name_active_key"
  ON "mst_medicine_classes" ("pharmacy_id", "name") WHERE status != 'DELETED';

-- Medicine
DROP INDEX IF EXISTS "mst_medicines_pharmacy_id_name_active_key";
CREATE UNIQUE INDEX "mst_medicines_pharmacy_id_name_active_key"
  ON "mst_medicines" ("pharmacy_id", "name") WHERE status != 'DELETED';

-- Role
DROP INDEX IF EXISTS "mst_roles_pharmacy_id_name_active_key";
CREATE UNIQUE INDEX "mst_roles_pharmacy_id_name_active_key"
  ON "mst_roles" ("pharmacy_id", "name") WHERE status != 'DELETED';

-- Position
DROP INDEX IF EXISTS "mst_positions_pharmacy_id_name_active_key";
CREATE UNIQUE INDEX "mst_positions_pharmacy_id_name_active_key"
  ON "mst_positions" ("pharmacy_id", "name") WHERE status != 'DELETED';

-- UserPharmacy
DROP INDEX IF EXISTS "mst_user_pharmacies_user_id_pharmacy_id_active_key";
CREATE UNIQUE INDEX "mst_user_pharmacies_user_id_pharmacy_id_active_key"
  ON "mst_user_pharmacies" ("user_id", "pharmacy_id") WHERE status != 'DELETED';

-- EmployeePharmacy
DROP INDEX IF EXISTS "mst_employee_pharmacies_employee_id_pharmacy_id_active_key";
CREATE UNIQUE INDEX "mst_employee_pharmacies_employee_id_pharmacy_id_active_key"
  ON "mst_employee_pharmacies" ("employee_id", "pharmacy_id") WHERE status != 'DELETED';
