-- ============================================================================
-- Migration: Add variation tracking to worksheet_error_reports
-- Description: Store which variation and seed the student saw when reporting
-- Date: 2026-01-05
-- ============================================================================

-- Add variation_index column
-- Stores the index of the variation the student saw (0-based)
-- NULL for legacy reports or if instance data unavailable
ALTER TABLE public.worksheet_error_reports
ADD COLUMN IF NOT EXISTS variation_index INTEGER;

-- Add seed column
-- Stores the seed used to generate the student's instance
-- Allows regenerating exactly what the student saw
ALTER TABLE public.worksheet_error_reports
ADD COLUMN IF NOT EXISTS seed INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN public.worksheet_error_reports.variation_index IS
  'Index of the variation the student saw (0-based). NULL for legacy reports.';

COMMENT ON COLUMN public.worksheet_error_reports.seed IS
  'Seed used to generate the student instance. Allows preview of what student saw.';
