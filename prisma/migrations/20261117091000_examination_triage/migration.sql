-- Triage (optional step before the doctor) + doctor's examination result fields.
ALTER TABLE "trx_medical_visits" ADD COLUMN     "advice" TEXT,
ADD COLUMN     "findings" TEXT,
ADD COLUMN     "oxygen_saturation" INTEGER,
ADD COLUMN     "triaged_at" TIMESTAMP(3),
ADD COLUMN     "triaged_by_id" INTEGER;

ALTER TABLE "trx_medical_visits" ADD CONSTRAINT "trx_medical_visits_triaged_by_id_fkey" FOREIGN KEY ("triaged_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Permission: record vitals/allergies before the doctor.
INSERT INTO "mst_permissions" ("uuid", "module", "action", "description", "updated_at")
VALUES (gen_random_uuid()::text, 'examinations', 'triage', 'Record vital signs and allergies before the doctor', CURRENT_TIMESTAMP)
ON CONFLICT ("module", "action") DO NOTHING;

-- Global Nurse role.
INSERT INTO "mst_roles" ("uuid", "pharmacy_id", "name", "type", "description", "requires_license", "status", "updated_at")
SELECT gen_random_uuid()::text, NULL, 'Nurse', 'NURSE', 'Nurse: patient registration, vital signs and allergies', false, 'ACTIVE', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "mst_roles" WHERE "pharmacy_id" IS NULL AND "type" = 'NURSE' AND "deleted_at" IS NULL);

-- Triage for the roles that already run the queue (not cashier by default).
INSERT INTO "mst_role_permissions" ("uuid", "role_id", "permission_id", "is_enabled", "updated_at")
SELECT gen_random_uuid()::text, r."id", p."id", true, CURRENT_TIMESTAMP
FROM "mst_roles" r
CROSS JOIN "mst_permissions" p
WHERE p."module" = 'examinations' AND p."action" = 'triage'
  AND r."pharmacy_id" IS NULL AND r."deleted_at" IS NULL
  AND r."type"::text IN ('OWNER', 'ADMIN', 'HEAD_PHARMACIST', 'PHARMACIST', 'DOCTOR')
  AND NOT EXISTS (
    SELECT 1 FROM "mst_role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id" AND rp."pharmacy_id" IS NULL
  );

-- Nurse permission set.
INSERT INTO "mst_role_permissions" ("uuid", "role_id", "permission_id", "is_enabled", "updated_at")
SELECT gen_random_uuid()::text, r."id", p."id", true, CURRENT_TIMESTAMP
FROM "mst_roles" r
CROSS JOIN "mst_permissions" p
WHERE r."pharmacy_id" IS NULL AND r."deleted_at" IS NULL AND r."type" = 'NURSE'
  AND (p."module" || '.' || p."action") IN (
    'customers.read', 'customers.create', 'customers.update',
    'medicines.read', 'doctors.read', 'prescriptions.read',
    'medical_records.read', 'medical_records.write',
    'examinations.read', 'examinations.checkin', 'examinations.triage',
    'dashboard.read'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "mst_role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id" AND rp."pharmacy_id" IS NULL
  );
