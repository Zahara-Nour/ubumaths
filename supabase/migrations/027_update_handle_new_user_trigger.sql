-- Migration: Update handle_new_user() Trigger to Support Pre-populated Students
-- Created: 2025-10-12
-- Purpose: When a student signs in with Google, check if they have pre-populated data in pending_students

-- Replace the handle_new_user function with updated version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  pending_student RECORD;
BEGIN
  -- Check if this email exists in pending_students (not yet activated)
  SELECT * INTO pending_student
  FROM public.pending_students
  WHERE email = NEW.email AND is_activated = FALSE
  LIMIT 1;

  -- If pending student exists, create profile with pre-populated data
  IF FOUND THEN
    INSERT INTO public.profiles (id, email, firstname, lastname, role, school_id, grade, gender)
    VALUES (
      NEW.id,
      NEW.email,
      pending_student.firstname,
      pending_student.lastname,
      'student',
      pending_student.school_id,
      pending_student.grade,
      pending_student.gender
    );

    -- Mark the pending student as activated
    UPDATE public.pending_students
    SET is_activated = TRUE,
        activated_at = NOW()
    WHERE id = pending_student.id;

    RAISE NOTICE 'Created profile for pre-populated student: %', NEW.email;
  ELSE
    -- No pending student found - create default profile
    INSERT INTO public.profiles (id, email, firstname, lastname, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'given_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'family_name', ''),
      'student'
    );

    RAISE NOTICE 'Created default profile for new user: %', NEW.email;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RAISE NOTICE 'Profile already exists for user: %', NEW.email;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't prevent user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger already exists from migration 004, no need to recreate

-- Update comment
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a profile when a user signs up. If the user email exists in pending_students, uses pre-populated data. Otherwise creates a default student profile.';
