-- =============================================================================
-- Vague-0 security incident fix — internal authorization guards on SECURITY
-- DEFINER RPCs + revoke anon EXECUTE.
--
-- Context: live production app (minor students, GDPR / EU). Several
-- SECURITY DEFINER functions trusted a caller-supplied actor id (p_user_id /
-- p_sender_id) without checking it against auth.uid(), and a few privileged
-- admin/teacher RPCs were callable by any (including anon) role. This lets a
-- logged-in user read/send another user's private messages, run admin-only
-- reporting, promote arbitrary accounts to admin, etc.
--
-- Findings C3 / C6 / C8 — see docs/wip/security-audit-2026-08.md
--
-- Fix strategy (this migration ONLY):
--   * Prepend an internal caller guard as the FIRST executable statement of
--     each affected function, using the existing helpers public.is_admin() /
--     public.is_teacher_or_admin(). Bodies are otherwise reproduced verbatim
--     (same LANGUAGE plpgsql, same SET search_path, same return type/logic).
--   * REVOKE EXECUTE from anon on the message/search/stats RPCs (authenticated
--     keeps access), and REVOKE from anon+authenticated+PUBLIC on
--     promote_user_to_admin (service_role bootstrap only).
--
-- Idempotent-safe: CREATE OR REPLACE + REVOKE are re-runnable.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. send_private_message — a caller may only send as themselves (admin exempt)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_private_message(
  p_sender_id uuid,
  p_recipient_ids uuid[],
  p_subject text,
  p_content jsonb,
  p_is_group_message boolean DEFAULT false,
  p_class_id uuid DEFAULT NULL::uuid,
  p_parent_message_id uuid DEFAULT NULL::uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_message_id UUID;
  v_recipient_id UUID;
  v_plain_text TEXT;
  v_thread_root_id UUID;
BEGIN
  -- SECURITY: a caller may only send messages as themselves (admins exempt).
  IF auth.uid() IS NOT NULL AND p_sender_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized: sender mismatch' USING ERRCODE = '42501';
  END IF;

  -- Validate permissions
  IF p_is_group_message AND p_class_id IS NOT NULL THEN
    -- Validate class message
    IF NOT validate_class_message_recipients(p_sender_id, p_class_id) THEN
      RAISE EXCEPTION 'You do not have permission to send messages to this class';
    END IF;

    -- Get all students in the class
    SELECT array_agg(student_id)
    INTO p_recipient_ids
    FROM get_students_in_class(p_class_id);

  ELSE
    -- Validate individual recipients
    IF NOT validate_message_recipients(p_sender_id, p_recipient_ids) THEN
      RAISE EXCEPTION 'You do not have permission to send messages to one or more recipients';
    END IF;
  END IF;

  -- Extract plain text from TipTap JSON using new function
  v_plain_text := extract_plain_text_from_tiptap(p_content);
  v_plain_text := substring(trim(v_plain_text), 1, 5000); -- Limit length and trim whitespace

  -- Determine thread root
  IF p_parent_message_id IS NOT NULL THEN
    -- Get thread root from parent
    SELECT COALESCE(thread_root_id, id)
    INTO v_thread_root_id
    FROM private_messages
    WHERE id = p_parent_message_id;
  ELSE
    v_thread_root_id := NULL; -- This will be the root
  END IF;

  -- Insert message
  INSERT INTO private_messages (
    sender_id,
    subject,
    content,
    plain_text,
    parent_message_id,
    thread_root_id,
    is_group_message,
    class_id,
    recipient_count
  ) VALUES (
    p_sender_id,
    p_subject,
    p_content,
    v_plain_text,
    p_parent_message_id,
    v_thread_root_id,
    p_is_group_message,
    p_class_id,
    array_length(p_recipient_ids, 1)
  )
  RETURNING id INTO v_message_id;

  -- If this is a root message, set its own thread_root_id
  IF v_thread_root_id IS NULL THEN
    UPDATE private_messages
    SET thread_root_id = v_message_id
    WHERE id = v_message_id;
  END IF;

  -- Create inbox entries for each recipient
  FOREACH v_recipient_id IN ARRAY p_recipient_ids
  LOOP
    INSERT INTO message_inbox (
      message_id,
      recipient_id,
      status
    ) VALUES (
      v_message_id,
      v_recipient_id,
      'inbox'
    );
  END LOOP;

  RETURN v_message_id;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Message read RPCs — the caller may only act as themselves (admin exempt)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_inbox(
  p_user_id uuid,
  p_status text DEFAULT 'inbox'::text,
  p_folder_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(message_id uuid, sender_id uuid, sender_name text, sender_avatar_url text, subject text, content jsonb, plain_text text, sent_at timestamp with time zone, read_at timestamp with time zone, is_starred boolean, status text, is_group_message boolean, recipient_count integer, has_attachments boolean, attachment_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY: a caller may only read their own inbox (admins exempt).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    pm.id AS message_id,
    pm.sender_id,
    p.full_name AS sender_name,
    p.avatar_url AS sender_avatar_url,
    pm.subject,
    pm.content,
    substring(pm.plain_text, 1, 200) AS plain_text,
    pm.sent_at,
    mi.read_at,
    mi.is_starred,
    mi.status,
    pm.is_group_message,
    pm.recipient_count,
    (EXISTS (SELECT 1 FROM message_attachments_v2 ma WHERE ma.message_id = pm.id)) AS has_attachments,
    (SELECT COUNT(*)::INT FROM message_attachments_v2 ma WHERE ma.message_id = pm.id) AS attachment_count
  FROM message_inbox mi
  JOIN private_messages pm ON pm.id = mi.message_id
  JOIN profiles p ON p.id = pm.sender_id
  WHERE mi.recipient_id = p_user_id
    AND mi.deleted = FALSE
    AND pm.deleted_by_sender = FALSE
    AND mi.status = p_status
    AND (p_folder_id IS NULL OR mi.folder_id = p_folder_id)
  ORDER BY pm.sent_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_sent_messages(
  p_user_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(message_id uuid, subject text, content jsonb, plain_text text, sent_at timestamp with time zone, is_group_message boolean, recipient_count integer, has_attachments boolean, recipients jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY: a caller may only read their own sent messages (admins exempt).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    pm.id AS message_id,
    pm.subject,
    pm.content,
    substring(pm.plain_text, 1, 200) AS plain_text,
    pm.sent_at,
    pm.is_group_message,
    pm.recipient_count,
    (EXISTS (SELECT 1 FROM message_attachments_v2 ma WHERE ma.message_id = pm.id)) AS has_attachments,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.full_name,
        'avatar_url', p.avatar_url
      ))
      FROM message_inbox mi
      JOIN profiles p ON p.id = mi.recipient_id
      WHERE mi.message_id = pm.id
    ) AS recipients
  FROM private_messages pm
  WHERE pm.sender_id = p_user_id
    AND pm.deleted_by_sender = FALSE
  ORDER BY pm.sent_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_message_details(
  p_message_id uuid,
  p_user_id uuid
)
 RETURNS TABLE(message_id uuid, sender_id uuid, sender_name text, sender_avatar_url text, sender_role text, subject text, content jsonb, plain_text text, sent_at timestamp with time zone, edited_at timestamp with time zone, is_group_message boolean, recipient_count integer, parent_message_id uuid, thread_root_id uuid, read_at timestamp with time zone, is_starred boolean, status text, attachments jsonb, recipients jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY: a caller may only fetch details as themselves (admins exempt).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Verify user has access
  IF NOT EXISTS (
    SELECT 1 FROM private_messages pm
    LEFT JOIN message_inbox mi ON mi.message_id = pm.id
    WHERE pm.id = p_message_id
      AND (pm.sender_id = p_user_id OR mi.recipient_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'You do not have access to this message';
  END IF;

  RETURN QUERY
  SELECT
    pm.id AS message_id,
    pm.sender_id,
    p.full_name AS sender_name,
    p.avatar_url AS sender_avatar_url,
    p.role::TEXT AS sender_role,  -- Cast to TEXT
    pm.subject,
    pm.content,
    pm.plain_text,
    pm.sent_at,
    pm.edited_at,
    pm.is_group_message,
    pm.recipient_count,
    pm.parent_message_id,
    pm.thread_root_id,
    mi.read_at,
    COALESCE(mi.is_starred, FALSE) AS is_starred,
    COALESCE(mi.status, 'sent') AS status,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', ma.id,
        'file_name', ma.file_name,
        'file_type', ma.file_type,
        'file_size', ma.file_size,
        'public_url', ma.public_url,
        'uploaded_at', ma.uploaded_at
      ))
      FROM message_attachments_v2 ma
      WHERE ma.message_id = pm.id
    ) AS attachments,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'name', pr.full_name,
        'avatar_url', pr.avatar_url,
        'role', pr.role::TEXT  -- Cast to TEXT
      ))
      FROM message_inbox mi2
      JOIN profiles pr ON pr.id = mi2.recipient_id
      WHERE mi2.message_id = pm.id
    ) AS recipients
  FROM private_messages pm
  JOIN profiles p ON p.id = pm.sender_id
  LEFT JOIN message_inbox mi ON mi.message_id = pm.id AND mi.recipient_id = p_user_id
  WHERE pm.id = p_message_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_message_thread(
  p_thread_root_id uuid,
  p_user_id uuid
)
 RETURNS TABLE(message_id uuid, sender_id uuid, sender_name text, sender_avatar_url text, subject text, content jsonb, sent_at timestamp with time zone, edited_at timestamp with time zone, parent_message_id uuid, level integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY: a caller may only fetch a thread as themselves (admins exempt).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Verify user has access to this thread
  IF NOT EXISTS (
    SELECT 1 FROM private_messages pm
    LEFT JOIN message_inbox mi ON mi.message_id = pm.id
    WHERE (pm.id = p_thread_root_id OR pm.thread_root_id = p_thread_root_id)
      AND (pm.sender_id = p_user_id OR mi.recipient_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'You do not have access to this message thread';
  END IF;

  RETURN QUERY
  WITH RECURSIVE thread_messages AS (
    -- Root message
    SELECT
      pm.id,
      pm.sender_id,
      p.full_name AS sender_name,
      p.avatar_url AS sender_avatar_url,
      pm.subject,
      pm.content,
      pm.sent_at,
      pm.edited_at,
      pm.parent_message_id,
      0 AS level
    FROM private_messages pm
    JOIN profiles p ON p.id = pm.sender_id
    WHERE pm.id = p_thread_root_id
      AND pm.deleted_by_sender = FALSE

    UNION ALL

    -- Recursive: get replies
    SELECT
      pm.id,
      pm.sender_id,
      p.full_name,
      p.avatar_url,
      pm.subject,
      pm.content,
      pm.sent_at,
      pm.edited_at,
      pm.parent_message_id,
      tm.level + 1
    FROM private_messages pm
    JOIN profiles p ON p.id = pm.sender_id
    JOIN thread_messages tm ON pm.parent_message_id = tm.id
    WHERE pm.deleted_by_sender = FALSE
  )
  SELECT * FROM thread_messages
  ORDER BY sent_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_allowed_recipients(
  p_user_id uuid
)
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, role text, relationship text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
	v_user_role text;
BEGIN
	-- SECURITY: a caller may only list their own allowed recipients (admins exempt).
	IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
		RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
	END IF;

	SELECT profiles.role INTO v_user_role FROM profiles WHERE profiles.id = p_user_id;

	IF v_user_role = 'student' THEN
		-- Option B: a student may message the single teacher account.
		RETURN QUERY
			SELECT p.id, p.full_name, p.avatar_url, p.role::text, 'teacher'::text
			FROM profiles p
			WHERE p.role = 'teacher'
			ORDER BY p.full_name;
	ELSIF v_user_role = 'teacher' THEN
		-- Option B: the teacher may message EVERY (real) student, in-class or not.
		RETURN QUERY
			SELECT p.id, p.full_name, p.avatar_url, p.role::text, 'student'::text
			FROM profiles p
			WHERE p.role = 'student'
			  AND coalesce(p.is_test, false) = false
			ORDER BY p.full_name;
	ELSIF v_user_role = 'admin' THEN
		RETURN QUERY
			SELECT p.id, p.full_name, p.avatar_url, p.role::text, 'any'::text
			FROM profiles p
			WHERE p.id <> p_user_id
			ORDER BY p.full_name;
	END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_private_messages(
  p_user_id uuid,
  p_query text,
  p_search_in text DEFAULT 'all'::text,
  p_has_attachments boolean DEFAULT NULL::boolean,
  p_sender_name text DEFAULT NULL::text,
  p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(message_id uuid, sender_id uuid, sender_name text, subject text, plain_text text, sent_at timestamp with time zone, is_starred boolean, has_attachments boolean, rank real)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tsquery TSQUERY;
BEGIN
  -- SECURITY: a caller may only search their own messages (admins exempt).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Convert search query to tsquery
  v_tsquery := plainto_tsquery('french', p_query);

  RETURN QUERY
  SELECT
    msi.message_id,
    pm.sender_id,
    msi.sender_name,
    pm.subject,
    substring(pm.plain_text, 1, 200) AS plain_text,
    msi.sent_at,
    COALESCE(mi.is_starred, FALSE) AS is_starred,
    msi.has_attachments,
    ts_rank(msi.search_tsv, v_tsquery) AS rank
  FROM message_search_index msi
  JOIN private_messages pm ON pm.id = msi.message_id
  LEFT JOIN message_inbox mi ON mi.message_id = msi.message_id AND mi.recipient_id = p_user_id
  WHERE
    -- Full-text search match
    msi.search_tsv @@ v_tsquery

    -- User has access
    AND (
      pm.sender_id = p_user_id
      OR (mi.recipient_id = p_user_id AND mi.deleted = FALSE)
    )

    -- Search scope filter
    AND (
      (p_search_in = 'all')
      OR (p_search_in = 'inbox' AND mi.recipient_id = p_user_id)
      OR (p_search_in = 'sent' AND pm.sender_id = p_user_id)
    )

    -- Optional filters
    AND (p_has_attachments IS NULL OR msi.has_attachments = p_has_attachments)
    AND (p_sender_name IS NULL OR msi.sender_name ILIKE '%' || p_sender_name || '%')
    AND (p_date_from IS NULL OR msi.sent_at >= p_date_from)
    AND (p_date_to IS NULL OR msi.sent_at <= p_date_to)

    -- Exclude soft-deleted
    AND pm.deleted_by_sender = FALSE

  ORDER BY rank DESC, msi.sent_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. validate_riddle_attempt — teacher/admin only (grants gidouilles rewards)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_riddle_attempt(
  p_attempt_id uuid,
  p_is_correct boolean
)
 RETURNS TABLE(success boolean, theoretical_reward numeric, actual_reward numeric, is_first_win boolean, week_best_reward numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id UUID;
  v_riddle_id UUID;
  v_difficulty INTEGER;
  v_attempt_number INTEGER;
  v_theoretical_gidouilles NUMERIC(10,2);
  v_actual_gidouilles NUMERIC(10,2);
  v_is_first_win BOOLEAN;
  v_week_best NUMERIC(10,2);
BEGIN
  -- SECURITY: only a teacher or admin may validate riddle attempts.
  IF NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT ra.student_id, ra.riddle_id, ra.attempt_number
  INTO v_student_id, v_riddle_id, v_attempt_number
  FROM riddle_attempts ra
  WHERE ra.id = p_attempt_id AND ra.is_correct IS NULL; -- Only validate pending attempts

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found or already validated';
  END IF;

  -- Mono-teacher: the sole teacher teaches any enrolled student.
  IF NOT EXISTS (
    SELECT 1 FROM class_members cm
    WHERE cm.student_id = v_student_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not teach this student';
  END IF;

  SELECT difficulty INTO v_difficulty FROM riddles WHERE id = v_riddle_id;
  IF v_difficulty IS NULL THEN
    RAISE EXCEPTION 'Riddle not found';
  END IF;

  IF NOT p_is_correct THEN
    UPDATE riddle_attempts
    SET is_correct = FALSE, validated_at = NOW(), validated_by = auth.uid()
    WHERE id = p_attempt_id;
    RETURN QUERY SELECT TRUE, 0::NUMERIC(10,2), 0::NUMERIC(10,2), FALSE, 0::NUMERIC(10,2);
    RETURN;
  END IF;

  v_theoretical_gidouilles := public.calculate_riddle_gidouilles(v_difficulty, v_attempt_number)::NUMERIC(10,2);

  SELECT NOT EXISTS (
    SELECT 1 FROM riddle_attempts ra2
    WHERE ra2.student_id = v_student_id AND ra2.riddle_id = v_riddle_id
      AND ra2.is_correct = TRUE AND ra2.id != p_attempt_id
  ) INTO v_is_first_win;

  IF v_is_first_win THEN
    v_actual_gidouilles := v_theoretical_gidouilles;
  ELSE
    v_actual_gidouilles := 0;
  END IF;

  UPDATE riddle_attempts
  SET is_correct = TRUE, validated_at = NOW(), validated_by = auth.uid(), gidouilles_awarded = v_actual_gidouilles
  WHERE id = p_attempt_id;

  IF v_actual_gidouilles > 0 THEN
    PERFORM public.update_student_gidouilles(v_student_id, v_actual_gidouilles::INTEGER);
  END IF;

  SELECT COALESCE(MAX(gidouilles_awarded), 0)::NUMERIC(10,2)
  INTO v_week_best
  FROM riddle_attempts ra3
  WHERE ra3.student_id = v_student_id AND ra3.is_correct = TRUE
    AND ra3.validated_at >= date_trunc('week', NOW());

  RETURN QUERY SELECT TRUE, v_theoretical_gidouilles, v_actual_gidouilles, v_is_first_win, v_week_best;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 4. search_users_unaccent — admin only; clamp limit; require >= 2 chars
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_users_unaccent(
  search_term text,
  result_limit integer DEFAULT 50
)
 RETURNS TABLE(id uuid, email text, firstname text, lastname text, role user_role, school_id uuid, grade text, is_test boolean, created_at timestamp with time zone, updated_at timestamp with time zone, school_name text, class_ids uuid[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
      -- SECURITY: admin-only directory search.
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
      END IF;

      -- Clamp the page size and require a minimum search length.
      result_limit := LEAST(COALESCE(result_limit, 20), 100);

      IF length(coalesce(btrim(search_term), '')) < 2 THEN
        RETURN;
      END IF;

      RETURN QUERY
      SELECT
          p.id,
          p.email,
          p.firstname,
          p.lastname,
          p.role,
          p.school_id,
          p.grade,
          p.is_test,
          p.created_at,
          p.updated_at,
          s.name AS school_name,
          COALESCE(
              ARRAY_AGG(cm.class_id) FILTER (WHERE cm.class_id IS NOT NULL),
              '{}'::UUID[]
          ) AS class_ids
      FROM profiles p
      LEFT JOIN schools s ON p.school_id = s.id
      LEFT JOIN class_members cm ON p.id = cm.student_id
      WHERE
          unaccent(LOWER(p.email)) LIKE '%' || unaccent(LOWER(search_term)) || '%'
          OR unaccent(LOWER(COALESCE(p.firstname, ''))) LIKE '%' || unaccent(LOWER(search_term)) || '%'
          OR unaccent(LOWER(COALESCE(p.lastname, ''))) LIKE '%' || unaccent(LOWER(search_term)) || '%'
      GROUP BY p.id, p.email, p.firstname, p.lastname, p.role, p.school_id,
               p.grade, p.is_test, p.created_at, p.updated_at, s.name
      ORDER BY p.lastname ASC, p.firstname ASC
      LIMIT result_limit;
  END;
  $function$;

-- -----------------------------------------------------------------------------
-- 5. get_database_stats — admin only (aggregate reporting over all users)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_database_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- SECURITY: admin-only reporting.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'students', (SELECT COUNT(*) FROM profiles WHERE role = 'student'),
    'teachers', (SELECT COUNT(*) FROM profiles WHERE role = 'teacher'),
    'admins', (SELECT COUNT(*) FROM profiles WHERE role = 'admin'),
    'classes', (SELECT COUNT(*) FROM classes),
    'schools', (SELECT COUNT(*) FROM schools),
    'friendships', (SELECT COUNT(*) FROM friendships WHERE status = 'accepted'),
    'pending_friendships', (SELECT COUNT(*) FROM friendships WHERE status = 'pending'),
    'pending_students_total', (SELECT COUNT(*) FROM pending_students),
    'pending_students_activated', (SELECT COUNT(*) FROM pending_students WHERE is_activated = true)
  )
  INTO result;

  RETURN result;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 6. promote_user_to_admin — service_role bootstrap (null uid) or admin only;
--    any logged-in non-admin is blocked.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(
  user_email text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  -- SECURITY: allow a null-uid service_role bootstrap; block any logged-in
  -- caller that is not already an admin.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Update the user's role to admin
  UPDATE profiles
  SET role = 'admin',
      updated_at = NOW()
  WHERE email = user_email;

  -- Raise notice if no user found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No user found with email: %', user_email;
  END IF;

  RAISE NOTICE 'User % has been promoted to admin', user_email;
END;
$function$;

-- =============================================================================
-- EXECUTE grants — lock these RPCs to `authenticated` (+ service_role).
--
-- ⚠️ Postgres grants EXECUTE to PUBLIC by default on function creation, and
-- `anon` is a member of PUBLIC. Revoking from `anon` ALONE is therefore NOT
-- enough — the PUBLIC grant still lets anon execute. We revoke from PUBLIC (and
-- anon explicitly, belt-and-suspenders), then GRANT back to `authenticated`
-- (which otherwise loses it as a PUBLIC member). Without this, since the caller
-- guards intentionally exempt a null `auth.uid()` (service_role), an anonymous
-- caller would slip past the guard AND keep PUBLIC EXECUTE → read any user's
-- inbox by passing their uuid. (Cf. migration 20260826090000: role grants and
-- the PUBLIC grant are independent.)
-- =============================================================================

-- Functions 1–5 (findings C3/C6): authenticated-only.
REVOKE EXECUTE ON FUNCTION public.send_private_message(uuid, uuid[], text, jsonb, boolean, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_private_message(uuid, uuid[], text, jsonb, boolean, uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_inbox(uuid, text, uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_inbox(uuid, text, uuid, integer, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_sent_messages(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_sent_messages(uuid, integer, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_message_details(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_message_details(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_message_thread(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_message_thread(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_allowed_recipients(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_allowed_recipients(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.search_private_messages(uuid, text, text, boolean, text, timestamptz, timestamptz, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_private_messages(uuid, text, text, boolean, text, timestamptz, timestamptz, integer, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.validate_riddle_attempt(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_riddle_attempt(uuid, boolean) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.search_users_unaccent(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_users_unaccent(text, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_database_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_database_stats() TO authenticated, service_role;

-- Function 6 (finding C8): service_role only — no anon, authenticated or PUBLIC.
-- (service_role's own access came via PUBLIC too, so re-grant it for the
-- documented one-off admin bootstrap.)
REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(text) TO service_role;

-- =============================================================================
-- Documentation of intent (idempotent).
-- =============================================================================
COMMENT ON FUNCTION public.send_private_message(uuid, uuid[], text, jsonb, boolean, uuid, uuid) IS
  'Vague-0 (C3/C6): guarded — sender must match auth.uid() unless admin. anon EXECUTE revoked.';
COMMENT ON FUNCTION public.get_user_inbox(uuid, text, uuid, integer, integer) IS
  'Vague-0 (C3/C6): guarded — p_user_id must match auth.uid() unless admin. anon EXECUTE revoked.';
COMMENT ON FUNCTION public.get_user_sent_messages(uuid, integer, integer) IS
  'Vague-0 (C3/C6): guarded — p_user_id must match auth.uid() unless admin. anon EXECUTE revoked.';
COMMENT ON FUNCTION public.get_message_details(uuid, uuid) IS
  'Vague-0 (C3/C6): guarded — p_user_id must match auth.uid() unless admin. anon EXECUTE revoked.';
COMMENT ON FUNCTION public.get_message_thread(uuid, uuid) IS
  'Vague-0 (C3/C6): guarded — p_user_id must match auth.uid() unless admin. anon EXECUTE revoked.';
COMMENT ON FUNCTION public.get_allowed_recipients(uuid) IS
  'Vague-0 (C3/C6): guarded — p_user_id must match auth.uid() unless admin. anon EXECUTE revoked.';
COMMENT ON FUNCTION public.search_private_messages(uuid, text, text, boolean, text, timestamptz, timestamptz, integer, integer) IS
  'Vague-0 (C3/C6): guarded — p_user_id must match auth.uid() unless admin. anon EXECUTE revoked.';
COMMENT ON FUNCTION public.validate_riddle_attempt(uuid, boolean) IS
  'Vague-0 (C3/C6): guarded — teacher/admin only. anon EXECUTE revoked.';
COMMENT ON FUNCTION public.search_users_unaccent(text, integer) IS
  'Vague-0 (C3/C6): guarded — admin only; limit clamped to 100; requires >= 2 chars. anon EXECUTE revoked.';
COMMENT ON FUNCTION public.get_database_stats() IS
  'Vague-0 (C3/C6): guarded — admin only. anon EXECUTE revoked.';
COMMENT ON FUNCTION public.promote_user_to_admin(text) IS
  'Vague-0 (C8): guarded — null-uid service_role bootstrap or admin only. EXECUTE limited to service_role.';
