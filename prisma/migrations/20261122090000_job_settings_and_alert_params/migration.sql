-- Editable job schedules/params, and per-pharmacy alert windows for daily-alerts.

-- CreateTable
CREATE TABLE "sys_job_settings" (
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "time" TEXT NOT NULL,
    "params" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" INTEGER,

    CONSTRAINT "sys_job_settings_pkey" PRIMARY KEY ("name")
);

-- AddForeignKey
ALTER TABLE "sys_job_settings" ADD CONSTRAINT "sys_job_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


INSERT INTO "mst_business_parameters" (uuid, pharmacy_id, key, value, data_type, description, created_at, updated_at)
SELECT gen_random_uuid(), p.id, k.key, '30', 'NUMBER', k.description, NOW(), NOW()
FROM "mst_pharmacies" p
CROSS JOIN (VALUES
  ('EXPIRY_ALERT_DAYS', 'Daily alert lists batches expiring within this many days'),
  ('LICENSE_ALERT_DAYS', 'Daily alert lists business and practice licenses expiring within this many days')
) AS k(key, description)
WHERE NOT EXISTS (
  SELECT 1 FROM "mst_business_parameters" bp WHERE bp.pharmacy_id = p.id AND bp.key = k.key
);
