-- Drop the transform_type column and its constraints from question_templates
ALTER TABLE question_templates DROP CONSTRAINT IF EXISTS valid_transform_type;
ALTER TABLE question_templates DROP COLUMN IF EXISTS transform_type;
