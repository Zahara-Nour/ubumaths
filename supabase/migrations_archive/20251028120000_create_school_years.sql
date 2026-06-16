-- Migration: Create school_years table
-- Description: Manages school years (e.g., "2024-2025") with one active year per school
-- Author: Claude Code
-- Date: 2025-10-28

-- Create school_years table
CREATE TABLE school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- "2024-2025", "2025-2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,  -- Only one active year per school
  metadata JSONB DEFAULT '{}'::jsonb,  -- For future extensibility (region, custom fields)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_school_year UNIQUE(school_id, name),
  CONSTRAINT valid_year_dates CHECK (end_date > start_date)
);

-- Add table comment
COMMENT ON TABLE school_years IS 'Academic years (e.g., "2024-2025") with one active year per school';
COMMENT ON COLUMN school_years.name IS 'Year name in format "YYYY-YYYY" (e.g., "2024-2025")';
COMMENT ON COLUMN school_years.is_active IS 'Only one active year allowed per school (enforced by partial unique index)';
COMMENT ON COLUMN school_years.metadata IS 'Extensible JSONB for region, custom fields, etc.';

-- Indexes
CREATE INDEX idx_school_years_school ON school_years(school_id);
CREATE INDEX idx_school_years_active ON school_years(school_id, is_active) WHERE is_active = true;

-- Unique constraint: Only one active year per school (using partial unique index)
-- This is compatible with all PostgreSQL versions (unlike UNIQUE NULLS NOT DISTINCT)
CREATE UNIQUE INDEX idx_one_active_year_per_school ON school_years(school_id) WHERE is_active = true;

-- RLS Policies
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage school years"
  ON school_years
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Teachers can read their school's years
CREATE POLICY "Teachers can read their school years"
  ON school_years
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.school_id = school_years.school_id
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_school_years_updated_at
  BEFORE UPDATE ON school_years
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
