-- Migration: Fix RLS policies for academic_periods
-- Description: Split admin policy to handle INSERT correctly
-- Issue: INSERT requires WITH CHECK clause that can validate NEW row data
-- Date: 2025-10-29

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage academic periods" ON academic_periods;

-- Create separate policies for better clarity

-- 1. Admins can INSERT periods for their school's years
CREATE POLICY "Admins can create academic periods"
  ON academic_periods
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN school_years sy ON sy.school_id = p.school_id
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND sy.id = academic_periods.school_year_id
    )
  );

-- 2. Admins can SELECT/UPDATE/DELETE periods for their school's years
CREATE POLICY "Admins can manage existing academic periods"
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
