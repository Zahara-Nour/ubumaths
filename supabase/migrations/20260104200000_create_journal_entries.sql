-- Migration: Create class_journal_entries table
-- Description: Daily journal entries for class textbook (cahier de texte)
-- Author: Claude Code
-- Date: 2026-01-04

-- Create class_journal_entries table
CREATE TABLE class_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Entry date (one entry per class per date)
  entry_date DATE NOT NULL,

  -- Content (Ubumark format)
  lesson_content TEXT,      -- What was covered in class
  homework_content TEXT,    -- Homework assignment
  homework_due_date DATE,   -- Optional due date for homework

  -- Publication status
  is_published BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_class_entry_date UNIQUE (class_id, entry_date)
);

-- Indexes for efficient queries
CREATE INDEX idx_journal_entries_class_id ON class_journal_entries(class_id);
CREATE INDEX idx_journal_entries_teacher_id ON class_journal_entries(teacher_id);
CREATE INDEX idx_journal_entries_entry_date ON class_journal_entries(entry_date);
CREATE INDEX idx_journal_entries_homework_due ON class_journal_entries(homework_due_date) WHERE homework_due_date IS NOT NULL;
-- Composite index for student queries (published entries up to today)
CREATE INDEX idx_journal_entries_student_view ON class_journal_entries(class_id, entry_date) WHERE is_published = true;

-- Enable RLS
ALTER TABLE class_journal_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Teachers can view entries they created OR entries in classes they own
CREATE POLICY "Teachers can view journal entries"
  ON class_journal_entries
  FOR SELECT
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_journal_entries.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Teachers can create entries for classes they own
CREATE POLICY "Teachers can create journal entries for their classes"
  ON class_journal_entries
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_journal_entries.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Teachers can update their own journal entries
CREATE POLICY "Teachers can update their journal entries"
  ON class_journal_entries
  FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their own journal entries
CREATE POLICY "Teachers can delete their journal entries"
  ON class_journal_entries
  FOR DELETE
  USING (teacher_id = auth.uid());

-- Students can view ONLY published entries with entry_date <= today
CREATE POLICY "Students can view published journal entries"
  ON class_journal_entries
  FOR SELECT
  USING (
    is_published = true AND
    entry_date <= CURRENT_DATE AND
    EXISTS (
      SELECT 1 FROM class_members
      WHERE class_members.class_id = class_journal_entries.class_id
      AND class_members.student_id = auth.uid()
    )
  );

-- Admins can manage all entries (FOR ALL includes SELECT)
CREATE POLICY "Admins can manage all journal entries"
  ON class_journal_entries
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON class_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE class_journal_entries IS 'Daily journal entries for class textbook (cahier de texte) - one entry per class per date';
COMMENT ON COLUMN class_journal_entries.entry_date IS 'Date of the class session';
COMMENT ON COLUMN class_journal_entries.lesson_content IS 'Content covered during the session (Ubumark format)';
COMMENT ON COLUMN class_journal_entries.homework_content IS 'Homework assignment (Ubumark format)';
COMMENT ON COLUMN class_journal_entries.homework_due_date IS 'Optional due date for the homework assignment';
COMMENT ON COLUMN class_journal_entries.is_published IS 'Whether the entry is visible to students (must also have entry_date <= today)';
