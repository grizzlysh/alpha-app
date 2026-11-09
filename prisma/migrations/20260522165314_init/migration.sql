-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN', 'PLATFORM_VIEWER', 'PLATFORM_SUPPORT');

-- CreateEnum
CREATE TYPE "PharmacyRole" AS ENUM ('OWNER', 'ADMIN', 'PHARMACIST', 'CASHIER');

-- CreateEnum
CREATE TYPE "DataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "StockMovementReason" AS ENUM ('PURCHASE', 'SALE', 'DISPOSAL', 'STOCK_RETURN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'VERIFIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CREDIT');

-- CreateEnum
CREATE TYPE "StockReturnStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockDisposalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisposalReason" AS ENUM ('EXPIRED', 'DAMAGED', 'CONTAMINATED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('CASH', 'CREDIT');

-- CreateTable
CREATE TABLE "mst_system_parameters" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "data_type" "DataType" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "mst_system_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_business_parameters" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "data_type" "DataType" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "mst_business_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_roles" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER,
    "name" TEXT NOT NULL,
    "type" "PharmacyRole" NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "mst_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_permissions" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "mst_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_role_permissions" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "pharmacy_id" INTEGER,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "mst_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_pharmacies" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "mst_pharmacies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_users" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "platform_role" "PlatformRole",
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "mst_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_user_pharmacies" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "mst_user_pharmacies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_medicine_shapes" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "mst_medicine_shapes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_medicine_types" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "mst_medicine_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_medicine_classes" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "mst_medicine_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_medicines" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "generic_name" TEXT NOT NULL,
    "shape_id" INTEGER NOT NULL,
    "type_id" INTEGER NOT NULL,
    "medicine_class_id" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "reorder_level" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "mst_medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_distributors" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "mst_distributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_customers" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "is_walk_in" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "mst_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_purchase_orders" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "distributor_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "trx_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_purchase_order_details" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "medicine_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "trx_purchase_order_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_invoices" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "distributor_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "purchase_order_id" INTEGER,
    "invoice_number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "trx_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_invoice_details" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "medicine_id" INTEGER NOT NULL,
    "batch_number" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "quantity_box" INTEGER NOT NULL,
    "quantity_per_box" INTEGER NOT NULL,
    "quantity_pieces" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_price" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "trx_invoice_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_invoice_payments" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "trx_invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_invoice_payment_history" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "invoice_payment_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "trx_invoice_payment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_stocks" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "medicine_id" INTEGER NOT NULL,
    "total_pieces" INTEGER NOT NULL,
    "base_price" DECIMAL(12,2) NOT NULL,
    "calculated_price" DECIMAL(12,2) NOT NULL,
    "selling_price" DECIMAL(12,2),
    "is_manual_price" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "inv_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_stock_details" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "distributor_id" INTEGER NOT NULL,
    "invoice_detail_id" INTEGER NOT NULL,
    "batch_number" TEXT NOT NULL,
    "barcode" TEXT,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "quantity_pieces" INTEGER NOT NULL,
    "quantity_box" INTEGER NOT NULL,
    "quantity_per_box" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "inv_stock_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_stock_movements" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "medicine_id" INTEGER NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "stock_detail_id" INTEGER NOT NULL,
    "invoice_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "reason" "StockMovementReason" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "inv_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_stock_returns" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "distributor_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "return_number" TEXT NOT NULL,
    "status" "StockReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "returned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "trx_stock_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_stock_return_details" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "stock_return_id" INTEGER NOT NULL,
    "medicine_id" INTEGER NOT NULL,
    "stock_detail_id" INTEGER NOT NULL,
    "quantity_pieces" INTEGER NOT NULL,
    "quantity_box" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "trx_stock_return_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_stock_disposals" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "disposal_number" TEXT NOT NULL,
    "status" "StockDisposalStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "disposed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "trx_stock_disposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_stock_disposal_details" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "stock_disposal_id" INTEGER NOT NULL,
    "medicine_id" INTEGER NOT NULL,
    "stock_detail_id" INTEGER NOT NULL,
    "quantity_pieces" INTEGER NOT NULL,
    "quantity_box" INTEGER NOT NULL,
    "reason" "DisposalReason" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "trx_stock_disposal_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_sales" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "sale_number" TEXT NOT NULL,
    "sale_type" "SaleType" NOT NULL DEFAULT 'CASH',
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sold_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "trx_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_sale_details" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "medicine_id" INTEGER NOT NULL,
    "stock_detail_id" INTEGER NOT NULL,
    "quantity_pieces" INTEGER NOT NULL,
    "quantity_box" INTEGER NOT NULL,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "trx_sale_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_sale_payments" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "trx_sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_sale_payment_history" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "sale_payment_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "trx_sale_payment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mst_system_parameters_uuid_key" ON "mst_system_parameters"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_system_parameters_key_key" ON "mst_system_parameters"("key");

-- CreateIndex
CREATE UNIQUE INDEX "mst_business_parameters_uuid_key" ON "mst_business_parameters"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_business_parameters_pharmacy_id_key_key" ON "mst_business_parameters"("pharmacy_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "mst_roles_uuid_key" ON "mst_roles"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_roles_pharmacy_id_name_key" ON "mst_roles"("pharmacy_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "mst_permissions_uuid_key" ON "mst_permissions"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_permissions_module_action_key" ON "mst_permissions"("module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "mst_role_permissions_uuid_key" ON "mst_role_permissions"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_role_permissions_role_id_permission_id_pharmacy_id_key" ON "mst_role_permissions"("role_id", "permission_id", "pharmacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "mst_pharmacies_uuid_key" ON "mst_pharmacies"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_users_uuid_key" ON "mst_users"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_users_email_key" ON "mst_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mst_user_pharmacies_uuid_key" ON "mst_user_pharmacies"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_user_pharmacies_user_id_pharmacy_id_key" ON "mst_user_pharmacies"("user_id", "pharmacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "mst_medicine_shapes_uuid_key" ON "mst_medicine_shapes"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_medicine_shapes_pharmacy_id_name_key" ON "mst_medicine_shapes"("pharmacy_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "mst_medicine_types_uuid_key" ON "mst_medicine_types"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_medicine_types_pharmacy_id_name_key" ON "mst_medicine_types"("pharmacy_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "mst_medicine_classes_uuid_key" ON "mst_medicine_classes"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_medicine_classes_pharmacy_id_name_key" ON "mst_medicine_classes"("pharmacy_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "mst_medicines_uuid_key" ON "mst_medicines"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_distributors_uuid_key" ON "mst_distributors"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_customers_uuid_key" ON "mst_customers"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_purchase_orders_uuid_key" ON "trx_purchase_orders"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_purchase_orders_order_number_key" ON "trx_purchase_orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "trx_purchase_order_details_uuid_key" ON "trx_purchase_order_details"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_invoices_uuid_key" ON "trx_invoices"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_invoices_invoice_number_key" ON "trx_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "trx_invoice_details_uuid_key" ON "trx_invoice_details"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_invoice_payments_uuid_key" ON "trx_invoice_payments"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_invoice_payment_history_uuid_key" ON "trx_invoice_payment_history"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "inv_stocks_uuid_key" ON "inv_stocks"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "inv_stocks_pharmacy_id_medicine_id_key" ON "inv_stocks"("pharmacy_id", "medicine_id");

-- CreateIndex
CREATE UNIQUE INDEX "inv_stock_details_uuid_key" ON "inv_stock_details"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "inv_stock_details_invoice_detail_id_key" ON "inv_stock_details"("invoice_detail_id");

-- CreateIndex
CREATE UNIQUE INDEX "inv_stock_details_barcode_key" ON "inv_stock_details"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "inv_stock_movements_uuid_key" ON "inv_stock_movements"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_stock_returns_uuid_key" ON "trx_stock_returns"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_stock_returns_return_number_key" ON "trx_stock_returns"("return_number");

-- CreateIndex
CREATE UNIQUE INDEX "trx_stock_return_details_uuid_key" ON "trx_stock_return_details"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_stock_disposals_uuid_key" ON "trx_stock_disposals"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_stock_disposals_disposal_number_key" ON "trx_stock_disposals"("disposal_number");

-- CreateIndex
CREATE UNIQUE INDEX "trx_stock_disposal_details_uuid_key" ON "trx_stock_disposal_details"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_sales_uuid_key" ON "trx_sales"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_sales_sale_number_key" ON "trx_sales"("sale_number");

-- CreateIndex
CREATE UNIQUE INDEX "trx_sale_details_uuid_key" ON "trx_sale_details"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_sale_payments_uuid_key" ON "trx_sale_payments"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_sale_payments_sale_id_key" ON "trx_sale_payments"("sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "trx_sale_payment_history_uuid_key" ON "trx_sale_payment_history"("uuid");

-- AddForeignKey
ALTER TABLE "mst_business_parameters" ADD CONSTRAINT "mst_business_parameters_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_roles" ADD CONSTRAINT "mst_roles_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_role_permissions" ADD CONSTRAINT "mst_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "mst_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_role_permissions" ADD CONSTRAINT "mst_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "mst_permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_role_permissions" ADD CONSTRAINT "mst_role_permissions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_pharmacies" ADD CONSTRAINT "mst_pharmacies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "mst_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_user_pharmacies" ADD CONSTRAINT "mst_user_pharmacies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mst_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_user_pharmacies" ADD CONSTRAINT "mst_user_pharmacies_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_user_pharmacies" ADD CONSTRAINT "mst_user_pharmacies_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "mst_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_shapes" ADD CONSTRAINT "mst_medicine_shapes_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_types" ADD CONSTRAINT "mst_medicine_types_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_classes" ADD CONSTRAINT "mst_medicine_classes_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicines" ADD CONSTRAINT "mst_medicines_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicines" ADD CONSTRAINT "mst_medicines_shape_id_fkey" FOREIGN KEY ("shape_id") REFERENCES "mst_medicine_shapes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicines" ADD CONSTRAINT "mst_medicines_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "mst_medicine_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicines" ADD CONSTRAINT "mst_medicines_medicine_class_id_fkey" FOREIGN KEY ("medicine_class_id") REFERENCES "mst_medicine_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_distributors" ADD CONSTRAINT "mst_distributors_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_customers" ADD CONSTRAINT "mst_customers_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_purchase_orders" ADD CONSTRAINT "trx_purchase_orders_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_purchase_orders" ADD CONSTRAINT "trx_purchase_orders_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "mst_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_purchase_orders" ADD CONSTRAINT "trx_purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_purchase_order_details" ADD CONSTRAINT "trx_purchase_order_details_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "trx_purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_purchase_order_details" ADD CONSTRAINT "trx_purchase_order_details_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "mst_medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoices" ADD CONSTRAINT "trx_invoices_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoices" ADD CONSTRAINT "trx_invoices_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "mst_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoices" ADD CONSTRAINT "trx_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoices" ADD CONSTRAINT "trx_invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "trx_purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoice_details" ADD CONSTRAINT "trx_invoice_details_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "trx_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoice_details" ADD CONSTRAINT "trx_invoice_details_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "mst_medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoice_payments" ADD CONSTRAINT "trx_invoice_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "trx_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoice_payment_history" ADD CONSTRAINT "trx_invoice_payment_history_invoice_payment_id_fkey" FOREIGN KEY ("invoice_payment_id") REFERENCES "trx_invoice_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stocks" ADD CONSTRAINT "inv_stocks_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stocks" ADD CONSTRAINT "inv_stocks_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "mst_medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_details" ADD CONSTRAINT "inv_stock_details_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "inv_stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_details" ADD CONSTRAINT "inv_stock_details_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "mst_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_details" ADD CONSTRAINT "inv_stock_details_invoice_detail_id_fkey" FOREIGN KEY ("invoice_detail_id") REFERENCES "trx_invoice_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "mst_medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "inv_stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_stock_detail_id_fkey" FOREIGN KEY ("stock_detail_id") REFERENCES "inv_stock_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "trx_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_returns" ADD CONSTRAINT "trx_stock_returns_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_returns" ADD CONSTRAINT "trx_stock_returns_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "mst_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_returns" ADD CONSTRAINT "trx_stock_returns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_return_details" ADD CONSTRAINT "trx_stock_return_details_stock_return_id_fkey" FOREIGN KEY ("stock_return_id") REFERENCES "trx_stock_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_return_details" ADD CONSTRAINT "trx_stock_return_details_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "mst_medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_return_details" ADD CONSTRAINT "trx_stock_return_details_stock_detail_id_fkey" FOREIGN KEY ("stock_detail_id") REFERENCES "inv_stock_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_disposals" ADD CONSTRAINT "trx_stock_disposals_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_disposals" ADD CONSTRAINT "trx_stock_disposals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_disposal_details" ADD CONSTRAINT "trx_stock_disposal_details_stock_disposal_id_fkey" FOREIGN KEY ("stock_disposal_id") REFERENCES "trx_stock_disposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_disposal_details" ADD CONSTRAINT "trx_stock_disposal_details_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "mst_medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_disposal_details" ADD CONSTRAINT "trx_stock_disposal_details_stock_detail_id_fkey" FOREIGN KEY ("stock_detail_id") REFERENCES "inv_stock_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sales" ADD CONSTRAINT "trx_sales_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sales" ADD CONSTRAINT "trx_sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "mst_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sales" ADD CONSTRAINT "trx_sales_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_details" ADD CONSTRAINT "trx_sale_details_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "trx_sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_details" ADD CONSTRAINT "trx_sale_details_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "mst_medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_details" ADD CONSTRAINT "trx_sale_details_stock_detail_id_fkey" FOREIGN KEY ("stock_detail_id") REFERENCES "inv_stock_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_payments" ADD CONSTRAINT "trx_sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "trx_sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_payment_history" ADD CONSTRAINT "trx_sale_payment_history_sale_payment_id_fkey" FOREIGN KEY ("sale_payment_id") REFERENCES "trx_sale_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
