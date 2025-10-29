-- Migration: Create student_warnings table
-- Description: Track student behavior warnings (Conduite, Manque de Travail, Retard, Tricherie)
-- Author: Claude Code
-- Date: 2025-10-29

-- Create student_warnings table
CREATE TABLE student_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_period_id UUID NOT NULL REFERENCES academic_periods(id) ON DELETE CASCADE,
  warning_type TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_warning_type CHECK (warning_type IN ('C', 'M', 'R', 'T'))
);

-- Add table comments
COMMENT ON TABLE student_warnings IS 'Student behavioral warnings tracked per academic period';
COMMENT ON COLUMN student_warnings.student_id IS 'Student receiving the warning';
COMMENT ON COLUMN student_warnings.class_id IS 'Class where the warning occurred';
COMMENT ON COLUMN student_warnings.academic_period_id IS 'Academic period (trimester/semester) for this warning';
COMMENT ON COLUMN student_warnings.warning_type IS 'Warning type: C=Conduite, M=Manque de Travail, R=Retard, T=Tricherie';
COMMENT ON COLUMN student_warnings.created_by IS 'Teacher who issued the warning';

-- Indexes for common query patterns
CREATE INDEX idx_warnings_student_period ON student_warnings(student_id, academic_period_id);
CREATE INDEX idx_warnings_class_period ON student_warnings(class_id, academic_period_id);
CREATE INDEX idx_warnings_created_by ON student_warnings(created_by);

-- Enable RLS
ALTER TABLE student_warnings ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Teachers can view warnings for their own classes
CREATE POLICY "teachers_select_own_class_warnings"
  ON student_warnings
  FOR SELECT
  TO authenticated
  USING (is_class_teacher(class_id));

-- RLS Policy 2: Teachers can insert warnings for their own classes
CREATE POLICY "teachers_insert_own_class_warnings"
  ON student_warnings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_class_teacher(class_id)
    AND created_by = auth.uid()
  );

-- RLS Policy 3: Teachers can delete warnings they created in their own classes
CREATE POLICY "teachers_delete_own_warnings"
  ON student_warnings
  FOR DELETE
  TO authenticated
  USING (
    is_class_teacher(class_id)
    AND created_by = auth.uid()
  );

-- Updated_at trigger
CREATE TRIGGER update_student_warnings_updated_at
  BEFORE UPDATE ON student_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON POLICY "teachers_select_own_class_warnings" ON student_warnings IS 'Teachers can view all warnings for students in their classes';
COMMENT ON POLICY "teachers_insert_own_class_warnings" ON student_warnings IS 'Teachers can add warnings for students in their classes';
COMMENT ON POLICY "teachers_delete_own_warnings" ON student_warnings IS 'Teachers can delete warnings they personally created';
