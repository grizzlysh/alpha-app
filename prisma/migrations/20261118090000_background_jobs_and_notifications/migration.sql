-- Background jobs (run log) and per-pharmacy daily notifications.

-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "JobTrigger" AS ENUM ('SCHEDULE', 'MANUAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EXPIRING_BATCHES', 'EXPIRED_BATCHES', 'LOW_STOCK', 'OVERDUE_PAYABLES', 'OVERDUE_RECEIVABLES', 'LICENSE_EXPIRING');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "sys_job_runs" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "JobRunStatus" NOT NULL DEFAULT 'RUNNING',
    "trigger" "JobTrigger" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "affected" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "error" TEXT,
    "triggered_by_id" INTEGER,

    CONSTRAINT "sys_job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_notifications" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL,
    "count" INTEGER NOT NULL,
    "data" JSONB,
    "link" TEXT,
    "permission" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trx_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_notification_reads" (
    "notification_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trx_notification_reads_pkey" PRIMARY KEY ("notification_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sys_job_runs_uuid_key" ON "sys_job_runs"("uuid");

-- CreateIndex
CREATE INDEX "sys_job_runs_name_started_at_idx" ON "sys_job_runs"("name", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "trx_notifications_uuid_key" ON "trx_notifications"("uuid");

-- CreateIndex
CREATE INDEX "trx_notifications_pharmacy_id_created_at_idx" ON "trx_notifications"("pharmacy_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "trx_notifications_pharmacy_id_dedupe_key_key" ON "trx_notifications"("pharmacy_id", "dedupe_key");

-- AddForeignKey
ALTER TABLE "sys_job_runs" ADD CONSTRAINT "sys_job_runs_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_notifications" ADD CONSTRAINT "trx_notifications_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_notification_reads" ADD CONSTRAINT "trx_notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "trx_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_notification_reads" ADD CONSTRAINT "trx_notification_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mst_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- How long a prescription stays dispensable; older PENDING/PARTIAL ones are
-- marked EXPIRED by the nightly job.
INSERT INTO "mst_business_parameters" (uuid, pharmacy_id, key, value, data_type, description, created_at, updated_at)
SELECT gen_random_uuid(), p.id, 'PRESCRIPTION_VALID_DAYS', '30', 'NUMBER',
       'Days a prescription stays valid for dispensing; older pending ones expire automatically', NOW(), NOW()
FROM "mst_pharmacies" p
WHERE NOT EXISTS (
  SELECT 1 FROM "mst_business_parameters"
  WHERE pharmacy_id = p.id AND key = 'PRESCRIPTION_VALID_DAYS'
);
