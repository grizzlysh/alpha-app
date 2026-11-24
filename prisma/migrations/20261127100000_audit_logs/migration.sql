-- CreateTable
CREATE TABLE "sys_audit_logs" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_uuid" TEXT,
    "entity_label" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sys_audit_logs_uuid_key" ON "sys_audit_logs"("uuid");

-- CreateIndex
CREATE INDEX "sys_audit_logs_pharmacy_id_created_at_idx" ON "sys_audit_logs"("pharmacy_id", "created_at");

-- CreateIndex
CREATE INDEX "sys_audit_logs_pharmacy_id_action_created_at_idx" ON "sys_audit_logs"("pharmacy_id", "action", "created_at");

-- CreateIndex
CREATE INDEX "sys_audit_logs_user_id_created_at_idx" ON "sys_audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "sys_audit_logs_entity_type_entity_uuid_idx" ON "sys_audit_logs"("entity_type", "entity_uuid");

-- AddForeignKey
ALTER TABLE "sys_audit_logs" ADD CONSTRAINT "sys_audit_logs_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_audit_logs" ADD CONSTRAINT "sys_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

