-- The medical records module shipped without its permission rows, so nobody
-- except the platform admin could open it. Add them with the same defaults as
-- seed-core, and drop the stale `patients.*` permissions (patients became
-- customers with customer_type = PATIENT and use `customers.*`).

INSERT INTO "mst_permissions" ("uuid", "module", "action", "description", "updated_at")
VALUES
  (gen_random_uuid()::text, 'medical_records', 'read',  'View patient medical records, allergies and visits', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'medical_records', 'write', 'Edit patient medical records, allergies and visits', CURRENT_TIMESTAMP)
ON CONFLICT ("module", "action") DO NOTHING;

INSERT INTO "mst_role_permissions" ("uuid", "role_id", "permission_id", "is_enabled", "updated_at")
SELECT gen_random_uuid()::text, r."id", p."id", true, CURRENT_TIMESTAMP
FROM "mst_roles" r
CROSS JOIN "mst_permissions" p
WHERE p."module" = 'medical_records'
  AND r."pharmacy_id" IS NULL
  AND r."deleted_at" IS NULL
  AND (
    (p."action" = 'read'  AND r."type"::text IN ('OWNER', 'ADMIN', 'HEAD_PHARMACIST', 'PHARMACIST', 'CASHIER', 'DOCTOR'))
    OR
    (p."action" = 'write' AND r."type"::text IN ('OWNER', 'ADMIN', 'HEAD_PHARMACIST', 'PHARMACIST', 'DOCTOR'))
  )
  AND NOT EXISTS (
    SELECT 1 FROM "mst_role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id" AND rp."pharmacy_id" IS NULL
  );

DELETE FROM "mst_role_permissions"
WHERE "permission_id" IN (SELECT "id" FROM "mst_permissions" WHERE "module" = 'patients');

DELETE FROM "mst_permissions" WHERE "module" = 'patients';
