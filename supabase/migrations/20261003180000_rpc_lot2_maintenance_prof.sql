-- =============================================================================
-- RPC lot 2 : tâches de maintenance et actions réservées au prof (Q143)
-- =============================================================================
--
-- Décision de David (Q143) : un élève ne lance plus aucune tâche de maintenance
-- et ne fait plus d'action réservée au prof ; prof et admin gardent ce que
-- leurs écrans font.
--
-- Avant : ces fonctions SECURITY DEFINER étaient exécutables par tout compte
-- connecté, sans contrôle d'appelant. Un élève pouvait par exemple vider
-- audit_logs (cleanup_old_audit_logs(-1)), effacer les erreurs résolues,
-- choisir l'énigme du jour au nom d'un autre, dupliquer un modèle de message
-- au nom du prof, gonfler le compteur de tuteur d'un camarade.
--
-- 1. REVOKE (service_role seul, + postgres propriétaire) — tâches de
--    maintenance. Appelants vérifiés (2026-10-03) :
--      - pg_cron (cron.job) tourne en postgres : aucun impact ;
--      - fonctions SQL appelantes toutes SECURITY DEFINER propriétaire
--        postgres (run_*, cleanup_stale_trades, cleanup_stuck_job_runs,
--        update_student_observable_state) : aucun impact ;
--      - code : /api/admin/cron/trigger, /api/riddles/auto-select-daily et le
--        tuteur passent déjà par le client service ; /api/errors/cleanup,
--        /api/errors/delete-resolved et les trois routes de tournois du
--        démineur passent au client service dans la MÊME livraison.
--      ⚠️ ORDRE : le code doit être déployé AVANT cette migration (sinon les
--      tournois ne s'activent/terminent plus, et le nettoyage admin échoue).
--    Hors liste exprès : auto_log_template_changes, cleanup_kanban_* (fonctions
--    trigger, non appelables en RPC) ; auto_accept_exact_proposal,
--    cleanup_expired_rate_limits, run_daily_summaries, run_weekly_rewards
--    (déjà service_role seul).
--
-- 2. GARDE dans le corps (le REVOKE casserait un écran légitime) :
--      - set_riddle_of_the_day : prof/admin, ou serveur (auth.uid() NULL) ;
--        selected_by := coalesce(auth.uid(), p_selected_by) (plus de forgerie).
--      - duplicate_template : prof/admin ET p_user_id = auth.uid(), ou serveur.
--      - log_template_action : appelée par le trigger INVOKER
--        auto_log_template_changes (écritures de modèles, réservées prof/admin
--        par la RLS) et par la route des favoris (tout compte). Donc :
--        prof/admin, serveur, ou l'appelant qui journalise SON favori, sans
--        p_changes ni p_metadata, et conforme à user_favorite_templates
--        (favorited : la ligne existe ; unfavorited : elle n'existe plus — la
--        route supprime puis journalise).
--    Corps repris de la production (pg_get_functiondef, 2026-10-03), md5(prosrc)
--    identiques en prod et en local : set_riddle_of_the_day
--    c98fa831ab040bdbd749d2178e7dbd55, duplicate_template
--    b6a526149bcce4a3a3a19cf46681bfa9, log_template_action
--    ef6d4d632a8044c61435189ea3af6c3b ; seule la garde est ajoutée.
--
-- 3. BUG auto_expire_listings (md5 prod afacfc38cdb19d3769935531fd7dd7d3) :
--    écrivait marketplace_listings.updated_at, colonne inexistante → échouait
--    toujours (aucun appelant aujourd'hui). Corps corrigé : les annonces
--    expirées et les propositions rejetées sont suivies par RETURNING, et les
--    verrous sont levés sous l'id de l'annonce ET de chaque proposition
--    rejetée (cf. 20261003165000).
--
-- Qui gagne quel accès : personne. Qui perd : l'élève (et tout compte non
-- prof/admin) perd l'exécution des fonctions ci-dessus.
--
-- Droits d'origine relevés en prod (2026-10-03) : toutes les fonctions
-- ci-dessous avaient {postgres, authenticated, service_role} ; ni anon ni
-- PUBLIC. Le REVOKE FROM PUBLIC, anon est donc neutre en prod (il ferme la
-- base locale, dont le baseline accorde aussi anon).
--
-- Migration additive (REVOKE + CREATE OR REPLACE, aucune donnée touchée).
--
-- ROLLBACK (intégral) :
--
-- GRANT EXECUTE ON FUNCTION
--   public.cleanup_old_audit_logs(integer),
--   public.cleanup_old_errors(integer),
--   public.delete_all_resolved_errors(),
--   public.run_cleanup_all(),
--   public.run_cleanup_expired_data(),
--   public.run_flag_stale_python_rechecks(),
--   public.run_recalculate_minesweeper_ref_times(),
--   public.run_weekly_best_bonuses(),
--   public.cleanup_abandoned_minesweeper_games(),
--   public.cleanup_account_deletion_audit(),
--   public.cleanup_expired_cache(),
--   public.cleanup_old_job_runs(),
--   public.cleanup_stale_presence(),
--   public.cleanup_stale_queue_entries(),
--   public.cleanup_stale_trades(),
--   public.cleanup_stuck_job_runs(),
--   public.auto_activate_scheduled_tournaments(),
--   public.auto_complete_ended_tournaments(),
--   public.auto_expire_listings(),
--   public.recalculate_minesweeper_reference_times(),
--   public.refresh_achievement_stats(),
--   public.refresh_achievement_stats_if_needed(boolean, integer, integer),
--   public.start_job_run(text, jsonb),
--   public.complete_job_run(uuid, text, text, jsonb),
--   public.increment_rate_limit(text, timestamp with time zone),
--   public.update_student_competence_level(uuid, uuid)
-- TO authenticated;
--
-- CREATE OR REPLACE FUNCTION public.set_riddle_of_the_day(p_riddle_id uuid, p_date date, p_selected_by uuid)
--  RETURNS uuid
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- DECLARE
--   v_id UUID;
-- BEGIN
--   -- Upsert riddle of the day
--   INSERT INTO riddle_of_the_day (riddle_id, date, auto_selected, selected_by)
--   VALUES (p_riddle_id, p_date, false, p_selected_by)
--   ON CONFLICT (date)
--   DO UPDATE SET
--     riddle_id = EXCLUDED.riddle_id,
--     auto_selected = false,
--     selected_by = EXCLUDED.selected_by,
--     created_at = now()
--   RETURNING id INTO v_id;
--
--   RETURN v_id;
-- END;
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.duplicate_template(p_template_id uuid, p_user_id uuid, p_new_title text DEFAULT NULL::text)
--  RETURNS uuid
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- DECLARE
--   new_template_id UUID;
--   original_template RECORD;
-- BEGIN
--   -- Get original template
--   SELECT * INTO original_template
--   FROM message_templates
--   WHERE id = p_template_id;
--
--   IF NOT FOUND THEN
--     RAISE EXCEPTION 'Template not found';
--   END IF;
--
--   -- Create duplicate
--   INSERT INTO message_templates (
--     title, description, subject_template, body_template,
--     trigger_type, trigger_config, scope, created_by, class_id,
--     variables, tags, is_active
--   ) VALUES (
--     COALESCE(p_new_title, original_template.title || ' (copie)'),
--     original_template.description,
--     original_template.subject_template,
--     original_template.body_template,
--     original_template.trigger_type,
--     original_template.trigger_config,
--     'class', -- Duplicates are always class scope
--     p_user_id,
--     NULL, -- User must assign a class
--     original_template.variables,
--     original_template.tags,
--     original_template.is_active
--   ) RETURNING id INTO new_template_id;
--
--   -- Log duplication
--   PERFORM log_template_action(
--     new_template_id,
--     'duplicated',
--     p_user_id,
--     NULL,
--     jsonb_build_object('original_template_id', p_template_id)
--   );
--
--   RETURN new_template_id;
-- END;
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.log_template_action(p_template_id uuid, p_action text, p_performed_by uuid, p_changes jsonb DEFAULT NULL::jsonb, p_metadata jsonb DEFAULT NULL::jsonb)
--  RETURNS uuid
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- DECLARE
--   log_id UUID;
-- BEGIN
--   INSERT INTO template_audit_log (
--     template_id, action, performed_by, changes, metadata
--   ) VALUES (
--     p_template_id, p_action, p_performed_by, p_changes, p_metadata
--   ) RETURNING id INTO log_id;
--
--   RETURN log_id;
-- END;
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.auto_expire_listings()
--  RETURNS integer
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--     v_expired_count INTEGER;
--     v_listing RECORD;
-- BEGIN
--     -- Update expired listings
--     UPDATE public.marketplace_listings
--     SET
--         status = 'expired',
--         updated_at = NOW()
--     WHERE expires_at < NOW()
--     AND status = 'active';
--
--     GET DIAGNOSTICS v_expired_count = ROW_COUNT;
--
--     -- Unlock cards for expired listings
--     FOR v_listing IN
--         SELECT id FROM public.marketplace_listings
--         WHERE status = 'expired'
--         AND updated_at >= NOW() - INTERVAL '1 minute'
--     LOOP
--         PERFORM public.unlock_cards(v_listing.id);
--     END LOOP;
--
--     -- Reject pending proposals for expired listings
--     UPDATE public.marketplace_proposals
--     SET
--         status = 'rejected',
--         responded_at = NOW(),
--         response_message = 'Listing expired'
--     WHERE listing_id IN (
--         SELECT id FROM public.marketplace_listings
--         WHERE status = 'expired'
--         AND updated_at >= NOW() - INTERVAL '1 minute'
--     )
--     AND status = 'pending';
--
--     RETURN v_expired_count;
-- END;
-- $function$;
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tâches de maintenance : service_role seul
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.cleanup_old_audit_logs(integer),
  public.cleanup_old_errors(integer),
  public.delete_all_resolved_errors(),
  public.run_cleanup_all(),
  public.run_cleanup_expired_data(),
  public.run_flag_stale_python_rechecks(),
  public.run_recalculate_minesweeper_ref_times(),
  public.run_weekly_best_bonuses(),
  public.cleanup_abandoned_minesweeper_games(),
  public.cleanup_account_deletion_audit(),
  public.cleanup_expired_cache(),
  public.cleanup_old_job_runs(),
  public.cleanup_stale_presence(),
  public.cleanup_stale_queue_entries(),
  public.cleanup_stale_trades(),
  public.cleanup_stuck_job_runs(),
  public.auto_activate_scheduled_tournaments(),
  public.auto_complete_ended_tournaments(),
  public.auto_expire_listings(),
  public.recalculate_minesweeper_reference_times(),
  public.refresh_achievement_stats(),
  public.refresh_achievement_stats_if_needed(boolean, integer, integer),
  public.start_job_run(text, jsonb),
  public.complete_job_run(uuid, text, text, jsonb),
  public.increment_rate_limit(text, timestamp with time zone),
  public.update_student_competence_level(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.cleanup_old_audit_logs(integer),
  public.cleanup_old_errors(integer),
  public.delete_all_resolved_errors(),
  public.run_cleanup_all(),
  public.run_cleanup_expired_data(),
  public.run_flag_stale_python_rechecks(),
  public.run_recalculate_minesweeper_ref_times(),
  public.run_weekly_best_bonuses(),
  public.cleanup_abandoned_minesweeper_games(),
  public.cleanup_account_deletion_audit(),
  public.cleanup_expired_cache(),
  public.cleanup_old_job_runs(),
  public.cleanup_stale_presence(),
  public.cleanup_stale_queue_entries(),
  public.cleanup_stale_trades(),
  public.cleanup_stuck_job_runs(),
  public.auto_activate_scheduled_tournaments(),
  public.auto_complete_ended_tournaments(),
  public.auto_expire_listings(),
  public.recalculate_minesweeper_reference_times(),
  public.refresh_achievement_stats(),
  public.refresh_achievement_stats_if_needed(boolean, integer, integer),
  public.start_job_run(text, jsonb),
  public.complete_job_run(uuid, text, text, jsonb),
  public.increment_rate_limit(text, timestamp with time zone),
  public.update_student_competence_level(uuid, uuid)
TO service_role;

-- -----------------------------------------------------------------------------
-- 2. Actions réservées au prof : garde dans le corps
-- -----------------------------------------------------------------------------

-- Énigme du jour : prof/admin, ou serveur (auth.uid() NULL : client service,
-- cron). selected_by n'est plus forgeable par un compte connecté.
CREATE OR REPLACE FUNCTION public.set_riddle_of_the_day(p_riddle_id uuid, p_date date, p_selected_by uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  -- Garde (Q143) : seul un prof/admin, ou le serveur, choisit l'énigme du jour.
  IF auth.uid() IS NOT NULL AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  -- Upsert riddle of the day
  INSERT INTO riddle_of_the_day (riddle_id, date, auto_selected, selected_by)
  VALUES (p_riddle_id, p_date, false, coalesce(auth.uid(), p_selected_by))
  ON CONFLICT (date)
  DO UPDATE SET
    riddle_id = EXCLUDED.riddle_id,
    auto_selected = false,
    selected_by = EXCLUDED.selected_by,
    created_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- Duplication d'un modèle : prof/admin agissant en son nom, ou serveur.
CREATE OR REPLACE FUNCTION public.duplicate_template(p_template_id uuid, p_user_id uuid, p_new_title text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  new_template_id UUID;
  original_template RECORD;
BEGIN
  -- Garde (Q143) : un prof/admin ne duplique qu'en son propre nom.
  IF auth.uid() IS NOT NULL
     AND (p_user_id IS DISTINCT FROM auth.uid() OR NOT public.is_teacher_or_admin()) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  -- Get original template
  SELECT * INTO original_template
  FROM message_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Create duplicate
  INSERT INTO message_templates (
    title, description, subject_template, body_template,
    trigger_type, trigger_config, scope, created_by, class_id,
    variables, tags, is_active
  ) VALUES (
    COALESCE(p_new_title, original_template.title || ' (copie)'),
    original_template.description,
    original_template.subject_template,
    original_template.body_template,
    original_template.trigger_type,
    original_template.trigger_config,
    'class', -- Duplicates are always class scope
    p_user_id,
    NULL, -- User must assign a class
    original_template.variables,
    original_template.tags,
    original_template.is_active
  ) RETURNING id INTO new_template_id;

  -- Log duplication
  PERFORM log_template_action(
    new_template_id,
    'duplicated',
    p_user_id,
    NULL,
    jsonb_build_object('original_template_id', p_template_id)
  );

  RETURN new_template_id;
END;
$function$;

-- Journal des modèles : prof/admin (y compris via le trigger INVOKER
-- auto_log_template_changes), serveur, ou un compte qui journalise SON favori.
CREATE OR REPLACE FUNCTION public.log_template_action(p_template_id uuid, p_action text, p_performed_by uuid, p_changes jsonb DEFAULT NULL::jsonb, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  log_id UUID;
BEGIN
  -- Garde (Q143) : un élève ne journalise que ses propres favoris, sans
  -- contenu libre, et seulement s'ils reflètent l'état réel. La route des
  -- favoris écrit PUIS journalise : après l'ajout la ligne existe, après le
  -- retrait elle n'existe plus.
  IF auth.uid() IS NOT NULL AND NOT public.is_teacher_or_admin() THEN
    IF NOT (
      p_performed_by = auth.uid()
      AND p_changes IS NULL
      AND p_metadata IS NULL
      AND (
        (p_action = 'favorited' AND EXISTS (
          SELECT 1 FROM public.user_favorite_templates f
          WHERE f.user_id = auth.uid() AND f.template_id = p_template_id))
        OR
        (p_action = 'unfavorited' AND NOT EXISTS (
          SELECT 1 FROM public.user_favorite_templates f
          WHERE f.user_id = auth.uid() AND f.template_id = p_template_id))
      )
    ) THEN
      RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO template_audit_log (
    template_id, action, performed_by, changes, metadata
  ) VALUES (
    p_template_id, p_action, p_performed_by, p_changes, p_metadata
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION
  public.set_riddle_of_the_day(uuid, date, uuid),
  public.duplicate_template(uuid, uuid, text),
  public.log_template_action(uuid, text, uuid, jsonb, jsonb)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.set_riddle_of_the_day(uuid, date, uuid),
  public.duplicate_template(uuid, uuid, text),
  public.log_template_action(uuid, text, uuid, jsonb, jsonb)
TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. auto_expire_listings : corps corrigé (la colonne updated_at n'existe pas)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_expire_listings()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_expired_ids  uuid[];
    v_rejected_ids uuid[];
    v_id           uuid;
BEGIN
    -- Annonces arrivées à échéance
    WITH expired AS (
        UPDATE public.marketplace_listings
        SET status = 'expired'
        WHERE expires_at < NOW()
          AND status = 'active'
        RETURNING id
    )
    SELECT coalesce(array_agg(id), '{}') INTO v_expired_ids FROM expired;

    -- Verrous posés sous l'id de l'annonce (cartes du vendeur, et anciennes
    -- propositions verrouillées sous l'id de l'annonce)
    FOREACH v_id IN ARRAY v_expired_ids LOOP
        PERFORM public.unlock_cards(v_id);
    END LOOP;

    -- Propositions en attente sur ces annonces : rejetées
    WITH rejected AS (
        UPDATE public.marketplace_proposals
        SET
            status = 'rejected',
            responded_at = NOW(),
            response_message = 'Listing expired'
        WHERE listing_id = ANY (v_expired_ids)
          AND status = 'pending'
        RETURNING id
    )
    SELECT coalesce(array_agg(id), '{}') INTO v_rejected_ids FROM rejected;

    -- Verrous posés sous l'id de chaque proposition rejetée
    FOREACH v_id IN ARRAY v_rejected_ids LOOP
        PERFORM public.unlock_cards(v_id);
    END LOOP;

    RETURN cardinality(v_expired_ids);
END;
$function$;
