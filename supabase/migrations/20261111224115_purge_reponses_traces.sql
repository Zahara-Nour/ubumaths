-- ============================================================================
-- L6 — purge de fin d'année des réponses des traces (chantier formes-de-serie)
-- ============================================================================
--
-- ADR 0038 : le prof lit du texte libre écrit par des mineurs (réponse case par case
-- d'une Saisie, d'un Contrôle blanc, d'une Course) ; borné en longueur, purgé en fin
-- d'année scolaire.
--
-- Décisions de David (2026-11-11) :
--   - chaque dimanche, dans la purge RGPD existante (run_cleanup_expired_data, pg_cron
--     « rgpd-retention-cleanup », 0 3 * * 0) : pas de nouveau cron ;
--   - traces créées AVANT LE 1er AOÛT de l'année scolaire en cours (minuit, heure de
--     Paris) : date fixe, la même pour tous, élèves hors classe compris (pas de
--     school_years, pas de geste admin) ;
--   - seulement les traces : les copies de contrôle et les anciennes séances libres
--     (test_answers) ne sont pas touchées.
--
-- ⚠️ MIGRATION DESTRUCTIVE DANS LA DURÉE : elle n'efface rien au moment où elle est
-- appliquée, mais la purge effacera ensuite chaque semaine, pour ces traces :
--   - answer_parts (réponse case par case) et part_verdicts (verdict par case) → NULL.
-- Gardés : réussi/raté, origine, lieu, durées, fin, graine, date.
-- Qui ne pourra plus lire ce qu'il lisait : l'élève (ses réponses) et son prof (celles
-- de ses élèves), pour les années passées ; l'export RGPD ne les contiendra plus.
-- Mesuré en prod le 2026-11-11 : 0 trace avec réponse (code des PR 4 et 5 pas encore
-- déployé) ; premières réponses effacées le premier dimanche d'août 2027.
-- Les CHECK de skill_attempts acceptent les deux colonnes NULL ensemble pour tout lieu.
--
-- Accès : purge_trace_answers est SECURITY DEFINER, exécutable par le serveur seul
-- (REVOKE PUBLIC, anon, authenticated) ; aucune policy touchée.
--
-- run_cleanup_expired_data : définition reprise de la prod (md5 du corps vérifié le
-- 2026-11-11, identique à la migration 20261015090500), un bloc ajouté après C11.
--
-- ROLLBACK : recréer run_cleanup_expired_data sans le bloc « L6 » (définition de
-- 20261015090500_conservation_c11.sql), puis
--   DROP FUNCTION public.purge_trace_answers();
--   DROP FUNCTION public.trace_answers_cutoff(date);
-- (les réponses déjà purgées ne reviennent pas).
-- ============================================================================

-- 1er août de l'année scolaire en cours, à minuit à Paris, pour le jour donné
-- (heure de Paris) : du 1er août au 31 juillet suivant, la même coupure.
CREATE OR REPLACE FUNCTION public.trace_answers_cutoff(p_today date)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
	SELECT (make_date(
		extract(year FROM p_today)::int - CASE WHEN extract(month FROM p_today) < 8 THEN 1 ELSE 0 END,
		8, 1)::timestamp AT TIME ZONE 'Europe/Paris');
$$;

COMMENT ON FUNCTION public.trace_answers_cutoff(date) IS
	'L6 (formes-de-serie) : 1er août de l''année scolaire du jour donné, minuit à Paris. '
	'Les traces créées avant perdent réponse et verdicts par case (purge_trace_answers).';

REVOKE EXECUTE ON FUNCTION public.trace_answers_cutoff(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trace_answers_cutoff(date) TO service_role;

CREATE OR REPLACE FUNCTION public.purge_trace_answers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
	v_run_id uuid;
	v_coupure timestamptz := public.trace_answers_cutoff((now() AT TIME ZONE 'Europe/Paris')::date);
	v_purgees integer := 0;
BEGIN
	v_run_id := start_job_run('trace_answers_purge',
		jsonb_build_object('cutoff', v_coupure));

	-- Un échec est journalisé « failed » (page admin des tâches) et ne remonte pas :
	-- relancé, il annulerait aussi la ligne de journal dans le bloc de l'appelant.
	BEGIN
		UPDATE skill_attempts
		SET answer_parts = NULL, part_verdicts = NULL
		WHERE created_at < v_coupure
		  AND (answer_parts IS NOT NULL OR part_verdicts IS NOT NULL);
		GET DIAGNOSTICS v_purgees = ROW_COUNT;
	EXCEPTION WHEN OTHERS THEN
		PERFORM complete_job_run(v_run_id, 'failed', SQLERRM,
			jsonb_build_object('cutoff', v_coupure));
		RAISE NOTICE 'Trace answers purge failed: %', SQLERRM;
		RETURN NULL;
	END;

	PERFORM complete_job_run(v_run_id, 'success', NULL,
		jsonb_build_object('cutoff', v_coupure, 'traces_purged', v_purgees));

	RETURN v_purgees;
END;
$$;

COMMENT ON FUNCTION public.purge_trace_answers() IS
	'L6 (formes-de-serie, 2026-11-11) : efface answer_parts et part_verdicts des traces créées '
	'avant le 1er août de l''année scolaire en cours. Appelée par run_cleanup_expired_data '
	'(hebdomadaire). Rend le nombre de traces purgées, NULL en cas d''échec (journalisé failed).';

REVOKE EXECUTE ON FUNCTION public.purge_trace_answers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_trace_answers() TO service_role;

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

    -- L6 (chantier formes-de-serie, décisions de David du 2026-11-11) : réponses et
    -- verdicts par case des traces des années scolaires passées. Isolée, comme C11.
    BEGIN
        PERFORM public.purge_trace_answers();
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Trace answers purge failed: %', SQLERRM;
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
