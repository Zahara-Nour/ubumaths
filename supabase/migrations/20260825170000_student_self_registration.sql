-- Student self-registration by class join code
-- =============================================
-- Enables controlled student self-registration: a student signs up with email/password
-- and a class join_code. The teacher distributes the code (like Pronote / Google Classroom);
-- only code holders can register, and they are auto-enrolled into that class.
--
-- Adds:
--   1. classes.registration_open  — per-class toggle (decoupled from is_active)
--   2. terms_acceptances          — RGPD proof of CGU/privacy acceptance at signup
--   3. handle_new_user()          — a priority self-registration branch driven by the
--                                   `class_id` user-metadata set at signUp.
--
-- Assumption (this scope): students are >= 15 (self-consent, no parental consent here).
--
-- Also fixes a pre-existing silent prod bug: the pending_students branch of handle_new_user()
-- referenced the `gender` column (dropped 2026-01-15, RGPD minimization) → 42703 swallowed by
-- WHEN OTHERS → pre-imported student activation failed silently. The two `gender` references
-- are removed here (this migration already CREATE OR REPLACE-s the function).

-- 1. Per-class registration toggle -------------------------------------------------
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS registration_open boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.classes.registration_open IS
  'When true, students can self-register into this class via its join_code. Controlled by the teacher; independent from is_active.';

-- 2. RGPD: record of terms/privacy acceptance --------------------------------------
-- Data minimization: we store only (user_id, terms_version, accepted_at). We intentionally
-- do NOT store IP / user-agent — the acceptance is written by the handle_new_user trigger
-- (GoTrue context, no HTTP request), and an IP is itself a minor's personal data we avoid
-- collecting. (user_id, version, timestamp) is a legally sufficient proof of consent.
CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.terms_acceptances IS
  'RGPD accountability: one row per acceptance of the CGU/privacy policy (version + timestamp) at registration.';

CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user_id ON public.terms_acceptances(user_id);

ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can read their own acceptance records.
CREATE POLICY "terms_acceptances_select_own" ON public.terms_acceptances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Teacher/admin can read all (proof of consent / RGPD accountability).
CREATE POLICY "terms_acceptances_select_staff" ON public.terms_acceptances
  FOR SELECT TO authenticated
  USING (public.is_teacher_or_admin());

-- No client INSERT/UPDATE/DELETE policy: rows are written by the SECURITY DEFINER
-- trigger below (or server-side with the service role). RLS default-denies the rest.

-- 3. handle_new_user(): add the self-registration branch ---------------------------
-- Preserves the existing pending_students and default branches verbatim; adds a
-- PRIORITY branch when the signup carries a `class_id` in raw_user_meta_data.
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
  v_class_id_raw TEXT;
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
  -- The register action passes `class_id` (resolved server-side from the join
  -- code) + firstname/lastname (+ optional terms_version) in user metadata.
  -- =========================================================================
  v_class_id_raw := NEW.raw_user_meta_data->>'class_id';
  IF v_class_id_raw IS NOT NULL AND v_class_id_raw <> '' THEN
    v_terms_version := NEW.raw_user_meta_data->>'terms_version';

    SELECT c.* INTO v_class
    FROM public.classes c
    WHERE c.id = v_class_id_raw::uuid
    LIMIT 1;

    IF FOUND AND v_class.is_active AND v_class.registration_open THEN
      -- Valid, open class → create an approved student and enroll them.
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
      -- class_id supplied but class is missing / inactive / registration closed:
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

      RAISE NOTICE 'Self-registration for % with invalid/closed class % → pending', NEW.email, v_class_id_raw;
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
  'Creates a profile when a user signs up. PRIORITY: if raw_user_meta_data.class_id is set (student self-registration by class code), enroll into that class when it is active AND registration_open (status approved) and record CGU acceptance; if the class is invalid/closed, create a non-enrolled pending profile. Otherwise: pending_students match → approved + enrolled; else default profile (@voltairedoha.com → pending, others → approved).';

-- 4. Resolve a class join code -> class id, but ONLY if the class is active and open ----
-- to self-registration. Called SERVER-SIDE by the /auth/register action with the
-- service-role client (NOT exposed to anon/authenticated) so anonymous visitors cannot
-- hit it directly via PostgREST to brute-force/enumerate open class codes. Least
-- privilege: returns just the id (or NULL), never class data. Case-insensitive, trimmed.
CREATE OR REPLACE FUNCTION public.resolve_open_class_by_code(p_code text)
    RETURNS uuid
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path TO 'public'
AS $$
  SELECT c.id
  FROM public.classes c
  WHERE upper(c.join_code) = upper(btrim(p_code))
    AND c.is_active
    AND c.registration_open
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.resolve_open_class_by_code(text) IS
  'Returns the id of the class whose join_code matches p_code (case-insensitive, trimmed) IF it is active and registration_open, else NULL. SECURITY DEFINER so the public /auth/register route can validate a class code without read access to classes.';

REVOKE ALL ON FUNCTION public.resolve_open_class_by_code(text) FROM PUBLIC;
-- service_role only: the register action calls this server-side. Not callable by anon
-- (prevents direct PostgREST enumeration of class codes, bypassing the app rate limit).
GRANT EXECUTE ON FUNCTION public.resolve_open_class_by_code(text) TO service_role;
