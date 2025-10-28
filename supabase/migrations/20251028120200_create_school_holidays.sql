-- Migration: Create school_holidays table
-- Description: Manages vacation periods within school years
-- Author: Claude Code
-- Date: 2025-10-28

-- Create school_holidays table
CREATE TABLE school_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- "Vacances de Noël", "Vacances de printemps"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_holiday_dates CHECK (end_date > start_date)
);

-- Add table comments
COMMENT ON TABLE school_holidays IS 'School vacation periods (e.g., Christmas, Spring break)';
COMMENT ON COLUMN school_holidays.name IS 'Holiday name in French (e.g., "Vacances de Noël")';

-- Indexes
CREATE INDEX idx_school_holidays_year ON school_holidays(school_year_id);
CREATE INDEX idx_school_holidays_dates ON school_holidays(start_date, end_date);

-- RLS Policies
ALTER TABLE school_holidays ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage school holidays"
  ON school_holidays
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN school_years sy ON sy.school_id = p.school_id
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND sy.id = school_holidays.school_year_id
    )
  );

-- Teachers can read their school's holidays
CREATE POLICY "Teachers can read school holidays"
  ON school_holidays
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN school_years sy ON sy.school_id = p.school_id
      WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'admin')
      AND sy.id = school_holidays.school_year_id
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_school_holidays_updated_at
  BEFORE UPDATE ON school_holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
