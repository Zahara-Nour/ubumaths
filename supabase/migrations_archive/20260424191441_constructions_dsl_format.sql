-- Add DSL support to constructions table
-- The existing `script` column (jsonb) remains for backward compatibility.
-- New constructions use `dsl_script` (text) + `format = 'dsl'`.

ALTER TABLE constructions ADD COLUMN format text NOT NULL DEFAULT 'json';
ALTER TABLE constructions ADD COLUMN dsl_script text;

-- Add check constraint: dsl_script required when format is 'dsl'
ALTER TABLE constructions ADD CONSTRAINT constructions_dsl_check
  CHECK (format = 'json' OR (format = 'dsl' AND dsl_script IS NOT NULL));

COMMENT ON COLUMN constructions.format IS 'Script format: json (legacy) or dsl (new)';
COMMENT ON COLUMN constructions.dsl_script IS 'DSL script text (used when format=dsl)';
