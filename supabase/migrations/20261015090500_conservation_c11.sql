-- ============================================================================
-- C11 — durées de conservation réellement appliquées
-- ============================================================================
--
-- La page de confidentialité promettait « profil : scolarité + 5 ans » et « données
-- pédagogiques : 5 ans après la dernière activité » ; run_cleanup_expired_data ne purgeait
-- ni comptes inactifs, ni pédagogie, ni messages au tuteur, ni pré-inscriptions.
--
-- Décisions de David (2026-10-11) — la purge hebdomadaire supprime désormais :
--   1. les comptes ÉLÈVES sans ACTIVITÉ depuis 5 ans — suppression complète, comme une
--      suppression de compte. Activité = la plus récente de : dernière ouverture de session
--      (ou création du compte), dernier rafraîchissement d'une session (auth.sessions),
--      dernière présence (user_presence). security-auditor : last_sign_in_at seul ne bouge
--      pas quand une session reste ouverte (jeton rafraîchi) — un élève actif sur une
--      tablette jamais déconnectée aurait été supprimé. Comptes de test exclus.
--      (delete_user_account puis auth.users, cascade), tracée dans account_deletion_audit ;
--      jamais un prof ni un admin ;
--   2. les conversations avec le tuteur IA 1 an après leur dernier message ;
--   3. les pré-inscriptions jamais activées 1 an après leur création.
--
-- ⚠️ MIGRATION DESTRUCTIVE DANS LA DURÉE : elle ne supprime rien au moment où elle est
-- appliquée, mais la purge supprimera ensuite des données chaque semaine. Mesuré en prod le
-- 2026-10-11 : le premier passage ne supprimerait RIEN (0 élève inactif depuis 5 ans,
-- 0 conversation de plus d'un an — la plus ancienne date du 13/12/2025 —, 0
-- pré-inscription). Premières suppressions de conversations attendues vers le 13/12/2026.
-- Les fichiers du storage d'un compte purgé ne sont pas retirés par le SQL : leurs chemins
-- sont consignés dans account_deletion_audit.cleanup_result.
--
-- run_cleanup_expired_data : définition reprise de la prod (md5 vérifié le 2026-10-11),
-- un appel ajouté en tête.
--
-- ROLLBACK : recréer run_cleanup_expired_data sans le bloc « C11 » ;
--   DROP FUNCTION public.run_retention_c11();
-- (les données déjà purgées ne reviennent pas).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_retention_c11()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
	v_run_id uuid;
	v_eleve record;
	v_resultat jsonb;
	v_comptes integer := 0;
	v_echecs integer := 0;
	v_conversations integer := 0;
	v_preinscriptions integer := 0;
BEGIN
	v_run_id := start_job_run('retention_c11', jsonb_build_object(
		'inactive_student_years', 5, 'tutor_conversation_years', 1, 'pending_student_years', 1));

	-- 1. Comptes élèves sans connexion depuis 5 ans
	FOR v_eleve IN
		SELECT p.id, u.email
		FROM profiles p
		JOIN auth.users u ON u.id = p.id
		WHERE p.role = 'student'
		  AND NOT coalesce(p.is_test, false)
		  AND greatest(
			coalesce(u.last_sign_in_at, u.created_at),
			u.created_at,
			(SELECT max(greatest(s.refreshed_at AT TIME ZONE 'UTC', s.updated_at))
			   FROM auth.sessions s WHERE s.user_id = u.id),
			(SELECT max(up.updated_at) FROM user_presence up WHERE up.user_id = p.id)
		  ) < now() - interval '5 years'
	LOOP
		BEGIN
			v_resultat := public.delete_user_account(v_eleve.id);
			DELETE FROM auth.users WHERE id = v_eleve.id;
			INSERT INTO account_deletion_audit (user_id, email_hash, status, error_message,
				cleanup_result, completed_at)
			VALUES (NULL, encode(extensions.digest(lower(trim(coalesce(v_eleve.email, ''))), 'sha256'), 'hex'),
				'completed', 'Conservation : 5 ans sans activité (C11)', v_resultat, now());
			v_comptes := v_comptes + 1;
		EXCEPTION WHEN OTHERS THEN
			v_echecs := v_echecs + 1;
			INSERT INTO account_deletion_audit (user_id, email_hash, status, error_message, completed_at)
			VALUES (v_eleve.id, encode(extensions.digest(lower(trim(coalesce(v_eleve.email, ''))), 'sha256'), 'hex'),
				'failed', 'Conservation : ' || SQLERRM, now());
		END;
	END LOOP;

	-- 2. Conversations avec le tuteur : 1 an après leur dernier message (messages en cascade)
	BEGIN
		DELETE FROM tutor_conversations c
		WHERE greatest(c.created_at,
			coalesce((SELECT max(m.created_at) FROM tutor_messages m WHERE m.conversation_id = c.id),
				c.created_at)) < now() - interval '1 year';
		GET DIAGNOSTICS v_conversations = ROW_COUNT;
	EXCEPTION WHEN OTHERS THEN
		v_echecs := v_echecs + 1;
		RAISE NOTICE 'Retention C11, tuteur : %', SQLERRM;
	END;

	-- 3. Pré-inscriptions jamais activées : 1 an après leur création
	BEGIN
		DELETE FROM pending_students
		WHERE NOT coalesce(is_activated, false)
		  AND created_at < now() - interval '1 year';
		GET DIAGNOSTICS v_preinscriptions = ROW_COUNT;
	EXCEPTION WHEN OTHERS THEN
		v_echecs := v_echecs + 1;
		RAISE NOTICE 'Retention C11, pré-inscriptions : %', SQLERRM;
	END;

	PERFORM complete_job_run(v_run_id,
		CASE WHEN v_echecs = 0 THEN 'success' ELSE 'failed' END, NULL,
		jsonb_build_object('student_accounts_deleted', v_comptes, 'student_accounts_failed', v_echecs,
			'tutor_conversations_deleted', v_conversations, 'pending_students_deleted', v_preinscriptions));

	RETURN jsonb_build_object('student_accounts_deleted', v_comptes, 'student_accounts_failed', v_echecs,
		'tutor_conversations_deleted', v_conversations, 'pending_students_deleted', v_preinscriptions);
END;
$$;

COMMENT ON FUNCTION public.run_retention_c11() IS
	'C11 (2026-10-11) : comptes élèves sans connexion depuis 5 ans, conversations du tuteur '
	'1 an après leur dernier message, pré-inscriptions non activées après 1 an. Appelée par '
	'run_cleanup_expired_data (hebdomadaire).';

REVOKE EXECUTE ON FUNCTION public.run_retention_c11() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_retention_c11() TO service_role;

CREATE OR REPLACE FUNCTION public.run_cleanup_expired_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_run_id UUID;
    v_error_logs_deleted INTEGER := 0;
    v_presence_deleted INTEGER := 0;
    v_friendships_deleted INTEGER := 0;
    v_messages_deleted INTEGER := 0;
    v_private_messages_deleted INTEGER := 0;
    v_audit_logs_deleted INTEGER := 0;
    v_error_occurrences_deleted INTEGER := 0;
    v_background_jobs_deleted INTEGER := 0;
    v_total_deleted INTEGER := 0;
    v_error_logs_success BOOLEAN := false;
    v_presence_success BOOLEAN := false;
    v_friendships_success BOOLEAN := false;
    v_messages_success BOOLEAN := false;
    v_private_messages_success BOOLEAN := false;
    v_audit_logs_success BOOLEAN := false;
    v_error_occurrences_success BOOLEAN := false;
    v_background_jobs_success BOOLEAN := false;
BEGIN
    -- C11 (décisions de David, 2026-10-11) : durées de conservation promises par la page
    -- de confidentialité. Isolée : un échec ne doit pas empêcher les purges ci-dessous.
    BEGIN
        PERFORM public.run_retention_c11();
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Retention C11 failed: %', SQLERRM;
    END;

    -- Start job run tracking
    v_run_id := start_job_run('retention_cleanup', jsonb_build_object(
        'retention_periods', jsonb_build_object(
            'error_logs_days', 30,
            'audit_logs_days', 60,
            'error_occurrences_days', 30,
            'background_job_runs_days', 7,
            'presence_days', 30,
            'friendships_years', 2,
            'messages_years', 3,
            'private_messages_years', 3
        )
    ));

    BEGIN
        -- ============================================================
        -- CLEANUP 1: Error logs (30 days, ALL — resolved or not)
        -- ============================================================
        BEGIN
            DELETE FROM error_logs
            WHERE created_at < NOW() - INTERVAL '30 days';
            GET DIAGNOSTICS v_error_logs_deleted = ROW_COUNT;
            v_error_logs_success := true;
            RAISE NOTICE 'Error logs cleanup: % entries deleted', v_error_logs_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error logs cleanup failed: %', SQLERRM;
            v_error_logs_success := false;
        END;

        -- ============================================================
        -- CLEANUP 2: User presence (30 days)
        -- ============================================================
        BEGIN
            DELETE FROM user_presence
            WHERE updated_at < NOW() - INTERVAL '30 days';
            GET DIAGNOSTICS v_presence_deleted = ROW_COUNT;
            v_presence_success := true;
            RAISE NOTICE 'User presence cleanup: % entries deleted', v_presence_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'User presence cleanup failed: %', SQLERRM;
            v_presence_success := false;
        END;

        -- ============================================================
        -- CLEANUP 3: Rejected friendships (2 years)
        -- ============================================================
        BEGIN
            DELETE FROM friendships
            WHERE status = 'rejected'
              AND updated_at < NOW() - INTERVAL '2 years';
            GET DIAGNOSTICS v_friendships_deleted = ROW_COUNT;
            v_friendships_success := true;
            RAISE NOTICE 'Friendships cleanup: % entries deleted', v_friendships_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Friendships cleanup failed: %', SQLERRM;
            v_friendships_success := false;
        END;

        -- ============================================================
        -- CLEANUP 4: Chat messages (3 years) - HARD DELETE
        -- Per RGPD Art. 17, must be hard delete, not soft delete
        -- ============================================================
        BEGIN
            DELETE FROM messages
            WHERE created_at < NOW() - INTERVAL '3 years';
            GET DIAGNOSTICS v_messages_deleted = ROW_COUNT;
            v_messages_success := true;
            RAISE NOTICE 'Messages cleanup (HARD DELETE): % entries deleted', v_messages_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Messages cleanup failed: %', SQLERRM;
            v_messages_success := false;
        END;

        -- ============================================================
        -- CLEANUP 5: Private messages (3 years) - HARD DELETE
        -- Cascades to message_inbox and message_attachments_v2
        -- ============================================================
        BEGIN
            DELETE FROM private_messages
            WHERE sent_at < NOW() - INTERVAL '3 years';
            GET DIAGNOSTICS v_private_messages_deleted = ROW_COUNT;
            v_private_messages_success := true;
            RAISE NOTICE 'Private messages cleanup (HARD DELETE): % entries deleted', v_private_messages_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Private messages cleanup failed: %', SQLERRM;
            v_private_messages_success := false;
        END;

        -- ============================================================
        -- CLEANUP 6: Audit logs (60 days)
        -- TOAST-heavy table (JSONB before/after snapshots).
        -- ============================================================
        BEGIN
            DELETE FROM audit_logs
            WHERE created_at < NOW() - INTERVAL '60 days';
            GET DIAGNOSTICS v_audit_logs_deleted = ROW_COUNT;
            v_audit_logs_success := true;
            RAISE NOTICE 'Audit logs cleanup: % entries deleted', v_audit_logs_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Audit logs cleanup failed: %', SQLERRM;
            v_audit_logs_success := false;
        END;

        -- ============================================================
        -- CLEANUP 7: Error occurrences (30 days)
        -- ============================================================
        BEGIN
            DELETE FROM error_occurrences
            WHERE last_seen < NOW() - INTERVAL '30 days';
            GET DIAGNOSTICS v_error_occurrences_deleted = ROW_COUNT;
            v_error_occurrences_success := true;
            RAISE NOTICE 'Error occurrences cleanup: % entries deleted', v_error_occurrences_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error occurrences cleanup failed: %', SQLERRM;
            v_error_occurrences_success := false;
        END;

        -- ============================================================
        -- CLEANUP 8: Background job runs (7 days)
        -- ============================================================
        BEGIN
            DELETE FROM background_job_runs
            WHERE started_at < NOW() - INTERVAL '7 days';
            GET DIAGNOSTICS v_background_jobs_deleted = ROW_COUNT;
            v_background_jobs_success := true;
            RAISE NOTICE 'Background job runs cleanup: % entries deleted', v_background_jobs_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Background job runs cleanup failed: %', SQLERRM;
            v_background_jobs_success := false;
        END;

        -- ============================================================
        -- Complete job run with results
        -- ============================================================
        v_total_deleted := COALESCE(v_error_logs_deleted, 0) +
                           COALESCE(v_presence_deleted, 0) +
                           COALESCE(v_friendships_deleted, 0) +
                           COALESCE(v_messages_deleted, 0) +
                           COALESCE(v_private_messages_deleted, 0) +
                           COALESCE(v_audit_logs_deleted, 0) +
                           COALESCE(v_error_occurrences_deleted, 0) +
                           COALESCE(v_background_jobs_deleted, 0);

        PERFORM complete_job_run(
            v_run_id,
            CASE
                WHEN v_error_logs_success AND v_presence_success AND v_friendships_success
                     AND v_messages_success AND v_private_messages_success
                     AND v_audit_logs_success AND v_error_occurrences_success
                     AND v_background_jobs_success
                THEN 'success'
                WHEN v_error_logs_success OR v_presence_success OR v_friendships_success
                     OR v_messages_success OR v_private_messages_success
                     OR v_audit_logs_success OR v_error_occurrences_success
                     OR v_background_jobs_success
                THEN 'success'  -- Partial success = success for monitoring
                ELSE 'failed'
            END,
            NULL,
            jsonb_build_object(
                'error_logs_deleted', COALESCE(v_error_logs_deleted, 0),
                'error_logs_success', v_error_logs_success,
                'presence_deleted', COALESCE(v_presence_deleted, 0),
                'presence_success', v_presence_success,
                'friendships_deleted', COALESCE(v_friendships_deleted, 0),
                'friendships_success', v_friendships_success,
                'messages_deleted', COALESCE(v_messages_deleted, 0),
                'messages_success', v_messages_success,
                'private_messages_deleted', COALESCE(v_private_messages_deleted, 0),
                'private_messages_success', v_private_messages_success,
                'audit_logs_deleted', COALESCE(v_audit_logs_deleted, 0),
                'audit_logs_success', v_audit_logs_success,
                'error_occurrences_deleted', COALESCE(v_error_occurrences_deleted, 0),
                'error_occurrences_success', v_error_occurrences_success,
                'background_jobs_deleted', COALESCE(v_background_jobs_deleted, 0),
                'background_jobs_success', v_background_jobs_success,
                'total_deleted', v_total_deleted,
                'rgpd_compliance', 'Art. 5(1)(e) - Storage limitation'
            )
        );

        RAISE NOTICE 'RGPD Retention cleanup complete: % total entries deleted', v_total_deleted;
        RAISE NOTICE '  - Error logs: %, Presence: %, Friendships: %',
            v_error_logs_deleted, v_presence_deleted, v_friendships_deleted;
        RAISE NOTICE '  - Messages: %, Private messages: %',
            v_messages_deleted, v_private_messages_deleted;
        RAISE NOTICE '  - Audit logs: %, Error occurrences: %, Background jobs: %',
            v_audit_logs_deleted, v_error_occurrences_deleted, v_background_jobs_deleted;

    EXCEPTION WHEN OTHERS THEN
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object(
                'error_logs_deleted', COALESCE(v_error_logs_deleted, 0),
                'presence_deleted', COALESCE(v_presence_deleted, 0),
                'friendships_deleted', COALESCE(v_friendships_deleted, 0),
                'messages_deleted', COALESCE(v_messages_deleted, 0),
                'private_messages_deleted', COALESCE(v_private_messages_deleted, 0),
                'audit_logs_deleted', COALESCE(v_audit_logs_deleted, 0),
                'error_occurrences_deleted', COALESCE(v_error_occurrences_deleted, 0),
                'background_jobs_deleted', COALESCE(v_background_jobs_deleted, 0),
                'error_logs_success', v_error_logs_success,
                'presence_success', v_presence_success,
                'friendships_success', v_friendships_success,
                'messages_success', v_messages_success,
                'private_messages_success', v_private_messages_success,
                'audit_logs_success', v_audit_logs_success,
                'error_occurrences_success', v_error_occurrences_success,
                'background_jobs_success', v_background_jobs_success
            )
        );
        RAISE;
    END;
END;
$function$;
