-- Add slug field to exercises table for URL-friendly identification
-- Slug format: topic-nanoid (e.g., "algebre-V1StGXR8")

ALTER TABLE exercises ADD COLUMN slug TEXT;

-- Unique index for slug lookups (partial - only non-null slugs)
CREATE UNIQUE INDEX idx_exercises_slug ON exercises(slug) WHERE slug IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN exercises.slug IS 'URL-friendly identifier: topic-nanoid format, editable by teacher';
