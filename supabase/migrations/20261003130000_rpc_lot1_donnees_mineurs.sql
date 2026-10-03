-- =============================================================================
-- RPC lot 1 : données des élèves mineurs (fonctions SECURITY DEFINER)
-- =============================================================================
--
-- Constat : des fonctions SECURITY DEFINER exécutables par `authenticated`
-- prenaient un identifiant d'utilisateur en paramètre sans vérifier QUI appelle.
-- Un élève connecté lisait donc, par simple appel RPC, les conversations, les
-- exercices, le solde, les amis… d'un autre élève, et la liste des classes
-- (avec élèves) d'autres écoles.
--
-- Décisions de David (Q143, Q144) :
--   * un élève ne lit plus RIEN du compte d'un autre ;
--   * professeur et admin gardent ce que leurs écrans font ;
--   * recherche d'amis : l'école est la frontière sociale, jamais une classe
--     fermée.
--
-- Ce que fait cette migration (ADDITIVE : aucun DROP, aucune donnée touchée) :
--   F1 get_user_conversations      : 42501 si p_user_id ≠ auth.uid()
--                                     (p_user_id NULL = soi, inchangé).
--   F2 get_conversation_participants : aucun appelant → EXECUTE retiré
--                                     (service_role seul).
--   F3 get_teacher_classes_with_data : réservé prof/admin (42501 sinon).
--   F4 get_student_exercises        : soi, prof/admin, ou appel service.
--   F5 compute_*_level (×7)         : aucun appelant client → EXECUTE retiré
--                                     (seuls appelants : compute_competence_level
--                                     et update_student_competence_level,
--                                     SECURITY DEFINER propriété de postgres).
--      get_exercise_completion_stats, get_assignment_completion_stats :
--                                     réservé prof/admin.
--   F6 get_friend_ids, check_gidouilles_balance, get_shop_items,
--      get_shop_item_detail          : aucun appelant (src, SQL, policies,
--                                     vues) → EXECUTE retiré.
--   Q144 get_classes_by_user_grade, get_students_in_class_by_grade :
--                                     classes ACTIVES de MON école uniquement.
--                                     Champs renvoyés inchangés.
--
-- Pour chaque fonction modifiée, le corps est repris de la prod
-- (pg_get_functiondef, md5(prosrc) local = prod vérifié le 2026-10-03) ; seule
-- la garde est ajoutée. Les fonctions LANGUAGE sql restent en sql : la garde est
-- une première instruction qui appelle un assert (le corps d'origine reste
-- intact, les types de retour ne bougent pas).
--
-- Droits d'origine relevés en prod (proacl), identiques pour TOUTES :
--   {postgres=X, authenticated=X, service_role=X} — ni PUBLIC, ni anon.
-- ⚠️ Leçon de l'audit d'août : REVOKE FROM anon seul ne suffit pas quand
-- PUBLIC a EXECUTE ; on révoque donc PUBLIC, anon ET authenticated.
--
-- Tests : tests/integration/rpc-lot1-donnees-mineurs.test.ts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Gardes réutilisables (appelées uniquement depuis les fonctions SECURITY
-- DEFINER ci-dessous, qui s'exécutent en tant que postgres : aucun rôle client
-- n'a besoin de les exécuter).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_teacher_or_admin()
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé au professeur' USING ERRCODE = '42501';
  END IF;
END;
$function$;

-- Lire les données d'un élève : lui-même, le professeur/admin, ou un appel
-- service (auth.uid() NULL : le client service_role ; anon n'a pas EXECUTE sur
-- les fonctions qui l'appellent).
CREATE OR REPLACE FUNCTION public.assert_can_read_student(p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL
     OR auth.uid() = p_student_id
     OR public.is_teacher_or_admin() THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'Accès refusé : données d''un autre élève' USING ERRCODE = '42501';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.assert_teacher_or_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assert_can_read_student(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_teacher_or_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_can_read_student(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- get_user_conversations
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(conversation_id uuid, name text, is_group boolean, class_id uuid, last_message_preview text, last_message_at timestamp with time zone, unread_count bigint, participant_count bigint, other_user_id uuid, other_user_firstname text, other_user_lastname text, other_user_avatar_url text, is_muted boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  -- Garde (lot 1) : un élève ne lit que SES conversations. p_user_id NULL = soi.
  IF auth.uid() IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : conversations d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    ucv.conversation_id,
    ucv.name,
    ucv.is_group,
    ucv.class_id,
    ucv.last_message_preview,
    ucv.last_message_at,
    ucv.unread_count,
    ucv.participant_count,
    ucv.other_user_id,
    ucv.other_user_firstname,
    ucv.other_user_lastname,
    ucv.other_user_avatar_url,
    ucv.is_muted
  FROM user_conversations_view ucv
  WHERE ucv.user_id = v_user_id
  ORDER BY
    ucv.last_message_at DESC NULLS LAST,
    ucv.updated_at DESC;
END;
$function$
;

-- -----------------------------------------------------------------------------
-- get_teacher_classes_with_data
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_teacher_classes_with_data(p_is_test_mode boolean DEFAULT false)
 RETURNS TABLE(id uuid, name text, description text, join_code text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, google_classroom_course_id uuid, student_count bigint, schedules jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Garde (lot 1) : réservé au professeur et à l'admin.
  IF NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé au professeur' USING ERRCODE = '42501';
  END IF;

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
$function$
;

-- -----------------------------------------------------------------------------
-- get_student_exercises
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_student_exercises(p_student_id uuid)
 RETURNS TABLE(exercise_id uuid, exercise_title text, variations jsonb, shared jsonb, variables jsonb, distribution_mode text, tags text[], grades text[], assignment_id uuid, assignment_type text, assigned_at timestamp with time zone, optional_deadline timestamp with time zone, notes text, assigned_by_name text, completed_at timestamp with time zone, last_viewed_at timestamp with time zone, view_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
	-- Garde (lot 1) : soi-même, le professeur/admin, ou un appel service.
	select public.assert_can_read_student(p_student_id);
	select
		e.id as exercise_id,
		e.title as exercise_title,
		e.variations,
		e.shared,
		e.variables,
		e.distribution_mode,
		coalesce(
			array(
				select t.name from resource_tags rt
				join tags t on t.id = rt.tag_id
				where rt.resource_id = e.id and rt.resource_kind = 'exercise'
				order by t.name
			),
			'{}'::text[]
		) as tags,
		e.grades,
		ea.id as assignment_id,
		ea.assigned_to_type as assignment_type,
		ea.assigned_at,
		ea.optional_deadline,
		ea.notes,
		p.full_name as assigned_by_name,
		ec.completed_at,
		ec.last_viewed_at,
		ec.view_count
	from exercises e
	left join exercise_assignments ea on e.id = ea.exercise_id
		and ea.is_active = true
		and (
			ea.student_id = p_student_id
			or ea.class_id in (
				select class_id from class_members
				where student_id = p_student_id and status = 'active'
			)
			or ea.assigned_to_type = 'public'
		)
	left join profiles p on ea.assigned_by = p.id
	left join exercise_completions ec on e.id = ec.exercise_id
		and ec.student_id = p_student_id
	where
		e.is_public = true
		or ea.id is not null
	order by
		case when ea.id is not null and ec.completed_at is null then 0 else 1 end,
		ec.last_viewed_at desc nulls last,
		ea.assigned_at desc nulls last;
$function$
;

-- -----------------------------------------------------------------------------
-- get_exercise_completion_stats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_exercise_completion_stats(p_exercise_id uuid)
 RETURNS TABLE(total_assignments bigint, total_students bigint, completed_count bigint, in_progress_count bigint, not_started_count bigint, completion_percentage numeric, total_viewed bigint, average_view_count numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
    -- Garde (lot 1) : réservé au professeur et à l'admin.
    SELECT public.assert_teacher_or_admin();
    WITH assignment_students AS (
        -- Get all students who have access to this exercise via assignments
        SELECT DISTINCT
            ea.exercise_id,
            CASE
                -- Direct student assignment
                WHEN ea.assigned_to_type = 'student' THEN ea.student_id
                -- Class assignment - expand to all students in class
                WHEN ea.assigned_to_type = 'class' THEN cm.student_id
                -- Public assignment - we can't count specific students
                ELSE NULL
            END as student_id
        FROM exercise_assignments ea
        LEFT JOIN class_members cm ON ea.assigned_to_type = 'class' AND ea.class_id = cm.class_id
        WHERE ea.exercise_id = p_exercise_id
            AND ea.is_active = TRUE
            AND (ea.assigned_to_type != 'public')  -- Exclude public (can't count students)
    ),
    completion_data AS (
        -- Get completion data for all students who have access
        SELECT
            asts.student_id,
            ec.completed_at,
            ec.view_count,
            ec.last_viewed_at
        FROM assignment_students asts
        LEFT JOIN exercise_completions ec
            ON asts.exercise_id = ec.exercise_id
            AND asts.student_id = ec.student_id
        WHERE asts.student_id IS NOT NULL  -- Exclude NULL from public assignments
    )
    SELECT
        -- Total number of assignments (not students - a class assignment = 1 assignment)
        (SELECT COUNT(*) FROM exercise_assignments WHERE exercise_id = p_exercise_id AND is_active = TRUE)::BIGINT as total_assignments,

        -- Total unique students with access
        COUNT(DISTINCT cd.student_id)::BIGINT as total_students,

        -- Students who completed
        COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.completed_at IS NOT NULL)::BIGINT as completed_count,

        -- Students who viewed but not completed
        COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.completed_at IS NULL AND cd.view_count > 0)::BIGINT as in_progress_count,

        -- Students who haven't viewed yet
        (COUNT(DISTINCT cd.student_id) - COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.view_count > 0))::BIGINT as not_started_count,

        -- Completion percentage
        CASE
            WHEN COUNT(DISTINCT cd.student_id) > 0
            THEN ROUND(
                (COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.completed_at IS NOT NULL)::NUMERIC /
                 COUNT(DISTINCT cd.student_id)::NUMERIC) * 100,
                2
            )
            ELSE 0
        END as completion_percentage,

        -- Total students who viewed
        COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.view_count > 0)::BIGINT as total_viewed,

        -- Average views per student (only students who viewed)
        COALESCE(
            AVG(cd.view_count) FILTER (WHERE cd.view_count > 0),
            0
        ) as average_view_count

    FROM completion_data cd;
$function$
;

-- -----------------------------------------------------------------------------
-- get_assignment_completion_stats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_assignment_completion_stats(p_assignment_id uuid)
 RETURNS TABLE(total_target_students bigint, students_viewed bigint, students_completed bigint, total_views bigint, avg_views_per_student numeric, completion_rate numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
    -- Garde (lot 1) : réservé au professeur et à l'admin.
    SELECT public.assert_teacher_or_admin();
    WITH assignment_details AS (
        SELECT
            assigned_to_type,
            student_id,
            class_id
        FROM exercise_assignments
        WHERE id = p_assignment_id
    ),
    target_students AS (
        SELECT
            CASE
                WHEN ad.assigned_to_type = 'student' THEN ARRAY[ad.student_id]
                WHEN ad.assigned_to_type = 'class' THEN ARRAY_AGG(cm.student_id)
                ELSE ARRAY[]::UUID[]  -- Public has no specific target
            END as student_ids
        FROM assignment_details ad
        LEFT JOIN class_members cm ON ad.class_id = cm.class_id
        GROUP BY ad.assigned_to_type, ad.student_id
    )
    SELECT
        CARDINALITY((SELECT student_ids FROM target_students)) as total_target_students,
        COUNT(DISTINCT ec.student_id) FILTER (WHERE ec.id IS NOT NULL) as students_viewed,
        COUNT(DISTINCT ec.student_id) FILTER (WHERE ec.completed_at IS NOT NULL) as students_completed,
        COALESCE(SUM(ec.view_count), 0) as total_views,
        COALESCE(AVG(ec.view_count), 0) as avg_views_per_student,
        CASE
            WHEN CARDINALITY((SELECT student_ids FROM target_students)) > 0
            THEN ROUND(
                COUNT(DISTINCT ec.student_id) FILTER (WHERE ec.completed_at IS NOT NULL)::NUMERIC /
                CARDINALITY((SELECT student_ids FROM target_students))::NUMERIC * 100,
                2
            )
            ELSE 0
        END as completion_rate
    FROM target_students
    LEFT JOIN exercise_completions ec ON ec.assignment_id = p_assignment_id
        AND (
            (SELECT assigned_to_type FROM assignment_details) = 'public'
            OR ec.student_id IN (SELECT unnest(student_ids) FROM target_students)
        );
$function$
;

-- -----------------------------------------------------------------------------
-- get_classes_by_user_grade
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_classes_by_user_grade()
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_grades text[];
BEGIN
  -- Get unique grades from user's classes
  SELECT ARRAY_AGG(DISTINCT c.grade)
  INTO user_grades
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE cm.student_id = auth.uid()
    AND cm.status = 'active'
    AND c.grade IS NOT NULL;

  -- If no grades found, return user's own classes
  IF user_grades IS NULL OR array_length(user_grades, 1) IS NULL THEN
    RETURN QUERY
    SELECT c.id, c.name
    FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = auth.uid()
      AND cm.status = 'active'
      AND c.is_active = true -- Q144 : jamais une classe fermée
    ORDER BY c.name;
    RETURN;
  END IF;

  -- Return all active classes with matching grades
  RETURN QUERY
  SELECT c.id, c.name
  FROM classes c
  WHERE c.is_active = true
    AND c.grade = ANY(user_grades)
    AND c.school_id = public.my_school() -- Q144 : l'école est la frontière sociale
  ORDER BY c.name;
END;
$function$
;

-- -----------------------------------------------------------------------------
-- get_students_in_class_by_grade
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_students_in_class_by_grade(target_class_id uuid)
 RETURNS TABLE(id uuid, full_name text, firstname text, lastname text, avatar_url text, role text, friendship_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_grades text[];
  target_grade text;
  target_school uuid;
  target_active boolean;
BEGIN
  -- Get the grade of the target class
  SELECT c.grade, c.school_id, c.is_active INTO target_grade, target_school, target_active
  FROM classes c
  WHERE c.id = target_class_id;

  -- Q144 : classe active de MON école uniquement (l'école est la frontière sociale).
  IF target_active IS NOT TRUE
     OR target_school IS NULL
     OR target_school IS DISTINCT FROM public.my_school() THEN
    RETURN;
  END IF;

  -- Get unique grades from user's classes
  SELECT ARRAY_AGG(DISTINCT c.grade)
  INTO user_grades
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE cm.student_id = auth.uid()
    AND cm.status = 'active'
    AND c.grade IS NOT NULL;

  -- Security check: only allow access if target class grade matches user's grades
  -- or if both have no grade (fallback for backward compatibility)
  IF target_grade IS NOT NULL AND (user_grades IS NULL OR NOT (target_grade = ANY(user_grades))) THEN
    -- Target class has a grade that doesn't match user's grades - return empty
    RETURN;
  END IF;

  -- If target has no grade, check if user is a member of that class
  IF target_grade IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM class_members cm
      WHERE cm.class_id = target_class_id
        AND cm.student_id = auth.uid()
        AND cm.status = 'active'
    ) THEN
      RETURN;
    END IF;
  END IF;

  -- Return students in the target class with their friendship status
  -- Cast role to text since it's an enum (user_role)
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.firstname,
    p.lastname,
    p.avatar_url,
    p.role::text AS role,
    f.status::text AS friendship_status
  FROM class_members cm
  JOIN profiles p ON p.id = cm.student_id
  LEFT JOIN friendships f ON (
    (f.requester_id = auth.uid() AND f.addressee_id = p.id)
    OR (f.addressee_id = auth.uid() AND f.requester_id = p.id)
  )
  WHERE cm.class_id = target_class_id
    AND cm.status = 'active'
    AND cm.student_id != auth.uid()
  ORDER BY p.full_name, p.lastname, p.firstname;
END;
$function$
;

-- -----------------------------------------------------------------------------
-- F2, F5 (compute_*), F6 : aucun appelant client → EXECUTE retiré.
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_conversation_participants(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_calculer_level(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_chercher_level(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_communiquer_level(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_competence_level(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_modeliser_level(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_raisonner_level(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_representer_level(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_friend_ids(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_gidouilles_balance(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_shop_items(uuid, text, text, text, boolean, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_shop_item_detail(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_conversation_participants(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_calculer_level(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_chercher_level(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_communiquer_level(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_competence_level(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_modeliser_level(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_raisonner_level(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_representer_level(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_friend_ids(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_gidouilles_balance(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_shop_items(uuid, text, text, text, boolean, text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_shop_item_detail(uuid, uuid) TO service_role;

--- ===========================================================================
--- ROLLBACK : retirer le préfixe « -- » des lignes de code (sed 's/^-- //;
--- s/^--$//'), les lignes « --- » restent des commentaires.
--- ===========================================================================
--- 1. Droits d'origine : {postgres=X, authenticated=X, service_role=X}.
-- GRANT EXECUTE ON FUNCTION public.get_conversation_participants(uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.compute_calculer_level(uuid, uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.compute_chercher_level(uuid, uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.compute_communiquer_level(uuid, uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.compute_competence_level(uuid, uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.compute_modeliser_level(uuid, uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.compute_raisonner_level(uuid, uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.compute_representer_level(uuid, uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_friend_ids(uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.check_gidouilles_balance(uuid, integer) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_shop_items(uuid, text, text, text, boolean, text, text, integer, integer) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_shop_item_detail(uuid, uuid) TO authenticated;
--
--- 2. Corps d'origine (prod, 2026-10-03). CREATE OR REPLACE conserve les droits,
---    inchangés par cette migration pour ces sept fonctions.
--
-- CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id uuid DEFAULT NULL::uuid)
--  RETURNS TABLE(conversation_id uuid, name text, is_group boolean, class_id uuid, last_message_preview text, last_message_at timestamp with time zone, unread_count bigint, participant_count bigint, other_user_id uuid, other_user_firstname text, other_user_lastname text, other_user_avatar_url text, is_muted boolean)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_user_id UUID := COALESCE(p_user_id, auth.uid());
-- BEGIN
--   RETURN QUERY
--   SELECT
--     ucv.conversation_id,
--     ucv.name,
--     ucv.is_group,
--     ucv.class_id,
--     ucv.last_message_preview,
--     ucv.last_message_at,
--     ucv.unread_count,
--     ucv.participant_count,
--     ucv.other_user_id,
--     ucv.other_user_firstname,
--     ucv.other_user_lastname,
--     ucv.other_user_avatar_url,
--     ucv.is_muted
--   FROM user_conversations_view ucv
--   WHERE ucv.user_id = v_user_id
--   ORDER BY
--     ucv.last_message_at DESC NULLS LAST,
--     ucv.updated_at DESC;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_teacher_classes_with_data(p_is_test_mode boolean DEFAULT false)
--  RETURNS TABLE(id uuid, name text, description text, join_code text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, google_classroom_course_id uuid, student_count bigint, schedules jsonb)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- BEGIN
--   RETURN QUERY
--   SELECT
--     c.id,
--     c.name,
--     c.description,
--     c.join_code,
--     c.is_active,
--     c.created_at,
--     c.updated_at,
--     c.google_classroom_course_id,
--     -- Count students filtered by test mode
--     COALESCE(
--       COUNT(DISTINCT cm.student_id) FILTER (
--         WHERE p.id IS NOT NULL
--         AND p.is_test = p_is_test_mode
--       ),
--       0
--     ) AS student_count,
--     -- Aggregate schedules into JSONB array
--     COALESCE(
--       JSONB_AGG(
--         JSONB_BUILD_OBJECT(
--           'id', cs.id,
--           'class_id', cs.class_id,
--           'day_of_week', cs.day_of_week,
--           'start_time', cs.start_time,
--           'end_time', cs.end_time,
--           'subject', cs.subject,
--           'room', cs.room,
--           'notes', cs.notes
--         )
--         ORDER BY cs.day_of_week, cs.start_time
--       ) FILTER (WHERE cs.id IS NOT NULL),
--       '[]'::JSONB
--     ) AS schedules
--   FROM classes c
--   LEFT JOIN class_members cm ON c.id = cm.class_id
--   LEFT JOIN profiles p ON cm.student_id = p.id
--   LEFT JOIN class_schedules cs ON c.id = cs.class_id
--   WHERE c.is_active = TRUE
--   GROUP BY c.id, c.name, c.description, c.join_code,
--            c.is_active, c.created_at, c.updated_at, c.google_classroom_course_id
--   ORDER BY c.name;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_student_exercises(p_student_id uuid)
--  RETURNS TABLE(exercise_id uuid, exercise_title text, variations jsonb, shared jsonb, variables jsonb, distribution_mode text, tags text[], grades text[], assignment_id uuid, assignment_type text, assigned_at timestamp with time zone, optional_deadline timestamp with time zone, notes text, assigned_by_name text, completed_at timestamp with time zone, last_viewed_at timestamp with time zone, view_count integer)
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- 	select
-- 		e.id as exercise_id,
-- 		e.title as exercise_title,
-- 		e.variations,
-- 		e.shared,
-- 		e.variables,
-- 		e.distribution_mode,
-- 		coalesce(
-- 			array(
-- 				select t.name from resource_tags rt
-- 				join tags t on t.id = rt.tag_id
-- 				where rt.resource_id = e.id and rt.resource_kind = 'exercise'
-- 				order by t.name
-- 			),
-- 			'{}'::text[]
-- 		) as tags,
-- 		e.grades,
-- 		ea.id as assignment_id,
-- 		ea.assigned_to_type as assignment_type,
-- 		ea.assigned_at,
-- 		ea.optional_deadline,
-- 		ea.notes,
-- 		p.full_name as assigned_by_name,
-- 		ec.completed_at,
-- 		ec.last_viewed_at,
-- 		ec.view_count
-- 	from exercises e
-- 	left join exercise_assignments ea on e.id = ea.exercise_id
-- 		and ea.is_active = true
-- 		and (
-- 			ea.student_id = p_student_id
-- 			or ea.class_id in (
-- 				select class_id from class_members
-- 				where student_id = p_student_id and status = 'active'
-- 			)
-- 			or ea.assigned_to_type = 'public'
-- 		)
-- 	left join profiles p on ea.assigned_by = p.id
-- 	left join exercise_completions ec on e.id = ec.exercise_id
-- 		and ec.student_id = p_student_id
-- 	where
-- 		e.is_public = true
-- 		or ea.id is not null
-- 	order by
-- 		case when ea.id is not null and ec.completed_at is null then 0 else 1 end,
-- 		ec.last_viewed_at desc nulls last,
-- 		ea.assigned_at desc nulls last;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_exercise_completion_stats(p_exercise_id uuid)
--  RETURNS TABLE(total_assignments bigint, total_students bigint, completed_count bigint, in_progress_count bigint, not_started_count bigint, completion_percentage numeric, total_viewed bigint, average_view_count numeric)
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
--     WITH assignment_students AS (
--         -- Get all students who have access to this exercise via assignments
--         SELECT DISTINCT
--             ea.exercise_id,
--             CASE
--                 -- Direct student assignment
--                 WHEN ea.assigned_to_type = 'student' THEN ea.student_id
--                 -- Class assignment - expand to all students in class
--                 WHEN ea.assigned_to_type = 'class' THEN cm.student_id
--                 -- Public assignment - we can't count specific students
--                 ELSE NULL
--             END as student_id
--         FROM exercise_assignments ea
--         LEFT JOIN class_members cm ON ea.assigned_to_type = 'class' AND ea.class_id = cm.class_id
--         WHERE ea.exercise_id = p_exercise_id
--             AND ea.is_active = TRUE
--             AND (ea.assigned_to_type != 'public')  -- Exclude public (can't count students)
--     ),
--     completion_data AS (
--         -- Get completion data for all students who have access
--         SELECT
--             asts.student_id,
--             ec.completed_at,
--             ec.view_count,
--             ec.last_viewed_at
--         FROM assignment_students asts
--         LEFT JOIN exercise_completions ec
--             ON asts.exercise_id = ec.exercise_id
--             AND asts.student_id = ec.student_id
--         WHERE asts.student_id IS NOT NULL  -- Exclude NULL from public assignments
--     )
--     SELECT
--         -- Total number of assignments (not students - a class assignment = 1 assignment)
--         (SELECT COUNT(*) FROM exercise_assignments WHERE exercise_id = p_exercise_id AND is_active = TRUE)::BIGINT as total_assignments,
--
--         -- Total unique students with access
--         COUNT(DISTINCT cd.student_id)::BIGINT as total_students,
--
--         -- Students who completed
--         COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.completed_at IS NOT NULL)::BIGINT as completed_count,
--
--         -- Students who viewed but not completed
--         COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.completed_at IS NULL AND cd.view_count > 0)::BIGINT as in_progress_count,
--
--         -- Students who haven't viewed yet
--         (COUNT(DISTINCT cd.student_id) - COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.view_count > 0))::BIGINT as not_started_count,
--
--         -- Completion percentage
--         CASE
--             WHEN COUNT(DISTINCT cd.student_id) > 0
--             THEN ROUND(
--                 (COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.completed_at IS NOT NULL)::NUMERIC /
--                  COUNT(DISTINCT cd.student_id)::NUMERIC) * 100,
--                 2
--             )
--             ELSE 0
--         END as completion_percentage,
--
--         -- Total students who viewed
--         COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.view_count > 0)::BIGINT as total_viewed,
--
--         -- Average views per student (only students who viewed)
--         COALESCE(
--             AVG(cd.view_count) FILTER (WHERE cd.view_count > 0),
--             0
--         ) as average_view_count
--
--     FROM completion_data cd;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_assignment_completion_stats(p_assignment_id uuid)
--  RETURNS TABLE(total_target_students bigint, students_viewed bigint, students_completed bigint, total_views bigint, avg_views_per_student numeric, completion_rate numeric)
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
--     WITH assignment_details AS (
--         SELECT
--             assigned_to_type,
--             student_id,
--             class_id
--         FROM exercise_assignments
--         WHERE id = p_assignment_id
--     ),
--     target_students AS (
--         SELECT
--             CASE
--                 WHEN ad.assigned_to_type = 'student' THEN ARRAY[ad.student_id]
--                 WHEN ad.assigned_to_type = 'class' THEN ARRAY_AGG(cm.student_id)
--                 ELSE ARRAY[]::UUID[]  -- Public has no specific target
--             END as student_ids
--         FROM assignment_details ad
--         LEFT JOIN class_members cm ON ad.class_id = cm.class_id
--         GROUP BY ad.assigned_to_type, ad.student_id
--     )
--     SELECT
--         CARDINALITY((SELECT student_ids FROM target_students)) as total_target_students,
--         COUNT(DISTINCT ec.student_id) FILTER (WHERE ec.id IS NOT NULL) as students_viewed,
--         COUNT(DISTINCT ec.student_id) FILTER (WHERE ec.completed_at IS NOT NULL) as students_completed,
--         COALESCE(SUM(ec.view_count), 0) as total_views,
--         COALESCE(AVG(ec.view_count), 0) as avg_views_per_student,
--         CASE
--             WHEN CARDINALITY((SELECT student_ids FROM target_students)) > 0
--             THEN ROUND(
--                 COUNT(DISTINCT ec.student_id) FILTER (WHERE ec.completed_at IS NOT NULL)::NUMERIC /
--                 CARDINALITY((SELECT student_ids FROM target_students))::NUMERIC * 100,
--                 2
--             )
--             ELSE 0
--         END as completion_rate
--     FROM target_students
--     LEFT JOIN exercise_completions ec ON ec.assignment_id = p_assignment_id
--         AND (
--             (SELECT assigned_to_type FROM assignment_details) = 'public'
--             OR ec.student_id IN (SELECT unnest(student_ids) FROM target_students)
--         );
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_classes_by_user_grade()
--  RETURNS TABLE(id uuid, name text)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   user_grades text[];
-- BEGIN
--   -- Get unique grades from user's classes
--   SELECT ARRAY_AGG(DISTINCT c.grade)
--   INTO user_grades
--   FROM class_members cm
--   JOIN classes c ON c.id = cm.class_id
--   WHERE cm.student_id = auth.uid()
--     AND cm.status = 'active'
--     AND c.grade IS NOT NULL;
--
--   -- If no grades found, return user's own classes
--   IF user_grades IS NULL OR array_length(user_grades, 1) IS NULL THEN
--     RETURN QUERY
--     SELECT c.id, c.name
--     FROM class_members cm
--     JOIN classes c ON c.id = cm.class_id
--     WHERE cm.student_id = auth.uid()
--       AND cm.status = 'active'
--     ORDER BY c.name;
--     RETURN;
--   END IF;
--
--   -- Return all active classes with matching grades
--   RETURN QUERY
--   SELECT c.id, c.name
--   FROM classes c
--   WHERE c.is_active = true
--     AND c.grade = ANY(user_grades)
--   ORDER BY c.name;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_students_in_class_by_grade(target_class_id uuid)
--  RETURNS TABLE(id uuid, full_name text, firstname text, lastname text, avatar_url text, role text, friendship_status text)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   user_grades text[];
--   target_grade text;
-- BEGIN
--   -- Get the grade of the target class
--   SELECT c.grade INTO target_grade
--   FROM classes c
--   WHERE c.id = target_class_id;
--
--   -- Get unique grades from user's classes
--   SELECT ARRAY_AGG(DISTINCT c.grade)
--   INTO user_grades
--   FROM class_members cm
--   JOIN classes c ON c.id = cm.class_id
--   WHERE cm.student_id = auth.uid()
--     AND cm.status = 'active'
--     AND c.grade IS NOT NULL;
--
--   -- Security check: only allow access if target class grade matches user's grades
--   -- or if both have no grade (fallback for backward compatibility)
--   IF target_grade IS NOT NULL AND (user_grades IS NULL OR NOT (target_grade = ANY(user_grades))) THEN
--     -- Target class has a grade that doesn't match user's grades - return empty
--     RETURN;
--   END IF;
--
--   -- If target has no grade, check if user is a member of that class
--   IF target_grade IS NULL THEN
--     IF NOT EXISTS (
--       SELECT 1 FROM class_members cm
--       WHERE cm.class_id = target_class_id
--         AND cm.student_id = auth.uid()
--         AND cm.status = 'active'
--     ) THEN
--       RETURN;
--     END IF;
--   END IF;
--
--   -- Return students in the target class with their friendship status
--   -- Cast role to text since it's an enum (user_role)
--   RETURN QUERY
--   SELECT
--     p.id,
--     p.full_name,
--     p.firstname,
--     p.lastname,
--     p.avatar_url,
--     p.role::text AS role,
--     f.status::text AS friendship_status
--   FROM class_members cm
--   JOIN profiles p ON p.id = cm.student_id
--   LEFT JOIN friendships f ON (
--     (f.requester_id = auth.uid() AND f.addressee_id = p.id)
--     OR (f.addressee_id = auth.uid() AND f.requester_id = p.id)
--   )
--   WHERE cm.class_id = target_class_id
--     AND cm.status = 'active'
--     AND cm.student_id != auth.uid()
--   ORDER BY p.full_name, p.lastname, p.firstname;
-- END;
-- $function$
-- ;
--
--- 3. Gardes ajoutées : à supprimer APRÈS l'étape 2 (plus aucune fonction ne les
---    appelle alors).
-- DROP FUNCTION public.assert_can_read_student(uuid);
-- DROP FUNCTION public.assert_teacher_or_admin();
