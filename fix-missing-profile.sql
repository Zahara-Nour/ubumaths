-- Quick Fix: Create Missing Profile for Existing User
-- ====================================================
--
-- This script manually creates a profile for a user who signed up
-- before the automatic profile creation trigger was in place.
--
-- USAGE:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Replace 'YOUR_USER_EMAIL@example.com' with the actual email
-- 3. Change 'student' to the appropriate role if needed
-- 4. Run the query

-- Option 1: If you know the user's email
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  'student' as role  -- Change to 'teacher' or 'admin' if needed
FROM auth.users
WHERE email = 'YOUR_USER_EMAIL@example.com'  -- Replace with actual email
ON CONFLICT (id) DO NOTHING;

-- Option 2: Create profiles for ALL users who don't have one
-- (Use this if multiple users are affected)
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  'student' as role  -- All new profiles get 'student' role by default
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;  -- Only users without profiles

-- Verify the fix worked
SELECT
  u.email,
  p.role,
  p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;
