-- Migration: Normalize exercise tags (math + Python) to junction tables
-- Created: 2026-05-09
--
-- Replaces the dénormalisé `tags TEXT[]` columns on `exercises` and
-- `python_exercises` with proper N-N junction tables pointing to the existing
-- catalog tables `tags` (math, 24 seeded entries) and `python_tags` (Python,
-- 41 seeded entries).
--
-- Why:
--   * Foreign keys finally enforce that every tag on an exercise exists in
--     the catalog (no more silent typos like "recursionn" or "For" vs "for").
--   * Renaming a tag is one row update, not an array_replace across thousands.
--   * Aggregations by tag (Bloc C dashboard, stats by class) become indexed
--     lookups instead of GIN unnest scans.
--
-- Strategy:
--   1. Create the two junction tables.
--   2. Insert any tag string referenced in an array but not yet in the catalog
--      (preserves the existing "auto-create on save" semantics).
--   3. Populate the junctions from the existing arrays (CROSS JOIN LATERAL
--      unnest).
--   4. Drop the legacy GIN indexes and the array columns.
--   5. Enable RLS on the junctions: SELECT open (tags are not sensitive),
--      INSERT/UPDATE/DELETE restricted to the exercise's author.
--
-- Atomicity: the whole migration is wrapped in a single transaction (Supabase
-- migrations are run inside a transaction by default), so a partial failure
-- rolls back the whole thing — including the DROP COLUMN.

-- ============================================================================
-- 1. JUNCTION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS exercise_tags (
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
    PRIMARY KEY (exercise_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_exercise_tags_tag ON exercise_tags(tag_id);

CREATE TABLE IF NOT EXISTS python_exercise_tags (
    exercise_id UUID NOT NULL REFERENCES python_exercises(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES python_tags(id) ON DELETE RESTRICT,
    PRIMARY KEY (exercise_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_python_exercise_tags_tag ON python_exercise_tags(tag_id);

COMMENT ON TABLE exercise_tags IS 'N-N junction between exercises and tags (math).';
COMMENT ON TABLE python_exercise_tags IS 'N-N junction between python_exercises and python_tags.';

-- ============================================================================
-- 2. UPSERT MISSING CATALOG ENTRIES
-- ============================================================================

INSERT INTO tags (name)
SELECT DISTINCT unnest(e.tags) AS name
FROM exercises e
WHERE e.tags IS NOT NULL AND array_length(e.tags, 1) > 0
ON CONFLICT (name) DO NOTHING;

INSERT INTO python_tags (name)
SELECT DISTINCT unnest(e.tags) AS name
FROM python_exercises e
WHERE e.tags IS NOT NULL AND array_length(e.tags, 1) > 0
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. POPULATE JUNCTIONS FROM ARRAYS
-- ============================================================================

INSERT INTO exercise_tags (exercise_id, tag_id)
SELECT e.id, t.id
FROM exercises e
CROSS JOIN LATERAL unnest(e.tags) AS tag_name
JOIN tags t ON t.name = tag_name
ON CONFLICT DO NOTHING;

INSERT INTO python_exercise_tags (exercise_id, tag_id)
SELECT e.id, t.id
FROM python_exercises e
CROSS JOIN LATERAL unnest(e.tags) AS tag_name
JOIN python_tags t ON t.name = tag_name
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. DROP LEGACY INDEXES & COLUMNS
-- ============================================================================

DROP INDEX IF EXISTS idx_exercises_tags;
DROP INDEX IF EXISTS idx_python_exercises_tags;

ALTER TABLE exercises DROP COLUMN IF EXISTS tags;
ALTER TABLE python_exercises DROP COLUMN IF EXISTS tags;

-- ============================================================================
-- 5. RLS ON JUNCTION TABLES
-- ============================================================================

ALTER TABLE exercise_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE python_exercise_tags ENABLE ROW LEVEL SECURITY;

-- SELECT: open. Tag associations are not sensitive on their own; the parent
-- exercise's RLS still gates whether the join target is visible.
DROP POLICY IF EXISTS exercise_tags_select_all ON exercise_tags;
CREATE POLICY exercise_tags_select_all ON exercise_tags
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS python_exercise_tags_select_all ON python_exercise_tags;
CREATE POLICY python_exercise_tags_select_all ON python_exercise_tags
    FOR SELECT USING (TRUE);

-- INSERT/UPDATE/DELETE: only the author of the parent exercise.
DROP POLICY IF EXISTS exercise_tags_modify_author ON exercise_tags;
CREATE POLICY exercise_tags_modify_author ON exercise_tags
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exercises e
            WHERE e.id = exercise_tags.exercise_id
              AND e.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exercises e
            WHERE e.id = exercise_tags.exercise_id
              AND e.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS python_exercise_tags_modify_author ON python_exercise_tags;
CREATE POLICY python_exercise_tags_modify_author ON python_exercise_tags
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM python_exercises pe
            WHERE pe.id = python_exercise_tags.exercise_id
              AND pe.author_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM python_exercises pe
            WHERE pe.id = python_exercise_tags.exercise_id
              AND pe.author_id = auth.uid()
        )
    );
