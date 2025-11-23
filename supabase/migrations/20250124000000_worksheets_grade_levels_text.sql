-- Migration: Change worksheets.grade_levels from INTEGER[] to TEXT[]
-- Reason: The app uses GradeCode strings (e.g., "CP", "6", "5") not integers

-- Drop the GIN index first
DROP INDEX IF EXISTS public.idx_worksheets_grade_levels;

-- Alter the column type
ALTER TABLE public.worksheets
ALTER COLUMN grade_levels TYPE TEXT[]
USING grade_levels::TEXT[];

-- Recreate the GIN index
CREATE INDEX idx_worksheets_grade_levels ON public.worksheets USING GIN(grade_levels);

-- Update comment
COMMENT ON COLUMN public.worksheets.grade_levels IS 'Array of grade level codes (e.g., CP, CE1, 6, 5, etc.)';
