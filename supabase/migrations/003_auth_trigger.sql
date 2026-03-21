-- Auth trigger: auto-create org + user_profile on new user signup
-- This runs inside Supabase's auth schema when a new user confirms their email.

-- Function that creates an org and user profile for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  org_name_val TEXT;
BEGIN
  -- Extract org name from user metadata (set during registration)
  org_name_val := COALESCE(
    NEW.raw_user_meta_data->>'org_name',
    split_part(NEW.email, '@', 1) || '''s Organization'
  );

  -- Create organization for this user
  INSERT INTO organizations (name)
  VALUES (org_name_val)
  RETURNING id INTO new_org_id;

  -- Create user profile linked to the org
  INSERT INTO user_profiles (id, org_id, role)
  VALUES (NEW.id, new_org_id, 'owner');

  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert (fires after email confirmation)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
