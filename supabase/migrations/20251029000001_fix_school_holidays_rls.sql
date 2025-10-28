-- Migration: Fix RLS policies for school_holidays
-- Description: Split admin policy to handle INSERT correctly
-- Date: 2025-10-29

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage school holidays" ON school_holidays;

-- Create separate policies for INSERT and other operations

-- 1. Admins can INSERT holidays for their school's years
CREATE POLICY "Admins can create school holidays"
  ON school_holidays
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN school_years sy ON sy.school_id = p.school_id
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND sy.id = school_holidays.school_year_id
    )
  );

-- 2. Admins can SELECT/UPDATE/DELETE holidays for their school's years
CREATE POLICY "Admins can manage existing school holidays"
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
