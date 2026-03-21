-- pg_trgm similarity search function for sanctions screening
-- Called from the application layer as Phase 1 of two-phase matching

CREATE OR REPLACE FUNCTION search_sanctions(
  query_name TEXT,
  similarity_threshold FLOAT DEFAULT 0.2,
  max_results INT DEFAULT 50,
  source_filter TEXT[] DEFAULT ARRAY['ofac_sdn', 'eu_consolidated', 'un_security_council'],
  entity_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  external_id TEXT,
  source TEXT,
  entry_type TEXT,
  primary_name TEXT,
  primary_name_normalized TEXT,
  aliases TEXT[],
  programs TEXT[],
  addresses JSONB,
  identification JSONB,
  remarks TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    se.id,
    se.external_id,
    se.source,
    se.entry_type,
    se.primary_name,
    se.primary_name_normalized,
    se.aliases,
    se.programs,
    se.addresses,
    se.identification,
    se.remarks,
    similarity(se.primary_name_normalized, query_name) AS similarity
  FROM sanctions_entries se
  WHERE se.is_active = true
    AND se.source = ANY(source_filter)
    AND (entity_type_filter IS NULL OR se.entry_type = entity_type_filter)
    AND similarity(se.primary_name_normalized, query_name) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
$$;
