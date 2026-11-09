-- CreateTable
CREATE TABLE "sys_doc_sequences" (
    "pharmacy_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sys_doc_sequences_pkey" PRIMARY KEY ("pharmacy_id","type","date_key")
);

