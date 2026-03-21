-- SanctionShield Initial Schema
-- Requires: pg_trgm extension for fuzzy name matching

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Organizations (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{"threshold": 80}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,  -- first 8 chars for identification (e.g. "sk_live_a")
  key_hash TEXT NOT NULL,    -- SHA-256 hash of the full key
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sanctions Lists metadata
CREATE TABLE sanctions_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('ofac_sdn', 'eu_consolidated', 'un_security_council')),
  version TEXT NOT NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_count INTEGER NOT NULL DEFAULT 0,
  raw_hash TEXT NOT NULL
);

-- Sanctions Entries (parsed from lists)
CREATE TABLE sanctions_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES sanctions_lists(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('ofac_sdn', 'eu_consolidated', 'un_security_council')),
  external_id TEXT,          -- SDN ID or equivalent
  entry_type TEXT NOT NULL CHECK (entry_type IN ('individual', 'organization', 'vessel', 'aircraft', 'other')),
  primary_name TEXT NOT NULL,
  primary_name_normalized TEXT NOT NULL,  -- lowercased, stripped diacritics, normalized whitespace
  aliases TEXT[] NOT NULL DEFAULT '{}',
  programs TEXT[] NOT NULL DEFAULT '{}',
  addresses JSONB NOT NULL DEFAULT '[]',
  identification JSONB NOT NULL DEFAULT '[]',
  remarks TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigram index for fuzzy name matching
CREATE INDEX idx_sanctions_entries_name_trgm
  ON sanctions_entries USING GIN (primary_name_normalized gin_trgm_ops);

-- Index for exact/prefix matching
CREATE INDEX idx_sanctions_entries_name_btree
  ON sanctions_entries (primary_name_normalized);

-- Index for filtering by source
CREATE INDEX idx_sanctions_entries_source
  ON sanctions_entries (source) WHERE is_active = true;

-- Screening Requests
CREATE TABLE screening_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('single', 'batch', 'watchlist_rescan')),
  input_name TEXT NOT NULL,
  batch_id UUID,
  threshold INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screening_requests_org
  ON screening_requests (org_id, created_at DESC);

-- Screening Results
CREATE TABLE screening_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES screening_requests(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES sanctions_entries(id) ON DELETE CASCADE,
  confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  match_details JSONB NOT NULL DEFAULT '{}',
  resolution TEXT CHECK (resolution IN ('pending', 'confirmed_match', 'false_positive')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screening_results_request
  ON screening_results (request_id);

-- Audit Log (append-only)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_org_date
  ON audit_log (org_id, created_at DESC);

-- Prevent updates and deletes on audit_log
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only — modifications are not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Watchlist Entries
CREATE TABLE watchlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'any' CHECK (entity_type IN ('individual', 'organization', 'vessel', 'aircraft', 'any')),
  added_by UUID REFERENCES auth.users(id),
  last_screened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_watchlist_org
  ON watchlist_entries (org_id);

-- Batch Jobs
CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  total_names INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  matches_found INTEGER NOT NULL DEFAULT 0,
  threshold INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Row-Level Security Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own organization's data
CREATE POLICY "Users see own org" ON organizations
  FOR SELECT USING (id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users see own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users see own org api_keys" ON api_keys
  FOR ALL USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users see own org screening_requests" ON screening_requests
  FOR ALL USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users see own org screening_results" ON screening_results
  FOR SELECT USING (request_id IN (
    SELECT id FROM screening_requests WHERE org_id IN (
      SELECT org_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users see own org audit_log" ON audit_log
  FOR SELECT USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users insert own org audit_log" ON audit_log
  FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users see own org watchlist" ON watchlist_entries
  FOR ALL USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users see own org batch_jobs" ON batch_jobs
  FOR ALL USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));
