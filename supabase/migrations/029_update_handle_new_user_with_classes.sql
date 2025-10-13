-- Migration: Update handle_new_user() to enroll students in classes
-- Created: 2025-10-12
-- Purpose: Automatically enroll students in pre-assigned classes on first login

-- Replace the handle_new_user function with updated version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  pending_student RECORD;
  class_id UUID;
BEGIN
  -- Check if this email exists in pending_students (not yet activated)
  SELECT * INTO pending_student
  FROM public.pending_students
  WHERE email = NEW.email AND is_activated = FALSE
  LIMIT 1;

  -- If pending student exists, create profile with pre-populated data
  IF FOUND THEN
    -- Create profile with pre-populated data
    INSERT INTO public.profiles (id, email, firstname, lastname, role, school_id, grade, gender, class_ids)
    VALUES (
      NEW.id,
      NEW.email,
      pending_student.firstname,
      pending_student.lastname,
      'student',
      pending_student.school_id,
      pending_student.grade,
      pending_student.gender,
      pending_student.class_ids
    );

    -- Enroll student in all pre-assigned classes
    IF pending_student.class_ids IS NOT NULL AND array_length(pending_student.class_ids, 1) > 0 THEN
      FOREACH class_id IN ARRAY pending_student.class_ids
      LOOP
        -- Insert into class_members (ignore if already exists)
        INSERT INTO public.class_members (class_id, student_id)
        VALUES (class_id, NEW.id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- Mark the pending student as activated
    UPDATE public.pending_students
    SET is_activated = TRUE,
        activated_at = NOW()
    WHERE id = pending_student.id;

    RAISE NOTICE 'Created profile for pre-populated student: % (enrolled in % classes)',
                 NEW.email,
                 COALESCE(array_length(pending_student.class_ids, 1), 0);
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

-- Update comment
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a profile when a user signs up. If the user email exists in pending_students, uses pre-populated data and enrolls them in pre-assigned classes. Otherwise creates a default student profile.';
