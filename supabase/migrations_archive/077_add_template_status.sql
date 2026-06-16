-- Migration: Add Status Field to Question Templates
-- ==================================================
--
-- Adds a status field to support draft/published workflow.
-- Only published templates are subject to category uniqueness validation.
--
-- Status values:
-- - 'draft': Work-in-progress templates (can have duplicate categories)
-- - 'published': Active templates (must have unique category)

-- Add status column with default 'published' for existing templates
ALTER TABLE question_templates
ADD COLUMN status TEXT NOT NULL DEFAULT 'published'
CHECK (status IN ('draft', 'published'));

-- Remove default after migration (new templates must explicitly set status)
ALTER TABLE question_templates
ALTER COLUMN status DROP DEFAULT;

-- Create index for efficient filtering by status
CREATE INDEX idx_question_templates_status ON question_templates(status);

-- Create composite index for category uniqueness checks (only published)
CREATE UNIQUE INDEX idx_question_templates_unique_category
ON question_templates(theme, domain, COALESCE(subdomain, ''), level)
WHERE status = 'published';

-- Add comment explaining the status field
COMMENT ON COLUMN question_templates.status IS
'Template status: "draft" (work-in-progress, can have duplicate categories) or "published" (active, must have unique category combination of theme/domain/subdomain/level)';
