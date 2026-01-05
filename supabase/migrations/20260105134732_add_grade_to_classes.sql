-- Add grade column to classes table
-- This stores the educational level (GradeCode) for the class
-- Examples: '6' (6ème), '5' (5ème), '2' (2nde), '1_SPE' (1ère spécialité maths)

-- Add the column (nullable for existing classes)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS grade TEXT;

-- Add CHECK constraint to validate grade values
-- These are the canonical GradeCode values from src/lib/types/grades.ts
ALTER TABLE classes ADD CONSTRAINT classes_grade_check CHECK (
  grade IS NULL OR grade IN (
    -- Primary school
    'CP', 'CE1', 'CE2', 'CM1', 'CM2',
    -- Middle school
    '6', '5', '4', '3',
    -- High school
    '2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'
  )
);

-- Add comment
COMMENT ON COLUMN classes.grade IS 'Educational grade level (GradeCode). Examples: 6 (6ème), 5 (5ème), 2 (2nde), 1_SPE (1ère spécialité maths). NULL for classes without a specific grade.';

-- Create index for filtering classes by grade
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade) WHERE grade IS NOT NULL;
