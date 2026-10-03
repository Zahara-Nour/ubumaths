-- ============================================================================
-- Cartes VIP : attribution, défausse, verrous et journal réservés au serveur
-- ============================================================================
--
-- Questions d'accès (tranchées par David le 2026-10-03) :
--
-- Q131 — `award_vip_card_no_cost` (2 surcharges), `discard_vip_cards`,
--   `lock_cards`, `unlock_cards` ne sont plus exécutables par authenticated,
--   anon ni PUBLIC : serveur seul (service_role). Les routes
--   `api/vip-cards/exchange`, `api/vip-cards/choose` et les helpers
--   `lib/server/marketplace/helpers.ts` (lock / unlock) les appellent avec le
--   client service APRÈS leurs propres contrôles (identité de session,
--   propriété des cartes, carte d'action conforme).
--   Perdent : un élève ne peut plus s'attribuer une carte gratuite, défausser
--   les cartes d'un autre, ni verrouiller / déverrouiller des cartes en
--   appelant directement l'API REST.
--
-- Q132 (a) — PERSONNE (élève, prof, admin) ne modifie directement
--   `profiles.vip_cards` ni `profiles.vip_cards_history` : le garde
--   `guard_profile_reserved_fields` refuse ces changements pour les rôles
--   authenticated / anon. Les fonctions SECURITY DEFINER (achat, tirage,
--   échange, marché…) tournent en postgres et passent.
--   ⚠️ Ordre des triggers BEFORE UPDATE (alphabétique) : le garde
--   (`guard_profile_reserved_fields_trg`) s'exécute AVANT
--   `update_vip_cards_history_trigger`. Ce dernier ne réécrit l'historique que
--   si `vip_cards` change — ce qui, pour un compte connecté, est désormais
--   refusé en amont. Une mise à jour d'un autre champ (gidouilles par le prof,
--   prénom…) laisse les deux colonnes inchangées : le garde ne la bloque pas.
--
-- Q133 — INSERT dans `vip_cards_activity` réservé au serveur : la policy
--   « System can insert VIP cards activity » est rattachée à service_role
--   (pas de DROP). Le journal est écrit par les fonctions SECURITY DEFINER.
--
-- Q134 — `run_weekly_rewards`, `run_daily_summaries`,
--   `count_student_active_cards`, `resolve_card_instances` : serveur seul.
--   Appelants : pg_cron (postgres), l'écran admin cron (client service),
--   des fonctions SECURITY DEFINER (`purchase_vip_card`,
--   `auto_expire_listings`, qui tournent en postgres), et le marché
--   (`resolve_card_instances`, passé au client service dans ce même lot).
--
-- Q135 — aucune donnée existante n'est touchée.
--
-- Audit (bloquant) — `unlock_specific_cards(uuid, text[])` : SECURITY DEFINER
--   sans aucun contrôle ; un élève pouvait libérer les cartes de n'importe
--   quelle entité du marché. Serveur seul, appelée par
--   `lib/server/marketplace/helpers.ts` APRÈS les contrôles de la route
--   `api/marketplace/trades/[id]/offers` (participant, négociation en cours,
--   cartes retirées lues dans l'offre courante de l'échange).
--
-- Audit — `lock_cards` : en cas d'erreur, le nettoyage effaçait TOUS les
--   verrous de l'entité, y compris ceux d'un autre élève (une proposition
--   d'échange porte les cartes des deux parties). Il ne retire plus que ceux
--   de `p_student_id`. Et il lit désormais le profil en FOR UPDATE : un
--   verrouillage ne se glisse plus entre la consommation d'une carte d'action
--   et `grant_vip_cards_after_action`, qui lit le même profil sous ce verrou.
--
-- Q137 (b) — `grant_vip_cards_after_action` et `restore_vip_card_instance`
--   sont livrées par la migration 20261003140000 (PR précédente), exigée ici :
--   les routes exchange / choose de ce lot les appellent.
--
-- Additive : aucun DROP, aucune donnée modifiée.
--
-- Leçon : EXECUTE est accordé à PUBLIC par défaut → REVOKE FROM PUBLIC, anon,
-- authenticated, puis GRANT à service_role. (En prod comme en local, PUBLIC et
-- anon étaient déjà révoqués ; le REVOKE est idempotent.)
--
-- ============================================================================
-- ROLLBACK (état d'origine relevé en prod le 2026-10-03, identique en local :
-- proacl = {postgres=X, authenticated=X, service_role=X} pour les 10 signatures,
-- `unlock_specific_cards` comprise)
-- ============================================================================
--   GRANT EXECUTE ON FUNCTION public.award_vip_card_no_cost(uuid, text) TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.award_vip_card_no_cost(uuid, text, text, jsonb) TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.discard_vip_cards(uuid, text[], jsonb) TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.lock_cards(uuid, text[], uuid, text) TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.unlock_cards(uuid) TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.run_weekly_rewards() TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.run_daily_summaries() TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.count_student_active_cards(uuid, text, boolean) TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.resolve_card_instances(text[]) TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.unlock_specific_cards(uuid, text[]) TO authenticated;
--
--   -- `lock_cards` d'origine (production) : identique à la définition
--   -- ci-dessous, à deux endroits près — lecture du profil SANS verrou :
--   --     SELECT vip_cards INTO v_student_cards
--   --     FROM public.profiles
--   --     WHERE id = p_student_id;
--   -- et nettoyage du bloc EXCEPTION sans le filtre sur l'élève :
--   --     DELETE FROM public.marketplace_locked_cards
--   --     WHERE locked_entity_id = p_entity_id;
--
--   ALTER POLICY "System can insert VIP cards activity" ON public.vip_cards_activity
--     TO authenticated;
--
--   -- Définition d'origine du garde (migration 20261001220000) :
--   CREATE OR REPLACE FUNCTION public.guard_profile_reserved_fields()
--   RETURNS trigger
--   LANGUAGE plpgsql
--   SET search_path TO ''
--   AS $function$
--   begin
--   	if current_user not in ('authenticated', 'anon') then
--   		return new;
--   	end if;
--
--   	if new.is_test is distinct from old.is_test and not public.is_admin() then
--   		raise exception 'Le statut « compte de test » n''est modifiable que par l''administrateur.'
--   			using errcode = '42501';
--   	end if;
--
--   	if coalesce(new.bonus, 0) > coalesce(old.bonus, 0) and not public.is_teacher_or_admin() then
--   		raise exception 'Le bonus ne peut être augmenté que par le professeur ou l''administrateur.'
--   			using errcode = '42501';
--   	end if;
--
--   	if new.grade is distinct from old.grade and not public.is_teacher_or_admin() then
--   		raise exception 'Le niveau n''est modifiable que par le professeur ou l''administrateur.'
--   			using errcode = '42501';
--   	end if;
--
--   	if (
--   		new.class_ids is distinct from old.class_ids
--   		or new.status_changed_by is distinct from old.status_changed_by
--   		or new.status_changed_at is distinct from old.status_changed_at
--   		or new.rejection_reason is distinct from old.rejection_reason
--   	) and not public.is_teacher_or_admin() then
--   		raise exception 'Les classes et l''historique de statut ne sont modifiables que par le professeur ou l''administrateur.'
--   			using errcode = '42501';
--   	end if;
--
--   	return new;
--   end;
--   $function$;
--
-- ⚠️ Le rollback rouvre l'auto-attribution de cartes gratuites par un élève
-- (appel REST direct), la défausse des cartes d'autrui et l'écriture directe
-- de son inventaire.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q131 + Q134 : fonctions réservées au serveur
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.award_vip_card_no_cost(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_vip_card_no_cost(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discard_vip_cards(uuid, text[], jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lock_cards(uuid, text[], uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unlock_cards(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.run_weekly_rewards() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.run_daily_summaries() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.count_student_active_cards(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_card_instances(text[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unlock_specific_cards(uuid, text[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.award_vip_card_no_cost(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_vip_card_no_cost(uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.discard_vip_cards(uuid, text[], jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.lock_cards(uuid, text[], uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.unlock_cards(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_weekly_rewards() TO service_role;
GRANT EXECUTE ON FUNCTION public.run_daily_summaries() TO service_role;
GRANT EXECUTE ON FUNCTION public.count_student_active_cards(uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_card_instances(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.unlock_specific_cards(uuid, text[]) TO service_role;

-- ----------------------------------------------------------------------------
-- Q133 : journal des cartes écrit par le serveur seul
-- ----------------------------------------------------------------------------

ALTER POLICY "System can insert VIP cards activity" ON public.vip_cards_activity TO service_role;

-- ----------------------------------------------------------------------------
-- Q132 (a) : inventaire et historique de cartes non modifiables directement
-- ----------------------------------------------------------------------------
-- Reprend à l'identique la définition de 20261001220000 et ajoute le dernier
-- bloc. Aucun rôle connecté n'est exempté, admin compris : toute écriture de
-- l'inventaire passe par une fonction SECURITY DEFINER (current_user = postgres).

CREATE OR REPLACE FUNCTION public.guard_profile_reserved_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
begin
	if current_user not in ('authenticated', 'anon') then
		return new;
	end if;

	if new.is_test is distinct from old.is_test and not public.is_admin() then
		raise exception 'Le statut « compte de test » n''est modifiable que par l''administrateur.'
			using errcode = '42501';
	end if;

	if coalesce(new.bonus, 0) > coalesce(old.bonus, 0) and not public.is_teacher_or_admin() then
		raise exception 'Le bonus ne peut être augmenté que par le professeur ou l''administrateur.'
			using errcode = '42501';
	end if;

	if new.grade is distinct from old.grade and not public.is_teacher_or_admin() then
		raise exception 'Le niveau n''est modifiable que par le professeur ou l''administrateur.'
			using errcode = '42501';
	end if;

	if (
		new.class_ids is distinct from old.class_ids
		or new.status_changed_by is distinct from old.status_changed_by
		or new.status_changed_at is distinct from old.status_changed_at
		or new.rejection_reason is distinct from old.rejection_reason
	) and not public.is_teacher_or_admin() then
		raise exception 'Les classes et l''historique de statut ne sont modifiables que par le professeur ou l''administrateur.'
			using errcode = '42501';
	end if;

	-- Q132 (a) : personne, admin compris. Ce garde s'exécute AVANT
	-- `update_vip_cards_history_trigger` (ordre alphabétique) : il compare donc
	-- l'historique tel que l'appelant l'a envoyé.
	if new.vip_cards is distinct from old.vip_cards
		or new.vip_cards_history is distinct from old.vip_cards_history then
		raise exception 'Les cartes VIP ne sont modifiables que par le serveur.'
			using errcode = '42501';
	end if;

	return new;
end;
$function$;

-- ----------------------------------------------------------------------------
-- Audit : `lock_cards` ne nettoie plus que les verrous de l'élève visé
-- ----------------------------------------------------------------------------
-- Corps repris à l'identique de la production (relevé le 2026-10-03), à deux
-- changements près : la lecture du profil prend `FOR UPDATE` (sérialise avec
-- `use_vip_card` et `grant_vip_cards_after_action`), et la clause DELETE du
-- bloc EXCEPTION gagne `AND student_id = p_student_id`.
-- (CREATE OR REPLACE conserve les droits : service_role seul, cf. plus haut.)

CREATE OR REPLACE FUNCTION public.lock_cards(p_student_id uuid, p_card_ids text[], p_entity_id uuid, p_lock_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_card_id TEXT;
    v_student_cards JSONB;
    v_card_data JSONB;
BEGIN
    -- Validate lock type
    IF p_lock_type NOT IN ('listing', 'trade') THEN
        RAISE EXCEPTION 'Invalid lock type: %', p_lock_type;
    END IF;

    -- Get student's VIP cards
    SELECT vip_cards INTO v_student_cards
    FROM public.profiles
    WHERE id = p_student_id
    FOR UPDATE;

    IF v_student_cards IS NULL THEN
        RAISE EXCEPTION 'Student has no VIP cards';
    END IF;

    -- Check each card
    FOREACH v_card_id IN ARRAY p_card_ids
    LOOP
        -- Check card exists for this student
        v_card_data := v_student_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % does not belong to student', v_card_id;
        END IF;

        -- Check card is not consumed (usedAt set in JSONB)
        IF v_card_data->>'usedAt' IS NOT NULL THEN
            RAISE EXCEPTION 'Card % has been consumed and cannot be traded', v_card_id;
        END IF;

        -- Check card is not already locked
        IF EXISTS (
            SELECT 1 FROM public.marketplace_locked_cards
            WHERE card_instance_id = v_card_id
        ) THEN
            RAISE EXCEPTION 'Card % is already locked', v_card_id;
        END IF;

        -- Lock the card
        INSERT INTO public.marketplace_locked_cards (
            student_id,
            card_instance_id,
            locked_for,
            locked_entity_id
        ) VALUES (
            p_student_id,
            v_card_id,
            p_lock_type,
            p_entity_id
        );
    END LOOP;

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback any partial locks
        DELETE FROM public.marketplace_locked_cards
        WHERE locked_entity_id = p_entity_id
          AND student_id = p_student_id;

        RAISE;
END;
$function$;
