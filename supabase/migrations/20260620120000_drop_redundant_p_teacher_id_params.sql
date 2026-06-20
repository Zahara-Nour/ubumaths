-- Mono-teacher cleanup: drop redundant p_teacher_id params + dead teacher RPCs
-- =============================================================================
-- Suite du retrait teacher_id (cf. 20260620090000). Le param `p_teacher_id` de
-- ces RPC = "le prof appelant" → en mono-prof c'est toujours auth.uid(), donc
-- redondant. Et 3 fonctions n'ont plus aucun appelant (app + DB) → mortes.

BEGIN;

-- ===== 1. Fonctions mortes (0 appelant app + DB) — DROP =====
-- is_class_teacher_of : son seul usager (policy students_view_class_teacher_profile)
--   a été retiré par Option B (20260618093000).
-- get_teacher_override_impact / get_teacher_overrides_summary : RPC de stats VIP
--   jamais branchées côté app.
DROP FUNCTION IF EXISTS "public"."is_class_teacher_of"("uuid");
DROP FUNCTION IF EXISTS "public"."get_teacher_override_impact"("uuid", "text");
DROP FUNCTION IF EXISTS "public"."get_teacher_overrides_summary"("uuid");

-- ===== 2. award_achievement_manual : drop p_teacher_id, unlocked_by = auth.uid() =====
DROP FUNCTION IF EXISTS "public"."award_achievement_manual"("uuid", "uuid", "text", "text");
CREATE OR REPLACE FUNCTION "public"."award_achievement_manual"("p_student_id" "uuid", "p_achievement_id" "text", "p_reason" "text" DEFAULT NULL::"text")
  RETURNS boolean
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
AS $function$
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

  SELECT * INTO v_achievement
  FROM achievements
  WHERE id = p_achievement_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not found';
  END IF;

  IF v_achievement.unlock_type NOT IN ('manual', 'event_based') THEN
    RAISE EXCEPTION 'This achievement cannot be manually awarded';
  END IF;

  -- Mono-teacher: the awarder is the calling teacher (auth.uid()).
  INSERT INTO student_achievements (
    student_id, achievement_id, unlocked_by, unlock_reason, points_awarded, gidouilles_awarded
  )
  VALUES (
    p_student_id, p_achievement_id, auth.uid(), COALESCE(p_reason, 'Manually awarded by teacher'),
    COALESCE((v_achievement.metadata->>'points')::INTEGER, 0),
    COALESCE((v_achievement.metadata->>'gidouilles_reward')::INTEGER, 0)
  )
  ON CONFLICT DO NOTHING;

  RETURN FOUND;
END;
$function$;
ALTER FUNCTION "public"."award_achievement_manual"("uuid", "text", "text") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."award_achievement_manual"("uuid", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."award_achievement_manual"("uuid", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_achievement_manual"("uuid", "text", "text") TO "service_role";

-- ===== 3. validate_riddle_attempt : drop p_teacher_id, validated_by = auth.uid() =====
DROP FUNCTION IF EXISTS "public"."validate_riddle_attempt"("uuid", "uuid", boolean);
CREATE OR REPLACE FUNCTION "public"."validate_riddle_attempt"("p_attempt_id" "uuid", "p_is_correct" boolean)
  RETURNS TABLE("success" boolean, "theoretical_reward" numeric, "actual_reward" numeric, "is_first_win" boolean, "week_best_reward" numeric)
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
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
ALTER FUNCTION "public"."validate_riddle_attempt"("uuid", boolean) OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."validate_riddle_attempt"("uuid", boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_riddle_attempt"("uuid", boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_riddle_attempt"("uuid", boolean) TO "service_role";

-- ===== 4. teacher_owns_riddle : drop p_teacher_id (→ auth.uid()) + maj des 3 policies =====
-- Drop the 3 dependent policies first, then the old 2-arg function, recreate 1-arg, recreate policies.
DROP POLICY IF EXISTS "Teachers can create assignments for their riddles" ON "public"."riddle_assignments";
DROP POLICY IF EXISTS "Teachers can delete assignments for their riddles" ON "public"."riddle_assignments";
DROP POLICY IF EXISTS "Teachers can view assignments for their riddles" ON "public"."riddle_assignments";

DROP FUNCTION IF EXISTS "public"."teacher_owns_riddle"("uuid", "uuid");
CREATE OR REPLACE FUNCTION "public"."teacher_owns_riddle"("p_riddle_id" "uuid")
  RETURNS boolean
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
AS $function$
BEGIN
  -- Mono-teacher: ownership = the calling teacher created the riddle.
  RETURN EXISTS (
    SELECT 1 FROM riddles r
    WHERE r.id = p_riddle_id AND r.created_by = auth.uid()
  );
END;
$function$;
ALTER FUNCTION "public"."teacher_owns_riddle"("uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."teacher_owns_riddle"("uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."teacher_owns_riddle"("uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."teacher_owns_riddle"("uuid") TO "service_role";

CREATE POLICY "Teachers can create assignments for their riddles" ON "public"."riddle_assignments" FOR INSERT WITH CHECK (((assigned_by = auth.uid()) AND teacher_owns_riddle(riddle_id) AND ((class_id IS NULL) OR (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = riddle_assignments.class_id) AND is_teacher_or_admin())))) AND ((student_id IS NULL) OR (EXISTS ( SELECT 1
   FROM (class_members cm
     JOIN classes c ON ((c.id = cm.class_id)))
  WHERE ((cm.student_id = riddle_assignments.student_id) AND is_teacher_or_admin()))))));

CREATE POLICY "Teachers can delete assignments for their riddles" ON "public"."riddle_assignments" FOR DELETE USING (((assigned_by = auth.uid()) OR teacher_owns_riddle(riddle_id)));

CREATE POLICY "Teachers can view assignments for their riddles" ON "public"."riddle_assignments" FOR SELECT USING (((assigned_by = auth.uid()) OR teacher_owns_riddle(riddle_id)));

COMMIT;
