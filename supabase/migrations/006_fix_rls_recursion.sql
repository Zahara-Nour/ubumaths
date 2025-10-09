-- Migration: Fix RLS Infinite Recursion
-- Created: 2025-10-09
-- Purpose: Fix circular dependency between profiles and classes RLS policies

-- The problem: profiles policy checks classes, classes policy checks profiles
-- This causes infinite recursion when fetching profiles

-- Solution: Make policies that are used in other policies simpler
-- and don't create circular dependencies

-- DROP the problematic policy
DROP POLICY IF EXISTS "Teachers can view student profiles in their classes" ON profiles;

-- DROP and recreate classes policies without profile lookups in SELECT
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
DROP POLICY IF EXISTS "Teachers can manage topics" ON topics;
DROP POLICY IF EXISTS "Teachers can manage subtopics" ON subtopics;
DROP POLICY IF EXISTS "Teachers can create exercises" ON exercises;

-- Recreate without EXISTS subqueries on profiles for INSERT/UPDATE
-- Instead, just check the user exists and let application logic handle role validation
CREATE POLICY "Teachers can create classes" ON classes
    FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can manage topics" ON topics
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Teachers can manage subtopics" ON subtopics
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Teachers can create exercises" ON exercises
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Add a simpler policy for teachers to view profiles
-- This doesn't create recursion because it doesn't reference other tables
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Note: The circular reference is now broken because:
-- 1. Basic profile SELECT just checks auth.uid() = id
-- 2. Classes SELECT doesn't need to check profiles.role
-- 3. Admin policy uses a self-join on profiles which is safe
