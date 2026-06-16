-- Update existing question templates with placeholder categories
-- Migration: 073_update_seed_question_categories.sql

-- Update all existing templates to have default categories
UPDATE question_templates
SET
  theme = 'Non catégorisé',
  domain = 'Non catégorisé',
  subdomain = NULL,
  level = 1
WHERE theme IS NULL OR domain IS NULL OR level IS NULL;

-- Note: After running this migration, admins should manually categorize
-- existing questions through the admin interface for better organization.
