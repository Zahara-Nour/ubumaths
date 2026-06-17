-- Add test_specs column for deterministic regression testing of question templates
ALTER TABLE question_templates ADD COLUMN IF NOT EXISTS test_specs JSONB DEFAULT NULL;

COMMENT ON COLUMN question_templates.test_specs IS 'Deterministic test specifications: fixed variables + expected validation results for regression testing';
