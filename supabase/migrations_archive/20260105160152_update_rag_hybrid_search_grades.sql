-- ============================================================================
-- MIGRATION: Update rag_hybrid_search function to use grades instead of grade_levels
-- ============================================================================
-- Description: Standardize rag_hybrid_search function parameter naming
-- Convention:
--   - 'grade' (singular) for GradeCode
--   - 'grades' (plural) for GradeCode[]
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- Drop and recreate rag_hybrid_search with updated parameter name
DROP FUNCTION IF EXISTS public.rag_hybrid_search(
  text,
  vector,
  text[],
  text[],
  integer,
  double precision,
  double precision
);

CREATE OR REPLACE FUNCTION public.rag_hybrid_search(
  query_text TEXT,
  query_embedding vector(384),
  filter_grades TEXT[] DEFAULT NULL,
  filter_topics TEXT[] DEFAULT NULL,
  match_count INTEGER DEFAULT 10,
  fts_weight DOUBLE PRECISION DEFAULT 1.0,
  vector_weight DOUBLE PRECISION DEFAULT 1.0
)
RETURNS TABLE (
  document_id UUID,
  document_title TEXT,
  chunk_id UUID,
  chunk_content TEXT,
  combined_score DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      c.id as chunk_id,
      c.document_id,
      1 - (c.embedding <=> query_embedding) as vector_similarity
    FROM rag_chunks c
    JOIN rag_documents d ON c.document_id = d.id
    WHERE (filter_grades IS NULL OR d.grades && filter_grades)
      AND (filter_topics IS NULL OR d.topics && filter_topics)
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  fts_search AS (
    SELECT
      c.id as chunk_id,
      c.document_id,
      ts_rank(c.content_tsv, websearch_to_tsquery('french', query_text)) as fts_rank
    FROM rag_chunks c
    JOIN rag_documents d ON c.document_id = d.id
    WHERE c.content_tsv @@ websearch_to_tsquery('french', query_text)
      AND (filter_grades IS NULL OR d.grades && filter_grades)
      AND (filter_topics IS NULL OR d.topics && filter_topics)
    ORDER BY fts_rank DESC
    LIMIT match_count * 2
  ),
  -- Reciprocal Rank Fusion (RRF)
  rrf_combined AS (
    SELECT
      COALESCE(v.chunk_id, f.chunk_id) as chunk_id,
      COALESCE(v.document_id, f.document_id) as document_id,
      (
        COALESCE(
          vector_weight / (60.0 + (ROW_NUMBER() OVER (ORDER BY v.vector_similarity DESC NULLS LAST))),
          0.0
        ) +
        COALESCE(
          fts_weight / (60.0 + (ROW_NUMBER() OVER (ORDER BY f.fts_rank DESC NULLS LAST))),
          0.0
        )
      ) as combined_score
    FROM vector_search v
    FULL OUTER JOIN fts_search f ON v.chunk_id = f.chunk_id
  )
  SELECT
    r.document_id,
    d.title as document_title,
    r.chunk_id,
    c.content as chunk_content,
    r.combined_score
  FROM rrf_combined r
  JOIN rag_documents d ON r.document_id = d.id
  JOIN rag_chunks c ON r.chunk_id = c.id
  ORDER BY r.combined_score DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.rag_hybrid_search(text, vector, text[], text[], integer, double precision, double precision) IS 'Hybrid search using vector similarity + full-text search with RRF fusion. Updated to use grades instead of grade_levels.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.rag_hybrid_search(text, vector, text[], text[], integer, double precision, double precision) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary:
-- 1. Updated rag_hybrid_search function parameter: filter_grade_levels -> filter_grades
-- 2. Updated function to use d.grades instead of d.grade_levels in WHERE clauses
-- 3. Re-granted execute permissions
--
-- Next steps:
-- 1. Run: pnpm db:migrate
-- 2. Update application code to use filter_grades parameter
-- ============================================================================
