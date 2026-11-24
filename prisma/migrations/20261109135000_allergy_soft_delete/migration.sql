-- AlterTable
ALTER TABLE "trx_medical_record_allergies" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" INTEGER;

