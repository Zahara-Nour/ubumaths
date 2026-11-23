-- ============================================================================
-- Mesures de performance chez nous (chantier amelioration, PR 1)
-- ============================================================================
--
-- Vercel a rendu payant le détail par indicateur de Speed Insights (2026-11-21).
-- Les mesures des visiteurs (LCP, FCP, TTFB, INP, CLS) sont gardées dans notre base.
--
-- Décisions de David (2026-11-21) : table anonyme ; lisible par l'admin seul ; lignes
-- gardées 90 jours, effacées par la purge hebdomadaire existante
-- (run_cleanup_expired_data, pg_cron « rgpd-retention-cleanup », 0 3 * * 0).
--
-- Qui pourra lire quoi, qu'il ne pouvait pas lire avant :
--   - l'admin : les lignes de web_vital_samples (heure arrondie, page sous sa forme
--     générique, indicateur, valeur, type d'appareil) ;
--   - le serveur (service_role) : les mêmes lignes, pour calculer le relevé (PR 3) ;
--   - le prof, l'élève, le visiteur : rien.
-- Qui écrit : le serveur seul, en ajout seul (route, metric, value, device_type ; ni la
-- date ni l'identifiant de ligne). Personne ne modifie. Seule la purge efface.
--
-- Anonymat, tenu par la table elle-même :
--   - aucune colonne de compte, d'adresse IP, de navigateur ni de session ;
--   - created_at arrondi à l'heure (une mesure ne se recoupe pas, à la seconde, avec
--     l'activité d'un élève dans une autre table), et non réglable par le serveur ;
--   - id : UUID tiré au hasard, pas un compteur. Un numéro croissant garderait l'ordre
--     exact des envois, donc le parcours d'une personne dans l'heure ;
--   - route : identifiant de route SvelteKit (« /(public)/cours/[token] »). Chaque
--     segment est un mot en minuscules, chiffres et tirets, un groupe « (…) » ou un
--     paramètre « […] » ; un début d'UUID est refusé. C'est un filet : un jeton écrit
--     en minuscules passerait. La garantie est la liste des routes connues, tenue par
--     le serveur à la réception (PR 2).
--
-- run_cleanup_expired_data : définition reprise de la prod (md5 du corps vérifié le
-- 2026-11-21, 514ef722a64973c8f7f78b2396293382, identique à la migration
-- 20261111224115), un bloc ajouté après L6.
--
-- Migration ADDITIVE. ROLLBACK : recréer run_cleanup_expired_data sans le bloc
-- « Mesures de performance » (définition de 20261111224115_purge_reponses_traces.sql), puis
--   DROP FUNCTION public.purge_web_vital_samples();
--   DROP TABLE public.web_vital_samples;
-- ============================================================================

CREATE TABLE public.web_vital_samples (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	created_at timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
	route text NOT NULL,
	metric text NOT NULL,
	value double precision NOT NULL,
	device_type text NOT NULL,
	CONSTRAINT web_vital_samples_route_check CHECK (
		char_length(route) <= 200
		AND (
			route = '/'
			OR route ~ '^(/([a-z0-9-]+|\([a-z0-9-]+\)|\[{1,2}(\.\.\.)?[A-Za-z0-9_]+(=[A-Za-z0-9_]+)?\]{1,2}))+$'
		)
		AND route !~ '[0-9a-f]{8}-[0-9a-f]{4}-'
	),
	CONSTRAINT web_vital_samples_metric_check CHECK (
		metric IN ('LCP', 'FCP', 'TTFB', 'INP', 'CLS')
	),
	-- Durées en millisecondes, dix minutes au plus ; CLS sans unité. NaN et l'infini
	-- sont plus grands que tout nombre pour Postgres : refusés par la borne haute.
	CONSTRAINT web_vital_samples_value_check CHECK (
		value >= 0
		AND value <= CASE WHEN metric = 'CLS' THEN 100 ELSE 600000 END
	),
	CONSTRAINT web_vital_samples_device_type_check CHECK (
		device_type IN ('mobile', 'tablet', 'desktop')
	)
);

COMMENT ON TABLE public.web_vital_samples IS
	'Mesures de performance des visiteurs (Core Web Vitals), anonymes : ni compte, ni adresse, '
	'ni navigateur. Écrites par le serveur seul, lues par l''admin seul, gardées 90 jours '
	'(purge_web_vital_samples).';
COMMENT ON COLUMN public.web_vital_samples.created_at IS
	'Heure de la mesure, arrondie à l''heure (anonymat).';
COMMENT ON COLUMN public.web_vital_samples.route IS
	'Forme générique de la page (identifiant de route SvelteKit), jamais l''adresse réelle.';
COMMENT ON COLUMN public.web_vital_samples.value IS
	'Millisecondes pour LCP, FCP, TTFB et INP ; sans unité pour CLS.';

CREATE INDEX idx_web_vital_samples_created_at ON public.web_vital_samples (created_at);

ALTER TABLE public.web_vital_samples ENABLE ROW LEVEL SECURITY;

-- Les droits par défaut de Supabase donnent tout à anon et authenticated : on repart de zéro.
REVOKE ALL ON TABLE public.web_vital_samples FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.web_vital_samples TO authenticated;
GRANT SELECT ON TABLE public.web_vital_samples TO service_role;
GRANT INSERT (route, metric, value, device_type) ON TABLE public.web_vital_samples TO service_role;

-- Seule policy : sans elle, un compte connecté ne lit aucune ligne.
CREATE POLICY "admin_view_web_vital_samples" ON public.web_vital_samples
	FOR SELECT TO authenticated
	USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.purge_web_vital_samples()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
	v_run_id uuid;
	v_coupure timestamptz := now() - interval '90 days';
	v_effacees integer := 0;
BEGIN
	v_run_id := start_job_run('web_vital_samples_purge',
		jsonb_build_object('cutoff', v_coupure));

	-- Un échec est journalisé « failed » (page admin des tâches) et ne remonte pas :
	-- relancé, il annulerait aussi la ligne de journal dans le bloc de l'appelant.
	BEGIN
		DELETE FROM web_vital_samples WHERE created_at < v_coupure;
		GET DIAGNOSTICS v_effacees = ROW_COUNT;
	EXCEPTION WHEN OTHERS THEN
		PERFORM complete_job_run(v_run_id, 'failed', SQLERRM,
			jsonb_build_object('cutoff', v_coupure));
		RAISE NOTICE 'Web vital samples purge failed: %', SQLERRM;
		RETURN NULL;
	END;

	PERFORM complete_job_run(v_run_id, 'success', NULL,
		jsonb_build_object('cutoff', v_coupure, 'samples_deleted', v_effacees));

	RETURN v_effacees;
END;
$$;

COMMENT ON FUNCTION public.purge_web_vital_samples() IS
	'Chantier amelioration (2026-11-21) : efface les mesures de performance de plus de 90 jours. '
	'Appelée par run_cleanup_expired_data (hebdomadaire). Rend le nombre de lignes effacées, '
	'NULL en cas d''échec (journalisé failed).';

REVOKE EXECUTE ON FUNCTION public.purge_web_vital_samples() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_web_vital_samples() TO service_role;

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

    -- Mesures de performance (chantier amelioration, décisions de David du 2026-11-21) :
    -- lignes de plus de 90 jours. Isolée, comme C11 et L6.
    BEGIN
        PERFORM public.purge_web_vital_samples();
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Web vital samples purge failed: %', SQLERRM;
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
