-- Migration: Simplify RLS policies for admins
-- Description: Allow all admins to manage academic periods and holidays regardless of school_id
-- Issue: Admins without school_id can't create periods/holidays
-- Date: 2025-10-29

-- ====================================
-- academic_periods: Simplify admin access
-- ====================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can create academic periods" ON academic_periods;
DROP POLICY IF EXISTS "Admins can manage existing academic periods" ON academic_periods;

-- Allow all admins to create periods (no school_id check)
CREATE POLICY "Admins can create academic periods"
  ON academic_periods
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow all admins to manage periods (no school_id check)
CREATE POLICY "Admins can manage academic periods"
  ON academic_periods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ====================================
-- school_holidays: Simplify admin access
-- ====================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can create school holidays" ON school_holidays;
DROP POLICY IF EXISTS "Admins can manage existing school holidays" ON school_holidays;

-- Allow all admins to create holidays (no school_id check)
CREATE POLICY "Admins can create school holidays"
  ON school_holidays
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow all admins to manage holidays (no school_id check)
CREATE POLICY "Admins can manage school holidays"
  ON school_holidays
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
