-- Migration: Create class_schedules table
-- Description: Weekly recurring schedules for teacher's classes (Sunday-Thursday)
-- Author: Claude Code
-- Date: 2025-10-17

-- Create class_schedules table
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Schedule details (weekly recurring)
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 4), -- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Optional metadata
  subject TEXT,
  room TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indexes for efficient queries
CREATE INDEX idx_class_schedules_class_id ON class_schedules(class_id);
CREATE INDEX idx_class_schedules_teacher_id ON class_schedules(teacher_id);
CREATE INDEX idx_class_schedules_day ON class_schedules(day_of_week);
CREATE INDEX idx_class_schedules_composite ON class_schedules(class_id, day_of_week, start_time);

-- Enable RLS
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Teachers can view schedules for their own classes
CREATE POLICY "Teachers can view their class schedules"
  ON class_schedules
  FOR SELECT
  USING (teacher_id = auth.uid());

-- Teachers can create schedules for their own classes
CREATE POLICY "Teachers can create schedules for their classes"
  ON class_schedules
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_schedules.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Teachers can update their own class schedules
CREATE POLICY "Teachers can update their class schedules"
  ON class_schedules
  FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their own class schedules
CREATE POLICY "Teachers can delete their class schedules"
  ON class_schedules
  FOR DELETE
  USING (teacher_id = auth.uid());

-- Students can view schedules for classes they're enrolled in
CREATE POLICY "Students can view schedules for their classes"
  ON class_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members
      WHERE class_members.class_id = class_schedules.class_id
      AND class_members.student_id = auth.uid()
    )
  );

-- Admins can view all schedules
CREATE POLICY "Admins can view all schedules"
  ON class_schedules
  FOR SELECT
  USING (is_admin());

-- Admins can manage all schedules
CREATE POLICY "Admins can manage all schedules"
  ON class_schedules
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_class_schedules_updated_at
  BEFORE UPDATE ON class_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE class_schedules IS 'Weekly recurring class schedules (Sunday-Thursday) for teacher-managed classes';
COMMENT ON COLUMN class_schedules.day_of_week IS 'Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday';
COMMENT ON COLUMN class_schedules.start_time IS 'Session start time (TIME format, e.g., 08:00:00)';
COMMENT ON COLUMN class_schedules.end_time IS 'Session end time (TIME format, e.g., 09:00:00)';
COMMENT ON COLUMN class_schedules.subject IS 'Optional subject/topic name';
COMMENT ON COLUMN class_schedules.room IS 'Optional room number or location';
COMMENT ON COLUMN class_schedules.notes IS 'Optional notes or description';
