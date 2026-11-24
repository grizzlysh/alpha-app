-- CreateTable
CREATE TABLE "mst_user_tokens" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "mst_user_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mst_user_tokens_uuid_key" ON "mst_user_tokens"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_user_tokens_refresh_token_key" ON "mst_user_tokens"("refresh_token");

-- AddForeignKey
ALTER TABLE "mst_user_tokens" ADD CONSTRAINT "mst_user_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mst_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
