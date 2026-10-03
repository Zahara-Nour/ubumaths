-- =============================================================================
-- RPC lot 5 : gardes restantes — les 24 fonctions SECURITY DEFINER relevées par
-- le garde-fou Q145 (tests/integration/garde-fonctions-security-definer.test.ts)
-- =============================================================================
--
-- Décision de David (Q143) : un élève ne lit ni n'écrit rien sur le compte
-- d'un autre ; prof et admin gardent ce que leurs écrans font.
--
-- Qui gagne quel accès : personne. Qui perd :
--   - un élève qui s'attribuait un succès (award_achievement_manual ne
--     vérifiait que l'inscription de l'élève CIBLE, pas le rôle de l'appelant :
--     10 succès « event_based » actifs en prod, 70 points ; aucune attribution
--     manuelle n'a jamais eu lieu en prod, mesuré le 2026-10-03) ;
--   - un élève qui interrogeait le compte d'un autre par identifiant (refus
--     42501) ;
--   - tout compte connecté perd 16 fonctions SANS appelant utilisateur
--     (service_role et les fonctions SECURITY DEFINER appelantes gardent
--     EXECUTE : un appel imbriqué vérifie les droits du PROPRIÉTAIRE, postgres).
--
-- 1. GARDES (corps repris de la prod, seule la garde est ajoutée ; corps
--    plpgsql d'origine dans un bloc imbriqué, VERBATIM ; les deux LANGUAGE sql
--    passent en plpgsql, même requête, même volatilité) :
--      prof/admin : award_achievement_manual (route prof /api/achievements/award,
--        requireRoles teacher/admin), get_teacher_classes_for_messaging (route
--        /api/messages/recipients, branche prof seulement).
--      soi, AMI ou prof/admin : check_daily_trade_limit, check_marketplace_enabled
--        — /api/marketplace/trades POST vérifie aussi le PARTENAIRE, qui doit
--        être un ami (is_friend : amitié acceptée avec auth.uid()).
--      soi ou prof/admin : is_conversation_participant, is_riddle_assigned_to_student,
--        student_has_exercise_access(uuid, uuid), can_moderate_message.
--        Policies qui les appellent, TOUTES avec auth.uid() en argument
--        (vérifié en prod le 2026-10-03) : la garde est toujours satisfaite.
--          conversation_participants."Users can view conversation participants"
--          riddles."Students can view assigned riddles and riddle of the day"
--          exercise_completions (3 policies) ; private_messages."Teachers can
--          view messages for moderation".
--      auth.uid() NULL = client service (anon n'a pas EXECUTE) : garde la main.
--    md5(prosrc) d'origine, identiques en prod et en local (2026-10-03) :
--      award_achievement_manual          c8f06ad185834c73af1e10cf70bd0cf7
--      get_teacher_classes_for_messaging 5fb57d2fa14c04bc913b05d0ef40c0a4
--      check_daily_trade_limit           46086f49d5133e04dab617dba2a3ae50
--      check_marketplace_enabled         d79b5af1b2278d476d58145c87cbe01e
--      is_conversation_participant       6b7fe6dbedcd7e2b4771c09aaa324938
--      is_riddle_assigned_to_student     3362c24eaae0bd0f55db691419587e5f
--      student_has_exercise_access(2)    8e68127f6fefa4b4ea05c741558b30fa
--      can_moderate_message              bac836f586e0e385cf8c3cfa8de4f99c
--
-- 2. REVOKE authenticated (aucun appelant utilisateur : ni src, ni policy, ni
--    vue, ni cron — vérifié en prod ; seuls appelants, tous SECURITY DEFINER
--    propriété de postgres) :
--      record_listing_view, get_user_frequent_templates, validate_attachment_upload,
--      validate_1on1_chat_creation, calculate_daily_challenge_gidouilles,
--      calculate_minesweeper_gidouilles (×2)                 : aucun appelant
--      check_and_unlock_achievements      ← complete_minesweeper_game
--      update_student_observable_state    ← trigger skill_attempts_after_insert
--      get_students_in_class, validate_class_message_recipients,
--      validate_message_recipients        ← send_private_message
--      check_achievement_prerequisites    ← process_achievement_event,
--                                           update_achievement_progress
--      get_next_riddle_attempt_number     ← submit_riddle_attempt
--      is_kanban_board_member             ← can_assign_kanban_card (qui le
--        demande pour l'ASSIGNÉ, un autre compte : une garde auth.uid() aurait
--        cassé l'assignation, d'où le REVOKE)
--      can_participate_in_tournament      ← start_tournament_game
--
-- Droits d'origine (proacl), identiques pour les 24 :
--   {postgres=X, authenticated=X, service_role=X}.
--
-- ORDRE DE LIVRAISON : aucun code ne change. La migration peut partir seule.
--
-- Tests : tests/integration/rpc-lot5-gardes-restantes.test.ts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Gardes
-- -----------------------------------------------------------------------------
-- ---
-- award_achievement_manual
-- ---
CREATE OR REPLACE FUNCTION public.award_achievement_manual(p_student_id uuid, p_achievement_id text, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 5, Q143) : réservée prof/admin (route /api/achievements/award, requireRoles teacher/admin) ; le contrôle d'inscription de l'élève reste dans le corps.
  -- auth.uid() NULL = client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé au professeur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine, inchangé, dans un bloc imbriqué (son éventuel
  -- EXCEPTION WHEN OTHERS n'avale pas le refus ci-dessus).

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
END;
$function$
;

-- ---
-- get_teacher_classes_for_messaging
-- ---
CREATE OR REPLACE FUNCTION public.get_teacher_classes_for_messaging()
 RETURNS TABLE(class_id uuid, class_name text, student_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 5, Q143) : réservée prof/admin (seul appelant : /api/messages/recipients, branche role = 'teacher').
  -- auth.uid() NULL = client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé au professeur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine, inchangé, dans un bloc imbriqué (son éventuel
  -- EXCEPTION WHEN OTHERS n'avale pas le refus ci-dessus).

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
END;
$function$
;

-- ---
-- check_daily_trade_limit
-- ---
CREATE OR REPLACE FUNCTION public.check_daily_trade_limit(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 5, Q143) : SON compte, un AMI (partenaire d'échange, /api/marketplace/trades POST), ou prof/admin.
  -- auth.uid() NULL = client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_friend(p_user_id) AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine, inchangé, dans un bloc imbriqué (son éventuel
  -- EXCEPTION WHEN OTHERS n'avale pas le refus ci-dessus).

DECLARE
  v_trade_count INTEGER;
  v_max_trades INTEGER;
BEGIN
  -- Get max trades per day from config (default 10)
  SELECT COALESCE(MAX(max_trades_per_day), 10) INTO v_max_trades
  FROM marketplace_config mc
  JOIN classes c ON c.school_id = mc.school_id
  JOIN class_members cm ON cm.class_id = c.id
  WHERE cm.student_id = p_user_id;

  -- Count trades created or participated in today
  SELECT COUNT(*) INTO v_trade_count
  FROM marketplace_trades
  WHERE (initiator_id = p_user_id OR partner_id = p_user_id)
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE
    AND completed_at < CURRENT_DATE + INTERVAL '1 day';

  RETURN json_build_object(
    'success', true,
    'can_create_trade', v_trade_count < v_max_trades,
    'trades_today', v_trade_count,
    'max_trades', v_max_trades,
    'remaining_trades', GREATEST(0, v_max_trades - v_trade_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
END;
$function$
;

-- ---
-- check_marketplace_enabled
-- ---
CREATE OR REPLACE FUNCTION public.check_marketplace_enabled(p_student_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 5, Q143) : SON compte, un AMI (partenaire d'échange), ou prof/admin.
  -- auth.uid() NULL = client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_student_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_friend(p_student_id) AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine, inchangé, dans un bloc imbriqué (son éventuel
  -- EXCEPTION WHEN OTHERS n'avale pas le refus ci-dessus).

DECLARE
    v_class_id UUID;
    v_class_enabled BOOLEAN;
BEGIN
    -- Get student's class
    SELECT cm.class_id INTO v_class_id
    FROM public.class_members cm
    WHERE cm.student_id = p_student_id
    LIMIT 1;

    IF v_class_id IS NULL THEN
        RETURN false;
    END IF;

    -- Check class-level config (new approach: config per class)
    SELECT mc.enabled_for_class INTO v_class_enabled
    FROM public.marketplace_config mc
    WHERE mc.class_id = v_class_id;

    -- If class config exists, use its enabled_for_class value
    IF v_class_enabled IS NOT NULL THEN
        RETURN v_class_enabled;
    END IF;

    -- No class config found - marketplace is disabled by default
    RETURN false;
END;
END;
$function$
;

-- ---
-- is_conversation_participant
-- ---
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 5, Q143) : SON compte ou prof/admin ; policy conversation_participants : toujours auth.uid().
  -- auth.uid() NULL = client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine (LANGUAGE sql), même requête :
  RETURN (
SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  )
  );
END;
$function$
;

-- ---
-- is_riddle_assigned_to_student
-- ---
CREATE OR REPLACE FUNCTION public.is_riddle_assigned_to_student(p_riddle_id uuid, p_student_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 5, Q143) : SON compte ou prof/admin ; policy riddles : toujours auth.uid().
  -- auth.uid() NULL = client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_student_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine, inchangé, dans un bloc imbriqué (son éventuel
  -- EXCEPTION WHEN OTHERS n'avale pas le refus ci-dessus).

begin
	-- Affectée nommément, ou à une classe où l'élève est ENCORE inscrit.
	return exists (
		select 1 from riddle_assignments ra
		where ra.riddle_id = p_riddle_id
			and (
				ra.student_id = p_student_id
				or exists (
					select 1 from class_members cm
					where cm.class_id = ra.class_id
						and cm.student_id = p_student_id
						and cm.status = 'active'
				)
			)
	);
end;
END;
$function$
;

-- ---
-- student_has_exercise_access
-- ---
CREATE OR REPLACE FUNCTION public.student_has_exercise_access(p_exercise_id uuid, p_student_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 5, Q143) : SON compte ou prof/admin ; policies exercise_completions et /api/exercises/[id]/access : toujours auth.uid().
  -- auth.uid() NULL = client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_student_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine (LANGUAGE sql), même requête :
  RETURN (
select exists (
		-- Exercise is public
		select 1 from exercises
		where id = p_exercise_id
		and is_public = true
	) or exists (
		-- Student has an active assignment
		select 1 from exercise_assignments ea
		where ea.exercise_id = p_exercise_id
		and ea.is_active = true
		and (
			-- Direct assignment: no class involved, so no status to check.
			ea.student_id = p_student_id
			-- Class assignment: the membership must still be active.
			or ea.class_id in (
				select class_id from class_members
				where student_id = p_student_id
				and status = 'active'
			)
			-- Public assignment
			or ea.assigned_to_type = 'public'
		)
	)
  );
END;
$function$
;

-- ---
-- can_moderate_message
-- ---
CREATE OR REPLACE FUNCTION public.can_moderate_message(moderator_uuid uuid, message_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 5, Q143) : SON compte (moderator_uuid) ou prof/admin ; policy private_messages : toujours auth.uid().
  -- auth.uid() NULL = client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND moderator_uuid IS DISTINCT FROM auth.uid()
     AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine, inchangé, dans un bloc imbriqué (son éventuel
  -- EXCEPTION WHEN OTHERS n'avale pas le refus ci-dessus).

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
END;
$function$
;

-- -----------------------------------------------------------------------------
-- 2. REVOKE
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.record_listing_view(uuid, uuid),
  public.get_user_frequent_templates(uuid, integer),
  public.validate_attachment_upload(uuid, uuid, integer),
  public.validate_1on1_chat_creation(uuid, uuid),
  public.calculate_daily_challenge_gidouilles(text, integer, uuid),
  public.calculate_minesweeper_gidouilles(text, integer, uuid, integer),
  public.calculate_minesweeper_gidouilles(text, integer, uuid, integer, integer),
  public.check_and_unlock_achievements(uuid),
  public.update_student_observable_state(uuid, uuid),
  public.get_students_in_class(uuid),
  public.validate_class_message_recipients(uuid, uuid),
  public.validate_message_recipients(uuid, uuid[]),
  public.check_achievement_prerequisites(uuid, text),
  public.get_next_riddle_attempt_number(uuid, uuid),
  public.is_kanban_board_member(uuid, uuid),
  public.can_participate_in_tournament(uuid, uuid)
FROM authenticated;

-- =============================================================================
-- ROLLBACK (à exécuter tel quel, dans une transaction) — retour exact à l'état
-- d'origine : corps de prod (md5 ci-dessus) et droits.
-- =============================================================================
-- GRANT EXECUTE ON FUNCTION
--   public.record_listing_view(uuid, uuid),
--   public.get_user_frequent_templates(uuid, integer),
--   public.validate_attachment_upload(uuid, uuid, integer),
--   public.validate_1on1_chat_creation(uuid, uuid),
--   public.calculate_daily_challenge_gidouilles(text, integer, uuid),
--   public.calculate_minesweeper_gidouilles(text, integer, uuid, integer),
--   public.calculate_minesweeper_gidouilles(text, integer, uuid, integer, integer),
--   public.check_and_unlock_achievements(uuid),
--   public.update_student_observable_state(uuid, uuid),
--   public.get_students_in_class(uuid),
--   public.validate_class_message_recipients(uuid, uuid),
--   public.validate_message_recipients(uuid, uuid[]),
--   public.check_achievement_prerequisites(uuid, text),
--   public.get_next_riddle_attempt_number(uuid, uuid),
--   public.is_kanban_board_member(uuid, uuid),
--   public.can_participate_in_tournament(uuid, uuid)
-- TO authenticated;
--
-- CREATE OR REPLACE FUNCTION public.award_achievement_manual(p_student_id uuid, p_achievement_id text, p_reason text DEFAULT NULL::text)
--  RETURNS boolean
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- DECLARE
--   v_achievement RECORD;
--   v_is_teacher BOOLEAN;
-- BEGIN
--   -- Mono-teacher: any class membership means the sole teacher teaches this student.
--   SELECT EXISTS (
--     SELECT 1 FROM class_members cm
--     WHERE cm.student_id = p_student_id
--   ) INTO v_is_teacher;
--
--   IF NOT v_is_teacher THEN
--     RAISE EXCEPTION 'Teacher does not have access to this student';
--   END IF;
--
--   SELECT * INTO v_achievement
--   FROM achievements
--   WHERE id = p_achievement_id AND is_active = true;
--
--   IF NOT FOUND THEN
--     RAISE EXCEPTION 'Achievement not found';
--   END IF;
--
--   IF v_achievement.unlock_type NOT IN ('manual', 'event_based') THEN
--     RAISE EXCEPTION 'This achievement cannot be manually awarded';
--   END IF;
--
--   -- Mono-teacher: the awarder is the calling teacher (auth.uid()).
--   INSERT INTO student_achievements (
--     student_id, achievement_id, unlocked_by, unlock_reason, points_awarded, gidouilles_awarded
--   )
--   VALUES (
--     p_student_id, p_achievement_id, auth.uid(), COALESCE(p_reason, 'Manually awarded by teacher'),
--     COALESCE((v_achievement.metadata->>'points')::INTEGER, 0),
--     COALESCE((v_achievement.metadata->>'gidouilles_reward')::INTEGER, 0)
--   )
--   ON CONFLICT DO NOTHING;
--
--   RETURN FOUND;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_teacher_classes_for_messaging()
--  RETURNS TABLE(class_id uuid, class_name text, student_count integer)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- BEGIN
--   RETURN QUERY
--   SELECT
--     c.id AS class_id,
--     c.name AS class_name,
--     COUNT(cm.student_id)::INT AS student_count
--   FROM classes c
--   LEFT JOIN class_members cm ON cm.class_id = c.id
--   WHERE c.is_active = TRUE
--   GROUP BY c.id, c.name
--   ORDER BY c.name;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.check_daily_trade_limit(p_user_id uuid)
--  RETURNS json
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- DECLARE
--   v_trade_count INTEGER;
--   v_max_trades INTEGER;
-- BEGIN
--   -- Get max trades per day from config (default 10)
--   SELECT COALESCE(MAX(max_trades_per_day), 10) INTO v_max_trades
--   FROM marketplace_config mc
--   JOIN classes c ON c.school_id = mc.school_id
--   JOIN class_members cm ON cm.class_id = c.id
--   WHERE cm.student_id = p_user_id;
--
--   -- Count trades created or participated in today
--   SELECT COUNT(*) INTO v_trade_count
--   FROM marketplace_trades
--   WHERE (initiator_id = p_user_id OR partner_id = p_user_id)
--     AND status = 'completed'
--     AND completed_at >= CURRENT_DATE
--     AND completed_at < CURRENT_DATE + INTERVAL '1 day';
--
--   RETURN json_build_object(
--     'success', true,
--     'can_create_trade', v_trade_count < v_max_trades,
--     'trades_today', v_trade_count,
--     'max_trades', v_max_trades,
--     'remaining_trades', GREATEST(0, v_max_trades - v_trade_count)
--   );
--
-- EXCEPTION
--   WHEN OTHERS THEN
--     RETURN json_build_object(
--       'success', false,
--       'error', SQLERRM
--     );
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.check_marketplace_enabled(p_student_id uuid)
--  RETURNS boolean
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- DECLARE
--     v_class_id UUID;
--     v_class_enabled BOOLEAN;
-- BEGIN
--     -- Get student's class
--     SELECT cm.class_id INTO v_class_id
--     FROM public.class_members cm
--     WHERE cm.student_id = p_student_id
--     LIMIT 1;
--
--     IF v_class_id IS NULL THEN
--         RETURN false;
--     END IF;
--
--     -- Check class-level config (new approach: config per class)
--     SELECT mc.enabled_for_class INTO v_class_enabled
--     FROM public.marketplace_config mc
--     WHERE mc.class_id = v_class_id;
--
--     -- If class config exists, use its enabled_for_class value
--     IF v_class_enabled IS NOT NULL THEN
--         RETURN v_class_enabled;
--     END IF;
--
--     -- No class config found - marketplace is disabled by default
--     RETURN false;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
--  RETURNS boolean
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
--   SELECT EXISTS (
--     SELECT 1 FROM conversation_participants
--     WHERE conversation_id = p_conversation_id
--     AND user_id = p_user_id
--   );
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.is_riddle_assigned_to_student(p_riddle_id uuid, p_student_id uuid)
--  RETURNS boolean
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- begin
-- 	-- Affectée nommément, ou à une classe où l'élève est ENCORE inscrit.
-- 	return exists (
-- 		select 1 from riddle_assignments ra
-- 		where ra.riddle_id = p_riddle_id
-- 			and (
-- 				ra.student_id = p_student_id
-- 				or exists (
-- 					select 1 from class_members cm
-- 					where cm.class_id = ra.class_id
-- 						and cm.student_id = p_student_id
-- 						and cm.status = 'active'
-- 				)
-- 			)
-- 	);
-- end;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.student_has_exercise_access(p_exercise_id uuid, p_student_id uuid)
--  RETURNS boolean
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- 	select exists (
-- 		-- Exercise is public
-- 		select 1 from exercises
-- 		where id = p_exercise_id
-- 		and is_public = true
-- 	) or exists (
-- 		-- Student has an active assignment
-- 		select 1 from exercise_assignments ea
-- 		where ea.exercise_id = p_exercise_id
-- 		and ea.is_active = true
-- 		and (
-- 			-- Direct assignment: no class involved, so no status to check.
-- 			ea.student_id = p_student_id
-- 			-- Class assignment: the membership must still be active.
-- 			or ea.class_id in (
-- 				select class_id from class_members
-- 				where student_id = p_student_id
-- 				and status = 'active'
-- 			)
-- 			-- Public assignment
-- 			or ea.assigned_to_type = 'public'
-- 		)
-- 	);
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.can_moderate_message(moderator_uuid uuid, message_uuid uuid)
--  RETURNS boolean
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- DECLARE
-- 	moderator_role text;
-- 	sender_role text;
-- 	has_student_recipient boolean;
-- BEGIN
-- 	SELECT role INTO moderator_role FROM profiles WHERE id = moderator_uuid;
--
-- 	IF moderator_role = 'admin' THEN
-- 		RETURN TRUE;
-- 	END IF;
-- 	IF moderator_role IS DISTINCT FROM 'teacher' THEN
-- 		RETURN FALSE;
-- 	END IF;
--
-- 	-- Sender is a student → moderatable (Option B: every student is "ours").
-- 	SELECT p.role INTO sender_role
-- 	FROM private_messages m
-- 	JOIN profiles p ON p.id = m.sender_id
-- 	WHERE m.id = message_uuid;
--
-- 	IF sender_role IS NULL THEN
-- 		RETURN FALSE; -- message doesn't exist (or sender missing)
-- 	END IF;
-- 	IF sender_role = 'student' THEN
-- 		RETURN TRUE;
-- 	END IF;
--
-- 	-- Otherwise, moderatable if any recipient is a student.
-- 	SELECT EXISTS (
-- 		SELECT 1
-- 		FROM message_inbox mi
-- 		JOIN profiles p ON p.id = mi.recipient_id
-- 		WHERE mi.message_id = message_uuid AND p.role = 'student'
-- 	) INTO has_student_recipient;
--
-- 	RETURN coalesce(has_student_recipient, false);
-- END;
-- $function$
-- ;
