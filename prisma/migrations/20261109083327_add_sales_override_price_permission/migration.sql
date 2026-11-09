-- Permission: change unit price / exceed the cashier discount limit at the POS.
-- Granted by default to every global role except CASHIER and DOCTOR; owners can
-- adjust it per role afterwards in Roles > Permissions.

INSERT INTO "mst_permissions" ("uuid", "module", "action", "description", "updated_at")
VALUES (gen_random_uuid()::text, 'sales', 'override_price',
        'Change unit price or give discounts above the cashier limit at the POS', CURRENT_TIMESTAMP)
ON CONFLICT ("module", "action") DO NOTHING;

INSERT INTO "mst_role_permissions" ("uuid", "role_id", "permission_id", "is_enabled", "updated_at")
SELECT gen_random_uuid()::text, r."id", p."id", true, CURRENT_TIMESTAMP
FROM "mst_roles" r
CROSS JOIN "mst_permissions" p
WHERE p."module" = 'sales' AND p."action" = 'override_price'
  AND r."pharmacy_id" IS NULL
  AND r."deleted_at" IS NULL
  AND r."type"::text IN ('OWNER', 'ADMIN', 'HEAD_PHARMACIST', 'PHARMACIST')
  AND NOT EXISTS (
    SELECT 1 FROM "mst_role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id" AND rp."pharmacy_id" IS NULL
  );
