-- Sanctions search function — three-strategy matching
-- Strategy 1: pg_trgm trigram similarity (standard fuzzy)
-- Strategy 2: word_similarity for short-query-in-long-name (e.g. "sberbank" in "public joint stock company sberbank of russia")
-- Strategy 3: Alias word similarity matching

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
  WITH candidates AS (
    -- Strategy 1: Trigram similarity on full name
    SELECT se.id, se.external_id, se.source, se.entry_type,
      se.primary_name, se.primary_name_normalized,
      se.aliases, se.programs, se.addresses, se.identification, se.remarks,
      similarity(se.primary_name_normalized, query_name) AS sim
    FROM sanctions_entries se
    WHERE se.is_active = true
      AND se.source = ANY(source_filter)
      AND (entity_type_filter IS NULL OR se.entry_type = entity_type_filter)
      AND similarity(se.primary_name_normalized, query_name) >= similarity_threshold

    UNION ALL

    -- Strategy 2: Word similarity (whole-word matching in longer names)
    SELECT se.id, se.external_id, se.source, se.entry_type,
      se.primary_name, se.primary_name_normalized,
      se.aliases, se.programs, se.addresses, se.identification, se.remarks,
      word_similarity(query_name, se.primary_name_normalized) AS sim
    FROM sanctions_entries se
    WHERE se.is_active = true
      AND se.source = ANY(source_filter)
      AND (entity_type_filter IS NULL OR se.entry_type = entity_type_filter)
      AND length(query_name) >= 3
      AND query_name % se.primary_name_normalized

    UNION ALL

    -- Strategy 3: Alias word similarity
    SELECT se.id, se.external_id, se.source, se.entry_type,
      se.primary_name, se.primary_name_normalized,
      se.aliases, se.programs, se.addresses, se.identification, se.remarks,
      word_similarity(query_name, lower(alias)) AS sim
    FROM sanctions_entries se, unnest(se.aliases) AS alias
    WHERE se.is_active = true
      AND se.source = ANY(source_filter)
      AND (entity_type_filter IS NULL OR se.entry_type = entity_type_filter)
      AND length(query_name) >= 3
      AND query_name % lower(alias)
  ),
  ranked AS (
    SELECT DISTINCT ON (c.id)
      c.id, c.external_id, c.source, c.entry_type,
      c.primary_name, c.primary_name_normalized,
      c.aliases, c.programs, c.addresses, c.identification, c.remarks,
      c.sim
    FROM candidates c
    ORDER BY c.id, c.sim DESC
  )
  SELECT r.id, r.external_id, r.source, r.entry_type,
    r.primary_name, r.primary_name_normalized,
    r.aliases, r.programs, r.addresses, r.identification, r.remarks,
    r.sim AS similarity
  FROM ranked r
  ORDER BY r.sim DESC
  LIMIT max_results;
$$;
