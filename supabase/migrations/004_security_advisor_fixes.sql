-- Supabase security advisor fixes: RLS, function search paths, and exposed
-- SECURITY DEFINER execution.

CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

ALTER TABLE sanctions_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanctions_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read sanctions lists" ON sanctions_lists;
CREATE POLICY "Public read sanctions lists" ON sanctions_lists
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read active sanctions entries" ON sanctions_entries;
CREATE POLICY "Public read active sanctions entries" ON sanctions_entries
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

ALTER FUNCTION public.search_sanctions(text, double precision, integer, text[], text)
  SET search_path = public, extensions;

DROP POLICY IF EXISTS "Users insert audit_log" ON audit_log;
CREATE POLICY "Users insert audit_log" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK ((org_id)::uuid IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
