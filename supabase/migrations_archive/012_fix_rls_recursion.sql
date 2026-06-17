-- Fix infinite recursion in RLS policies
-- The issue: Admin policy checks profiles table, which triggers the same policy = infinite loop
-- Solution: Use a security definer function to break the recursion

-- Create a helper function to check if current user is an admin
-- SECURITY DEFINER means it runs with the permissions of the function creator (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Now recreate the RLS policies using the helper function

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;

-- SELECT policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can view all profiles (using helper function to avoid recursion)
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_admin());

-- UPDATE policies
-- Users can update their own profile (but cannot change their role)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Prevent users from changing their own role by comparing with existing role
  AND role = (
    SELECT role FROM profiles WHERE id = auth.uid()
  )
);

-- Admins can update any profile (using helper function)
CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
TO authenticated
USING (is_admin());

-- INSERT policy
-- Allow profile creation (needed for signup trigger)
CREATE POLICY "Allow profile creation"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON FUNCTION public.is_admin() IS 'Security definer function to check if current user is admin without triggering RLS recursion';
