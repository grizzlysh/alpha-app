-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "trx_medical_visits" ADD COLUMN     "checked_in_at" TIMESTAMP(3),
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "queue_number" INTEGER,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "status" "VisitStatus" NOT NULL DEFAULT 'COMPLETED';

-- CreateIndex
CREATE INDEX "trx_medical_visits_pharmacy_id_status_checked_in_at_idx" ON "trx_medical_visits"("pharmacy_id", "status", "checked_in_at");


-- Existing visits were entered after the fact: they are complete.
UPDATE "trx_medical_visits" SET "completed_at" = COALESCE("updated_at", "created_at") WHERE "completed_at" IS NULL;

-- Permissions: read the queue, check patients in (front desk), perform the exam (doctor).
INSERT INTO "mst_permissions" ("uuid", "module", "action", "description", "updated_at")
VALUES
  (gen_random_uuid()::text, 'examinations', 'read',    'View the examination queue', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'examinations', 'checkin', 'Register patients into the examination queue', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'examinations', 'perform', 'Examine patients and write the result', CURRENT_TIMESTAMP)
ON CONFLICT ("module", "action") DO NOTHING;

INSERT INTO "mst_role_permissions" ("uuid", "role_id", "permission_id", "is_enabled", "updated_at")
SELECT gen_random_uuid()::text, r."id", p."id", true, CURRENT_TIMESTAMP
FROM "mst_roles" r
CROSS JOIN "mst_permissions" p
WHERE p."module" = 'examinations'
  AND r."pharmacy_id" IS NULL
  AND r."deleted_at" IS NULL
  AND (
    (p."action" IN ('read', 'checkin') AND r."type"::text IN ('OWNER', 'ADMIN', 'HEAD_PHARMACIST', 'PHARMACIST', 'CASHIER', 'DOCTOR'))
    OR
    (p."action" = 'perform' AND r."type"::text IN ('OWNER', 'ADMIN', 'HEAD_PHARMACIST', 'DOCTOR'))
  )
  AND NOT EXISTS (
    SELECT 1 FROM "mst_role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id" AND rp."pharmacy_id" IS NULL
  );
