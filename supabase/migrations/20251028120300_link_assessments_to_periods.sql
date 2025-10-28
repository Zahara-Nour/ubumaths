-- Migration: Link assessments to academic periods
-- Description: Add academic_period_id to assessments with auto-assignment logic
-- Author: Claude Code
-- Date: 2025-10-28

-- Add academic_period_id column to assessments
ALTER TABLE assessments
ADD COLUMN academic_period_id UUID REFERENCES academic_periods(id) ON DELETE SET NULL;

-- Add column comment
COMMENT ON COLUMN assessments.academic_period_id IS 'Academic period this assessment belongs to (auto-assigned based on created_at date)';

-- Index for queries filtering by period
CREATE INDEX idx_assessments_period ON assessments(academic_period_id);

-- Function to auto-assign assessments to periods based on created_at date
CREATE OR REPLACE FUNCTION auto_assign_assessment_to_period()
RETURNS TRIGGER AS $$
DECLARE
  matching_period_id UUID;
BEGIN
  -- Find the academic period that contains this assessment's created_at date
  SELECT ap.id INTO matching_period_id
  FROM academic_periods ap
  JOIN school_years sy ON sy.id = ap.school_year_id
  JOIN classes c ON c.school_id = sy.school_id
  WHERE c.id = NEW.class_id
    AND sy.is_active = true
    AND NEW.created_at::date BETWEEN ap.start_date AND ap.end_date
  LIMIT 1;

  -- Assign if found (only if not already set)
  IF matching_period_id IS NOT NULL AND NEW.academic_period_id IS NULL THEN
    NEW.academic_period_id := matching_period_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add function comment
COMMENT ON FUNCTION auto_assign_assessment_to_period IS 'Auto-assigns new assessments to academic periods based on created_at date and active school year';

-- Trigger to auto-assign new assessments
CREATE TRIGGER auto_assign_assessment_period
  BEFORE INSERT ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_assessment_to_period();

-- Function to manually link existing assessments to periods (for migration/backfill)
CREATE OR REPLACE FUNCTION link_existing_assessments_to_periods(p_school_year_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE assessments a
  SET academic_period_id = ap.id
  FROM academic_periods ap
  JOIN school_years sy ON sy.id = ap.school_year_id
  JOIN classes c ON c.school_id = sy.school_id
  WHERE c.id = a.class_id
    AND sy.id = p_school_year_id
    AND a.created_at::date BETWEEN ap.start_date AND ap.end_date
    AND a.academic_period_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Add function comment
COMMENT ON FUNCTION link_existing_assessments_to_periods IS 'Backfills academic_period_id for existing assessments in a given school year. Returns count of updated assessments.';
