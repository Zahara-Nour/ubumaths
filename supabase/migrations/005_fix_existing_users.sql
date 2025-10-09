-- Migration: Create Profiles for Existing Users
-- Created: 2025-10-09
-- Purpose: Backfill profiles for users who signed up before the trigger was created

-- Create profiles for all users who don't have one
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', '') as full_name,
  'student' as role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Log the results
DO $$
DECLARE
  missing_count INTEGER;
  fixed_count INTEGER;
BEGIN
  -- Count users without profiles before fix
  SELECT COUNT(*) INTO missing_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL;

  IF missing_count = 0 THEN
    RAISE NOTICE 'Migration completed: All % users already have profiles',
      (SELECT COUNT(*) FROM auth.users);
  ELSE
    RAISE NOTICE 'Migration completed: Created profiles for % users', missing_count;
  END IF;
END $$;
