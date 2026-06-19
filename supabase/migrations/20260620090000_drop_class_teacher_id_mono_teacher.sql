-- Drop teacher_id from the class-ownership cluster (mono-teacher refactor).
--
-- UbuMaths is a mono-teacher application: there is exactly ONE role='teacher'
-- (David) who can elevate to the single admin. The multi-teacher scoping that
-- `teacher_id` carried on the class-ownership cluster is therefore dead weight.
--
-- Ownership moves from `teacher_id = auth.uid()` to the role helper
-- `public.is_teacher_or_admin()`. Effective permissions are IDENTICAL: with a
-- single teacher, "owns this class" and "is the teacher (or admin)" coincide.
-- This is a refactor, NOT a privilege change.
--
-- NOTE: `public.is_admin()` checks role='admin' ONLY (its comment is misleading)
-- so it does NOT cover the teacher. We use `public.is_teacher_or_admin()`
-- everywhere ownership previously meant `teacher_id = auth.uid()`.
--
-- 6 tables lose teacher_id (+ their FK, auto-dropped with the column):
--   classes, class_chapters, class_journal_entries, class_schedules,
--   game_timeslots, evaluation_tasks
-- These KEEP teacher_id (untouched): google_classroom_courses,
--   google_integrations, orphaned_documents, rag_documents,
--   teacher_vip_card_overrides.

BEGIN;

-- ===== 1. Helpers =====
-- Rebase the class-ownership helpers onto the role check. Signatures, SECURITY
-- DEFINER, search_path and EXCEPTION handlers preserved.

CREATE OR REPLACE FUNCTION "public"."is_class_teacher"("p_class_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Mono-teacher: the sole teacher (or admin) owns every class.
    RETURN public.is_teacher_or_admin();
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."is_class_teacher_of"("p_teacher_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Mono-teacher: a target profile is "a teacher of the current user" iff that
    -- profile is the (sole) teacher/admin. The enrolment join is now redundant.
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_teacher_id
          AND role IN ('teacher', 'admin')
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- ===== 2. RLS policies on the 6 tables =====
-- Replace every `teacher_id = auth.uid()` predicate with
-- `public.is_teacher_or_admin()`. Student SELECT policies are kept verbatim
-- (they use is_class_student()/class_members, not teacher_id). The now-redundant
-- admin-only policies are dropped (is_admin() ⊂ is_teacher_or_admin()).

-- --- classes ---
DROP POLICY IF EXISTS "delete_own_classes" ON "public"."classes";
CREATE POLICY "delete_own_classes" ON "public"."classes" FOR DELETE TO "authenticated"
    USING ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "insert_own_classes" ON "public"."classes";
CREATE POLICY "insert_own_classes" ON "public"."classes" FOR INSERT TO "authenticated"
    WITH CHECK ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "update_own_classes" ON "public"."classes";
CREATE POLICY "update_own_classes" ON "public"."classes" FOR UPDATE TO "authenticated"
    USING ("public"."is_teacher_or_admin"()) WITH CHECK ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "view_own_classes" ON "public"."classes";
CREATE POLICY "view_own_classes" ON "public"."classes" FOR SELECT TO "authenticated"
    USING ("public"."is_teacher_or_admin"());

-- Redundant admin-only policies (is_admin() ⊂ is_teacher_or_admin()).
DROP POLICY IF EXISTS "admins_delete_classes" ON "public"."classes";
DROP POLICY IF EXISTS "admins_insert_classes" ON "public"."classes";
DROP POLICY IF EXISTS "admins_update_classes" ON "public"."classes";
DROP POLICY IF EXISTS "admins_view_all_classes" ON "public"."classes";
-- KEEP "view_member_classes" (student SELECT via class_members) verbatim.

-- --- class_chapters ---
DROP POLICY IF EXISTS "Teachers can manage chapters of their classes" ON "public"."class_chapters";
CREATE POLICY "Teachers can manage chapters of their classes" ON "public"."class_chapters" TO "authenticated"
    USING ("public"."is_teacher_or_admin"()) WITH CHECK ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "Admins can manage all chapters" ON "public"."class_chapters";
-- KEEP "Students can view visible chapters of their classes" verbatim.

-- --- class_journal_entries ---
-- create/view drop the extra `EXISTS (... classes ...)` clause (redundant once
-- the predicate is role-based).
DROP POLICY IF EXISTS "Teachers can create journal entries for their classes" ON "public"."class_journal_entries";
CREATE POLICY "Teachers can create journal entries for their classes" ON "public"."class_journal_entries" FOR INSERT
    WITH CHECK ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "Teachers can delete their journal entries" ON "public"."class_journal_entries";
CREATE POLICY "Teachers can delete their journal entries" ON "public"."class_journal_entries" FOR DELETE
    USING ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "Teachers can update their journal entries" ON "public"."class_journal_entries";
CREATE POLICY "Teachers can update their journal entries" ON "public"."class_journal_entries" FOR UPDATE
    USING ("public"."is_teacher_or_admin"()) WITH CHECK ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "Teachers can view journal entries" ON "public"."class_journal_entries";
CREATE POLICY "Teachers can view journal entries" ON "public"."class_journal_entries" FOR SELECT
    USING ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "Admins can manage all journal entries" ON "public"."class_journal_entries";
-- KEEP "Students can view published journal entries" verbatim.

-- --- class_schedules ---
DROP POLICY IF EXISTS "Teachers can create schedules for their classes" ON "public"."class_schedules";
CREATE POLICY "Teachers can create schedules for their classes" ON "public"."class_schedules" FOR INSERT
    WITH CHECK ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "Teachers can delete their class schedules" ON "public"."class_schedules";
CREATE POLICY "Teachers can delete their class schedules" ON "public"."class_schedules" FOR DELETE
    USING ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "Teachers can update their class schedules" ON "public"."class_schedules";
CREATE POLICY "Teachers can update their class schedules" ON "public"."class_schedules" FOR UPDATE
    USING ("public"."is_teacher_or_admin"()) WITH CHECK ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "Teachers can view their class schedules" ON "public"."class_schedules";
CREATE POLICY "Teachers can view their class schedules" ON "public"."class_schedules" FOR SELECT
    USING ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "Admins can manage all schedules" ON "public"."class_schedules";
DROP POLICY IF EXISTS "Admins can view all schedules" ON "public"."class_schedules";
-- KEEP "Students can view schedules for their classes" verbatim.

-- --- game_timeslots ---
DROP POLICY IF EXISTS "Teachers can manage own class timeslots" ON "public"."game_timeslots";
CREATE POLICY "Teachers can manage own class timeslots" ON "public"."game_timeslots"
    USING ("public"."is_teacher_or_admin"()) WITH CHECK ("public"."is_teacher_or_admin"());
-- KEEP "Students can view class timeslots" verbatim.

-- --- evaluation_tasks ---
-- Drop the `teacher_id = auth.uid() AND` part; predicate becomes just the role check.
DROP POLICY IF EXISTS "evaluation_tasks_select_teacher" ON "public"."evaluation_tasks";
CREATE POLICY "evaluation_tasks_select_teacher" ON "public"."evaluation_tasks" FOR SELECT TO "authenticated"
    USING ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "evaluation_tasks_insert_teacher" ON "public"."evaluation_tasks";
CREATE POLICY "evaluation_tasks_insert_teacher" ON "public"."evaluation_tasks" FOR INSERT TO "authenticated"
    WITH CHECK ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "evaluation_tasks_update_teacher" ON "public"."evaluation_tasks";
CREATE POLICY "evaluation_tasks_update_teacher" ON "public"."evaluation_tasks" FOR UPDATE TO "authenticated"
    USING ("public"."is_teacher_or_admin"()) WITH CHECK ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "evaluation_tasks_delete_teacher" ON "public"."evaluation_tasks";
CREATE POLICY "evaluation_tasks_delete_teacher" ON "public"."evaluation_tasks" FOR DELETE TO "authenticated"
    USING ("public"."is_teacher_or_admin"());

DROP POLICY IF EXISTS "Admins can manage all evaluation_tasks" ON "public"."evaluation_tasks";
-- KEEP "evaluation_tasks_select_student" (class_members) verbatim.

-- ===== 3. Class-fetch RPCs =====
-- Drop the p_teacher_id param, remove teacher_id from RETURNS TABLE, and remove
-- the `WHERE c.teacher_id = p_teacher_id` filter (mono -> all classes).
-- Old signatures are dropped first because the parameter list changes.

-- --- get_teacher_classes_with_data ---
DROP FUNCTION IF EXISTS "public"."get_teacher_classes_with_data"("uuid", boolean);
CREATE FUNCTION "public"."get_teacher_classes_with_data"("p_is_test_mode" boolean DEFAULT false)
    RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "join_code" "text", "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "google_classroom_course_id" "uuid", "student_count" bigint, "schedules" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.join_code,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.google_classroom_course_id,
    -- Count students filtered by test mode
    COALESCE(
      COUNT(DISTINCT cm.student_id) FILTER (
        WHERE p.id IS NOT NULL
        AND p.is_test = p_is_test_mode
      ),
      0
    ) AS student_count,
    -- Aggregate schedules into JSONB array
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', cs.id,
          'class_id', cs.class_id,
          'day_of_week', cs.day_of_week,
          'start_time', cs.start_time,
          'end_time', cs.end_time,
          'subject', cs.subject,
          'room', cs.room,
          'notes', cs.notes
        )
        ORDER BY cs.day_of_week, cs.start_time
      ) FILTER (WHERE cs.id IS NOT NULL),
      '[]'::JSONB
    ) AS schedules
  FROM classes c
  LEFT JOIN class_members cm ON c.id = cm.class_id
  LEFT JOIN profiles p ON cm.student_id = p.id
  LEFT JOIN class_schedules cs ON c.id = cs.class_id
  WHERE c.is_active = TRUE
  GROUP BY c.id, c.name, c.description, c.join_code,
           c.is_active, c.created_at, c.updated_at, c.google_classroom_course_id
  ORDER BY c.name;
END;
$$;

ALTER FUNCTION "public"."get_teacher_classes_with_data"(boolean) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_teacher_classes_with_data"(boolean) IS 'Optimized function to fetch all classes with student counts, schedules, and Google Classroom course association. Mono-teacher: returns every class. Supports test mode filtering for student counts.';
GRANT ALL ON FUNCTION "public"."get_teacher_classes_with_data"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_classes_with_data"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_classes_with_data"(boolean) TO "service_role";

-- --- get_teacher_classes_with_students ---
DROP FUNCTION IF EXISTS "public"."get_teacher_classes_with_students"("uuid", boolean);
CREATE FUNCTION "public"."get_teacher_classes_with_students"("p_is_test_mode" boolean DEFAULT false)
    RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "join_code" "text", "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "students" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.join_code,
    c.is_active,
    c.created_at,
    c.updated_at,
    -- Aggregate students into JSONB array with all required fields
    -- Filter by is_test to match the requested mode
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', p.id,
          'firstname', p.firstname,
          'lastname', p.lastname,
          'full_name', p.full_name,
          'avatar_url', p.avatar_url,
          'gidouilles', p.gidouilles,
          'vip_cards', p.vip_cards,
          'role', p.role,
          'is_test', p.is_test
        )
        ORDER BY p.firstname NULLS LAST
      ) FILTER (WHERE p.id IS NOT NULL AND p.is_test = p_is_test_mode),
      '[]'::JSONB
    ) AS students
  FROM classes c
  LEFT JOIN class_members cm ON c.id = cm.class_id
  LEFT JOIN profiles p ON cm.student_id = p.id
  WHERE c.is_active = TRUE
  GROUP BY c.id, c.name, c.description, c.join_code,
           c.is_active, c.created_at, c.updated_at
  ORDER BY c.name;
END;
$$;

ALTER FUNCTION "public"."get_teacher_classes_with_students"(boolean) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_teacher_classes_with_students"(boolean) IS 'Optimized function to fetch all classes with full student data filtered by test mode. Mono-teacher: returns every class. When p_is_test_mode = TRUE, returns only test students; when FALSE, only real students. Ensures complete data isolation between test and production environments.';
GRANT ALL ON FUNCTION "public"."get_teacher_classes_with_students"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_classes_with_students"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_classes_with_students"(boolean) TO "service_role";

-- --- get_teacher_classes_for_messaging ---
DROP FUNCTION IF EXISTS "public"."get_teacher_classes_for_messaging"("uuid");
CREATE FUNCTION "public"."get_teacher_classes_for_messaging"()
    RETURNS TABLE("class_id" "uuid", "class_name" "text", "student_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS class_id,
    c.name AS class_name,
    COUNT(cm.student_id)::INT AS student_count
  FROM classes c
  LEFT JOIN class_members cm ON cm.class_id = c.id
  WHERE c.is_active = TRUE
  GROUP BY c.id, c.name
  ORDER BY c.name;
END;
$$;

ALTER FUNCTION "public"."get_teacher_classes_for_messaging"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_teacher_classes_for_messaging"() IS 'Returns all classes for group messaging with student counts (mono-teacher).';
GRANT ALL ON FUNCTION "public"."get_teacher_classes_for_messaging"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_classes_for_messaging"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_classes_for_messaging"() TO "service_role";

-- --- get_teacher_assignment_stats ---
-- This one filters exercise_assignments.assigned_by (NOT classes.teacher_id).
-- Replace the p_teacher_id param with auth.uid() (the calling teacher).
DROP FUNCTION IF EXISTS "public"."get_teacher_assignment_stats"("uuid");
CREATE FUNCTION "public"."get_teacher_assignment_stats"()
    RETURNS TABLE("total_assignments" bigint, "active_assignments" bigint, "student_assignments" bigint, "class_assignments" bigint, "public_assignments" bigint, "total_completions" bigint, "unique_students_engaged" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
    SELECT
        COUNT(*) as total_assignments,
        COUNT(*) FILTER (WHERE is_active = TRUE) as active_assignments,
        COUNT(*) FILTER (WHERE assigned_to_type = 'student') as student_assignments,
        COUNT(*) FILTER (WHERE assigned_to_type = 'class') as class_assignments,
        COUNT(*) FILTER (WHERE assigned_to_type = 'public') as public_assignments,
        (
            SELECT COUNT(*)
            FROM exercise_completions ec
            JOIN exercise_assignments ea ON ec.assignment_id = ea.id
            WHERE ea.assigned_by = auth.uid()
            AND ec.completed_at IS NOT NULL
        ) as total_completions,
        (
            SELECT COUNT(DISTINCT ec.student_id)
            FROM exercise_completions ec
            JOIN exercise_assignments ea ON ec.assignment_id = ea.id
            WHERE ea.assigned_by = auth.uid()
        ) as unique_students_engaged
    FROM exercise_assignments
    WHERE assigned_by = auth.uid();
$$;

ALTER FUNCTION "public"."get_teacher_assignment_stats"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_teacher_assignment_stats"() IS 'Returns comprehensive statistics for the calling teacher''s exercise assignments and student engagement (mono-teacher: scoped to auth.uid()).';
GRANT ALL ON FUNCTION "public"."get_teacher_assignment_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_assignment_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_assignment_stats"() TO "service_role";

-- ===== 4. Other functions referencing classes-cluster teacher_id =====

-- add_student_gidouilles: "student in teacher's classes" -> "student in any class"
CREATE OR REPLACE FUNCTION "public"."add_student_gidouilles"("p_student_id" "uuid", "p_amount" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;
  v_current_gidouilles INTEGER;
  v_new_gidouilles INTEGER;
BEGIN
  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can modify gidouilles';
  END IF;

  -- Mono-teacher: any class membership means the sole teacher teaches this student.
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    WHERE cm.student_id = p_student_id
  ) INTO v_student_in_class;

  IF NOT v_student_in_class THEN
    RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
  END IF;

  -- Get current gidouilles
  SELECT gidouilles INTO v_current_gidouilles
  FROM profiles
  WHERE id = p_student_id;

  -- Calculate new balance
  v_new_gidouilles := v_current_gidouilles + p_amount;

  -- Ensure balance doesn't go negative
  IF v_new_gidouilles < 0 THEN
    RAISE EXCEPTION 'Insufficient gidouilles: Cannot go below 0 (current: %, attempted change: %)', v_current_gidouilles, p_amount;
  END IF;

  -- Update gidouilles
  UPDATE profiles
  SET
    gidouilles = v_new_gidouilles,
    updated_at = NOW()
  WHERE id = p_student_id;

  RETURN v_new_gidouilles;
END;
$$;

-- approve_vip_card: only the ownership join changes; the activation-approval logic
-- and audit log are preserved verbatim.
CREATE OR REPLACE FUNCTION "public"."approve_vip_card"("p_student_id" "uuid", "p_instance_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_teacher_id UUID;
  v_vip_cards JSONB;
  v_card_data JSONB;
  v_card_id TEXT;
  v_template RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_now_str TEXT;
BEGIN
  v_teacher_id := auth.uid();

  IF NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only teachers can approve VIP cards'
    );
  END IF;

  -- Mono-teacher: any class membership means the sole teacher teaches this student.
  IF NOT EXISTS (
    SELECT 1
    FROM class_members cm
    WHERE cm.student_id = p_student_id
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Student is not in your active classes'
    );
  END IF;

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  v_card_data := v_vip_cards->p_instance_id;

  IF v_card_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found: ' || p_instance_id
    );
  END IF;

  IF v_card_data->>'usedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has already been used'
    );
  END IF;

  IF v_card_data->>'activationApprovedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has already been approved'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  SELECT id, name INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  IF v_template IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card template not found: ' || v_card_id
    );
  END IF;

  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  v_vip_cards := jsonb_set(
    v_vip_cards,
    ARRAY[p_instance_id],
    v_card_data || jsonb_build_object(
      'activationApprovedAt', v_now_str,
      'activationApprovedBy', v_teacher_id::TEXT
    )
  );

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id, p_instance_id, v_card_id, 'approved',
    jsonb_build_object('approved_by', v_teacher_id::TEXT, 'approved_at', v_now_str)
  );

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', v_template.name,
    'instanceId', p_instance_id,
    'cardId', v_card_id
  );
END;
$$;

-- award_achievement_manual: keep p_teacher_id param (it stamps unlocked_by/awarded_by),
-- but drop the classes.teacher_id ownership join -> any class membership.
CREATE OR REPLACE FUNCTION "public"."award_achievement_manual"("p_teacher_id" "uuid", "p_student_id" "uuid", "p_achievement_id" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_achievement RECORD;
  v_is_teacher BOOLEAN;
BEGIN
  -- Mono-teacher: any class membership means the sole teacher teaches this student.
  SELECT EXISTS (
    SELECT 1 FROM class_members cm
    WHERE cm.student_id = p_student_id
  ) INTO v_is_teacher;

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Teacher does not have access to this student';
  END IF;

  -- Get achievement
  SELECT * INTO v_achievement
  FROM achievements
  WHERE id = p_achievement_id
  AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not found';
  END IF;

  -- Check if achievement allows manual awarding
  IF v_achievement.unlock_type NOT IN ('manual', 'event_based') THEN
    RAISE EXCEPTION 'This achievement cannot be manually awarded';
  END IF;

  -- Award the achievement
  INSERT INTO student_achievements (
    student_id,
    achievement_id,
    unlocked_by,
    unlock_reason,
    points_awarded,
    gidouilles_awarded
  )
  VALUES (
    p_student_id,
    p_achievement_id,
    p_teacher_id,
    COALESCE(p_reason, 'Manually awarded by teacher'),
    COALESCE((v_achievement.metadata->>'points')::INTEGER, 0),
    COALESCE((v_achievement.metadata->>'gidouilles_reward')::INTEGER, 0)
  )
  ON CONFLICT DO NOTHING;

  RETURN FOUND;
END;
$$;

-- award_random_vip_card: "student in teacher's classes" -> "student in any class".
-- Only the ownership join changes; the gidouilles deduction / template pick /
-- activity log are preserved verbatim.
CREATE OR REPLACE FUNCTION "public"."award_random_vip_card"("p_student_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;
  v_current_gidouilles INTEGER;
  v_new_gidouilles INTEGER;
  v_card_id TEXT;
  v_instance_id UUID;
  v_new_card_instance JSONB;
  v_earned_at TIMESTAMPTZ;
  v_template RECORD;
BEGIN
  -- Get the current user's ID (the teacher calling this function)
  v_teacher_id := auth.uid();

  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can award VIP cards';
  END IF;

  -- Mono-teacher: any class membership means the sole teacher teaches this student.
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    WHERE cm.student_id = p_student_id
  ) INTO v_student_in_class;

  IF NOT v_student_in_class THEN
    RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
  END IF;

  -- Get current gidouilles count
  SELECT gidouilles INTO v_current_gidouilles
  FROM profiles
  WHERE id = p_student_id;

  -- Check if student has enough gidouilles (at least 3)
  IF v_current_gidouilles < 3 THEN
    RAISE EXCEPTION 'Insufficient gidouilles: Student needs at least 3 gidouilles (current: %)', v_current_gidouilles;
  END IF;

  -- Calculate new gidouilles value
  v_new_gidouilles := v_current_gidouilles - 3;

  -- Select random VIP card from enabled templates
  SELECT id, rarity, uses_total INTO v_template
  FROM vip_card_templates
  WHERE is_enabled = TRUE
  ORDER BY random()
  LIMIT 1;

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'No VIP cards available';
  END IF;

  v_card_id := v_template.id;

  -- Generate unique instance ID
  v_instance_id := gen_random_uuid();

  -- Capture earned timestamp
  v_earned_at := now();

  -- Create new card instance
  v_new_card_instance := jsonb_build_object(
    'cardId', v_card_id,
    'earnedAt', v_earned_at,
    'usedAt', null,
    'acquiredFrom', 'teacher_draw',
    'usesRemaining', v_template.uses_total
  );

  -- Update student profile: deduct gidouilles and add VIP card
  UPDATE profiles
  SET
    gidouilles = v_new_gidouilles,
    vip_cards = COALESCE(vip_cards, '{}'::jsonb) || jsonb_build_object(v_instance_id::TEXT, v_new_card_instance),
    updated_at = NOW()
  WHERE id = p_student_id;

  -- Log activity
  INSERT INTO vip_cards_activity (
    student_id,
    card_instance_id,
    card_template_id,
    action,
    metadata
  ) VALUES (
    p_student_id,
    v_instance_id::TEXT,
    v_card_id,
    'gained',
    jsonb_build_object(
      'acquired_from', 'teacher_draw',
      'awarded_by', v_teacher_id,
      'gidouilles_cost', 3,
      'old_balance', v_current_gidouilles,
      'new_balance', v_new_gidouilles,
      'rarity', v_template.rarity
    )
  );

  -- Return complete card information as JSONB
  RETURN jsonb_build_object(
    'cardId', v_card_id,
    'instanceId', v_instance_id,
    'earnedAt', v_earned_at
  );
END;
$$;

-- award_vip_cards_with_filters: only the ownership join changes; the entire
-- filter-parsing / weighted-draw loop is preserved verbatim.
CREATE OR REPLACE FUNCTION "public"."award_vip_cards_with_filters"("p_student_id" "uuid", "p_count" integer, "p_filters" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  -- Constants
  c_min_count CONSTANT INT := 1;
  c_max_count CONSTANT INT := 10;

  -- Authorization variables
  v_caller_id UUID;
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;

  -- Filter variables (parsed from p_filters JSONB)
  v_force_rarity TEXT;
  v_min_rarity TEXT;
  v_exclude_card_ids TEXT[];
  v_only_cards_with_actions BOOLEAN;

  -- Rarity probabilities (for normal draw and minRarity enforcement)
  v_common_prob INTEGER;
  v_rare_prob INTEGER;
  v_epic_prob INTEGER;
  v_legendary_prob INTEGER;
  v_common_max INTEGER;
  v_rare_max INTEGER;
  v_epic_max INTEGER;

  -- Student profile variables
  v_vip_cards JSONB;

  -- Card drawing variables
  v_drawn_cards JSONB := '[]'::jsonb;
  v_card_id TEXT;
  v_instance_id UUID;
  v_earned_at TIMESTAMPTZ;
  v_new_card_instance JSONB;
  v_loop_counter INT;

  -- Rarity selection (for minRarity and normal draws)
  v_roll INTEGER;
  v_selected_rarity TEXT;

  -- Card details for return value
  v_card_name TEXT;
  v_card_rarity TEXT;

  -- Available cards count (for validation)
  v_available_cards_count INT;

BEGIN
  -- ========================================
  -- 1. VALIDATE INPUT PARAMETERS
  -- ========================================

  -- Validate count range
  IF p_count < c_min_count OR p_count > c_max_count THEN
    RAISE EXCEPTION 'Invalid count: Must be between % and % (received: %)',
      c_min_count, c_max_count, p_count;
  END IF;

  -- Validate student exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_student_id) THEN
    RAISE EXCEPTION 'Student not found: %', p_student_id;
  END IF;

  -- ========================================
  -- 2. AUTHORIZATION
  -- ========================================

  v_caller_id := auth.uid();
  v_is_teacher := is_teacher_or_admin();

  -- Only teachers can call this function
  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers and admins can award VIP cards with filters';
  END IF;

  -- Mono-teacher: any class membership means the sole teacher teaches this student.
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    WHERE cm.student_id = p_student_id
  ) INTO v_student_in_class;

  IF NOT v_student_in_class THEN
    RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
  END IF;

  -- ========================================
  -- 3. PARSE FILTERS FROM JSONB
  -- ========================================

  -- Extract forceRarity filter (optional)
  v_force_rarity := p_filters->>'forceRarity';

  -- Validate forceRarity value if provided
  IF v_force_rarity IS NOT NULL AND v_force_rarity NOT IN ('common', 'rare', 'epic', 'legendary') THEN
    RAISE EXCEPTION 'Invalid forceRarity filter: Must be common, rare, epic, or legendary (received: %)', v_force_rarity;
  END IF;

  -- Extract minRarity filter (optional)
  v_min_rarity := p_filters->>'minRarity';

  -- Validate minRarity value if provided
  IF v_min_rarity IS NOT NULL AND v_min_rarity NOT IN ('common', 'rare', 'epic', 'legendary') THEN
    RAISE EXCEPTION 'Invalid minRarity filter: Must be common, rare, epic, or legendary (received: %)', v_min_rarity;
  END IF;

  -- Extract excludeCardIds filter (optional array)
  IF p_filters ? 'excludeCardIds' THEN
    SELECT ARRAY(
      SELECT jsonb_array_elements_text(p_filters->'excludeCardIds')
    ) INTO v_exclude_card_ids;
  ELSE
    v_exclude_card_ids := ARRAY[]::TEXT[];
  END IF;

  -- Extract onlyCardsWithActions filter (optional boolean)
  v_only_cards_with_actions := COALESCE((p_filters->>'onlyCardsWithActions')::boolean, FALSE);

  RAISE NOTICE 'Filters parsed: forceRarity=%, minRarity=%, excludeCardIds=%, onlyCardsWithActions=%',
    v_force_rarity, v_min_rarity, v_exclude_card_ids, v_only_cards_with_actions;

  -- ========================================
  -- 4. VALIDATE FILTERS COMPATIBILITY
  -- ========================================

  -- forceRarity and minRarity are mutually exclusive
  IF v_force_rarity IS NOT NULL AND v_min_rarity IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid filters: forceRarity and minRarity cannot be used together';
  END IF;

  -- Check if any cards match the filters
  SELECT COUNT(*) INTO v_available_cards_count
  FROM vip_card_templates
  WHERE is_enabled = TRUE
    AND (v_force_rarity IS NULL OR rarity = v_force_rarity)
    AND (v_exclude_card_ids IS NULL OR NOT (id = ANY(v_exclude_card_ids)))
    AND (NOT v_only_cards_with_actions OR action IS NOT NULL);

  IF v_available_cards_count = 0 THEN
    RAISE EXCEPTION 'No cards available matching filters: forceRarity=%, excludeCardIds=%, onlyCardsWithActions=%',
      v_force_rarity, v_exclude_card_ids, v_only_cards_with_actions;
  END IF;

  RAISE NOTICE 'Available cards matching filters: %', v_available_cards_count;

  -- ========================================
  -- 5. LOCK STUDENT PROFILE (PREVENT RACE CONDITIONS)
  -- ========================================

  -- Use SELECT FOR UPDATE to prevent concurrent modifications
  SELECT vip_cards
  INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  -- Initialize vip_cards if null
  v_vip_cards := COALESCE(v_vip_cards, '{}'::jsonb);

  -- ========================================
  -- 6. LOAD RARITY PROBABILITIES (FOR NON-FORCED DRAWS)
  -- ========================================

  -- Only load probabilities if not using forceRarity
  IF v_force_rarity IS NULL THEN
    -- Read active config from vip_card_config table
    SELECT
      common_probability,
      rare_probability,
      epic_probability,
      legendary_probability
    INTO
      v_common_prob, v_rare_prob, v_epic_prob, v_legendary_prob
    FROM vip_card_config
    WHERE is_active = TRUE
    LIMIT 1;

    -- Fallback to default probabilities if no active config found
    IF v_common_prob IS NULL THEN
      v_common_prob := 60;
      v_rare_prob := 25;
      v_epic_prob := 12;
      v_legendary_prob := 3;
      RAISE NOTICE 'No active config found, using default probabilities';
    END IF;

    -- Calculate cumulative probability ranges
    v_common_max := v_common_prob;                          -- 1-60
    v_rare_max := v_common_max + v_rare_prob;               -- 61-85
    v_epic_max := v_rare_max + v_epic_prob;                 -- 86-97
    -- legendary is anything above v_epic_max (98-100)

    RAISE NOTICE 'Using rarity probabilities: common=%, rare=%, epic=%, legendary=%',
      v_common_prob, v_rare_prob, v_epic_prob, v_legendary_prob;
  END IF;

  -- ========================================
  -- 7. DRAW CARDS WITH FILTERS
  -- ========================================

  FOR v_loop_counter IN 1..p_count LOOP

    -- ------------------------------------
    -- STEP 1: Determine Rarity for This Card
    -- ------------------------------------

    IF v_force_rarity IS NOT NULL THEN
      -- FILTER MODE: forceRarity
      -- All cards must be of the forced rarity
      v_selected_rarity := v_force_rarity;

      RAISE NOTICE 'Draw %: forced rarity=%', v_loop_counter, v_selected_rarity;

    ELSIF v_min_rarity IS NOT NULL AND v_loop_counter = 1 THEN
      -- FILTER MODE: minRarity (FIRST CARD ONLY)
      -- First card must be at least minRarity or higher
      -- Use weighted selection from eligible rarities only

      -- Map minRarity to eligible rarities (current and higher)
      -- Rarity hierarchy: common < rare < epic < legendary
      v_roll := floor(random() * 100 + 1)::int;

      IF v_min_rarity = 'common' THEN
        -- All rarities eligible (normal draw)
        IF v_roll <= v_common_max THEN
          v_selected_rarity := 'common';
        ELSIF v_roll <= v_rare_max THEN
          v_selected_rarity := 'rare';
        ELSIF v_roll <= v_epic_max THEN
          v_selected_rarity := 'epic';
        ELSE
          v_selected_rarity := 'legendary';
        END IF;

      ELSIF v_min_rarity = 'rare' THEN
        -- Only rare, epic, legendary eligible
        -- Recalculate probabilities: rare/(rare+epic+legendary), etc.
        DECLARE
          v_eligible_total INT;
          v_rare_cutoff INT;
          v_epic_cutoff INT;
        BEGIN
          v_eligible_total := v_rare_prob + v_epic_prob + v_legendary_prob;
          v_rare_cutoff := (v_rare_prob * 100 / v_eligible_total);
          v_epic_cutoff := v_rare_cutoff + (v_epic_prob * 100 / v_eligible_total);

          IF v_roll <= v_rare_cutoff THEN
            v_selected_rarity := 'rare';
          ELSIF v_roll <= v_epic_cutoff THEN
            v_selected_rarity := 'epic';
          ELSE
            v_selected_rarity := 'legendary';
          END IF;
        END;

      ELSIF v_min_rarity = 'epic' THEN
        -- Only epic, legendary eligible
        DECLARE
          v_eligible_total INT;
          v_epic_cutoff INT;
        BEGIN
          v_eligible_total := v_epic_prob + v_legendary_prob;
          v_epic_cutoff := (v_epic_prob * 100 / v_eligible_total);

          IF v_roll <= v_epic_cutoff THEN
            v_selected_rarity := 'epic';
          ELSE
            v_selected_rarity := 'legendary';
          END IF;
        END;

      ELSIF v_min_rarity = 'legendary' THEN
        -- Only legendary eligible
        v_selected_rarity := 'legendary';

      END IF;

      RAISE NOTICE 'Draw % (minRarity=%): rolled %, selected rarity=%',
        v_loop_counter, v_min_rarity, v_roll, v_selected_rarity;

    ELSE
      -- NORMAL MODE: Weighted rarity selection (no filters or subsequent minRarity cards)
      v_roll := floor(random() * 100 + 1)::int;

      IF v_roll <= v_common_max THEN
        v_selected_rarity := 'common';
      ELSIF v_roll <= v_rare_max THEN
        v_selected_rarity := 'rare';
      ELSIF v_roll <= v_epic_max THEN
        v_selected_rarity := 'epic';
      ELSE
        v_selected_rarity := 'legendary';
      END IF;

      RAISE NOTICE 'Draw %: rolled %, selected rarity=%', v_loop_counter, v_roll, v_selected_rarity;

    END IF;

    -- ------------------------------------
    -- STEP 2: Select Random Card from Filtered Pool
    -- ------------------------------------

    SELECT id, name, rarity INTO v_card_id, v_card_name, v_card_rarity
    FROM vip_card_templates
    WHERE is_enabled = TRUE
      AND rarity = v_selected_rarity
      AND (v_exclude_card_ids IS NULL OR NOT (id = ANY(v_exclude_card_ids)))
      AND (NOT v_only_cards_with_actions OR action IS NOT NULL)
    ORDER BY random()
    LIMIT 1;

    -- ------------------------------------
    -- STEP 3: Fallback if No Cards Match Filters
    -- ------------------------------------

    IF v_card_id IS NULL THEN
      RAISE NOTICE 'No enabled cards for rarity=% with filters, falling back to common', v_selected_rarity;

      -- Fallback to common rarity with same filters
      SELECT id, name, rarity INTO v_card_id, v_card_name, v_card_rarity
      FROM vip_card_templates
      WHERE rarity = 'common'
        AND is_enabled = TRUE
        AND (v_exclude_card_ids IS NULL OR NOT (id = ANY(v_exclude_card_ids)))
        AND (NOT v_only_cards_with_actions OR action IS NOT NULL)
      ORDER BY random()
      LIMIT 1;

      -- If still no cards, abort
      IF v_card_id IS NULL THEN
        RAISE EXCEPTION 'No enabled VIP cards available matching filters (checked % and common)', v_selected_rarity;
      END IF;
    END IF;

    RAISE NOTICE 'Drew card: % (name=%, rarity=%)', v_card_id, v_card_name, v_card_rarity;

    -- ------------------------------------
    -- STEP 4: Create Card Instance
    -- ------------------------------------

    -- Generate unique instance ID
    v_instance_id := gen_random_uuid();

    -- Capture earned timestamp
    v_earned_at := NOW();

    -- Create new card instance
    v_new_card_instance := jsonb_build_object(
      'cardId', v_card_id,
      'earnedAt', v_earned_at,
      'usedAt', null
    );

    -- Add to student's vip_cards JSONB
    v_vip_cards := v_vip_cards || jsonb_build_object(
      v_instance_id::text,
      v_new_card_instance
    );

    -- Add to results array with full card details
    v_drawn_cards := v_drawn_cards || jsonb_build_object(
      'cardId', v_card_id,
      'instanceId', v_instance_id,
      'name', v_card_name,
      'rarity', v_card_rarity,
      'earnedAt', v_earned_at
    );

  END LOOP;

  -- ========================================
  -- 8. UPDATE STUDENT PROFILE
  -- ========================================

  UPDATE profiles
  SET
    vip_cards = v_vip_cards,
    updated_at = NOW()
  WHERE id = p_student_id;

  -- ========================================
  -- 9. RETURN RESULTS
  -- ========================================

  RETURN jsonb_build_object(
    'cards', v_drawn_cards
  );

END;
$$;

-- can_view_student_profile: "teacher's class has student" -> teacher/admin AND
-- student is in some class.
CREATE OR REPLACE FUNCTION "public"."can_view_student_profile"("student_profile_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Mono-teacher: the sole teacher/admin may view any student that is enrolled
  -- in at least one class.
  RETURN public.is_teacher_or_admin() AND EXISTS (
    SELECT 1
    FROM public.class_members cm
    WHERE cm.student_id = student_profile_id
  );
END;
$$;

-- create_class_chat_room: trigger on classes INSERT. NEW.teacher_id is gone;
-- attribute the chat room to the sole teacher.
CREATE OR REPLACE FUNCTION "public"."create_class_chat_room"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_conversation_id UUID;
  v_teacher_id UUID;
BEGIN
  -- Mono-teacher: resolve the sole teacher (the class creator/owner).
  SELECT id INTO v_teacher_id
  FROM profiles
  WHERE role = 'teacher'
  LIMIT 1;

  -- Create a conversation for the new class
  INSERT INTO conversations (
    name,
    is_group,
    class_id,
    created_by,
    created_at
  ) VALUES (
    NEW.name || ' - Chat de classe', -- e.g., "6ème A - Chat de classe"
    true, -- is_group
    NEW.id, -- class_id
    v_teacher_id, -- created_by (sole teacher)
    NOW()
  )
  RETURNING id INTO new_conversation_id;

  -- Add the teacher as a participant
  IF v_teacher_id IS NOT NULL THEN
    INSERT INTO conversation_participants (
      conversation_id,
      user_id,
      joined_at
    ) VALUES (
      new_conversation_id,
      v_teacher_id,
      NOW()
    );
  END IF;

  -- Add all existing class members as participants
  INSERT INTO conversation_participants (
    conversation_id,
    user_id,
    joined_at
  )
  SELECT
    new_conversation_id,
    cm.student_id,
    NOW()
  FROM class_members cm
  WHERE cm.class_id = NEW.id;

  RETURN NEW;
END;
$$;

-- create_tournament: drop the per-class `classes.teacher_id = v_user_id`
-- ownership check; the sole teacher owns every class, so only verify existence.
CREATE OR REPLACE FUNCTION "public"."create_tournament"("p_name" "text", "p_difficulty" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_class_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_description" "text" DEFAULT NULL::"text", "p_top_x_games" integer DEFAULT 3, "p_podium_rewards" "jsonb" DEFAULT '{"1": 10, "2": 5, "3": 3}'::"jsonb", "p_podium_places" integer DEFAULT 3) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_scope TEXT;
  v_class_id UUID;
  v_tournament_id UUID;
BEGIN
  -- Step 1: Get authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to create a tournament';
  END IF;

  -- Step 2: Get user role
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Only teachers and admins can create tournaments';
  END IF;

  -- Step 3: Validate inputs
  IF p_name IS NULL OR length(trim(p_name)) < 3 THEN
    RAISE EXCEPTION 'Tournament name must be at least 3 characters';
  END IF;

  IF p_difficulty NOT IN ('beginner', 'intermediate', 'expert') THEN
    RAISE EXCEPTION 'Invalid difficulty: must be beginner, intermediate, or expert';
  END IF;

  IF p_end_date <= p_start_date THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  IF p_top_x_games < 1 OR p_top_x_games > 20 THEN
    RAISE EXCEPTION 'top_x_games must be between 1 and 20';
  END IF;

  IF p_podium_places < 1 OR p_podium_places > 10 THEN
    RAISE EXCEPTION 'podium_places must be between 1 and 10';
  END IF;

  -- Step 4: Determine scope and validate classes
  IF p_class_ids IS NULL OR array_length(p_class_ids, 1) IS NULL THEN
    -- Global tournament (admin only)
    IF v_user_role != 'admin' THEN
      RAISE EXCEPTION 'Only admins can create global tournaments (no classes specified)';
    END IF;
    v_scope := 'global';
  ELSE
    -- Class-scoped tournament
    v_scope := 'classes';

    -- Mono-teacher: the sole teacher owns every class, so only verify existence.
    FOREACH v_class_id IN ARRAY p_class_ids
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.classes WHERE id = v_class_id
      ) THEN
        RAISE EXCEPTION 'Class not found: %', v_class_id;
      END IF;
    END LOOP;
  END IF;

  -- Step 5: Validate podium_rewards has entries for all places
  FOR i IN 1..p_podium_places
  LOOP
    IF NOT (p_podium_rewards ? i::TEXT) THEN
      RAISE EXCEPTION 'podium_rewards must have entry for place %', i;
    END IF;
    IF NOT ((p_podium_rewards->>i::TEXT)::INTEGER >= 0) THEN
      RAISE EXCEPTION 'podium_rewards for place % must be non-negative integer', i;
    END IF;
  END LOOP;

  -- Step 6: Create tournament
  INSERT INTO public.minesweeper_tournaments (
    creator_id,
    creator_role,
    scope,
    name,
    description,
    difficulty,
    start_date,
    end_date,
    top_x_games,
    podium_rewards,
    podium_places
  ) VALUES (
    v_user_id,
    v_user_role,
    v_scope,
    trim(p_name),
    p_description,
    p_difficulty,
    p_start_date,
    p_end_date,
    p_top_x_games,
    p_podium_rewards,
    p_podium_places
  )
  RETURNING id INTO v_tournament_id;

  -- Step 7: Create class associations (if class-scoped)
  IF v_scope = 'classes' THEN
    INSERT INTO public.minesweeper_tournament_classes (tournament_id, class_id)
    SELECT v_tournament_id, unnest(p_class_ids);
  END IF;

  RETURN v_tournament_id;
END;
$$;

-- draw_multiple_vip_cards: only two things change; everything else is verbatim:
-- (1) the ownership join `class_members cm JOIN classes c ... AND c.teacher_id`
--     becomes a bare class_members membership check (mono-teacher);
-- (2) the two `tvo.teacher_id IN (SELECT DISTINCT c.teacher_id ...)` blocked-card
--     subqueries become `tvo.teacher_id IN (SELECT id FROM profiles WHERE role='teacher')`
--     (a card disabled by the sole teacher stays blocked).
CREATE OR REPLACE FUNCTION "public"."draw_multiple_vip_cards"("p_student_id" "uuid", "p_count" integer, "p_payment_method" "text", "p_gidouilles_cost" integer DEFAULT NULL::integer, "p_vip_card_instance_id" "uuid" DEFAULT NULL::"uuid", "p_force_rarity" "text" DEFAULT NULL::"text", "p_min_rarity" "text" DEFAULT NULL::"text", "p_exclude_card_ids" "text"[] DEFAULT NULL::"text"[], "p_only_cards_with_actions" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  -- Constants
  c_max_cost_per_card CONSTANT INT := 10;
  c_min_count CONSTANT INT := 1;
  c_max_count CONSTANT INT := 10;

  -- Authorization variables
  v_caller_id UUID;
  v_is_teacher BOOLEAN;
  v_is_authorized BOOLEAN;
  v_student_in_class BOOLEAN;

  -- Student profile variables
  v_current_gidouilles INT;
  v_vip_cards JSONB;
  v_card_instance JSONB;
  v_card_used_at TEXT;
  v_payment_card_id TEXT;
  v_payment_card_name TEXT;

  -- Card drawing variables (weighted by rarity)
  v_common_prob INTEGER;
  v_rare_prob INTEGER;
  v_epic_prob INTEGER;
  v_legendary_prob INTEGER;
  v_common_max INTEGER;
  v_rare_max INTEGER;
  v_epic_max INTEGER;
  v_roll INTEGER;
  v_selected_rarity TEXT;
  v_drawn_cards JSONB := '[]'::jsonb;
  v_card_id TEXT;
  v_available_card_ids TEXT[];
  v_instance_id UUID;
  v_earned_at TIMESTAMPTZ;
  v_new_card_instance JSONB;
  v_loop_counter INT;

  -- Filter variables
  v_min_rarity_level INT;
  v_rolled_rarity_level INT;

  -- Timestamp for audit
  v_now_str TEXT;

  -- Acquisition source for JSONB instance + audit
  v_acquired_from TEXT;

  -- Class ID for audit trail
  v_class_id UUID;

BEGIN
  -- ========================================
  -- 1. VALIDATE INPUT PARAMETERS
  -- ========================================

  IF p_count < c_min_count OR p_count > c_max_count THEN
    RAISE EXCEPTION 'Invalid count: Must be between % and % (received: %)',
      c_min_count, c_max_count, p_count;
  END IF;

  IF p_payment_method NOT IN ('gidouilles', 'vip_card') THEN
    RAISE EXCEPTION 'Invalid payment_method: Must be ''gidouilles'' or ''vip_card'' (received: ''%'')',
      p_payment_method;
  END IF;

  IF p_force_rarity IS NOT NULL AND p_force_rarity NOT IN ('common', 'rare', 'epic', 'legendary') THEN
    RAISE EXCEPTION 'Invalid force_rarity: Must be ''common'', ''rare'', ''epic'', or ''legendary'' (received: ''%'')',
      p_force_rarity;
  END IF;

  IF p_min_rarity IS NOT NULL AND p_min_rarity NOT IN ('common', 'rare', 'epic', 'legendary') THEN
    RAISE EXCEPTION 'Invalid min_rarity: Must be ''common'', ''rare'', ''epic'', or ''legendary'' (received: ''%'')',
      p_min_rarity;
  END IF;

  IF p_force_rarity IS NOT NULL AND p_min_rarity IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid filters: force_rarity and min_rarity are mutually exclusive';
  END IF;

  -- Compute acquiredFrom once based on payment method
  v_acquired_from := CASE p_payment_method
    WHEN 'gidouilles' THEN 'draw_gidouilles'
    WHEN 'vip_card' THEN 'draw_vip_card'
  END;

  -- ========================================
  -- 2. AUTHORIZATION
  -- ========================================

  v_caller_id := auth.uid();
  v_is_teacher := is_teacher_or_admin();

  IF v_is_teacher THEN
    -- Mono-teacher: any class membership means the sole teacher teaches this student.
    SELECT EXISTS (
      SELECT 1
      FROM class_members cm
      WHERE cm.student_id = p_student_id
    ) INTO v_student_in_class;

    IF NOT v_student_in_class THEN
      RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
    END IF;

    v_is_authorized := TRUE;
  ELSIF v_caller_id = p_student_id THEN
    v_is_authorized := TRUE;
  ELSE
    RAISE EXCEPTION 'Unauthorized: You can only draw cards for yourself or your students';
  END IF;

  -- ========================================
  -- 3. LOCK STUDENT PROFILE
  -- ========================================

  SELECT gidouilles, vip_cards
  INTO v_current_gidouilles, v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  -- Get student's active class for audit trail
  SELECT cm.class_id INTO v_class_id
  FROM class_members cm
  WHERE cm.student_id = p_student_id
    AND cm.status = 'active'
  LIMIT 1;

  -- ========================================
  -- 4. LOAD RARITY PROBABILITIES FROM CONFIG
  -- ========================================

  SELECT
    common_probability,
    rare_probability,
    epic_probability,
    legendary_probability
  INTO
    v_common_prob, v_rare_prob, v_epic_prob, v_legendary_prob
  FROM vip_card_config
  WHERE is_active = TRUE
  LIMIT 1;

  IF v_common_prob IS NULL THEN
    v_common_prob := 60;
    v_rare_prob := 25;
    v_epic_prob := 12;
    v_legendary_prob := 3;
  END IF;

  v_common_max := v_common_prob;
  v_rare_max := v_common_max + v_rare_prob;
  v_epic_max := v_rare_max + v_epic_prob;

  IF p_min_rarity IS NOT NULL THEN
    v_min_rarity_level := CASE p_min_rarity
      WHEN 'common' THEN 1
      WHEN 'rare' THEN 2
      WHEN 'epic' THEN 3
      WHEN 'legendary' THEN 4
    END;
  END IF;

  -- ========================================
  -- 5. PROCESS PAYMENT
  -- ========================================

  IF p_payment_method = 'gidouilles' THEN
    IF p_gidouilles_cost IS NULL THEN
      RAISE EXCEPTION 'Missing parameter: gidouilles_cost is required for gidouilles payment';
    END IF;

    IF p_gidouilles_cost < 0 THEN
      RAISE EXCEPTION 'Invalid gidouilles_cost: Cannot be negative (received: %)', p_gidouilles_cost;
    END IF;

    IF p_gidouilles_cost > (p_count * c_max_cost_per_card) THEN
      RAISE EXCEPTION 'Invalid gidouilles_cost: Maximum % gidouilles for % cards (received: %)',
        (p_count * c_max_cost_per_card), p_count, p_gidouilles_cost;
    END IF;

    IF p_gidouilles_cost = 0 AND NOT v_is_teacher THEN
      RAISE EXCEPTION 'Unauthorized: Students cannot draw free cards (cost must be > 0)';
    END IF;

    IF v_current_gidouilles < p_gidouilles_cost THEN
      RAISE EXCEPTION 'Insufficient gidouilles: Required %, available % (shortfall: %)',
        p_gidouilles_cost, v_current_gidouilles, (p_gidouilles_cost - v_current_gidouilles);
    END IF;

    v_current_gidouilles := v_current_gidouilles - p_gidouilles_cost;

    -- Log gidouilles spent for audit trail
    IF p_gidouilles_cost > 0 THEN
      INSERT INTO gidouilles_activity (
        student_id,
        class_id,
        delta,
        reason,
        created_by
      ) VALUES (
        p_student_id,
        v_class_id,
        -p_gidouilles_cost,
        'Tirage de ' || p_count || ' carte' || CASE WHEN p_count > 1 THEN 's' ELSE '' END || ' VIP',
        NULL
      );
    END IF;

  ELSIF p_payment_method = 'vip_card' THEN
    IF p_vip_card_instance_id IS NULL THEN
      RAISE EXCEPTION 'Missing parameter: vip_card_instance_id is required for vip_card payment';
    END IF;

    v_vip_cards := COALESCE(v_vip_cards, '{}'::jsonb);
    v_card_instance := v_vip_cards->p_vip_card_instance_id::text;

    IF v_card_instance IS NULL THEN
      RAISE EXCEPTION 'VIP card not found: Instance ID % does not exist in student''s cards',
        p_vip_card_instance_id;
    END IF;

    v_card_used_at := v_card_instance->>'usedAt';

    IF v_card_used_at IS NOT NULL THEN
      RAISE EXCEPTION 'VIP card already used: This card was used at %', v_card_used_at;
    END IF;

    -- Extract template ID and look up card name for audit trail
    v_payment_card_id := v_card_instance->>'cardId';

    SELECT name INTO v_payment_card_name
    FROM vip_card_templates
    WHERE id = v_payment_card_id;

    v_payment_card_name := COALESCE(v_payment_card_name, v_payment_card_id);

    -- Mark card as used
    v_now_str := to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    v_vip_cards := jsonb_set(
      v_vip_cards,
      ARRAY[p_vip_card_instance_id::text, 'usedAt'],
      to_jsonb(v_now_str)
    );

    -- AUDIT: Log VIP card payment atomically within this transaction
    INSERT INTO public.vip_cards_activity (
      student_id, card_instance_id, card_template_id, action, metadata
    ) VALUES (
      p_student_id,
      p_vip_card_instance_id::text,
      COALESCE(v_payment_card_id, 'unknown'),
      'used',
      jsonb_build_object(
        'used_at', v_now_str,
        'action_type', 'draw_cards',
        'cards_drawn', p_count,
        'filters', jsonb_build_object(
          'force_rarity', p_force_rarity,
          'min_rarity', p_min_rarity,
          'exclude_card_ids', to_jsonb(COALESCE(p_exclude_card_ids, ARRAY[]::TEXT[])),
          'only_cards_with_actions', p_only_cards_with_actions
        )
      )
    );

  END IF;

  -- ========================================
  -- 6. DRAW RANDOM VIP CARDS
  -- ========================================

  FOR v_loop_counter IN 1..p_count LOOP

    IF p_force_rarity IS NOT NULL THEN
      v_selected_rarity := p_force_rarity;
    ELSE
      v_roll := floor(random() * 100 + 1)::int;

      IF v_roll <= v_common_max THEN
        v_selected_rarity := 'common';
        v_rolled_rarity_level := 1;
      ELSIF v_roll <= v_rare_max THEN
        v_selected_rarity := 'rare';
        v_rolled_rarity_level := 2;
      ELSIF v_roll <= v_epic_max THEN
        v_selected_rarity := 'epic';
        v_rolled_rarity_level := 3;
      ELSE
        v_selected_rarity := 'legendary';
        v_rolled_rarity_level := 4;
      END IF;

      IF p_min_rarity IS NOT NULL AND v_rolled_rarity_level < v_min_rarity_level THEN
        v_selected_rarity := p_min_rarity;
      END IF;
    END IF;

    SELECT ARRAY_AGG(vct.id)
    INTO v_available_card_ids
    FROM vip_card_templates vct
    WHERE vct.rarity = v_selected_rarity
      AND vct.is_enabled = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM teacher_vip_card_overrides tvo
        WHERE tvo.card_id = vct.id
          AND tvo.is_enabled = FALSE
          AND tvo.teacher_id IN (
            SELECT id FROM profiles WHERE role = 'teacher'
          )
      )
      AND (p_exclude_card_ids IS NULL OR vct.id != ALL(p_exclude_card_ids))
      AND (NOT p_only_cards_with_actions OR vct.action IS NOT NULL);

    IF v_available_card_ids IS NULL OR array_length(v_available_card_ids, 1) IS NULL THEN
      IF p_force_rarity IS NOT NULL THEN
        RAISE EXCEPTION 'No enabled VIP cards available for forced rarity ''%'' (all cards may be disabled by teacher overrides, excluded, or filtered out)',
          p_force_rarity;
      END IF;

      SELECT ARRAY_AGG(vct.id)
      INTO v_available_card_ids
      FROM vip_card_templates vct
      WHERE vct.rarity = 'common'
        AND vct.is_enabled = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM teacher_vip_card_overrides tvo
          WHERE tvo.card_id = vct.id
            AND tvo.is_enabled = FALSE
            AND tvo.teacher_id IN (
              SELECT id FROM profiles WHERE role = 'teacher'
            )
        )
        AND (p_exclude_card_ids IS NULL OR vct.id != ALL(p_exclude_card_ids))
        AND (NOT p_only_cards_with_actions OR vct.action IS NOT NULL);

      IF v_available_card_ids IS NULL OR array_length(v_available_card_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'No enabled VIP cards available to draw (all cards disabled by teacher overrides, excluded, or filtered out)';
      END IF;
    END IF;

    v_card_id := v_available_card_ids[floor(random() * array_length(v_available_card_ids, 1) + 1)::int];

    v_instance_id := gen_random_uuid();
    v_earned_at := NOW();

    v_new_card_instance := jsonb_build_object(
      'cardId', v_card_id,
      'earnedAt', v_earned_at,
      'usedAt', null,
      'acquiredFrom', v_acquired_from
    );

    v_vip_cards := COALESCE(v_vip_cards, '{}'::jsonb) || jsonb_build_object(
      v_instance_id::text,
      v_new_card_instance
    );

    v_drawn_cards := v_drawn_cards || jsonb_build_object(
      'cardId', v_card_id,
      'instanceId', v_instance_id,
      'earnedAt', v_earned_at
    );

    -- Log 'gained' audit entry for each drawn card
    INSERT INTO public.vip_cards_activity (
      student_id, card_instance_id, card_template_id, action, metadata
    ) VALUES (
      p_student_id,
      v_instance_id::text,
      v_card_id,
      'gained',
      jsonb_build_object(
        'acquired_from', v_acquired_from,
        'rarity', v_selected_rarity,
        'payment_method', p_payment_method,
        'payment_card_name', v_payment_card_name
      )
    );

  END LOOP;

  -- ========================================
  -- 7. UPDATE STUDENT PROFILE
  -- ========================================

  UPDATE profiles
  SET
    gidouilles = v_current_gidouilles,
    vip_cards = v_vip_cards,
    updated_at = NOW()
  WHERE id = p_student_id;

  -- ========================================
  -- 8. RETURN RESULTS
  -- ========================================

  RETURN jsonb_build_object(
    'cards', v_drawn_cards
  );

END;
$$;

-- get_allowed_recipients: intentionally NOT redefined. Its live version (migration
-- 20260618093000, Option B) is already role-based, references neither classes
-- nor teacher_id nor the dead RPCs, and lets a hors-classe student message the
-- sole teacher. Redefining it from the baseline body would REGRESS Option B.

-- get_available_cards_for_student: replace the blocked-card subquery with the
-- sole teacher.
CREATE OR REPLACE FUNCTION "public"."get_available_cards_for_student"("p_student_id" "uuid") RETURNS TABLE("card_id" "text", "card_name" "text", "rarity" "text", "is_globally_enabled" boolean, "blocked_by_teachers" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    vct.id as card_id,
    vct.name as card_name,
    vct.rarity,
    vct.is_enabled as is_globally_enabled,
    ARRAY_AGG(DISTINCT p.full_name) FILTER (WHERE tvo.is_enabled = FALSE) as blocked_by_teachers
  FROM vip_card_templates vct
  LEFT JOIN teacher_vip_card_overrides tvo ON tvo.card_id = vct.id
    AND tvo.teacher_id IN (
      SELECT id FROM profiles WHERE role = 'teacher'
    )
  LEFT JOIN profiles p ON p.id = tvo.teacher_id
  GROUP BY vct.id, vct.name, vct.rarity, vct.is_enabled
  ORDER BY
    CASE vct.rarity
      WHEN 'common' THEN 1
      WHEN 'rare' THEN 2
      WHEN 'epic' THEN 3
      WHEN 'legendary' THEN 4
    END,
    vct.name;
END;
$$;

-- get_consent_info: the teacher-name lookup joined classes by teacher_id; with
-- it gone, resolve the teacher name from class_members -> classes -> sole teacher.
CREATE OR REPLACE FUNCTION "public"."get_consent_info"("p_token" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_consent_id UUID;
    v_student_id UUID;
    v_status consent_status;
    v_expires_at TIMESTAMPTZ;
    v_parent_email TEXT;
    v_student RECORD;
    v_teacher_name TEXT;
    v_school_name TEXT;
BEGIN
    -- Find the consent record by token
    SELECT id, student_id, status, expires_at, parent_email
    INTO v_consent_id, v_student_id, v_status, v_expires_at, v_parent_email
    FROM parental_consents
    WHERE consent_token = p_token;

    -- Token not found
    IF v_consent_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'TOKEN_NOT_FOUND',
            'message', 'Lien de consentement invalide.'
        );
    END IF;

    -- Already granted
    IF v_status = 'granted' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ALREADY_GRANTED',
            'message', 'Ce consentement a déjà été accordé.'
        );
    END IF;

    -- Token expired
    IF v_expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'TOKEN_EXPIRED',
            'message', 'Ce lien a expiré. Contactez l''enseignant pour recevoir un nouveau lien.'
        );
    END IF;

    -- Get student info (limited fields for privacy)
    SELECT firstname, lastname, grade
    INTO v_student
    FROM profiles
    WHERE id = v_student_id;

    -- Mono-teacher: the consenting student's teacher is the sole teacher.
    SELECT p.firstname || ' ' || p.lastname
    INTO v_teacher_name
    FROM profiles p
    WHERE p.role = 'teacher'
    LIMIT 1;

    -- Try to get school name
    SELECT s.name
    INTO v_school_name
    FROM class_members cm
    JOIN classes c ON cm.class_id = c.id
    JOIN schools s ON c.school_id = s.id
    WHERE cm.student_id = v_student_id
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'student', jsonb_build_object(
            'firstname', v_student.firstname,
            'lastname', v_student.lastname,
            'grade', v_student.grade
        ),
        'teacher_name', v_teacher_name,
        'school_name', v_school_name,
        'parent_email', v_parent_email,
        'expires_at', v_expires_at
    );
END;
$$;

-- get_teacher_override_impact: keep the p_teacher_id param (it refers to a tvo
-- override). The classes.teacher_id filter is gone -> count ALL classes/students.
CREATE OR REPLACE FUNCTION "public"."get_teacher_override_impact"("p_teacher_id" "uuid", "p_card_id" "text") RETURNS TABLE("student_count" bigint, "class_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT cm.student_id) as student_count,
    COUNT(DISTINCT c.id) as class_count
  FROM classes c
  INNER JOIN class_members cm ON cm.class_id = c.id;
END;
$$;

-- grant_specific_vip_card: only the ownership join changes (the p_count loop and
-- activity log are preserved verbatim).
CREATE OR REPLACE FUNCTION "public"."grant_specific_vip_card"("p_student_id" "uuid", "p_card_id" "text", "p_count" integer DEFAULT 1) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_vip_cards JSONB;
  v_new_instance JSONB;
  v_new_instance_id UUID;
  v_earned_at TIMESTAMPTZ;
  v_result JSONB;
  v_cards JSONB[];
  v_template RECORD;
  i INT;
BEGIN
  -- Get the calling user ID
  v_teacher_id := auth.uid();

  -- Check if the user is a teacher or admin
  SELECT is_teacher_or_admin()
  INTO v_is_teacher;

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Only teachers and admins can grant VIP cards';
  END IF;

  -- Mono-teacher: any class membership means the sole teacher teaches this student.
  IF NOT EXISTS (
    SELECT 1
    FROM class_members cm
    WHERE cm.student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'You do not have permission to grant cards to this student';
  END IF;

  -- Get template info (validate card exists and get rarity)
  SELECT id, rarity, uses_total INTO v_template
  FROM vip_card_templates WHERE id = p_card_id;

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Invalid card ID: %', p_card_id;
  END IF;

  -- Validate count
  IF p_count < 1 OR p_count > 10 THEN
    RAISE EXCEPTION 'Count must be between 1 and 10';
  END IF;

  -- Lock the student's profile row to prevent race conditions
  SELECT vip_cards
  INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  -- Initialize empty array if vip_cards is null
  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- Initialize result array
  v_cards := ARRAY[]::JSONB[];
  v_earned_at := NOW();

  -- Add the specified card p_count times
  FOR i IN 1..p_count LOOP
    v_new_instance_id := gen_random_uuid();

    v_new_instance := jsonb_build_object(
      'cardId', p_card_id,
      'earnedAt', v_earned_at,
      'usedAt', NULL,
      'acquiredFrom', 'teacher_award',
      'usesRemaining', v_template.uses_total
    );

    -- Add to vip_cards JSONB object
    v_vip_cards := v_vip_cards || jsonb_build_object(v_new_instance_id::TEXT, v_new_instance);

    -- Log activity
    INSERT INTO vip_cards_activity (
      student_id,
      card_instance_id,
      card_template_id,
      action,
      metadata
    ) VALUES (
      p_student_id,
      v_new_instance_id::TEXT,
      p_card_id,
      'gained',
      jsonb_build_object(
        'acquired_from', 'teacher_award',
        'awarded_by', v_teacher_id,
        'rarity', v_template.rarity
      )
    );

    -- Add to result array
    v_cards := v_cards || jsonb_build_object(
      'cardId', p_card_id,
      'instanceId', v_new_instance_id,
      'earnedAt', v_earned_at
    );
  END LOOP;

  -- Update the student's profile
  UPDATE profiles
  SET vip_cards = v_vip_cards
  WHERE id = p_student_id;

  -- Build result object
  v_result := jsonb_build_object('cards', to_jsonb(v_cards));

  RETURN v_result;
END;
$$;

-- initialize_default_categories: drop the classes.teacher_id ownership check.
CREATE OR REPLACE FUNCTION "public"."initialize_default_categories"("p_class_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- SECURITY CHECK: mono-teacher -> any teacher/admin may initialize categories.
    IF auth.uid() IS NULL OR NOT public.is_teacher_or_admin() THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to initialize categories for this class';
    END IF;

    -- Insert default categories (ON CONFLICT DO NOTHING to handle re-runs)
    INSERT INTO public.coursework_categories (class_id, name, icon, color, display_order, created_by)
    VALUES
        (p_class_id, 'Cours', '📚', '#3B82F6', 1, auth.uid()),
        (p_class_id, 'Exercices', '✏️', '#10B981', 2, auth.uid()),
        (p_class_id, 'Corrections', '✅', '#8B5CF6', 3, auth.uid()),
        (p_class_id, 'Devoirs', '📝', '#F59E0B', 4, auth.uid()),
        (p_class_id, 'Évaluations', '🎯', '#EF4444', 5, auth.uid())
    ON CONFLICT (class_id, name) DO NOTHING;
END;
$$;

-- is_teacher_for_shared_coursework: "owns the linked class" -> teacher/admin.
CREATE OR REPLACE FUNCTION "public"."is_teacher_for_shared_coursework"("p_shared_coursework_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Mono-teacher: the sole teacher/admin owns every class, hence every shared
    -- coursework. SECURITY DEFINER bypasses RLS, preventing infinite recursion.
    RETURN public.is_teacher_or_admin();
END;
$$;

-- is_teacher_of_class: "owns this class" -> teacher/admin.
CREATE OR REPLACE FUNCTION "public"."is_teacher_of_class"("p_class_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    -- Mono-teacher: the sole teacher (or admin) is the teacher of every class.
    return public.is_teacher_or_admin();
exception
    when others then
        return false;
end;
$$;

-- is_teacher_of_student: "owns a class with this student" -> teacher/admin AND
-- the student is enrolled somewhere.
CREATE OR REPLACE FUNCTION "public"."is_teacher_of_student"("p_student_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    -- Mono-teacher: the sole teacher/admin teaches any enrolled student.
    return public.is_teacher_or_admin() and exists (
        select 1
        from class_members cm
        where cm.student_id = p_student_id
    );
exception
    when others then
        return false;
end;
$$;

-- orphan_chapter_documents: trigger archiving deleted chapter documents.
-- It read class_chapters.teacher_id (dropped) to attribute the orphaned doc and
-- build its storage path -> use the sole teacher's id instead.
CREATE OR REPLACE FUNCTION "public"."orphan_chapter_documents"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_teacher_id UUID;
BEGIN
    -- Mono-teacher: attribute orphaned documents to the sole teacher.
    SELECT id INTO v_teacher_id
    FROM public.profiles
    WHERE role = 'teacher'
    LIMIT 1;

    -- Only process uploaded documents (not Google Drive links)
    INSERT INTO public.orphaned_documents (
        original_document_id,
        original_chapter_id,
        original_class_id,
        teacher_id,
        title,
        file_name,
        mime_type,
        file_size,
        orphaned_storage_path,
        original_created_at
    )
    SELECT
        cd.id,
        cd.chapter_id,
        ch.class_id,
        v_teacher_id,
        cd.title,
        cd.file_name,
        cd.mime_type,
        cd.file_size,
        'orphaned-documents/' || v_teacher_id || '/' || cd.id || '/' || cd.file_name,
        cd.created_at
    FROM public.chapter_documents cd
    JOIN public.class_chapters ch ON ch.id = cd.chapter_id
    WHERE cd.chapter_id = OLD.id
      AND cd.source_type = 'upload'
      AND cd.storage_path IS NOT NULL;

    RETURN OLD;
END;
$$;

-- reject_vip_card: only the ownership join changes; the activation-clearing logic
-- and audit log are preserved verbatim.
CREATE OR REPLACE FUNCTION "public"."reject_vip_card"("p_student_id" "uuid", "p_instance_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_teacher_id UUID;
  v_vip_cards JSONB;
  v_card_data JSONB;
  v_card_id TEXT;
  v_template RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_now_str TEXT;
BEGIN
  v_teacher_id := auth.uid();

  IF NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only teachers can reject VIP card activations'
    );
  END IF;

  -- Mono-teacher: any class membership means the sole teacher teaches this student.
  IF NOT EXISTS (
    SELECT 1
    FROM class_members cm
    WHERE cm.student_id = p_student_id
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Student is not in your active classes'
    );
  END IF;

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  v_card_data := v_vip_cards->p_instance_id;

  IF v_card_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found: ' || p_instance_id
    );
  END IF;

  IF v_card_data->>'activationRequestedAt' IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No pending activation request for this card'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  SELECT id, name INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  v_vip_cards := jsonb_set(
    v_vip_cards,
    ARRAY[p_instance_id],
    (v_vip_cards->p_instance_id)
      - 'activationRequestedAt'
      - 'activationRequestedBy'
      - 'activationApprovedAt'
      - 'activationApprovedBy'
  );

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id, p_instance_id, v_card_id, 'rejected',
    jsonb_build_object('rejected_by', v_teacher_id::TEXT, 'rejected_at', v_now_str)
  );

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', COALESCE(v_template.name, v_card_id),
    'instanceId', p_instance_id,
    'cardId', v_card_id
  );
END;
$$;

-- remove_student_vip_card: only the ownership join changes; the FIFO oldest-unused
-- removal logic is preserved verbatim.
CREATE OR REPLACE FUNCTION "public"."remove_student_vip_card"("p_student_id" "uuid", "p_card_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;
  v_vip_cards JSONB;
  v_instance_id TEXT;
  v_oldest_date TIMESTAMPTZ;
  v_oldest_instance_id TEXT;
BEGIN
  -- Get the current user's ID (the teacher calling this function)
  v_teacher_id := auth.uid();

  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can remove VIP cards';
  END IF;

  -- Mono-teacher: any class membership means the sole teacher teaches this student.
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    WHERE cm.student_id = p_student_id
  ) INTO v_student_in_class;

  IF NOT v_student_in_class THEN
    RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
  END IF;

  -- Get student's VIP cards
  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id;

  -- If no cards, return FALSE
  IF v_vip_cards IS NULL OR v_vip_cards = '{}'::jsonb THEN
    RETURN FALSE;
  END IF;

  -- Find oldest unused instance of the specified card
  -- Loop through all card instances
  FOR v_instance_id IN
    SELECT key
    FROM jsonb_each(v_vip_cards)
  LOOP
    DECLARE
      v_card_data JSONB;
      v_card_id_check TEXT;
      v_used_at TEXT;
      v_earned_at TIMESTAMPTZ;
    BEGIN
      v_card_data := v_vip_cards->v_instance_id;
      v_card_id_check := v_card_data->>'cardId';
      v_used_at := v_card_data->>'usedAt';

      -- Check if this is the card we're looking for and it's unused
      IF v_card_id_check = p_card_id AND v_used_at IS NULL THEN
        v_earned_at := (v_card_data->>'earnedAt')::timestamptz;

        -- Track the oldest instance
        IF v_oldest_date IS NULL OR v_earned_at < v_oldest_date THEN
          v_oldest_date := v_earned_at;
          v_oldest_instance_id := v_instance_id;
        END IF;
      END IF;
    END;
  END LOOP;

  -- If we found an instance to remove, delete it from JSONB
  IF v_oldest_instance_id IS NOT NULL THEN
    -- Remove the instance from vip_cards JSONB
    v_vip_cards := v_vip_cards - v_oldest_instance_id;

    -- Update the database
    UPDATE profiles
    SET
      vip_cards = v_vip_cards,
      updated_at = NOW()
    WHERE id = p_student_id;

    RETURN TRUE;
  ELSE
    -- No matching card found
    RETURN FALSE;
  END IF;
END;
$$;

-- remove_vip_card: only the ownership join changes; the instance/FIFO resolution,
-- reason metadata and audit log are preserved verbatim.
CREATE OR REPLACE FUNCTION "public"."remove_vip_card"("p_student_id" "uuid", "p_card_id" "text" DEFAULT NULL::"text", "p_instance_id" "text" DEFAULT NULL::"text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_teacher_id UUID;
  v_vip_cards JSONB;
  v_instance_id TEXT;
  v_card_data JSONB;
  v_card_id TEXT;
  v_template RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_oldest_instance_id TEXT;
  v_oldest_date TIMESTAMPTZ;
  v_loop_key TEXT;
  v_metadata JSONB;
BEGIN
  v_teacher_id := auth.uid();

  IF NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only teachers can remove VIP cards'
    );
  END IF;

  -- Mono-teacher: any class membership means the sole teacher teaches this student.
  IF NOT EXISTS (
    SELECT 1
    FROM class_members cm
    WHERE cm.student_id = p_student_id
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Student is not in your active classes'
    );
  END IF;

  IF p_instance_id IS NULL AND p_card_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Either p_instance_id or p_card_id must be provided'
    );
  END IF;

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  IF p_instance_id IS NOT NULL THEN
    v_instance_id := p_instance_id;
  ELSE
    FOR v_loop_key IN
      SELECT key FROM jsonb_each(v_vip_cards)
    LOOP
      DECLARE
        v_loop_data JSONB;
        v_loop_card_id TEXT;
        v_loop_used_at TEXT;
        v_loop_earned_at TIMESTAMPTZ;
      BEGIN
        v_loop_data := v_vip_cards->v_loop_key;
        v_loop_card_id := v_loop_data->>'cardId';
        v_loop_used_at := v_loop_data->>'usedAt';

        IF v_loop_card_id = p_card_id AND v_loop_used_at IS NULL THEN
          v_loop_earned_at := (v_loop_data->>'earnedAt')::TIMESTAMPTZ;

          IF v_oldest_date IS NULL OR v_loop_earned_at < v_oldest_date THEN
            v_oldest_date := v_loop_earned_at;
            v_oldest_instance_id := v_loop_key;
          END IF;
        END IF;
      END;
    END LOOP;

    IF v_oldest_instance_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'No unused instance found for card: ' || COALESCE(p_card_id, 'unknown')
      );
    END IF;

    v_instance_id := v_oldest_instance_id;
  END IF;

  v_card_data := v_vip_cards->v_instance_id;

  IF v_card_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found: ' || v_instance_id
    );
  END IF;

  IF v_card_data->>'usedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot remove a card that has already been used'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  SELECT id, name INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  v_vip_cards := v_vip_cards - v_instance_id;

  -- Build metadata with optional reason
  v_metadata := jsonb_build_object(
    'removed_by', v_teacher_id::TEXT,
    'removed_at', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  IF p_reason IS NOT NULL THEN
    v_metadata := v_metadata || jsonb_build_object('reason', p_reason);
  END IF;

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id, v_instance_id, v_card_id, 'removed', v_metadata
  );

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', COALESCE(v_template.name, v_card_id),
    'instanceId', v_instance_id,
    'cardId', v_card_id
  );
END;
$$;

-- soft_delete_warning: drop the classes.teacher_id ownership join from the
-- EXISTS guard. Mono-teacher: teacher/admin may delete a warning for any
-- student enrolled in the warning's class.
CREATE OR REPLACE FUNCTION "public"."soft_delete_warning"("p_warning_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_affected INTEGER;
    v_caller_role TEXT;
BEGIN
    -- Get caller's role to enforce authorization (SECURITY DEFINER bypasses RLS).
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Only teachers and admins can delete warnings.
    IF v_caller_role NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only teachers and admins can delete warnings';
    END IF;

    -- Attempt to soft delete the warning
    UPDATE public.student_warnings
    SET
        deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE id = p_warning_id
    AND deleted_at IS NULL  -- Only delete active warnings
    AND EXISTS (
        -- Mono-teacher: the student is enrolled in the warning's class.
        SELECT 1 FROM public.class_members cm
        WHERE cm.student_id = student_warnings.student_id
        AND cm.class_id = student_warnings.class_id
    );

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    RETURN v_affected > 0;
END;
$$;

-- update_class_gidouilles: drop the classes.teacher_id ownership check; verify
-- the class exists instead (the sole teacher owns it).
CREATE OR REPLACE FUNCTION "public"."update_class_gidouilles"("p_class_id" "uuid", "p_delta" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_teacher BOOLEAN;
  v_class_exists BOOLEAN;
  v_affected_rows INTEGER;
BEGIN
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can update gidouilles';
  END IF;

  -- Mono-teacher: the sole teacher owns every class; just verify it exists.
  SELECT EXISTS (
    SELECT 1
    FROM classes
    WHERE id = p_class_id
  ) INTO v_class_exists;

  IF NOT v_class_exists THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  -- Update all ACTIVE students in the class
  UPDATE profiles
  SET gidouilles = GREATEST(0, gidouilles + p_delta),
      updated_at = NOW()
  WHERE id IN (
    SELECT cm.student_id
    FROM class_members cm
    WHERE cm.class_id = p_class_id
      AND cm.status = 'active'
  );

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;

-- update_student_bonus: drop the classes.teacher_id ownership join from the
-- authorization branch.
CREATE OR REPLACE FUNCTION "public"."update_student_bonus"("p_student_id" "uuid", "p_class_id" "uuid", "p_delta" integer, "p_reason" "text" DEFAULT NULL::"text", "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_new_bonus INTEGER;
    v_caller_role TEXT;
BEGIN
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Mono-teacher: admin, or teacher with an active member in this class.
    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND EXISTS (
            SELECT 1 FROM public.class_members cm
            WHERE cm.student_id = p_student_id
            AND cm.class_id = p_class_id
            AND cm.status = 'active'
        ))
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to update bonus for this student';
    END IF;

    IF p_delta < -10000 OR p_delta > 10000 THEN
        RAISE EXCEPTION 'Invalid delta: must be between -10000 and 10000, got %', p_delta;
    END IF;

    IF (ABS(p_delta) > 100) AND (p_reason IS NULL OR p_reason = '') THEN
        RAISE EXCEPTION 'Reason required for large bonus changes (|delta| = %)', ABS(p_delta);
    END IF;

    -- Verify ACTIVE membership
    IF NOT EXISTS (
        SELECT 1 FROM public.class_members
        WHERE student_id = p_student_id
        AND class_id = p_class_id
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Student % is not an active member of class %', p_student_id, p_class_id;
    END IF;

    UPDATE public.profiles
    SET bonus = GREATEST(0, COALESCE(bonus, 0) + p_delta)
    WHERE id = p_student_id
    RETURNING bonus INTO v_new_bonus;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bonus_history') THEN
        INSERT INTO public.bonus_history (
            student_id,
            class_id,
            delta,
            reason,
            created_by
        ) VALUES (
            p_student_id,
            p_class_id,
            p_delta,
            p_reason,
            COALESCE(p_created_by, auth.uid())
        );
    END IF;

    RETURN v_new_bonus;
END;
$$;

-- update_student_gidouilles (2-arg): "student in teacher's classes" -> any class.
CREATE OR REPLACE FUNCTION "public"."update_student_gidouilles"("p_student_id" "uuid", "p_delta" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;
  v_new_gidouilles INTEGER;
BEGIN
  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can update gidouilles';
  END IF;

  -- Mono-teacher: any class membership means the sole teacher teaches this student.
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    WHERE cm.student_id = p_student_id
  ) INTO v_student_in_class;

  IF NOT v_student_in_class THEN
    RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
  END IF;

  -- Update the gidouilles field ONLY (atomic, with built-in minimum enforcement)
  UPDATE profiles
  SET gidouilles = GREATEST(0, gidouilles + p_delta),
      updated_at = NOW()
  WHERE id = p_student_id
  RETURNING gidouilles INTO v_new_gidouilles;

  RETURN v_new_gidouilles;
END;
$$;

-- update_student_gidouilles (5-arg): drop the classes.teacher_id ownership join
-- from the authorization branch.
CREATE OR REPLACE FUNCTION "public"."update_student_gidouilles"("p_student_id" "uuid", "p_class_id" "uuid", "p_delta" integer, "p_reason" "text" DEFAULT NULL::"text", "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_new_gidouilles INTEGER;
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK: Get caller's role to enforce authorization
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Mono-teacher: admin, teacher with an active member in this class, or system (NULL caller).
    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND EXISTS (
            SELECT 1 FROM public.class_members cm
            WHERE cm.student_id = p_student_id
            AND cm.class_id = p_class_id
            AND cm.status = 'active'
        ))
    ) THEN
        RAISE EXCEPTION 'Non autorisé: seuls les professeurs de cet élève peuvent modifier ses gidouilles';
    END IF;

    -- Update gidouilles with floor at 0
    UPDATE public.profiles
    SET gidouilles = GREATEST(0, COALESCE(gidouilles, 0) + p_delta)
    WHERE id = p_student_id
    RETURNING gidouilles INTO v_new_gidouilles;

    -- Log the change in activity table
    INSERT INTO public.gidouilles_activity (
        student_id,
        class_id,
        delta,
        reason,
        created_by
    ) VALUES (
        p_student_id,
        p_class_id,
        p_delta,
        p_reason,
        COALESCE(p_created_by, auth.uid())
    );

    RETURN v_new_gidouilles;
END;
$$;

-- use_vip_card: only the ownership join changes; the self-use bypass, FIFO
-- resolution, multi-use accounting, context validation and audit trail are all
-- preserved verbatim.
CREATE OR REPLACE FUNCTION "public"."use_vip_card"("p_student_id" "uuid", "p_instance_id" "text" DEFAULT NULL::"text", "p_card_id" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb", "p_context" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id UUID;
  v_vip_cards JSONB;
  v_instance_id TEXT;
  v_card_data JSONB;
  v_card_id TEXT;
  v_template RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_now_str TEXT;
  v_oldest_instance_id TEXT;
  v_oldest_date TIMESTAMPTZ;
  v_loop_key TEXT;
  v_audit_metadata JSONB;
  v_uses_remaining INTEGER;
  v_is_fully_consumed BOOLEAN;
  v_use_number INTEGER;
  v_action_context TEXT;
BEGIN
  -- ========================================================================
  -- PARAMETER VALIDATION
  -- ========================================================================

  IF p_instance_id IS NULL AND p_card_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Either p_instance_id or p_card_id must be provided'
    );
  END IF;

  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Authentication required'
    );
  END IF;

  -- ========================================================================
  -- AUTHORIZATION
  -- ========================================================================

  IF v_caller_id != p_student_id THEN
    IF NOT is_teacher_or_admin() THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Unauthorized: Only the card owner or a teacher can use cards'
      );
    END IF;

    -- Mono-teacher: any class membership means the sole teacher teaches this student.
    IF NOT EXISTS (
      SELECT 1
      FROM class_members cm
      WHERE cm.student_id = p_student_id
    ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Unauthorized: Student is not in your active classes'
      );
    END IF;
  END IF;

  -- ========================================================================
  -- GET AND LOCK STUDENT'S VIP CARDS
  -- ========================================================================

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- ========================================================================
  -- RESOLVE CARD INSTANCE (by instance_id or card_id FIFO)
  -- ========================================================================

  IF p_instance_id IS NOT NULL THEN
    v_instance_id := p_instance_id;
  ELSE
    FOR v_loop_key IN
      SELECT key FROM jsonb_each(v_vip_cards)
    LOOP
      DECLARE
        v_loop_data JSONB;
        v_loop_card_id TEXT;
        v_loop_used_at TEXT;
        v_loop_earned_at TIMESTAMPTZ;
        v_loop_uses_remaining INTEGER;
      BEGIN
        v_loop_data := v_vip_cards->v_loop_key;
        v_loop_card_id := v_loop_data->>'cardId';
        v_loop_used_at := v_loop_data->>'usedAt';

        IF v_loop_card_id = p_card_id AND v_loop_used_at IS NULL THEN
          v_loop_uses_remaining := (v_loop_data->>'usesRemaining')::INTEGER;
          IF v_loop_uses_remaining IS NOT NULL AND v_loop_uses_remaining <= 0 THEN
            CONTINUE;
          END IF;

          v_loop_earned_at := (v_loop_data->>'earnedAt')::TIMESTAMPTZ;

          IF v_oldest_date IS NULL OR v_loop_earned_at < v_oldest_date THEN
            v_oldest_date := v_loop_earned_at;
            v_oldest_instance_id := v_loop_key;
          END IF;
        END IF;
      END;
    END LOOP;

    IF v_oldest_instance_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'No unused instance found for card: ' || COALESCE(p_card_id, 'unknown')
      );
    END IF;

    v_instance_id := v_oldest_instance_id;
  END IF;

  -- ========================================================================
  -- VALIDATE CARD INSTANCE
  -- ========================================================================

  v_card_data := v_vip_cards->v_instance_id;

  IF v_card_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found: ' || v_instance_id
    );
  END IF;

  IF v_card_data->>'usedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has already been used'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  -- ========================================================================
  -- GET TEMPLATE (for name, action->context, uses_total)
  -- ========================================================================

  SELECT id, name, action, uses_total INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  IF v_template IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card template not found: ' || v_card_id
    );
  END IF;

  -- ========================================================================
  -- VALIDATE ACTIVATION CONTEXT (read from action JSONB)
  -- ========================================================================

  v_action_context := v_template.action->>'context';

  IF v_action_context IS NOT NULL AND v_action_context != 'any' THEN
    IF p_context IS NULL OR p_context != v_action_context THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'This card requires context: ' || v_action_context
      );
    END IF;
  END IF;

  -- ========================================================================
  -- PROCESS CARD USE (unified single-use / multi-use logic)
  -- ========================================================================

  v_uses_remaining := COALESCE((v_card_data->>'usesRemaining')::INTEGER, 1);

  IF v_uses_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has no remaining uses'
    );
  END IF;

  v_use_number := COALESCE(v_template.uses_total, 1) - v_uses_remaining + 1;
  v_uses_remaining := v_uses_remaining - 1;
  v_is_fully_consumed := (v_uses_remaining = 0);

  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  IF v_is_fully_consumed THEN
    v_card_data := v_card_data
      - 'activationRequestedAt'
      - 'activationRequestedBy'
      - 'activationApprovedAt'
      - 'activationApprovedBy'
      || jsonb_build_object(
        'usedAt', v_now_str,
        'usesRemaining', 0
      );
  ELSE
    v_card_data := v_card_data || jsonb_build_object(
      'usesRemaining', v_uses_remaining
    );
  END IF;

  v_vip_cards := jsonb_set(v_vip_cards, ARRAY[v_instance_id], v_card_data);

  -- ========================================================================
  -- UPDATE PROFILE
  -- ========================================================================

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  -- ========================================================================
  -- AUDIT TRAIL
  -- ========================================================================

  v_audit_metadata := jsonb_build_object(
    'used_at', v_now_str,
    'usesRemaining', v_uses_remaining,
    'useNumber', v_use_number,
    'totalUses', COALESCE(v_template.uses_total, 1),
    'fullyConsumed', v_is_fully_consumed,
    'context', p_context
  ) || COALESCE(p_metadata, '{}'::JSONB);

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id, v_instance_id, v_card_id, 'used',
    v_audit_metadata
  );

  -- ========================================================================
  -- RETURN UNIFIED RESULT
  -- ========================================================================

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', v_template.name,
    'instanceId', v_instance_id,
    'cardId', v_card_id,
    'usesRemaining', v_uses_remaining,
    'isFullyConsumed', v_is_fully_consumed,
    'usedAt', CASE WHEN v_is_fully_consumed THEN v_now_str ELSE NULL END
  );
END;
$$;

-- validate_class_message_recipients: drop the classes.teacher_id ownership check.
CREATE OR REPLACE FUNCTION "public"."validate_class_message_recipients"("sender_uuid" "uuid", "class_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  sender_role TEXT;
  v_class_exists BOOLEAN;
BEGIN
  -- Get sender's role
  SELECT role INTO sender_role
  FROM profiles
  WHERE id = sender_uuid;

  -- Only teachers/admins can send class messages
  IF sender_role != 'teacher' AND sender_role != 'admin' THEN
    RETURN FALSE;
  END IF;

  -- Mono-teacher: the sole teacher owns every active class; just verify it exists.
  SELECT EXISTS (
    SELECT 1
    FROM classes
    WHERE id = class_uuid
      AND is_active = TRUE
  ) INTO v_class_exists;

  RETURN v_class_exists;
END;
$$;

-- validate_message_recipients: intentionally NOT redefined. Its live version (migration
-- 20260618093000, Option B) is already role-based, references neither classes
-- nor teacher_id nor the dead RPCs, and lets a hors-classe student message the
-- sole teacher. Redefining it from the baseline body would REGRESS Option B.

-- validate_riddle_attempt: keep p_teacher_id (stamps validated_by); drop the
-- classes.teacher_id ownership join -> any class membership.
CREATE OR REPLACE FUNCTION "public"."validate_riddle_attempt"("p_attempt_id" "uuid", "p_teacher_id" "uuid", "p_is_correct" boolean) RETURNS TABLE("success" boolean, "theoretical_reward" numeric, "actual_reward" numeric, "is_first_win" boolean, "week_best_reward" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_student_id UUID;
  v_riddle_id UUID;
  v_difficulty INTEGER;
  v_attempt_number INTEGER;
  v_theoretical_gidouilles NUMERIC(10,2);
  v_actual_gidouilles NUMERIC(10,2);
  v_is_first_win BOOLEAN;
  v_week_best NUMERIC(10,2);
  v_school_id UUID;
  v_daily_result RECORD;
BEGIN
  -- Get attempt details
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

  -- Get riddle difficulty
  SELECT difficulty INTO v_difficulty
  FROM riddles
  WHERE id = v_riddle_id;

  IF v_difficulty IS NULL THEN
    RAISE EXCEPTION 'Riddle not found';
  END IF;

  IF NOT p_is_correct THEN
    UPDATE riddle_attempts
    SET is_correct = FALSE,
        validated_at = NOW(),
        validated_by = p_teacher_id
    WHERE id = p_attempt_id;

    RETURN QUERY SELECT TRUE, 0::NUMERIC(10,2), 0::NUMERIC(10,2), FALSE, 0::NUMERIC(10,2);
    RETURN;
  END IF;

  v_theoretical_gidouilles := public.calculate_riddle_gidouilles(v_difficulty, v_attempt_number)::NUMERIC(10,2);

  SELECT NOT EXISTS (
    SELECT 1 FROM riddle_attempts ra2
    WHERE ra2.student_id = v_student_id
      AND ra2.riddle_id = v_riddle_id
      AND ra2.is_correct = TRUE
      AND ra2.id != p_attempt_id
  ) INTO v_is_first_win;

  IF v_is_first_win THEN
    v_actual_gidouilles := v_theoretical_gidouilles;
  ELSE
    v_actual_gidouilles := 0;
  END IF;

  UPDATE riddle_attempts
  SET is_correct = TRUE,
      validated_at = NOW(),
      validated_by = p_teacher_id,
      gidouilles_awarded = v_actual_gidouilles
  WHERE id = p_attempt_id;

  IF v_actual_gidouilles > 0 THEN
    PERFORM public.update_student_gidouilles(
      v_student_id,
      v_actual_gidouilles::INTEGER
    );
  END IF;

  SELECT COALESCE(MAX(gidouilles_awarded), 0)::NUMERIC(10,2)
  INTO v_week_best
  FROM riddle_attempts ra3
  WHERE ra3.student_id = v_student_id
    AND ra3.is_correct = TRUE
    AND ra3.validated_at >= date_trunc('week', NOW());

  RETURN QUERY SELECT TRUE, v_theoretical_gidouilles, v_actual_gidouilles, v_is_first_win, v_week_best;
END;
$$;

-- ===== 4b. plpgsql authz functions still referencing classes.teacher_id =====
-- award_weekly_reward / compute_daily_summary gate on "teacher of this class".
-- Mono-teacher: the sole teacher owns every class -> public.is_teacher_or_admin().

CREATE OR REPLACE FUNCTION "public"."award_weekly_reward"("p_student_id" "uuid", "p_class_id" "uuid", "p_week_start" "date", "p_week_end" "date", "p_gidouilles" integer DEFAULT 1, "p_reason" "text" DEFAULT 'no_warnings'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_reward_id UUID;
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK (Issue #1): Get caller's role to enforce authorization
    -- SECURITY DEFINER functions bypass RLS, so we must check permissions explicitly
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Authorization: Only admins, teachers of the class, or service_role can award rewards
    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND public.is_teacher_or_admin())
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to award rewards for this class';
    END IF;

    -- FIX (Issue #6): Use atomic INSERT with WHERE NOT EXISTS to prevent race condition
    -- Insert the reward record only if student had no warnings that week
    INSERT INTO public.weekly_rewards (
        student_id,
        class_id,
        week_start,
        week_end,
        gidouilles_awarded,
        reason
    )
    SELECT p_student_id, p_class_id, p_week_start, p_week_end, p_gidouilles, p_reason
    WHERE NOT EXISTS (
        SELECT 1 FROM public.student_warnings
        WHERE student_id = p_student_id
        AND class_id = p_class_id
        AND DATE(created_at) BETWEEN p_week_start AND p_week_end
        AND deleted_at IS NULL
    )
    ON CONFLICT (student_id, class_id, week_start) DO NOTHING
    RETURNING id INTO v_reward_id;

    -- Only update gidouilles if we actually inserted a new record
    IF v_reward_id IS NOT NULL THEN
        -- Update student's gidouilles (and log in history)
        PERFORM public.update_student_gidouilles(
            p_student_id,
            p_class_id,
            p_gidouilles,
            p_reason,
            NULL  -- System-generated
        );
    END IF;

    RETURN v_reward_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."compute_daily_summary"("p_student_id" "uuid", "p_class_id" "uuid", "p_summary_date" "date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_summary_id UUID;
    v_gidouilles_gained INTEGER;
    v_gidouilles_lost INTEGER;
    v_bonus_gained INTEGER;
    v_bonus_used INTEGER;
    v_warnings_issued INTEGER;
    v_warnings_removed INTEGER;
    v_vip_cards_gained INTEGER;
    v_vip_cards_used INTEGER;
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK (Issue #1): Get caller's role to enforce authorization
    -- SECURITY DEFINER functions bypass RLS, so we must check permissions explicitly
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Authorization: Only admins, teachers of the student, or service_role can compute summaries
    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND public.is_teacher_or_admin())
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to compute summaries for this student';
    END IF;
    -- Calculate gidouilles (positive = gained, negative = lost)
    SELECT
        COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN delta < 0 THEN delta ELSE 0 END), 0)
    INTO v_gidouilles_gained, v_gidouilles_lost
    FROM public.gidouilles_history
    WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND DATE(created_at) = p_summary_date;

    -- Calculate bonus (positive = gained, negative = used)
    SELECT
        COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN delta < 0 THEN delta ELSE 0 END), 0)
    INTO v_bonus_gained, v_bonus_used
    FROM public.bonus_history
    WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND DATE(created_at) = p_summary_date;

    -- Calculate warnings (issued vs removed)
    -- FIX (Issue #9): Simplify confusing logic for warning calculations
    SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL),
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)
    INTO v_warnings_issued, v_warnings_removed
    FROM public.student_warnings
    WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND DATE(created_at) = p_summary_date;

    -- Calculate VIP cards (gained vs used)
    SELECT
        COUNT(*) FILTER (WHERE action = 'gained'),
        COUNT(*) FILTER (WHERE action = 'used')
    INTO v_vip_cards_gained, v_vip_cards_used
    FROM public.vip_cards_activity
    WHERE student_id = p_student_id
    AND DATE(created_at) = p_summary_date;

    -- Insert or update the summary
    INSERT INTO public.daily_summaries (
        student_id,
        class_id,
        summary_date,
        gidouilles_gained,
        gidouilles_lost,
        bonus_gained,
        bonus_used,
        warnings_issued,
        warnings_removed,
        vip_cards_gained,
        vip_cards_used
    ) VALUES (
        p_student_id,
        p_class_id,
        p_summary_date,
        v_gidouilles_gained,
        v_gidouilles_lost,
        v_bonus_gained,
        v_bonus_used,
        v_warnings_issued,
        v_warnings_removed,
        v_vip_cards_gained,
        v_vip_cards_used
    )
    ON CONFLICT (student_id, class_id, summary_date)
    DO UPDATE SET
        gidouilles_gained = EXCLUDED.gidouilles_gained,
        gidouilles_lost = EXCLUDED.gidouilles_lost,
        bonus_gained = EXCLUDED.bonus_gained,
        bonus_used = EXCLUDED.bonus_used,
        warnings_issued = EXCLUDED.warnings_issued,
        warnings_removed = EXCLUDED.warnings_removed,
        vip_cards_gained = EXCLUDED.vip_cards_gained,
        vip_cards_used = EXCLUDED.vip_cards_used,
        updated_at = NOW()
    RETURNING id INTO v_summary_id;

    RETURN v_summary_id;
END;
$$;


-- ===== 5. Drop the chapter teacher_id trigger and its function =====
-- The trigger backfilled class_chapters.teacher_id from the class on INSERT;
-- with the column gone, both are obsolete.

DROP TRIGGER IF EXISTS "set_chapter_teacher_id_trigger" ON "public"."class_chapters";
DROP FUNCTION IF EXISTS "public"."set_chapter_teacher_id"();

-- ===== 2b. External policies referencing classes-cluster teacher_id =====
-- These live on OTHER tables but subquery classes.teacher_id ("is the caller the
-- teacher of this class?"). Mono-teacher: the sole teacher owns every class, so
-- that predicate becomes public.is_teacher_or_admin() (behaviour-preserving).

DROP POLICY IF EXISTS "Students can read chunks from accessible documents" ON "public"."rag_chunks";
DROP POLICY IF EXISTS "Students can read system and class documents" ON "public"."rag_documents";
DROP POLICY IF EXISTS "System can insert VIP cards activity" ON "public"."vip_cards_activity";
CREATE POLICY "System can insert VIP cards activity" ON "public"."vip_cards_activity" FOR INSERT TO "authenticated" WITH CHECK ((("student_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."user_role") AND (EXISTS ( SELECT 1
           FROM "public"."class_members" "cm"
          WHERE (("cm"."student_id" = "vip_cards_activity"."student_id") AND ("cm"."class_id" IN ( SELECT "c"."id"
                   FROM "public"."classes" "c"
                  WHERE ("public"."is_teacher_or_admin"())))))))))));

DROP POLICY IF EXISTS "Teachers can create assignments for their assessments" ON "public"."assessment_assignments";
CREATE POLICY "Teachers can create assignments for their assessments" ON "public"."assessment_assignments" FOR INSERT WITH CHECK ((("assigned_by" = "auth"."uid"()) AND "public"."is_assessment_owner"("assessment_id") AND (("class_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "assessment_assignments"."class_id") AND ("public"."is_teacher_or_admin"()))))) AND (("student_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM ("public"."class_members" "cm"
     JOIN "public"."classes" "c" ON (("c"."id" = "cm"."class_id")))
  WHERE (("cm"."student_id" = "assessment_assignments"."student_id") AND ("public"."is_teacher_or_admin"())))))));

DROP POLICY IF EXISTS "Teachers can create assignments for their riddles" ON "public"."riddle_assignments";
CREATE POLICY "Teachers can create assignments for their riddles" ON "public"."riddle_assignments" FOR INSERT WITH CHECK ((("assigned_by" = "auth"."uid"()) AND "public"."teacher_owns_riddle"("auth"."uid"(), "riddle_id") AND (("class_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "riddle_assignments"."class_id") AND ("public"."is_teacher_or_admin"()))))) AND (("student_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM ("public"."class_members" "cm"
     JOIN "public"."classes" "c" ON (("c"."id" = "cm"."class_id")))
  WHERE (("cm"."student_id" = "riddle_assignments"."student_id") AND ("public"."is_teacher_or_admin"())))))));

DROP POLICY IF EXISTS "Teachers can create notifications for their classes" ON "public"."notifications";
CREATE POLICY "Teachers can create notifications for their classes" ON "public"."notifications" FOR INSERT WITH CHECK (((( SELECT ("profiles"."role")::"text" AS "role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'teacher'::"text") AND ((("target_type" = 'classes'::"text") AND ("target_class_ids" <@ ( SELECT "array_agg"("classes"."id") AS "array_agg"
   FROM "public"."classes"
  WHERE ("public"."is_teacher_or_admin"())))) OR (("target_type" = 'users'::"text") AND ("target_user_ids" <@ ( SELECT "array_agg"(DISTINCT "cm"."student_id") AS "array_agg"
   FROM ("public"."class_members" "cm"
     JOIN "public"."classes" "c" ON (("c"."id" = "cm"."class_id")))
  WHERE ("public"."is_teacher_or_admin"())))))));

DROP POLICY IF EXISTS "Teachers can insert consents for their students" ON "public"."parental_consents";
CREATE POLICY "Teachers can insert consents for their students" ON "public"."parental_consents" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."class_members" "cm"
     JOIN "public"."classes" "c" ON (("cm"."class_id" = "c"."id")))
  WHERE (("cm"."student_id" = "parental_consents"."student_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can insert shared materials" ON "public"."shared_materials";
CREATE POLICY "Teachers can insert shared materials" ON "public"."shared_materials" FOR INSERT TO "authenticated" WITH CHECK ((("shared_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "shared_materials"."class_id") AND ("public"."is_teacher_or_admin"()))))));

DROP POLICY IF EXISTS "Teachers can manage Google Classroom links for their classes" ON "public"."class_google_classroom_links";
CREATE POLICY "Teachers can manage Google Classroom links for their classes" ON "public"."class_google_classroom_links" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_google_classroom_links"."class_id") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_google_classroom_links"."class_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can manage coursework categories for their classes" ON "public"."coursework_categories";
CREATE POLICY "Teachers can manage coursework categories for their classes" ON "public"."coursework_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "coursework_categories"."class_id") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "coursework_categories"."class_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can manage own class settings" ON "public"."game_class_settings";
CREATE POLICY "Teachers can manage own class settings" ON "public"."game_class_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "game_class_settings"."class_id") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "game_class_settings"."class_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can manage shared coursework for their classes" ON "public"."shared_coursework";
CREATE POLICY "Teachers can manage shared coursework for their classes" ON "public"."shared_coursework" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "shared_coursework"."class_id") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "shared_coursework"."class_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can manage their class counters" ON "public"."whiteboard_export_counters";
CREATE POLICY "Teachers can manage their class counters" ON "public"."whiteboard_export_counters" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "whiteboard_export_counters"."class_id") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "whiteboard_export_counters"."class_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can soft delete warnings for their students" ON "public"."student_warnings";
CREATE POLICY "Teachers can soft delete warnings for their students" ON "public"."student_warnings" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."user_role")))) AND (EXISTS ( SELECT 1
   FROM "public"."class_members" "cm"
  WHERE (("cm"."student_id" = "student_warnings"."student_id") AND ("cm"."class_id" IN ( SELECT "c"."id"
           FROM "public"."classes" "c"
          WHERE ("public"."is_teacher_or_admin"())))))) AND ("deleted_at" IS NULL))) WITH CHECK ((("deleted_at" IS NOT NULL) AND ("deleted_by" = "auth"."uid"())));

DROP POLICY IF EXISTS "Teachers can update consents for their students" ON "public"."parental_consents";
CREATE POLICY "Teachers can update consents for their students" ON "public"."parental_consents" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."class_members" "cm"
     JOIN "public"."classes" "c" ON (("cm"."class_id" = "c"."id")))
  WHERE (("cm"."student_id" = "parental_consents"."student_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can update student rewards in their classes" ON "public"."profiles";
CREATE POLICY "Teachers can update student rewards in their classes" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM ("public"."class_members" "cm"
     JOIN "public"."classes" "c" ON (("c"."id" = "cm"."class_id")))
  WHERE (("cm"."student_id" = "profiles"."id") AND ("public"."is_teacher_or_admin"()))))));

DROP POLICY IF EXISTS "Teachers can validate attempts" ON "public"."riddle_attempts";
CREATE POLICY "Teachers can validate attempts" ON "public"."riddle_attempts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."class_members" "cm"
     JOIN "public"."classes" "c" ON (("c"."id" = "cm"."class_id")))
  WHERE (("cm"."student_id" = "riddle_attempts"."student_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON "public"."messages";
CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT USING ((("deleted_at" IS NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "messages"."conversation_id") AND ("cp"."user_id" = "auth"."uid"())))) OR ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"public"."user_role", 'admin'::"public"."user_role"]))))) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."is_group" = true) OR (("c"."is_group" = false) AND (EXISTS ( SELECT 1
           FROM ("public"."conversation_participants" "cp1"
             JOIN "public"."conversation_participants" "cp2" ON ((("cp1"."conversation_id" = "cp2"."conversation_id") AND ("cp1"."user_id" < "cp2"."user_id"))))
          WHERE (("cp1"."conversation_id" = "c"."id") AND (EXISTS ( SELECT 1
                   FROM ("public"."class_members" "cm1"
                     JOIN "public"."classes" "c1" ON (("c1"."id" = "cm1"."class_id")))
                  WHERE (("cm1"."student_id" = "cp1"."user_id") AND ("public"."is_teacher_or_admin"())))) AND (EXISTS ( SELECT 1
                   FROM ("public"."class_members" "cm2"
                     JOIN "public"."classes" "c2" ON (("c2"."id" = "cm2"."class_id")))
                  WHERE (("cm2"."student_id" = "cp2"."user_id") AND ("public"."is_teacher_or_admin"()))))))))))))))));

DROP POLICY IF EXISTS "Users can view messages of accessible conversations" ON "public"."tutor_messages";
CREATE POLICY "Users can view messages of accessible conversations" ON "public"."tutor_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tutor_conversations" "tc"
  WHERE (("tc"."id" = "tutor_messages"."conversation_id") AND (("tc"."student_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."classes" "c"
          WHERE (("c"."id" = "tc"."class_id") AND ("public"."is_teacher_or_admin"())))) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))))))));

DROP POLICY IF EXISTS "Users can view relevant tournaments" ON "public"."minesweeper_tournaments";
CREATE POLICY "Users can view relevant tournaments" ON "public"."minesweeper_tournaments" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))) OR ("creator_id" = "auth"."uid"()) OR ("scope" = 'global'::"text") OR (("scope" = 'classes'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."minesweeper_tournament_classes" "tc"
     JOIN "public"."class_members" "cm" ON (("cm"."class_id" = "tc"."class_id")))
  WHERE (("tc"."tournament_id" = "minesweeper_tournaments"."id") AND ("cm"."student_id" = "auth"."uid"()))))) OR (("scope" = 'classes'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."minesweeper_tournament_classes" "tc"
     JOIN "public"."classes" "c" ON (("c"."id" = "tc"."class_id")))
  WHERE (("tc"."tournament_id" = "minesweeper_tournaments"."id") AND ("public"."is_teacher_or_admin"())))))));

DROP POLICY IF EXISTS "Users can view their conversations" ON "public"."conversations";
CREATE POLICY "Users can view their conversations" ON "public"."conversations" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."conversation_participants"
  WHERE (("conversation_participants"."conversation_id" = "conversations"."id") AND ("conversation_participants"."user_id" = "auth"."uid"())))) OR ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"public"."user_role", 'admin'::"public"."user_role"]))))) AND (("is_group" = true) OR (("is_group" = false) AND (EXISTS ( SELECT 1
   FROM ("public"."conversation_participants" "cp1"
     JOIN "public"."conversation_participants" "cp2" ON ((("cp1"."conversation_id" = "cp2"."conversation_id") AND ("cp1"."user_id" < "cp2"."user_id"))))
  WHERE (("cp1"."conversation_id" = "conversations"."id") AND (( SELECT "count"(*) AS "count"
           FROM "public"."conversation_participants"
          WHERE ("conversation_participants"."conversation_id" = "conversations"."id")) = 2) AND (EXISTS ( SELECT 1
           FROM ("public"."class_members" "cm1"
             JOIN "public"."classes" "c1" ON (("c1"."id" = "cm1"."class_id")))
          WHERE (("cm1"."student_id" = "cp1"."user_id") AND ("public"."is_teacher_or_admin"())))) AND (EXISTS ( SELECT 1
           FROM ("public"."class_members" "cm2"
             JOIN "public"."classes" "c2" ON (("c2"."id" = "cm2"."class_id")))
          WHERE (("cm2"."student_id" = "cp2"."user_id") AND ("public"."is_teacher_or_admin"()))))))))))));

DROP POLICY IF EXISTS "Users can view tournament classes" ON "public"."minesweeper_tournament_classes";
CREATE POLICY "Users can view tournament classes" ON "public"."minesweeper_tournament_classes" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))) OR (EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "minesweeper_tournament_classes"."class_id") AND ("public"."is_teacher_or_admin"())))) OR (EXISTS ( SELECT 1
   FROM "public"."class_members" "cm"
  WHERE (("cm"."class_id" = "minesweeper_tournament_classes"."class_id") AND ("cm"."student_id" = "auth"."uid"()))))));

DROP POLICY IF EXISTS "anti_fraud_update_teacher_of_student" ON "public"."srs_anti_fraud_flags";
CREATE POLICY "anti_fraud_update_teacher_of_student" ON "public"."srs_anti_fraud_flags" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."class_members" "cm"
     JOIN "public"."classes" "c" ON (("c"."id" = "cm"."class_id")))
  WHERE (("cm"."student_id" = "srs_anti_fraud_flags"."student_id") AND ("cm"."status" = 'active'::"text") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."class_members" "cm"
     JOIN "public"."classes" "c" ON (("c"."id" = "cm"."class_id")))
  WHERE (("cm"."student_id" = "srs_anti_fraud_flags"."student_id") AND ("cm"."status" = 'active'::"text") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "marketplace_config_insert_teacher_class" ON "public"."marketplace_config";
CREATE POLICY "marketplace_config_insert_teacher_class" ON "public"."marketplace_config" FOR INSERT TO "authenticated" WITH CHECK ((("class_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "marketplace_config"."class_id") AND ("public"."is_teacher_or_admin"()))))));

DROP POLICY IF EXISTS "marketplace_config_update_teacher_class" ON "public"."marketplace_config";
CREATE POLICY "marketplace_config_update_teacher_class" ON "public"."marketplace_config" FOR UPDATE TO "authenticated" USING ((("class_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "marketplace_config"."class_id") AND ("public"."is_teacher_or_admin"())))))) WITH CHECK ((("class_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "marketplace_config"."class_id") AND ("public"."is_teacher_or_admin"()))))));

DROP POLICY IF EXISTS "python_exercise_assignments_insert" ON "public"."python_exercise_assignments";
CREATE POLICY "python_exercise_assignments_insert" ON "public"."python_exercise_assignments" FOR INSERT TO "authenticated" WITH CHECK ((("assigned_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."user_role")))) AND ((("class_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "python_exercise_assignments"."class_id") AND ("public"."is_teacher_or_admin"()))))) OR (("student_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."class_members" "cm"
     JOIN "public"."classes" "c" ON (("c"."id" = "cm"."class_id")))
  WHERE (("cm"."student_id" = "python_exercise_assignments"."student_id") AND ("public"."is_teacher_or_admin"()))))))));

DROP POLICY IF EXISTS "python_exercise_assignments_select_teacher" ON "public"."python_exercise_assignments";
CREATE POLICY "python_exercise_assignments_select_teacher" ON "public"."python_exercise_assignments" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."user_role")))) AND (("assigned_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "python_exercise_assignments"."class_id") AND ("public"."is_teacher_or_admin"())))))));

DROP POLICY IF EXISTS "skill_attempts_insert_teacher" ON "public"."skill_attempts";
CREATE POLICY "skill_attempts_insert_teacher" ON "public"."skill_attempts" FOR INSERT TO "authenticated" WITH CHECK ((("source" = 'teacher'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."classes" "c"
     JOIN "public"."class_members" "cm" ON (("cm"."class_id" = "c"."id")))
  WHERE (("public"."is_teacher_or_admin"()) AND ("cm"."student_id" = "skill_attempts"."student_id")))) AND (("task_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."evaluation_tasks" "t"
  WHERE (("t"."id" = "skill_attempts"."task_id") AND ("public"."is_teacher_or_admin"())))))));

DROP POLICY IF EXISTS "teacher_class_stats" ON "public"."template_usage_stats";
CREATE POLICY "teacher_class_stats" ON "public"."template_usage_stats" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "template_usage_stats"."class_id") AND ("public"."is_teacher_or_admin"())))));

CREATE POLICY "Students can read system and class documents" ON "public"."rag_documents" FOR SELECT TO "authenticated" USING ((("teacher_id" IS NULL) OR (("teacher_id" IN ( SELECT "p"."id" FROM "public"."profiles" "p" WHERE ("p"."role" = 'teacher'::"public"."user_role"))) AND (EXISTS ( SELECT 1 FROM "public"."class_members" "cm" WHERE ("cm"."student_id" = "auth"."uid"()))))));

CREATE POLICY "Students can read chunks from accessible documents" ON "public"."rag_chunks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1 FROM "public"."rag_documents" "d" WHERE (("d"."id" = "rag_chunks"."document_id") AND (("d"."teacher_id" IS NULL) OR (("d"."teacher_id" IN ( SELECT "p"."id" FROM "public"."profiles" "p" WHERE ("p"."role" = 'teacher'::"public"."user_role"))) AND (EXISTS ( SELECT 1 FROM "public"."class_members" "cm" WHERE ("cm"."student_id" = "auth"."uid"())))))))));


-- ===== 2c. External policies referencing denormalized class-cluster teacher_id =====
-- On chapter sub-tables (class_chapters.teacher_id) and evaluation_task_perimeter
-- (evaluation_tasks.teacher_id). Same mono-teacher rewrite: -> is_teacher_or_admin().

DROP POLICY IF EXISTS "Teachers can manage checklist items of their chapters" ON "public"."chapter_checklist_items";
CREATE POLICY "Teachers can manage checklist items of their chapters" ON "public"."chapter_checklist_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_checklist_items"."chapter_id") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_checklist_items"."chapter_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can manage documents of their chapters" ON "public"."chapter_documents";
CREATE POLICY "Teachers can manage documents of their chapters" ON "public"."chapter_documents" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_documents"."chapter_id") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_documents"."chapter_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can manage exercises of their chapters" ON "public"."chapter_exercises";
CREATE POLICY "Teachers can manage exercises of their chapters" ON "public"."chapter_exercises" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_exercises"."chapter_id") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_exercises"."chapter_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can manage quiz questions of their chapters" ON "public"."chapter_quiz_questions";
CREATE POLICY "Teachers can manage quiz questions of their chapters" ON "public"."chapter_quiz_questions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_quiz_questions"."chapter_id") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_quiz_questions"."chapter_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can create instantiations for their chapters" ON "public"."chapter_template_instantiations";
CREATE POLICY "Teachers can create instantiations for their chapters" ON "public"."chapter_template_instantiations" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_template_instantiations"."chapter_id") AND ("public"."is_teacher_or_admin"())))) AND "public"."is_teacher_or_admin"()));

DROP POLICY IF EXISTS "Teachers can delete instantiations of their chapters" ON "public"."chapter_template_instantiations";
CREATE POLICY "Teachers can delete instantiations of their chapters" ON "public"."chapter_template_instantiations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_template_instantiations"."chapter_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can update instantiations of their chapters" ON "public"."chapter_template_instantiations";
CREATE POLICY "Teachers can update instantiations of their chapters" ON "public"."chapter_template_instantiations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_template_instantiations"."chapter_id") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_template_instantiations"."chapter_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "Teachers can view instantiations of their chapters" ON "public"."chapter_template_instantiations";
CREATE POLICY "Teachers can view instantiations of their chapters" ON "public"."chapter_template_instantiations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."class_chapters" "ch"
  WHERE (("ch"."id" = "chapter_template_instantiations"."chapter_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "evaluation_task_perimeter_delete_teacher" ON "public"."evaluation_task_perimeter";
CREATE POLICY "evaluation_task_perimeter_delete_teacher" ON "public"."evaluation_task_perimeter" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."evaluation_tasks" "t"
  WHERE (("t"."id" = "evaluation_task_perimeter"."task_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "evaluation_task_perimeter_insert_teacher" ON "public"."evaluation_task_perimeter";
CREATE POLICY "evaluation_task_perimeter_insert_teacher" ON "public"."evaluation_task_perimeter" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."evaluation_tasks" "t"
  WHERE (("t"."id" = "evaluation_task_perimeter"."task_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "evaluation_task_perimeter_select_teacher" ON "public"."evaluation_task_perimeter";
CREATE POLICY "evaluation_task_perimeter_select_teacher" ON "public"."evaluation_task_perimeter" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."evaluation_tasks" "t"
  WHERE (("t"."id" = "evaluation_task_perimeter"."task_id") AND ("public"."is_teacher_or_admin"())))));

DROP POLICY IF EXISTS "evaluation_task_perimeter_update_teacher" ON "public"."evaluation_task_perimeter";
CREATE POLICY "evaluation_task_perimeter_update_teacher" ON "public"."evaluation_task_perimeter" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."evaluation_tasks" "t"
  WHERE (("t"."id" = "evaluation_task_perimeter"."task_id") AND ("public"."is_teacher_or_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."evaluation_tasks" "t"
  WHERE (("t"."id" = "evaluation_task_perimeter"."task_id") AND ("public"."is_teacher_or_admin"())))));


-- ===== 6. Drop teacher_id columns =====
-- FK constraints referencing these columns are dropped automatically with them.

ALTER TABLE "public"."classes" DROP COLUMN "teacher_id";
ALTER TABLE "public"."class_chapters" DROP COLUMN "teacher_id";
ALTER TABLE "public"."class_journal_entries" DROP COLUMN "teacher_id";
ALTER TABLE "public"."class_schedules" DROP COLUMN "teacher_id";
ALTER TABLE "public"."game_timeslots" DROP COLUMN "teacher_id";
ALTER TABLE "public"."evaluation_tasks" DROP COLUMN "teacher_id";

-- ===== 7. Drop dead RPCs =====
-- get_student_teachers / get_teacher_students had 0 remaining callers once their
-- two internal callers (get_allowed_recipients, validate_message_recipients) were
-- inlined in §4, and they referenced the non-existent classes.archived column
-- (i.e. they were already broken at runtime).

DROP FUNCTION IF EXISTS "public"."get_student_teachers"("uuid");
DROP FUNCTION IF EXISTS "public"."get_teacher_students"("uuid");

COMMIT;
