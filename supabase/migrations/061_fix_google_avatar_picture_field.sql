-- Migration: Fix Google OAuth avatar to use 'picture' field
-- Created: 2025-10-15
-- Purpose: Update handle_new_user() to check 'picture' field (Google's standard)
--
-- CONTEXT:
-- Google OAuth returns user profile pictures in user_metadata.picture, not user_metadata.avatar_url
-- Previous implementation only checked avatar_url, causing avatars to not display for Google users
--
-- CHANGES:
-- - Extract avatar from 'picture' field first (Google standard), then 'avatar_url' (fallback)
-- - Save avatar URL to profiles.avatar_url on user creation
-- - Update existing profiles with Google avatar if they don't have one set
--
-- RELATED FILES:
-- - src/routes/(public)/auth/callback/+server.ts (OAuth callback handler)
-- - src/lib/components/Header.svelte (Avatar display logic)
-- - src/routes/(protected)/debug-avatar/+page.svelte (Debug page)

-- Replace the handle_new_user function with updated version that checks 'picture' field
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
  IF FOUND THEN
    -- Create profile with pre-populated data (including Google avatar)
    INSERT INTO public.profiles (id, email, firstname, lastname, role, school_id, grade, gender, class_ids, avatar_url)
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
      google_avatar  -- Save Google avatar URL
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

    RAISE NOTICE 'Created profile for pre-populated student: % (enrolled in % classes, avatar: %)',
                 NEW.email,
                 COALESCE(array_length(pending_student.class_ids, 1), 0),
                 COALESCE(google_avatar, 'none');
  ELSE
    -- No pending student found - create default profile with Google avatar
    INSERT INTO public.profiles (id, email, firstname, lastname, role, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'given_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'family_name', ''),
      'student',
      google_avatar  -- Save Google avatar URL
    );

    RAISE NOTICE 'Created default profile for new user: % (avatar: %)', NEW.email, COALESCE(google_avatar, 'none');
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

-- Update comment
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a profile when a user signs up. Extracts and saves Google OAuth avatar from picture or avatar_url field. If the user email exists in pending_students, uses pre-populated data and enrolls them in pre-assigned classes. Otherwise creates a default student profile. Updates avatar for existing profiles if not already set.';
