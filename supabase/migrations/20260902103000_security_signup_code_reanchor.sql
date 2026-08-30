-- Security incident fix — re-anchor student self-registration on the class CODE
-- =============================================================================
-- Findings H9 / H10 (docs/wip/security-audit-2026-08.md). PROD LIVE, minor students.
--
-- H9 — handle_new_user() trusted `raw_user_meta_data->>'class_id'`: a bare class
--      UUID set at signup enrolled the new account straight into that class (when
--      active + registration_open). GoTrue's public POST /auth/v1/signup lets the
--      attacker choose that metadata, so a leaked/guessed class UUID = self-enrolment
--      into an arbitrary class of minors, bypassing the join CODE entirely.
--      Fix: the self-registration branch now reads `class_code` and resolves it
--      SERVER-SIDE-IN-TRIGGER via resolve_open_class_by_code() (case-insensitive,
--      trimmed, active + registration_open). The enrolling class id is derived from
--      the secret code, never taken from client metadata. The app already sends
--      `class_code` instead of `class_id`.
--
-- H10 — RLS policy "students_can_join" on public.class_members let ANY authenticated
--      user INSERT a membership row for themselves (WITH CHECK student_id = auth.uid())
--      into ANY class by UUID, with no class-validity check. No app code performs a
--      direct authenticated class_members insert — enrolment happens only through the
--      SECURITY DEFINER trigger below — so the policy is pure attack surface. Dropped.
--
-- Both statements are idempotent (CREATE OR REPLACE / DROP POLICY IF EXISTS).

-- 1. handle_new_user(): re-anchor the self-registration branch on the class code -----
-- Reproduced verbatim from the deployed definition; ONLY the priority
-- self-registration branch changed (class_id -> class_code + resolve_open_class_by_code).
-- The pending_students branch, the default branch and the EXCEPTION guard are unchanged.
CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
AS $function$
DECLARE
  pending_student RECORD;
  class_id UUID;
  google_avatar TEXT;
  user_status_value user_status;
  -- Self-registration locals
  v_class_code TEXT;
  v_resolved_class_id UUID;
  v_class RECORD;
  v_terms_version TEXT;
BEGIN
  -- Extract Google avatar URL from user metadata if available
  -- Google OAuth stores avatar in 'picture' field (standard), but check both for compatibility
  google_avatar := COALESCE(
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- =========================================================================
  -- PRIORITY BRANCH: student self-registration by class code.
  -- The register action passes `class_code` (the teacher-distributed join code)
  -- + firstname/lastname (+ optional terms_version) in user metadata. The code is
  -- resolved HERE via resolve_open_class_by_code() so the enrolling class is never
  -- attacker-controllable: a bare class UUID in metadata can no longer enroll anyone
  -- (finding H9). resolve_open_class_by_code() returns the class id IFF the code
  -- matches (case-insensitive, trimmed) AND the class is active AND registration_open.
  -- =========================================================================
  v_class_code := NEW.raw_user_meta_data->>'class_code';
  IF v_class_code IS NOT NULL AND v_class_code <> '' THEN
    v_terms_version := NEW.raw_user_meta_data->>'terms_version';

    v_resolved_class_id := public.resolve_open_class_by_code(v_class_code);

    IF v_resolved_class_id IS NOT NULL THEN
      -- Valid, open class → load it and create an approved, enrolled student.
      SELECT c.* INTO v_class
      FROM public.classes c
      WHERE c.id = v_resolved_class_id
      LIMIT 1;

      -- SECURITY: role/status/school_id/grade are NEVER read from raw_user_meta_data
      -- (attacker-controlled). `role` is hardcoded 'student', `status` is derived from the
      -- real class state, and school_id/grade come from the resolved class (v_class). Only
      -- firstname/lastname/terms_version come from metadata (non-authorization data).
      INSERT INTO public.profiles (id, email, firstname, lastname, role, school_id, grade, avatar_url, status)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'firstname', ''),
        COALESCE(NEW.raw_user_meta_data->>'lastname', ''),
        'student',
        v_class.school_id,
        v_class.grade,
        google_avatar,
        'approved'::user_status
      );

      INSERT INTO public.class_members (class_id, student_id)
      VALUES (v_class.id, NEW.id)
      ON CONFLICT DO NOTHING;

      -- RGPD: record CGU acceptance if the client supplied a version.
      IF v_terms_version IS NOT NULL AND v_terms_version <> '' THEN
        INSERT INTO public.terms_acceptances (user_id, terms_version)
        VALUES (NEW.id, v_terms_version);
      END IF;

      RAISE NOTICE 'Self-registered student % into class % (status: approved)', NEW.email, v_class.id;
    ELSE
      -- class_code supplied but no active/open class matches it:
      -- create a NON-enrolled pending profile (teacher/admin review), never auto-approve.
      INSERT INTO public.profiles (id, email, firstname, lastname, role, avatar_url, status)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'firstname', ''),
        COALESCE(NEW.raw_user_meta_data->>'lastname', ''),
        'student',
        google_avatar,
        'pending'::user_status
      );

      RAISE NOTICE 'Self-registration for % with invalid/closed class code → pending', NEW.email;
    END IF;

    RETURN NEW;
  END IF;

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
    -- NOTE: `gender` was intentionally dropped from profiles/pending_students on 2026-01-15
    -- (RGPD minimization). The original trigger still referenced it, which raised 42703 and
    -- was swallowed by the WHEN OTHERS handler → student activation failed silently. Fixed here.
    INSERT INTO public.profiles (id, email, firstname, lastname, role, school_id, grade, class_ids, avatar_url, status)
    VALUES (
      NEW.id,
      NEW.email,
      pending_student.firstname,
      pending_student.lastname,
      'student',
      pending_student.school_id,
      pending_student.grade,
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
$function$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates a profile when a user signs up. PRIORITY: if raw_user_meta_data.class_code is set (student self-registration by class code), resolve it via resolve_open_class_by_code() and, when it maps to an active + registration_open class, enroll the student (status approved) and record CGU acceptance; if the code resolves to nothing, create a non-enrolled pending profile. The enrolling class is derived from the secret code, never from a client-supplied class_id (finding H9). Otherwise: pending_students match → approved + enrolled; else default profile (@voltairedoha.com → pending, others → approved).';

-- 2. Drop the exploitable self-join RLS policy (finding H10) -------------------------
-- "students_can_join" allowed any authenticated user to INSERT a class_members row for
-- themselves (WITH CHECK student_id = auth.uid()) into ANY class by UUID, with no check
-- that the class is theirs / open. Enrolment is done exclusively by the SECURITY DEFINER
-- trigger above; no app code inserts class_members as the authenticated user. Remove it.
DROP POLICY IF EXISTS "students_can_join" ON public.class_members;
