-- Migration: Fix Profiles RLS Infinite Recursion
-- Created: 2025-10-09
-- Purpose: Remove ALL circular dependencies in profiles policies

-- The issue: Any policy on profiles that queries profiles creates recursion
-- Solution: Use ONLY auth.uid() for profiles policies, never query profiles table

-- Drop the problematic admin policy that was just added
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Drop ALL existing profiles policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles in their classes" ON profiles;

-- Recreate SIMPLE policies that don't query any tables
-- Policy 1: Users can view their own profile (no subqueries!)
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy 2: Users can update their own profile (no subqueries!)
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy 3: Allow inserts for new users (for the trigger to work)
CREATE POLICY "Allow profile creation" ON profiles
    FOR INSERT WITH CHECK (true);

-- That's it! No more complex policies on profiles.
-- Other tables can still query profiles safely, but profiles itself must be simple.

COMMENT ON POLICY "Users can view their own profile" ON profiles IS
    'Simple policy using only auth.uid() to avoid recursion';
