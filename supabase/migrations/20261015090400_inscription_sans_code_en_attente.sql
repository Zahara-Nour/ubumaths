-- ============================================================================
-- B7 — un compte sans code de classe ni pré-inscription est en attente
-- ============================================================================
--
-- handle_new_user approuvait d'office un compte créé sans code de classe et absent de
-- pending_students (signUp GoTrue direct, hors des limites de débit de l'app, ou
-- première connexion Google), sauf adresse @voltairedoha.com. Prouvé par
-- tests/integration/inscription-sans-code-en-attente.test.ts.
--
-- Question d'accès posée à David (2026-10-10) : « tous en attente ». En miroir — qui
-- perd quoi : un nouveau compte sans code ni pré-inscription n'accède plus à rien tant
-- que le prof ne l'a pas approuvé. Inchangés : code de classe valide (approuvé, inscrit),
-- élève pré-inscrit par le prof (approuvé), comptes existants (2 élèves approuvés sans
-- classe en prod, laissés tels quels).
--
-- Définition reprise de la prod (md5 vérifié le 2026-10-10), une branche changée.
-- Aucune donnée touchée.
--
-- ROLLBACK : recréer la fonction depuis pg_get_functiondef en remplaçant la ligne
--   « user_status_value := 'pending'::user_status; » par le test de domaine :
--   IF NEW.email LIKE '%@voltairedoha.com' THEN pending ELSE approved END IF.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
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
    -- No pending student found - create default profile.
    -- B7 (décision de David, 2026-10-10) : sans code de classe valide ni pré-inscription
    -- (signUp GoTrue direct, première connexion Google…), le compte est TOUJOURS en
    -- attente — le prof approuve. Avant : approuvé d'office hors @voltairedoha.com.
    user_status_value := 'pending'::user_status;

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
