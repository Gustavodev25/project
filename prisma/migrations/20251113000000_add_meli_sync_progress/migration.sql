-- CreateTable
CREATE TABLE "meli_sync_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "synced_orders" INTEGER NOT NULL DEFAULT 0,
    "last_offset" INTEGER NOT NULL DEFAULT 0,
    "last_sync_date" TIMESTAMP(3),
    "oldest_order_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB,

    CONSTRAINT "meli_sync_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meli_sync_progress_user_id_account_id_key" ON "meli_sync_progress"("user_id", "account_id");

-- CreateIndex
CREATE INDEX "meli_sync_progress_user_id_idx" ON "meli_sync_progress"("user_id");

-- CreateIndex
CREATE INDEX "meli_sync_progress_account_id_idx" ON "meli_sync_progress"("account_id");

-- CreateIndex
CREATE INDEX "meli_sync_progress_status_idx" ON "meli_sync_progress"("status");

-- CreateIndex
CREATE INDEX "meli_sync_progress_started_at_idx" ON "meli_sync_progress"("started_at");
