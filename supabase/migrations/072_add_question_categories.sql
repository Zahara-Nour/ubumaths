-- Add category fields to question_templates table
-- Migration: 072_add_question_categories.sql

-- Add new columns for categorization
ALTER TABLE question_templates
ADD COLUMN theme TEXT NOT NULL DEFAULT 'Non catégorisé',
ADD COLUMN domain TEXT NOT NULL DEFAULT 'Non catégorisé',
ADD COLUMN subdomain TEXT,
ADD COLUMN level INTEGER NOT NULL DEFAULT 1;

-- Remove default values after adding columns (defaults only for migration)
ALTER TABLE question_templates
ALTER COLUMN theme DROP DEFAULT,
ALTER COLUMN domain DROP DEFAULT,
ALTER COLUMN level DROP DEFAULT;

-- Add check constraint: level must be positive
ALTER TABLE question_templates
ADD CONSTRAINT question_templates_level_positive CHECK (level > 0);

-- Create indexes for efficient filtering
CREATE INDEX idx_question_templates_theme ON question_templates(theme);
CREATE INDEX idx_question_templates_domain ON question_templates(domain);
CREATE INDEX idx_question_templates_subdomain ON question_templates(subdomain) WHERE subdomain IS NOT NULL;
CREATE INDEX idx_question_templates_level ON question_templates(level);

-- Create composite index for common filter combinations
CREATE INDEX idx_question_templates_categories ON question_templates(theme, domain, level);

-- Add comment explaining the categorization system
COMMENT ON COLUMN question_templates.theme IS 'Question theme (e.g., Algèbre, Géométrie) - independent from grades';
COMMENT ON COLUMN question_templates.domain IS 'Question domain within theme (e.g., Équations, Polynômes)';
COMMENT ON COLUMN question_templates.subdomain IS 'Optional subdomain for finer categorization (e.g., Linéaires, Quadratiques)';
COMMENT ON COLUMN question_templates.level IS 'Difficulty level as positive integer (no max) - independent from grades';
