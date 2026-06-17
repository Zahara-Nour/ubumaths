-- Migration: Fix authorization bypass for @voltairedoha.com users
-- Created: 2025-12-08
-- Purpose: Update handle_new_user() trigger to set status='pending' for @voltairedoha.com emails
--
-- PROBLEM:
-- The handle_new_user() trigger creates profiles WITHOUT the status field.
-- The status column has DEFAULT 'approved', so new users bypass the approval workflow.
-- The OAuth callback tries to set status='pending', but the profile already exists (created by trigger).
--
-- SOLUTION:
-- Modify the trigger to explicitly set status='pending' for @voltairedoha.com domain emails.
-- Other users get status='approved' (explicit, not relying on DEFAULT).
--
-- AFFECTED USERS:
-- - New @voltairedoha.com users will require admin approval
-- - Existing approved users are NOT affected
-- - Pending students (pre-imported) remain approved (they were explicitly added by teachers)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  pending_student RECORD;
  class_id UUID;
  google_avatar TEXT;
  user_status_value user_status;
BEGIN
  -- Extract Google avatar URL from user metadata if available
  -- Google OAuth stores avatar in 'picture' field (standard), but check both for compatibility
  google_avatar := COALESCE(
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Check if this email exists in pending_students (not yet activated)
  SELECT * INTO pending_student
  FROM public.pending_students
  WHERE email = NEW.email AND is_activated = FALSE
  LIMIT 1;

  -- If pending student exists, create profile with pre-populated data
  -- These students were explicitly added by teachers, so they are approved
  IF FOUND THEN
    -- Create profile with pre-populated data (including Google avatar)
    -- Status is 'approved' because teacher explicitly added this student
    INSERT INTO public.profiles (id, email, firstname, lastname, role, school_id, grade, gender, class_ids, avatar_url, status)
    VALUES (
      NEW.id,
      NEW.email,
      pending_student.firstname,
      pending_student.lastname,
      'student',
      pending_student.school_id,
      pending_student.grade,
      pending_student.gender,
      pending_student.class_ids,
      google_avatar,
      'approved'::user_status  -- Explicitly approved (teacher added them)
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

    RAISE NOTICE 'Created profile for pre-populated student: % (enrolled in % classes, avatar: %, status: approved)',
                 NEW.email,
                 COALESCE(array_length(pending_student.class_ids, 1), 0),
                 COALESCE(google_avatar, 'none');
  ELSE
    -- No pending student found - create default profile
    -- Determine status based on email domain
    IF NEW.email LIKE '%@voltairedoha.com' THEN
      user_status_value := 'pending'::user_status;
    ELSE
      user_status_value := 'approved'::user_status;
    END IF;

    INSERT INTO public.profiles (id, email, firstname, lastname, role, avatar_url, status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'given_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'family_name', ''),
      'student',
      google_avatar,
      user_status_value
    );

    RAISE NOTICE 'Created default profile for new user: % (avatar: %, status: %)',
                 NEW.email,
                 COALESCE(google_avatar, 'none'),
                 user_status_value;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, update avatar_url if we have one from Google
    IF google_avatar IS NOT NULL THEN
      UPDATE public.profiles
      SET avatar_url = google_avatar,
          updated_at = NOW()
      WHERE id = NEW.id AND (avatar_url IS NULL OR avatar_url = '');

      RAISE NOTICE 'Updated avatar for existing user: % (avatar: %)', NEW.email, google_avatar;
    END IF;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't prevent user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Update comment to reflect the new behavior
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a profile when a user signs up. Extracts and saves Google OAuth avatar from picture or avatar_url field. If the user email exists in pending_students, uses pre-populated data and enrolls them in pre-assigned classes (status: approved). For new users with @voltairedoha.com email, sets status to pending (requires admin approval). Other new users are approved by default.';

-- Fix the existing user who bypassed the restriction
-- Set their status to 'pending' so they need approval
UPDATE public.profiles
SET status = 'pending'::user_status,
    updated_at = NOW()
WHERE id = '02063171-7586-4e85-997b-8cff44df365f'
  AND status = 'approved'
  AND status_changed_by IS NULL;  -- Only if not explicitly approved by admin

-- Log the fix
DO $$
DECLARE
  affected_email TEXT;
BEGIN
  SELECT email INTO affected_email
  FROM public.profiles
  WHERE id = '02063171-7586-4e85-997b-8cff44df365f';

  IF affected_email IS NOT NULL THEN
    RAISE NOTICE 'Fixed bypass for user: % - status set to pending', affected_email;
  END IF;
END
$$;
