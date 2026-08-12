-- Phase 02: Supabase PostgreSQL schema
-- users → categories → stock_items
-- users → transactions
-- Includes FKs (RESTRICT), indexes, CHECK constraints, and RLS policies.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- users
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- categories
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- stock_items
CREATE TABLE "stock_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit" VARCHAR(50) NOT NULL,
    "price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "minimum_stock" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- transactions
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "transaction_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (safe delete behavior)
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_items"
  ADD CONSTRAINT "stock_items_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unique: one category name per user
CREATE UNIQUE INDEX "categories_user_id_name_key" ON "categories"("user_id", "name");

-- Indexes for common queries
CREATE INDEX "categories_user_id_idx" ON "categories"("user_id");
CREATE INDEX "stock_items_category_id_idx" ON "stock_items"("category_id");
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");
CREATE INDEX "transactions_transaction_date_idx" ON "transactions"("transaction_date");
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CHECK constraints
ALTER TABLE "stock_items"
  ADD CONSTRAINT "stock_items_quantity_non_negative"
  CHECK ("quantity" >= 0);

ALTER TABLE "stock_items"
  ADD CONSTRAINT "stock_items_minimum_stock_non_negative"
  CHECK ("minimum_stock" >= 0);

ALTER TABLE "stock_items"
  ADD CONSTRAINT "stock_items_price_non_negative"
  CHECK ("price" >= 0);

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_amount_positive"
  CHECK ("amount" > 0);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Ownership: users own categories & transactions; stock_items via categories.
-- ---------------------------------------------------------------------------

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners as well (Supabase postgres role still bypasses;
-- PostgREST roles anon/authenticated will enforce these policies).
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
ALTER TABLE "stock_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "transactions" FORCE ROW LEVEL SECURITY;

-- users: only self
CREATE POLICY "users_select_own"
  ON "users" FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON "users" FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- categories: owner only
CREATE POLICY "categories_select_own"
  ON "categories" FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "categories_insert_own"
  ON "categories" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_update_own"
  ON "categories" FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_delete_own"
  ON "categories" FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- transactions: owner only
CREATE POLICY "transactions_select_own"
  ON "transactions" FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own"
  ON "transactions" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update_own"
  ON "transactions" FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_delete_own"
  ON "transactions" FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- stock_items: via category ownership
CREATE POLICY "stock_items_select_own"
  ON "stock_items" FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "categories" c
      WHERE c.id = stock_items.category_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "stock_items_insert_own"
  ON "stock_items" FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "categories" c
      WHERE c.id = stock_items.category_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "stock_items_update_own"
  ON "stock_items" FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "categories" c
      WHERE c.id = stock_items.category_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "categories" c
      WHERE c.id = stock_items.category_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "stock_items_delete_own"
  ON "stock_items" FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "categories" c
      WHERE c.id = stock_items.category_id
        AND c.user_id = auth.uid()
    )
  );
