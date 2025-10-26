-- Migration: Add Full-Text Search to Exercises
-- ===============================================
-- Date: 2025-10-27
-- Description: Adds full-text search capability to exercises table for efficient searching

-- Create IMMUTABLE wrapper function for text search
CREATE OR REPLACE FUNCTION exercises_search_vector(
  title TEXT,
  statement_md TEXT,
  solution_md TEXT,
  tags TEXT[]
) RETURNS tsvector
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT to_tsvector('french',
    coalesce(title, '') || ' ' ||
    coalesce(statement_md, '') || ' ' ||
    coalesce(solution_md, '') || ' ' ||
    coalesce(array_to_string(tags, ' '), '')
  );
$$;

-- Add full-text search index on exercises
-- Searches across title, statement_md, solution_md, and tags
CREATE INDEX IF NOT EXISTS idx_exercises_fulltext
ON exercises USING gin(
  exercises_search_vector(title, statement_md, solution_md, tags)
);

-- Add index on topic for faster filtering
CREATE INDEX IF NOT EXISTS idx_exercises_topic_fulltext
ON exercises(topic)
WHERE topic IS NOT NULL;

-- Comment explaining the index
COMMENT ON INDEX idx_exercises_fulltext IS
'Full-text search index on exercises using French language configuration. Searches across title, content, and tags.';
