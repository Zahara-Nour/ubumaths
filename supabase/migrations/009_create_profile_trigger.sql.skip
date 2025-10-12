-- Create Profile Trigger Migration
-- =================================
--
-- This migration creates a database trigger that automatically creates
-- a profile record whenever a new user signs up via Supabase Auth.
--
-- PROBLEM IT SOLVES:
-- When users sign up, they are added to auth.users table, but the application
-- needs a corresponding record in public.profiles with their role information.
-- Without this trigger, users would see "Profile not found" errors.
--
-- HOW IT WORKS:
-- 1. User signs up → Record created in auth.users
-- 2. Trigger fires automatically
-- 3. Profile created in public.profiles with default role 'student'
-- 4. User can now access dashboard

-- Function to create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile record when a user signs up
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,                           -- Use the same ID as auth.users
    NEW.email,                        -- Copy email from auth.users
    NEW.raw_user_meta_data->>'full_name',  -- Extract full_name from metadata (if provided)
    'student'                         -- Default role is 'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a profile record with default student role when a user signs up';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'Trigger to create profile in public.profiles when user is created in auth.users';
