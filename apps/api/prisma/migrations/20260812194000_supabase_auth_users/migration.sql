-- Phase 03: Supabase Auth integration
-- Link public.users to auth.users, drop application password, add profile trigger.

-- Clear development rows that are not linked to auth.users (Phase 02 seed).
DELETE FROM "stock_items";
DELETE FROM "categories";
DELETE FROM "transactions";
DELETE FROM "users";

-- Password is managed by Supabase Auth only.
ALTER TABLE "users" DROP COLUMN IF EXISTS "password";

-- Application profile id must match auth.users id.
ALTER TABLE "users"
  ADD CONSTRAINT "users_id_fkey"
  FOREIGN KEY ("id") REFERENCES auth.users("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Allow authenticated users to insert their own profile (backup for client upsert).
DROP POLICY IF EXISTS "users_insert_own" ON "users";
CREATE POLICY "users_insert_own"
  ON "users" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create public profile automatically when a Supabase Auth user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
