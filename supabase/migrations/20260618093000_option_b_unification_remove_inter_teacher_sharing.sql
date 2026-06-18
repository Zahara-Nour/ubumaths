-- Option B unification + removal of inter-teacher content sharing
-- ================================================================
--
-- Mono-teacher model. Two goals:
--   A/B. Unify messaging, moderation and a few feature RLS policies on Option B:
--        the sole teacher can message / moderate / read the work of ANY student,
--        including students enrolled in no class (hors-classe). Until now these
--        paths were scoped by class membership (a multi-teacher-era leftover).
--   C.   Remove teacher-to-teacher content sharing (chapter templates public
--        library, worksheets cross-teacher view, worksheet templates public
--        library, "teachers can view all exercises").
--
-- NON-DESTRUCTIVE migration (RLS + functions only). The destructive
-- `DROP COLUMN is_public` on chapter_templates / worksheet_templates ships in a
-- separate follow-up migration applied AFTER this is deployed (see
-- docs/wip/option-b-unification-progress.md).
--
-- Note: this also fixes a latent prod bug — get_student_teachers /
-- get_teacher_students reference `classes.archived`, a column that does not
-- exist (classes has `is_active`), so the legacy messaging RPCs error at
-- runtime. The rewrites below are role-based and no longer touch `classes`.

-- ============================================================================
-- PART A — Messaging & moderation RPCs (role-based, no school filter)
-- ============================================================================

-- A student may message the sole teacher; the teacher may message ALL students.
CREATE OR REPLACE FUNCTION public.get_allowed_recipients(p_user_id uuid)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, role text, relationship text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
	v_user_role text;
BEGIN
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

-- Students may only address the teacher; teachers may only address students.
CREATE OR REPLACE FUNCTION public.validate_message_recipients(sender_uuid uuid, recipient_uuids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
	sender_role text;
BEGIN
	SELECT role INTO sender_role FROM profiles WHERE id = sender_uuid;
	IF sender_role IS NULL THEN
		RETURN FALSE;
	END IF;
	IF array_length(recipient_uuids, 1) IS NULL OR array_length(recipient_uuids, 1) = 0 THEN
		RETURN FALSE;
	END IF;

	IF sender_role = 'student' THEN
		-- Every recipient must be the teacher (Option B: the sole teacher).
		RETURN NOT EXISTS (
			SELECT 1 FROM unnest(recipient_uuids) AS rid
			WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = rid AND p.role = 'teacher')
		);
	ELSIF sender_role = 'teacher' THEN
		-- Every recipient must be a student.
		RETURN NOT EXISTS (
			SELECT 1 FROM unnest(recipient_uuids) AS rid
			WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = rid AND p.role = 'student')
		);
	ELSIF sender_role = 'admin' THEN
		RETURN TRUE;
	END IF;

	RETURN FALSE;
END;
$function$;

-- A teacher may moderate any message whose sender or any recipient is a student.
CREATE OR REPLACE FUNCTION public.can_moderate_message(moderator_uuid uuid, message_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
	moderator_role text;
	sender_role text;
	has_student_recipient boolean;
BEGIN
	SELECT role INTO moderator_role FROM profiles WHERE id = moderator_uuid;

	IF moderator_role = 'admin' THEN
		RETURN TRUE;
	END IF;
	IF moderator_role IS DISTINCT FROM 'teacher' THEN
		RETURN FALSE;
	END IF;

	-- Sender is a student → moderatable (Option B: every student is "ours").
	SELECT p.role INTO sender_role
	FROM private_messages m
	JOIN profiles p ON p.id = m.sender_id
	WHERE m.id = message_uuid;

	IF sender_role IS NULL THEN
		RETURN FALSE; -- message doesn't exist (or sender missing)
	END IF;
	IF sender_role = 'student' THEN
		RETURN TRUE;
	END IF;

	-- Otherwise, moderatable if any recipient is a student.
	SELECT EXISTS (
		SELECT 1
		FROM message_inbox mi
		JOIN profiles p ON p.id = mi.recipient_id
		WHERE mi.message_id = message_uuid AND p.role = 'student'
	) INTO has_student_recipient;

	RETURN coalesce(has_student_recipient, false);
END;
$function$;

-- ============================================================================
-- PART B — Feature RLS → Option B (teacher reads ANY student's work)
-- ============================================================================

-- python_files: teacher/admin read any student's files (was is_teacher_of_student).
DROP POLICY IF EXISTS "Teachers can read student python files" ON public.python_files;
CREATE POLICY "Teachers can read student python files" ON public.python_files
	FOR SELECT TO authenticated
	USING (public.is_my_student(owner_id));

-- python_notebooks: idem (was is_teacher_of_student(author_id)).
DROP POLICY IF EXISTS "Teachers can read student notebooks" ON public.python_notebooks;
CREATE POLICY "Teachers can read student notebooks" ON public.python_notebooks
	FOR SELECT TO authenticated
	USING (public.is_my_student(author_id));

-- python_exercise_mastery: idem (was is_teacher_of_student(student_id)).
DROP POLICY IF EXISTS "pem_select_teacher" ON public.python_exercise_mastery;
CREATE POLICY "pem_select_teacher" ON public.python_exercise_mastery
	FOR SELECT TO authenticated
	USING (public.is_my_student(student_id));

-- python_notebook_checkpoint_runs: teacher reads runs for their own notebooks OR
-- any student's runs (Option B). The is_my_student(user_id) branch subsumes the
-- old class-assignment branch.
DROP POLICY IF EXISTS "Teachers can read checkpoint runs for their notebooks" ON public.python_notebook_checkpoint_runs;
CREATE POLICY "Teachers can read checkpoint runs for their notebooks" ON public.python_notebook_checkpoint_runs
	FOR SELECT TO authenticated
	USING (
		public.is_my_student(user_id)
		OR EXISTS (
			SELECT 1 FROM public.python_notebooks pn
			WHERE pn.id = python_notebook_checkpoint_runs.notebook_id
			  AND pn.author_id = auth.uid()
		)
	);

-- profiles: drop the redundant class-scoped student→teacher view. Profile reads
-- are already wide-open via the leaderboard policies (USING true) and the teacher
-- sees students via is_my_student, so this policy is dead weight. Pure cleanup.
DROP POLICY IF EXISTS "students_view_class_teacher_profile" ON public.profiles;

-- ============================================================================
-- PART C — Remove inter-teacher content sharing
-- ============================================================================

-- chapter_templates: drop the public library (teacher A sees teacher B's public
-- published templates). Owners keep their own; admins keep "manage all".
DROP POLICY IF EXISTS "Teachers can view public published templates" ON public.chapter_templates;

-- exercises: "view all" was a multi-teacher read. Tighten to "view own". Public
-- exercises and share tokens (student/parent-facing) are untouched.
DROP POLICY IF EXISTS "Teachers can view all exercises" ON public.exercises;
CREATE POLICY "Teachers can view own exercises" ON public.exercises
	FOR SELECT TO authenticated
	USING (created_by = auth.uid());

-- worksheets: drop the cross-teacher same-school published-sharing branch. Keep
-- own + admin + student access.
DROP POLICY IF EXISTS "Users can view worksheets" ON public.worksheets;
CREATE POLICY "Users can view worksheets" ON public.worksheets
	FOR SELECT TO authenticated
	USING (
		(created_by = auth.uid())
		OR public.is_admin()
		OR public.student_has_worksheet_access(id)
	);

-- worksheet_templates: drop the is_public library branch (inter-teacher sharing).
-- Owners + admins only. (is_public column dropped in the follow-up migration.)
DROP POLICY IF EXISTS "Users can view templates" ON public.worksheet_templates;
CREATE POLICY "Users can view templates" ON public.worksheet_templates
	FOR SELECT TO authenticated
	USING (
		(created_by = auth.uid())
		OR public.is_admin()
	);
