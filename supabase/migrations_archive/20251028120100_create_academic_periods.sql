-- Migration: Create academic_periods table
-- Description: Manages trimesters/semesters within school years
-- Author: Claude Code
-- Date: 2025-10-28

-- Create academic_periods table
CREATE TABLE academic_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'trimester', 'semester', 'quarter', 'custom'
  name TEXT NOT NULL,  -- "Trimestre 1", "1er Semestre", etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  period_order INTEGER NOT NULL,  -- 1, 2, 3...
  color TEXT DEFAULT '#3b82f6',  -- Hex color for UI (default blue)
  metadata JSONB DEFAULT '{}'::jsonb,  -- For future extensibility
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_period_dates CHECK (end_date > start_date),
  CONSTRAINT unique_period_order UNIQUE(school_year_id, period_order),
  CONSTRAINT valid_type CHECK (type IN ('trimester', 'semester', 'quarter', 'custom')),
  CONSTRAINT positive_order CHECK (period_order > 0)
);

-- Add table comments
COMMENT ON TABLE academic_periods IS 'Academic periods (trimesters, semesters) within school years';
COMMENT ON COLUMN academic_periods.type IS 'Period type: trimester (3), semester (2), quarter (4), or custom';
COMMENT ON COLUMN academic_periods.period_order IS 'Sequential order within the school year (1, 2, 3...)';
COMMENT ON COLUMN academic_periods.color IS 'Hex color code for UI display (default: #3b82f6 blue)';

-- Indexes
CREATE INDEX idx_academic_periods_year ON academic_periods(school_year_id);
CREATE INDEX idx_academic_periods_order ON academic_periods(school_year_id, period_order);

-- RLS Policies
ALTER TABLE academic_periods ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage academic periods"
  ON academic_periods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN school_years sy ON sy.school_id = p.school_id
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND sy.id = academic_periods.school_year_id
    )
  );

-- Teachers can read their school's periods
CREATE POLICY "Teachers can read academic periods"
  ON academic_periods
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN school_years sy ON sy.school_id = p.school_id
      WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'admin')
      AND sy.id = academic_periods.school_year_id
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_academic_periods_updated_at
  BEFORE UPDATE ON academic_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
