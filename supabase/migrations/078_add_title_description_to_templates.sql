/**
 * Migration: Add Title and Description to Question Templates
 * ===========================================================
 *
 * Adds two new fields to question_templates table:
 * - title: Main title for the template (TEXT, NOT NULL) - supports LaTeX
 * - description: Optional rich text description (TEXT, NULL) - for documentation and student context
 *
 * Both fields serve dual purposes:
 * - Internal documentation for teachers
 * - Contextual display for students during exercises
 *
 * Strategy:
 * 1. Add columns (allow NULL initially)
 * 2. Migrate existing data (generate default titles)
 * 3. Make title NOT NULL
 * 4. Add full-text search index on title
 */

-- ============================================================================
-- ADD COLUMNS
-- ============================================================================

-- Add title column (allow NULL initially for migration)
ALTER TABLE question_templates
ADD COLUMN title TEXT;

-- Add description column (optional field)
ALTER TABLE question_templates
ADD COLUMN description TEXT;

-- ============================================================================
-- MIGRATE EXISTING DATA
-- ============================================================================

/**
 * Generate default titles for existing templates
 * Format: "Question {type} - {theme}/{domain}"
 *
 * Examples:
 * - "Question numérique - Algèbre/Équations"
 * - "Question QCM - Géométrie/Périmètres"
 */
UPDATE question_templates
SET title = CASE type
  WHEN 'numerical_exact' THEN 'Question numérique (exact)'
  WHEN 'numerical_decimal' THEN 'Question numérique (décimal)'
  WHEN 'numerical_rounded' THEN 'Question numérique (arrondi)'
  WHEN 'algebraic_transform' THEN 'Question algébrique'
  WHEN 'fill_in_blanks' THEN 'Question à trous'
  WHEN 'multiple_choice' THEN 'Question QCM'
  ELSE 'Question'
END || ' - ' || theme || '/' || domain
WHERE title IS NULL;

-- ============================================================================
-- MAKE TITLE NOT NULL
-- ============================================================================

-- Now that all existing records have titles, make it required
ALTER TABLE question_templates
ALTER COLUMN title SET NOT NULL;

-- ============================================================================
-- ADD INDEXES
-- ============================================================================

-- Full-text search index on title (for PostgreSQL full-text search)
CREATE INDEX idx_question_templates_title_search
ON question_templates
USING GIN(to_tsvector('french', title));

-- Regular index for sorting and filtering
CREATE INDEX idx_question_templates_title
ON question_templates(title);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN question_templates.title IS
  'Template title with LaTeX support - used for organization and display (required)';

COMMENT ON COLUMN question_templates.description IS
  'Optional rich text description for internal documentation and student context';
