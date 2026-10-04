-- =============================================================================
-- Échanges de cartes : la base garde l'échange (faille du 2026-10-04)
-- =============================================================================
--
-- FAILLE. Un élève A pouvait voler les cartes et les gidouilles d'un élève B :
-- créer un échange avec B, écrire lui-même `current_offer.from_partner` (les
-- cartes et gidouilles de B), puis appeler `rpc/execute_trade`. La fonction ne
-- regardait ni les validations ni les confirmations ; la policy UPDATE laissait
-- chaque participant réécrire TOUTE la ligne (offre, drapeaux, partenaire,
-- statut) ; l'INSERT ne vérifiait ni l'amitié ni l'école ; le DELETE effaçait
-- l'historique.
--
-- DÉCISIONS DE DAVID (2026-10-04, points a à f) :
--   * chaque élève ne modifie que SA moitié de l'offre, SA validation et SA
--     confirmation, ou annule ; il peut remettre à FALSE la validation ou la
--     confirmation de l'autre (refus, expiration), jamais la mettre à TRUE ;
--   * `confirmation_started_at` : écrit par l'un ou l'autre ; `validated_at`
--     reste au trigger existant `set_trade_validation_timestamp` ;
--   * une écriture de `current_offer` qui change la moitié de L'AUTRE est
--     REFUSÉE ; si l'offre change, la validation de l'autre et TOUTES les
--     confirmations repassent à false (celle de l'auteur reste telle quelle) ;
--   * `execute_trade` exige les 4 drapeaux, sans exception ;
--     `accept_proposal_atomic` les pose à l'insertion (échanges 'marketplace') ;
--   * création directe : 'friend' seulement, entre deux élèves AMIS (amitié
--     acceptée) de la MÊME école, 4 drapeaux à false ;
--   * les élèves ne suppriment plus d'échange.
--
-- MÉCANISME DE CONFIANCE DU TRIGGER : `current_user`.
--   Via l'API (PostgREST), les requêtes s'exécutent sous le rôle
--   `authenticated` (ou `anon`). Dans une fonction SECURITY DEFINER possédée
--   par `postgres` (execute_trade, accept_proposal_atomic,
--   cleanup_stale_trades), `current_user` vaut `postgres` ; avec la clé
--   service, `service_role`. Un client ne peut pas changer `current_user` :
--   `SET ROLE` exige d'être membre du rôle visé. C'est le motif déjà en place
--   sur les propositions (guard_marketplace_proposal_update, 20261003170000).
--   Pas de drapeau `set_config` : il n'apporterait rien et ouvrirait une
--   question de plus (qui peut le poser ?). Le trigger ne lit AUCUN réglage
--   de session ; un `set_config` fait par un élève n'ouvre donc rien (testé).
--
-- ORDRE DES TRIGGERS BEFORE UPDATE (Postgres : ordre alphabétique du nom) :
--   1. guard_marketplace_trade_update_trg   (celui-ci : refuse, puis remet à zéro)
--   2. set_trade_validation_timestamp_trigger (validated_at / confirmation_started_at ;
--      sa clause WHEN est évaluée APRÈS le trigger 1, sur le NEW qu'il a modifié)
--   3. update_marketplace_trades_updated_at
--   Une remise à zéro faite par le 1 est donc vue par le 2, qui efface les
--   horodatages. Le 1 interdit à l'élève d'écrire `validated_at` lui-même.
--
-- Tests : tests/integration/marketplace-trades-garde.test.ts
--
-- ROLLBACK (non destructif, à exécuter dans cet ordre) :
--   DROP TRIGGER IF EXISTS guard_marketplace_trade_update_trg ON public.marketplace_trades;
--   DROP FUNCTION IF EXISTS public.guard_marketplace_trade_update();
--   DROP POLICY IF EXISTS marketplace_trades_insert_friend_rules ON public.marketplace_trades;
--   DROP POLICY IF EXISTS marketplace_trades_delete_never ON public.marketplace_trades;
--   puis les deux corps précédents ci-dessous (search_path = public, pg_temp,
--   posé en prod par 20261003210000), suivis de :
--   ALTER FUNCTION public.execute_trade(uuid) SET search_path = public, pg_temp;
--   ALTER FUNCTION public.accept_proposal_atomic(uuid, uuid) SET search_path = public, pg_temp;
--   Droits d'execute_trade : le REVOKE / GRANT de la section 1 ne fait que
--   rendre explicite l'état déjà en place (anon et PUBLIC sans EXECUTE,
--   vérifié en local) ; il n'y a rien à rétablir. Ne PAS rendre EXECUTE à
--   anon : la garde « participant » d'execute_trade laisse passer
--   auth.uid() NULL.
--
-- ── Corps précédent d'execute_trade (baseline 20260616220000) ──────────────
-- CREATE OR REPLACE FUNCTION "public"."execute_trade"("p_trade_id" "uuid") RETURNS "jsonb"
--     LANGUAGE "plpgsql" SECURITY DEFINER
--     SET "search_path" TO 'public'
--     AS $$
-- DECLARE
--     v_trade RECORD;
--     v_final_trade JSONB;
--     v_initiator_cards TEXT[];
--     v_initiator_gidouilles INTEGER;
--     v_partner_cards TEXT[];
--     v_partner_gidouilles INTEGER;
--     v_initiator_vip_cards JSONB;
--     v_partner_vip_cards JSONB;
--     v_card_id TEXT;
--     v_card_data JSONB;
--     v_card_template_id TEXT;
--     v_daily_trade_count INTEGER;
--     v_max_trades_per_day INTEGER;
--     v_initiator_balance INTEGER;
--     v_partner_balance INTEGER;
--     v_initiator_name TEXT;
--     v_partner_name TEXT;
--     v_initiator_class_id UUID;
--     v_partner_class_id UUID;
--     v_trade_id_short TEXT;
-- BEGIN
--     -- Lock the trade row for update
--     SELECT * INTO v_trade
--     FROM public.marketplace_trades
--     WHERE id = p_trade_id
--     FOR UPDATE;
--
--     IF NOT FOUND THEN
--         RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
--     END IF;
--
--     -- CRITICAL SECURITY FIX: Verify caller is a participant in the trade
--     IF auth.uid() != v_trade.initiator_id AND auth.uid() != v_trade.partner_id THEN
--         RETURN jsonb_build_object(
--             'success', false,
--             'error', 'Non autorisé: vous devez être participant de cet échange'
--         );
--     END IF;
--
--     IF v_trade.status != 'negotiating' THEN
--         RETURN jsonb_build_object('success', false, 'error', 'Trade is not in negotiating status');
--     END IF;
--
--     IF v_trade.current_offer IS NULL THEN
--         RETURN jsonb_build_object('success', false, 'error', 'No offer to execute');
--     END IF;
--
--     -- Check daily trade limit for both participants
--     SELECT COUNT(*) INTO v_daily_trade_count
--     FROM public.marketplace_trades
--     WHERE (initiator_id = v_trade.initiator_id OR partner_id = v_trade.initiator_id)
--     AND status = 'completed'
--     AND completed_at >= CURRENT_DATE;
--
--     -- Get max trades per day from config (default 10)
--     SELECT COALESCE(MAX(max_trades_per_day), 10) INTO v_max_trades_per_day
--     FROM public.marketplace_config mc
--     JOIN public.classes c ON c.school_id = mc.school_id
--     JOIN public.class_members cm ON cm.class_id = c.id
--     WHERE cm.student_id = v_trade.initiator_id;
--
--     IF v_daily_trade_count >= v_max_trades_per_day THEN
--         RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for initiator');
--     END IF;
--
--     -- Check partner's daily limit
--     SELECT COUNT(*) INTO v_daily_trade_count
--     FROM public.marketplace_trades
--     WHERE (initiator_id = v_trade.partner_id OR partner_id = v_trade.partner_id)
--     AND status = 'completed'
--     AND completed_at >= CURRENT_DATE;
--
--     IF v_daily_trade_count >= v_max_trades_per_day THEN
--         RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for partner');
--     END IF;
--
--     -- Extract trade details
--     v_final_trade := v_trade.current_offer;
--     v_initiator_cards := ARRAY(SELECT jsonb_array_elements_text(v_final_trade->'from_initiator'->'cards'));
--     v_initiator_gidouilles := COALESCE((v_final_trade->'from_initiator'->>'gidouilles')::INTEGER, 0);
--     v_partner_cards := ARRAY(SELECT jsonb_array_elements_text(v_final_trade->'from_partner'->'cards'));
--     v_partner_gidouilles := COALESCE((v_final_trade->'from_partner'->>'gidouilles')::INTEGER, 0);
--
--     -- Get and lock both profiles for gidouilles verification and update
--     SELECT gidouilles, vip_cards INTO v_initiator_balance, v_initiator_vip_cards
--     FROM public.profiles
--     WHERE id = v_trade.initiator_id
--     FOR UPDATE;
--
--     SELECT gidouilles, vip_cards INTO v_partner_balance, v_partner_vip_cards
--     FROM public.profiles
--     WHERE id = v_trade.partner_id
--     FOR UPDATE;
--
--     -- Get names for history logging
--     SELECT COALESCE(NULLIF(TRIM(COALESCE(firstname, '') || ' ' || COALESCE(lastname, '')), ''), 'Élève')
--     INTO v_initiator_name
--     FROM public.profiles WHERE id = v_trade.initiator_id;
--
--     SELECT COALESCE(NULLIF(TRIM(COALESCE(firstname, '') || ' ' || COALESCE(lastname, '')), ''), 'Élève')
--     INTO v_partner_name
--     FROM public.profiles WHERE id = v_trade.partner_id;
--
--     -- Get class_id for both participants
--     SELECT cm.class_id INTO v_initiator_class_id
--     FROM public.class_members cm
--     WHERE cm.student_id = v_trade.initiator_id
--     AND cm.status = 'active'
--     LIMIT 1;
--
--     SELECT cm.class_id INTO v_partner_class_id
--     FROM public.class_members cm
--     WHERE cm.student_id = v_trade.partner_id
--     AND cm.status = 'active'
--     LIMIT 1;
--
--     -- Short trade ID for display
--     v_trade_id_short := LEFT(p_trade_id::TEXT, 8);
--
--     -- Verify gidouilles balance for initiator
--     IF v_initiator_gidouilles > 0 THEN
--         IF v_initiator_balance IS NULL OR v_initiator_balance < v_initiator_gidouilles THEN
--             RETURN jsonb_build_object(
--                 'success', false,
--                 'error', format('Solde insuffisant: initiateur a %s mais a besoin de %s',
--                                COALESCE(v_initiator_balance, 0), v_initiator_gidouilles)
--             );
--         END IF;
--     END IF;
--
--     -- Verify gidouilles balance for partner
--     IF v_partner_gidouilles > 0 THEN
--         IF v_partner_balance IS NULL OR v_partner_balance < v_partner_gidouilles THEN
--             RETURN jsonb_build_object(
--                 'success', false,
--                 'error', format('Solde insuffisant: partenaire a %s mais a besoin de %s',
--                                COALESCE(v_partner_balance, 0), v_partner_gidouilles)
--             );
--         END IF;
--     END IF;
--
--     -- ========================================================================
--     -- Transfer cards from initiator to partner
--     -- ========================================================================
--     FOREACH v_card_id IN ARRAY v_initiator_cards
--     LOOP
--         v_card_data := v_initiator_vip_cards->v_card_id;
--         IF v_card_data IS NULL THEN
--             RAISE EXCEPTION 'Card % not found for initiator', v_card_id;
--         END IF;
--
--         v_card_template_id := v_card_data->>'cardId';
--         v_initiator_vip_cards := v_initiator_vip_cards - v_card_id;
--         v_partner_vip_cards := jsonb_set(
--             COALESCE(v_partner_vip_cards, '{}'::jsonb),
--             ARRAY[v_card_id],
--             v_card_data || jsonb_build_object('traded_at', NOW(), 'acquiredFrom', 'trade')
--         );
--
--         -- Log sender activity (FIX C: include partner name)
--         INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
--         VALUES (v_card_id, v_trade.initiator_id, v_card_template_id, 'traded',
--             jsonb_build_object(
--                 'trade_id', p_trade_id,
--                 'traded_to', v_trade.partner_id,
--                 'traded_to_name', v_partner_name,
--                 'direction', 'sent'
--             ));
--
--         -- Log receiver activity (FIX C: include sender name)
--         INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
--         VALUES (v_card_id, v_trade.partner_id, v_card_template_id, 'gained',
--             jsonb_build_object(
--                 'acquired_from', 'trade',
--                 'trade_id', p_trade_id,
--                 'received_from', v_trade.initiator_id,
--                 'received_from_name', v_initiator_name
--             ));
--     END LOOP;
--
--     -- ========================================================================
--     -- Transfer cards from partner to initiator
--     -- ========================================================================
--     FOREACH v_card_id IN ARRAY v_partner_cards
--     LOOP
--         v_card_data := v_partner_vip_cards->v_card_id;
--         IF v_card_data IS NULL THEN
--             RAISE EXCEPTION 'Card % not found for partner', v_card_id;
--         END IF;
--
--         v_card_template_id := v_card_data->>'cardId';
--         v_partner_vip_cards := v_partner_vip_cards - v_card_id;
--         v_initiator_vip_cards := jsonb_set(
--             COALESCE(v_initiator_vip_cards, '{}'::jsonb),
--             ARRAY[v_card_id],
--             v_card_data || jsonb_build_object('traded_at', NOW(), 'acquiredFrom', 'trade')
--         );
--
--         -- Log sender activity (FIX C: include partner name)
--         INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
--         VALUES (v_card_id, v_trade.partner_id, v_card_template_id, 'traded',
--             jsonb_build_object(
--                 'trade_id', p_trade_id,
--                 'traded_to', v_trade.initiator_id,
--                 'traded_to_name', v_initiator_name,
--                 'direction', 'sent'
--             ));
--
--         -- Log receiver activity (FIX C: include sender name)
--         INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
--         VALUES (v_card_id, v_trade.initiator_id, v_card_template_id, 'gained',
--             jsonb_build_object(
--                 'acquired_from', 'trade',
--                 'trade_id', p_trade_id,
--                 'received_from', v_trade.partner_id,
--                 'received_from_name', v_partner_name
--             ));
--     END LOOP;
--
--     -- ========================================================================
--     -- Update profiles and log gidouilles activity
--     -- ========================================================================
--
--     -- Update initiator profile
--     UPDATE public.profiles
--     SET
--         vip_cards = v_initiator_vip_cards,
--         gidouilles = GREATEST(0, COALESCE(gidouilles, 0) - v_initiator_gidouilles + v_partner_gidouilles),
--         updated_at = NOW()
--     WHERE id = v_trade.initiator_id;
--
--     -- Update partner profile
--     UPDATE public.profiles
--     SET
--         vip_cards = v_partner_vip_cards,
--         gidouilles = GREATEST(0, COALESCE(gidouilles, 0) - v_partner_gidouilles + v_initiator_gidouilles),
--         updated_at = NOW()
--     WHERE id = v_trade.partner_id;
--
--     -- FIX B: Log gidouilles activity with descriptive reasons
--     IF v_initiator_gidouilles > 0 THEN
--         -- Initiator sent gidouilles
--         INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
--         VALUES (v_trade.initiator_id, v_initiator_class_id, -v_initiator_gidouilles,
--                 format('Donné à %s (échange #%s)', v_partner_name, v_trade_id_short), NULL);
--         -- Partner received gidouilles
--         INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
--         VALUES (v_trade.partner_id, v_partner_class_id, v_initiator_gidouilles,
--                 format('Reçu de %s (échange #%s)', v_initiator_name, v_trade_id_short), NULL);
--     END IF;
--
--     IF v_partner_gidouilles > 0 THEN
--         -- Partner sent gidouilles
--         INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
--         VALUES (v_trade.partner_id, v_partner_class_id, -v_partner_gidouilles,
--                 format('Donné à %s (échange #%s)', v_initiator_name, v_trade_id_short), NULL);
--         -- Initiator received gidouilles
--         INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
--         VALUES (v_trade.initiator_id, v_initiator_class_id, v_partner_gidouilles,
--                 format('Reçu de %s (échange #%s)', v_partner_name, v_trade_id_short), NULL);
--     END IF;
--
--     -- ========================================================================
--     -- Update trade status
--     -- ========================================================================
--     UPDATE public.marketplace_trades
--     SET
--         status = 'completed',
--         completed_at = NOW(),
--         final_trade = v_final_trade,
--         updated_at = NOW()
--     WHERE id = p_trade_id;
--
--     -- Unlock all cards for this trade
--     DELETE FROM public.marketplace_locked_cards
--     WHERE locked_entity_id = p_trade_id;
--
--     -- If this was a marketplace listing trade, update listing and proposals
--     IF v_trade.listing_id IS NOT NULL THEN
--         UPDATE public.marketplace_listings
--         SET status = 'completed', completed_at = NOW()
--         WHERE id = v_trade.listing_id;
--
--         UPDATE public.marketplace_proposals
--         SET status = 'accepted', responded_at = NOW()
--         WHERE id = v_trade.proposal_id;
--
--         UPDATE public.marketplace_proposals
--         SET status = 'rejected', responded_at = NOW(), response_message = 'Another proposal was accepted'
--         WHERE listing_id = v_trade.listing_id AND id != v_trade.proposal_id AND status = 'pending';
--     END IF;
--
--     RETURN jsonb_build_object(
--         'success', true,
--         'trade_id', p_trade_id,
--         'completed_at', NOW()
--     );
--
-- EXCEPTION
--     WHEN OTHERS THEN
--         RAISE WARNING 'Trade execution failed: %', SQLERRM;
--         RETURN jsonb_build_object('success', false, 'error', SQLERRM);
-- END;
-- $$;
--
-- ── Corps précédent d'accept_proposal_atomic (20261003170000) ──────────────
-- CREATE OR REPLACE FUNCTION public.accept_proposal_atomic(p_proposal_id uuid, p_user_id uuid)
--  RETURNS json
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_proposal marketplace_proposals;
--   v_listing marketplace_listings;
--   v_trade_id UUID;
--   v_current_offer JSONB;
--   v_execute_result JSONB;
-- BEGIN
--   -- Q140 : p_user_id doit être l'appelant. Seul le serveur (service role) agit
--   -- au nom du vendeur, après sa propre vérification (auto_accept_exact_proposal).
--   -- Un p_user_id NULL ne passe jamais.
--   IF p_user_id IS NULL
--      OR (auth.uid() IS DISTINCT FROM p_user_id
--          AND COALESCE(auth.role(), '') <> 'service_role') THEN
--     RETURN json_build_object('success', false, 'error', 'Vous n''êtes pas autorisé à accepter cette proposition');
--   END IF;
--
--   SELECT * INTO v_proposal
--   FROM marketplace_proposals
--   WHERE id = p_proposal_id
--   FOR UPDATE NOWAIT;
--
--   IF NOT FOUND THEN
--     RETURN json_build_object('success', false, 'error', 'Proposition introuvable');
--   END IF;
--
--   IF v_proposal.status != 'pending' THEN
--     RETURN json_build_object('success', false, 'error', 'Cette proposition a déjà été traitée');
--   END IF;
--
--   SELECT * INTO v_listing
--   FROM marketplace_listings
--   WHERE id = v_proposal.listing_id
--   FOR UPDATE NOWAIT;
--
--   IF NOT FOUND OR v_listing.status != 'active' THEN
--     RETURN json_build_object('success', false, 'error', 'Cette annonce n''est plus disponible');
--   END IF;
--
--   -- IS DISTINCT FROM : NULL != x vaut NULL, qui laissait passer.
--   IF v_listing.creator_id IS DISTINCT FROM p_user_id THEN
--     RETURN json_build_object('success', false, 'error', 'Vous n''êtes pas autorisé à accepter cette proposition');
--   END IF;
--
--   v_current_offer := jsonb_build_object(
--     'from_initiator', jsonb_build_object(
--       'cards', COALESCE(to_jsonb(v_listing.offered_card_ids), '[]'::jsonb),
--       'gidouilles', COALESCE(v_listing.offered_gidouilles, 0)
--     ),
--     'from_partner', jsonb_build_object(
--       'cards', COALESCE(to_jsonb(v_proposal.offered_card_ids), '[]'::jsonb),
--       'gidouilles', COALESCE(v_proposal.offered_gidouilles, 0)
--     )
--   );
--
--   v_trade_id := gen_random_uuid();
--   INSERT INTO marketplace_trades (
--     id, initiator_id, partner_id, trade_type, status,
--     listing_id, proposal_id, current_offer, created_at, updated_at
--   ) VALUES (
--     v_trade_id, v_listing.creator_id, v_proposal.proposer_id,
--     'marketplace', 'negotiating',
--     v_listing.id, v_proposal.id,
--     v_current_offer, NOW(), NOW()
--   );
--
--   v_execute_result := execute_trade(v_trade_id);
--
--   IF NOT (v_execute_result->>'success')::boolean THEN
--     DELETE FROM marketplace_trades WHERE id = v_trade_id;
--     RETURN json_build_object(
--       'success', false,
--       'error', COALESCE(v_execute_result->>'error', 'Erreur lors de l''exécution de l''échange')
--     );
--   END IF;
--
--   DECLARE
--     v_other_proposal RECORD;
--   BEGIN
--     FOR v_other_proposal IN
--       SELECT id FROM marketplace_proposals
--       WHERE listing_id = v_listing.id
--         AND id != p_proposal_id
--         AND status = 'pending'
--     LOOP
--       UPDATE marketplace_proposals
--       SET status = 'rejected', responded_at = NOW(),
--           response_message = 'Autre proposition acceptée'
--       WHERE id = v_other_proposal.id;
--
--       DELETE FROM marketplace_locked_cards
--       WHERE locked_entity_id = v_other_proposal.id;
--     END LOOP;
--   END;
--
--   DELETE FROM marketplace_locked_cards
--   WHERE locked_entity_id = v_listing.id;
--
--   -- Cartes de la proposition acceptée, verrouillées sous son id : elles ont
--   -- changé de main, le verrou ne doit pas les suivre.
--   DELETE FROM marketplace_locked_cards
--   WHERE locked_entity_id = p_proposal_id;
--
--   RETURN json_build_object(
--     'success', true,
--     'message', 'Proposition acceptée et échange effectué',
--     'trade_id', v_trade_id
--   );
--
-- EXCEPTION
--   WHEN lock_not_available THEN
--     RETURN json_build_object(
--       'success', false,
--       'error', 'Une autre transaction est en cours sur cette annonce'
--     );
--   WHEN OTHERS THEN
--     RAISE LOG 'Error in accept_proposal_atomic: %', SQLERRM;
--     RETURN json_build_object(
--       'success', false,
--       'error', 'Une erreur est survenue: ' || SQLERRM
--     );
-- END;
-- $function$;
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. execute_trade : corps identique + verrou des 4 drapeaux.
--    search_path = public, pg_temp (valeur posée en prod par 20261003210000).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."execute_trade"("p_trade_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_trade RECORD;
    v_final_trade JSONB;
    v_initiator_cards TEXT[];
    v_initiator_gidouilles INTEGER;
    v_partner_cards TEXT[];
    v_partner_gidouilles INTEGER;
    v_initiator_vip_cards JSONB;
    v_partner_vip_cards JSONB;
    v_card_id TEXT;
    v_card_data JSONB;
    v_card_template_id TEXT;
    v_daily_trade_count INTEGER;
    v_max_trades_per_day INTEGER;
    v_initiator_balance INTEGER;
    v_partner_balance INTEGER;
    v_initiator_name TEXT;
    v_partner_name TEXT;
    v_initiator_class_id UUID;
    v_partner_class_id UUID;
    v_trade_id_short TEXT;
BEGIN
    -- Lock the trade row for update
    SELECT * INTO v_trade
    FROM public.marketplace_trades
    WHERE id = p_trade_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
    END IF;

    -- CRITICAL SECURITY FIX: Verify caller is a participant in the trade
    IF auth.uid() != v_trade.initiator_id AND auth.uid() != v_trade.partner_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Non autorisé: vous devez être participant de cet échange'
        );
    END IF;

    IF v_trade.status != 'negotiating' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trade is not in negotiating status');
    END IF;

    IF v_trade.current_offer IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No offer to execute');
    END IF;

    -- Garde 2026-10-04 : un échange ne s'exécute que si les DEUX élèves ont
    -- validé PUIS confirmé l'offre en cours. Le trigger
    -- guard_marketplace_trade_update remet ces drapeaux à false dès qu'une
    -- moitié de l'offre change : quatre drapeaux vrais = offre actuelle
    -- validée et confirmée par chacun. Aucune exception (les échanges
    -- 'marketplace' les reçoivent d'accept_proposal_atomic).
    IF NOT (COALESCE(v_trade.validated_by_initiator, false)
            AND COALESCE(v_trade.validated_by_partner, false)
            AND COALESCE(v_trade.confirmed_by_initiator, false)
            AND COALESCE(v_trade.confirmed_by_partner, false)) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Les deux participants doivent valider puis confirmer l''échange'
        );
    END IF;

    -- Check daily trade limit for both participants
    SELECT COUNT(*) INTO v_daily_trade_count
    FROM public.marketplace_trades
    WHERE (initiator_id = v_trade.initiator_id OR partner_id = v_trade.initiator_id)
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE;

    -- Get max trades per day from config (default 10)
    SELECT COALESCE(MAX(max_trades_per_day), 10) INTO v_max_trades_per_day
    FROM public.marketplace_config mc
    JOIN public.classes c ON c.school_id = mc.school_id
    JOIN public.class_members cm ON cm.class_id = c.id
    WHERE cm.student_id = v_trade.initiator_id;

    IF v_daily_trade_count >= v_max_trades_per_day THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for initiator');
    END IF;

    -- Check partner's daily limit
    SELECT COUNT(*) INTO v_daily_trade_count
    FROM public.marketplace_trades
    WHERE (initiator_id = v_trade.partner_id OR partner_id = v_trade.partner_id)
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE;

    IF v_daily_trade_count >= v_max_trades_per_day THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for partner');
    END IF;

    -- Extract trade details
    v_final_trade := v_trade.current_offer;
    v_initiator_cards := ARRAY(SELECT jsonb_array_elements_text(v_final_trade->'from_initiator'->'cards'));
    v_initiator_gidouilles := COALESCE((v_final_trade->'from_initiator'->>'gidouilles')::INTEGER, 0);
    v_partner_cards := ARRAY(SELECT jsonb_array_elements_text(v_final_trade->'from_partner'->'cards'));
    v_partner_gidouilles := COALESCE((v_final_trade->'from_partner'->>'gidouilles')::INTEGER, 0);

    -- Get and lock both profiles for gidouilles verification and update
    SELECT gidouilles, vip_cards INTO v_initiator_balance, v_initiator_vip_cards
    FROM public.profiles
    WHERE id = v_trade.initiator_id
    FOR UPDATE;

    SELECT gidouilles, vip_cards INTO v_partner_balance, v_partner_vip_cards
    FROM public.profiles
    WHERE id = v_trade.partner_id
    FOR UPDATE;

    -- Get names for history logging
    SELECT COALESCE(NULLIF(TRIM(COALESCE(firstname, '') || ' ' || COALESCE(lastname, '')), ''), 'Élève')
    INTO v_initiator_name
    FROM public.profiles WHERE id = v_trade.initiator_id;

    SELECT COALESCE(NULLIF(TRIM(COALESCE(firstname, '') || ' ' || COALESCE(lastname, '')), ''), 'Élève')
    INTO v_partner_name
    FROM public.profiles WHERE id = v_trade.partner_id;

    -- Get class_id for both participants
    SELECT cm.class_id INTO v_initiator_class_id
    FROM public.class_members cm
    WHERE cm.student_id = v_trade.initiator_id
    AND cm.status = 'active'
    LIMIT 1;

    SELECT cm.class_id INTO v_partner_class_id
    FROM public.class_members cm
    WHERE cm.student_id = v_trade.partner_id
    AND cm.status = 'active'
    LIMIT 1;

    -- Short trade ID for display
    v_trade_id_short := LEFT(p_trade_id::TEXT, 8);

    -- Verify gidouilles balance for initiator
    IF v_initiator_gidouilles > 0 THEN
        IF v_initiator_balance IS NULL OR v_initiator_balance < v_initiator_gidouilles THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Solde insuffisant: initiateur a %s mais a besoin de %s',
                               COALESCE(v_initiator_balance, 0), v_initiator_gidouilles)
            );
        END IF;
    END IF;

    -- Verify gidouilles balance for partner
    IF v_partner_gidouilles > 0 THEN
        IF v_partner_balance IS NULL OR v_partner_balance < v_partner_gidouilles THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Solde insuffisant: partenaire a %s mais a besoin de %s',
                               COALESCE(v_partner_balance, 0), v_partner_gidouilles)
            );
        END IF;
    END IF;

    -- ========================================================================
    -- Transfer cards from initiator to partner
    -- ========================================================================
    FOREACH v_card_id IN ARRAY v_initiator_cards
    LOOP
        v_card_data := v_initiator_vip_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % not found for initiator', v_card_id;
        END IF;

        v_card_template_id := v_card_data->>'cardId';
        v_initiator_vip_cards := v_initiator_vip_cards - v_card_id;
        v_partner_vip_cards := jsonb_set(
            COALESCE(v_partner_vip_cards, '{}'::jsonb),
            ARRAY[v_card_id],
            v_card_data || jsonb_build_object('traded_at', NOW(), 'acquiredFrom', 'trade')
        );

        -- Log sender activity (FIX C: include partner name)
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.initiator_id, v_card_template_id, 'traded',
            jsonb_build_object(
                'trade_id', p_trade_id,
                'traded_to', v_trade.partner_id,
                'traded_to_name', v_partner_name,
                'direction', 'sent'
            ));

        -- Log receiver activity (FIX C: include sender name)
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.partner_id, v_card_template_id, 'gained',
            jsonb_build_object(
                'acquired_from', 'trade',
                'trade_id', p_trade_id,
                'received_from', v_trade.initiator_id,
                'received_from_name', v_initiator_name
            ));
    END LOOP;

    -- ========================================================================
    -- Transfer cards from partner to initiator
    -- ========================================================================
    FOREACH v_card_id IN ARRAY v_partner_cards
    LOOP
        v_card_data := v_partner_vip_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % not found for partner', v_card_id;
        END IF;

        v_card_template_id := v_card_data->>'cardId';
        v_partner_vip_cards := v_partner_vip_cards - v_card_id;
        v_initiator_vip_cards := jsonb_set(
            COALESCE(v_initiator_vip_cards, '{}'::jsonb),
            ARRAY[v_card_id],
            v_card_data || jsonb_build_object('traded_at', NOW(), 'acquiredFrom', 'trade')
        );

        -- Log sender activity (FIX C: include partner name)
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.partner_id, v_card_template_id, 'traded',
            jsonb_build_object(
                'trade_id', p_trade_id,
                'traded_to', v_trade.initiator_id,
                'traded_to_name', v_initiator_name,
                'direction', 'sent'
            ));

        -- Log receiver activity (FIX C: include sender name)
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.initiator_id, v_card_template_id, 'gained',
            jsonb_build_object(
                'acquired_from', 'trade',
                'trade_id', p_trade_id,
                'received_from', v_trade.partner_id,
                'received_from_name', v_partner_name
            ));
    END LOOP;

    -- ========================================================================
    -- Update profiles and log gidouilles activity
    -- ========================================================================

    -- Update initiator profile
    UPDATE public.profiles
    SET
        vip_cards = v_initiator_vip_cards,
        gidouilles = GREATEST(0, COALESCE(gidouilles, 0) - v_initiator_gidouilles + v_partner_gidouilles),
        updated_at = NOW()
    WHERE id = v_trade.initiator_id;

    -- Update partner profile
    UPDATE public.profiles
    SET
        vip_cards = v_partner_vip_cards,
        gidouilles = GREATEST(0, COALESCE(gidouilles, 0) - v_partner_gidouilles + v_initiator_gidouilles),
        updated_at = NOW()
    WHERE id = v_trade.partner_id;

    -- FIX B: Log gidouilles activity with descriptive reasons
    IF v_initiator_gidouilles > 0 THEN
        -- Initiator sent gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.initiator_id, v_initiator_class_id, -v_initiator_gidouilles,
                format('Donné à %s (échange #%s)', v_partner_name, v_trade_id_short), NULL);
        -- Partner received gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.partner_id, v_partner_class_id, v_initiator_gidouilles,
                format('Reçu de %s (échange #%s)', v_initiator_name, v_trade_id_short), NULL);
    END IF;

    IF v_partner_gidouilles > 0 THEN
        -- Partner sent gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.partner_id, v_partner_class_id, -v_partner_gidouilles,
                format('Donné à %s (échange #%s)', v_initiator_name, v_trade_id_short), NULL);
        -- Initiator received gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.initiator_id, v_initiator_class_id, v_partner_gidouilles,
                format('Reçu de %s (échange #%s)', v_partner_name, v_trade_id_short), NULL);
    END IF;

    -- ========================================================================
    -- Update trade status
    -- ========================================================================
    UPDATE public.marketplace_trades
    SET
        status = 'completed',
        completed_at = NOW(),
        final_trade = v_final_trade,
        updated_at = NOW()
    WHERE id = p_trade_id;

    -- Unlock all cards for this trade
    DELETE FROM public.marketplace_locked_cards
    WHERE locked_entity_id = p_trade_id;

    -- If this was a marketplace listing trade, update listing and proposals
    IF v_trade.listing_id IS NOT NULL THEN
        UPDATE public.marketplace_listings
        SET status = 'completed', completed_at = NOW()
        WHERE id = v_trade.listing_id;

        UPDATE public.marketplace_proposals
        SET status = 'accepted', responded_at = NOW()
        WHERE id = v_trade.proposal_id;

        UPDATE public.marketplace_proposals
        SET status = 'rejected', responded_at = NOW(), response_message = 'Another proposal was accepted'
        WHERE listing_id = v_trade.listing_id AND id != v_trade.proposal_id AND status = 'pending';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'trade_id', p_trade_id,
        'completed_at', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Trade execution failed: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- Personne n'appelle execute_trade sans session : routes /confirm et /accept
-- (client élève, authenticated) ; l'acceptation automatique passe par
-- auto_accept_exact_proposal (client service) puis accept_proposal_atomic,
-- qui l'appelle en tant que postgres. anon refusé explicitement : la garde
-- « participant » laisse passer auth.uid() NULL.
REVOKE EXECUTE ON FUNCTION public.execute_trade(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_trade(uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. accept_proposal_atomic : corps identique, 4 drapeaux posés à l'insertion.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_proposal_atomic(p_proposal_id uuid, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_proposal marketplace_proposals;
  v_listing marketplace_listings;
  v_trade_id UUID;
  v_current_offer JSONB;
  v_execute_result JSONB;
BEGIN
  -- Q140 : p_user_id doit être l'appelant. Seul le serveur (service role) agit
  -- au nom du vendeur, après sa propre vérification (auto_accept_exact_proposal).
  -- Un p_user_id NULL ne passe jamais.
  IF p_user_id IS NULL
     OR (auth.uid() IS DISTINCT FROM p_user_id
         AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RETURN json_build_object('success', false, 'error', 'Vous n''êtes pas autorisé à accepter cette proposition');
  END IF;

  SELECT * INTO v_proposal
  FROM marketplace_proposals
  WHERE id = p_proposal_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Proposition introuvable');
  END IF;

  IF v_proposal.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Cette proposition a déjà été traitée');
  END IF;

  SELECT * INTO v_listing
  FROM marketplace_listings
  WHERE id = v_proposal.listing_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND OR v_listing.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Cette annonce n''est plus disponible');
  END IF;

  -- IS DISTINCT FROM : NULL != x vaut NULL, qui laissait passer.
  IF v_listing.creator_id IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Vous n''êtes pas autorisé à accepter cette proposition');
  END IF;

  v_current_offer := jsonb_build_object(
    'from_initiator', jsonb_build_object(
      'cards', COALESCE(to_jsonb(v_listing.offered_card_ids), '[]'::jsonb),
      'gidouilles', COALESCE(v_listing.offered_gidouilles, 0)
    ),
    'from_partner', jsonb_build_object(
      'cards', COALESCE(to_jsonb(v_proposal.offered_card_ids), '[]'::jsonb),
      'gidouilles', COALESCE(v_proposal.offered_gidouilles, 0)
    )
  );

  v_trade_id := gen_random_uuid();
  -- 2026-10-04 : accepter une proposition, c'est l'accord des deux parties
  -- (l'annonce publiée par le vendeur, la proposition faite par l'acheteur,
  -- acceptée ici par le vendeur). Les 4 drapeaux sont posés à l'insertion :
  -- execute_trade les exige désormais sans exception. Aucun trigger INSERT
  -- sur marketplace_trades ; validated_at / confirmation_started_at restent
  -- NULL, ce que validate_timestamps_consistency admet.
  INSERT INTO marketplace_trades (
    id, initiator_id, partner_id, trade_type, status,
    listing_id, proposal_id, current_offer, created_at, updated_at,
    validated_by_initiator, validated_by_partner,
    confirmed_by_initiator, confirmed_by_partner
  ) VALUES (
    v_trade_id, v_listing.creator_id, v_proposal.proposer_id,
    'marketplace', 'negotiating',
    v_listing.id, v_proposal.id,
    v_current_offer, NOW(), NOW(),
    true, true,
    true, true
  );

  v_execute_result := execute_trade(v_trade_id);

  IF NOT (v_execute_result->>'success')::boolean THEN
    DELETE FROM marketplace_trades WHERE id = v_trade_id;
    RETURN json_build_object(
      'success', false,
      'error', COALESCE(v_execute_result->>'error', 'Erreur lors de l''exécution de l''échange')
    );
  END IF;

  DECLARE
    v_other_proposal RECORD;
  BEGIN
    FOR v_other_proposal IN
      SELECT id FROM marketplace_proposals
      WHERE listing_id = v_listing.id
        AND id != p_proposal_id
        AND status = 'pending'
    LOOP
      UPDATE marketplace_proposals
      SET status = 'rejected', responded_at = NOW(),
          response_message = 'Autre proposition acceptée'
      WHERE id = v_other_proposal.id;

      DELETE FROM marketplace_locked_cards
      WHERE locked_entity_id = v_other_proposal.id;
    END LOOP;
  END;

  DELETE FROM marketplace_locked_cards
  WHERE locked_entity_id = v_listing.id;

  -- Cartes de la proposition acceptée, verrouillées sous son id : elles ont
  -- changé de main, le verrou ne doit pas les suivre.
  DELETE FROM marketplace_locked_cards
  WHERE locked_entity_id = p_proposal_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Proposition acceptée et échange effectué',
    'trade_id', v_trade_id
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Une autre transaction est en cours sur cette annonce'
    );
  WHEN OTHERS THEN
    RAISE LOG 'Error in accept_proposal_atomic: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Une erreur est survenue: ' || SQLERRM
    );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Trigger BEFORE UPDATE : ce qu'un élève peut écrire, en direct, sur un échange.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_marketplace_trade_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_initiator boolean;
  v_own text;
  v_other text;
  v_own_half jsonb;
  v_empty constant jsonb := '{"cards": [], "gidouilles": 0}'::jsonb;
BEGIN
  -- Confiance : seuls les rôles de l'API sont contrôlés. Une fonction
  -- SECURITY DEFINER (postgres) ou le client service passent.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL
     OR (v_uid IS DISTINCT FROM OLD.initiator_id AND v_uid IS DISTINCT FROM OLD.partner_id) THEN
    RAISE EXCEPTION 'Vous n''êtes pas participant à cet échange.' USING ERRCODE = '42501';
  END IF;

  v_is_initiator := (v_uid = OLD.initiator_id);
  v_own := CASE WHEN v_is_initiator THEN 'from_initiator' ELSE 'from_partner' END;
  v_other := CASE WHEN v_is_initiator THEN 'from_partner' ELSE 'from_initiator' END;

  IF OLD.status IS DISTINCT FROM 'negotiating' THEN
    RAISE EXCEPTION 'Un échange terminé ou annulé ne se modifie plus.' USING ERRCODE = '42501';
  END IF;

  -- Colonnes figées : identité de l'échange, issue, horodatage de validation.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.trade_type IS DISTINCT FROM OLD.trade_type
     OR NEW.initiator_id IS DISTINCT FROM OLD.initiator_id
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
     OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.last_offer_by IS DISTINCT FROM OLD.last_offer_by
     OR NEW.final_trade IS DISTINCT FROM OLD.final_trade
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.validated_at IS DISTINCT FROM OLD.validated_at THEN
    RAISE EXCEPTION 'Ces informations de l''échange ne se modifient pas.' USING ERRCODE = '42501';
  END IF;

  -- Statut : seule l'annulation est permise ; cancelled_at ne bouge qu'avec elle.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'Un échange ne peut qu''être annulé.' USING ERRCODE = '42501';
  END IF;
  IF NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at AND NEW.status IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'Un échange ne peut qu''être annulé.' USING ERRCODE = '42501';
  END IF;

  -- Drapeaux de l'autre : remise à false permise, passage à true interdit.
  IF v_is_initiator THEN
    IF NEW.validated_by_partner IS TRUE AND OLD.validated_by_partner IS NOT TRUE
       OR NEW.confirmed_by_partner IS TRUE AND OLD.confirmed_by_partner IS NOT TRUE THEN
      RAISE EXCEPTION 'Vous ne pouvez pas valider ou confirmer à la place de l''autre élève.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.validated_by_initiator IS TRUE AND OLD.validated_by_initiator IS NOT TRUE
       OR NEW.confirmed_by_initiator IS TRUE AND OLD.confirmed_by_initiator IS NOT TRUE THEN
      RAISE EXCEPTION 'Vous ne pouvez pas valider ou confirmer à la place de l''autre élève.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Sa propre confirmation : seulement une fois l'offre validée des deux côtés.
  IF (v_is_initiator AND NEW.confirmed_by_initiator IS TRUE AND OLD.confirmed_by_initiator IS NOT TRUE)
     OR (NOT v_is_initiator AND NEW.confirmed_by_partner IS TRUE AND OLD.confirmed_by_partner IS NOT TRUE) THEN
    IF NOT (NEW.validated_by_initiator IS TRUE AND NEW.validated_by_partner IS TRUE) THEN
      RAISE EXCEPTION 'L''offre doit être validée par les deux élèves avant d''être confirmée.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Offre : seule sa propre moitié change.
  IF NEW.current_offer IS DISTINCT FROM OLD.current_offer THEN
    IF NEW.current_offer IS NOT NULL AND (
         jsonb_typeof(NEW.current_offer) IS DISTINCT FROM 'object'
         OR EXISTS (
           SELECT 1 FROM jsonb_object_keys(NEW.current_offer) AS k(cle)
           WHERE k.cle NOT IN ('from_initiator', 'from_partner')
         )) THEN
      RAISE EXCEPTION 'Offre mal formée.' USING ERRCODE = '22023';
    END IF;

    -- Une moitié absente vaut une moitié vide (l'échange naît sans offre).
    IF COALESCE(NEW.current_offer -> v_other, v_empty)
       IS DISTINCT FROM COALESCE(OLD.current_offer -> v_other, v_empty) THEN
      RAISE EXCEPTION 'Vous ne pouvez modifier que votre propre offre.' USING ERRCODE = '42501';
    END IF;

    v_own_half := NEW.current_offer -> v_own;
    IF v_own_half IS NOT NULL AND NOT (
         jsonb_typeof(v_own_half) = 'object'
         AND jsonb_typeof(COALESCE(v_own_half -> 'cards', '[]'::jsonb)) = 'array'
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(COALESCE(v_own_half -> 'cards', '[]'::jsonb)) AS e(carte)
           WHERE jsonb_typeof(e.carte) IS DISTINCT FROM 'string'
         )
         -- Entier écrit sans point ni signe : execute_trade fait
         -- `->> 'gidouilles')::INTEGER`, qui échoue sur « 5.0 » (jsonb garde
         -- l'échelle ; « 5e0 », lui, est rangé en « 5 »).
         -- 9 chiffres au plus : reste dans un INTEGER.
         AND jsonb_typeof(COALESCE(v_own_half -> 'gidouilles', '0'::jsonb)) = 'number'
         AND (COALESCE(v_own_half ->> 'gidouilles', '0')) ~ '^[0-9]{1,9}$'
       ) THEN
      RAISE EXCEPTION 'Offre mal formée : cartes = liste d''identifiants, gidouilles = entier positif.'
        USING ERRCODE = '22023';
    END IF;

    -- L'autre doit revalider ; personne n'a confirmé CETTE offre.
    IF v_is_initiator THEN
      NEW.validated_by_partner := false;
    ELSE
      NEW.validated_by_initiator := false;
    END IF;
    NEW.confirmed_by_initiator := false;
    NEW.confirmed_by_partner := false;
  END IF;

  -- Une validation retirée (refus, expiration) annule les confirmations :
  -- on valide PUIS on confirme, à chaque tour.
  IF (OLD.validated_by_initiator IS TRUE AND NEW.validated_by_initiator IS NOT TRUE)
     OR (OLD.validated_by_partner IS TRUE AND NEW.validated_by_partner IS NOT TRUE) THEN
    NEW.confirmed_by_initiator := false;
    NEW.confirmed_by_partner := false;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_marketplace_trade_update() IS
  '2026-10-04 : pour les rôles de l''API, un participant ne modifie que sa moitié de l''offre, sa validation, sa confirmation (l''autre : remise à false seulement), confirmation_started_at, ou annule. Offre changée → validation de l''autre et confirmations à false.';

-- Nom choisi pour passer AVANT set_trade_validation_timestamp_trigger (ordre alphabétique).
CREATE TRIGGER guard_marketplace_trade_update_trg
  BEFORE UPDATE ON public.marketplace_trades
  FOR EACH ROW EXECUTE FUNCTION public.guard_marketplace_trade_update();

-- -----------------------------------------------------------------------------
-- 4. INSERT : un élève ne crée qu'un échange 'friend', vierge, avec un ami
--    élève de la même école. RESTRICTIVE : s'ajoute (ET) à
--    marketplace_trades_insert_initiator, sans la retirer. Marché activé et
--    quotas quotidiens restent vérifiés par la route POST /api/marketplace/trades.
--    Les fonctions SECURITY DEFINER (postgres, propriétaire) ne sont pas visées.
-- -----------------------------------------------------------------------------
CREATE POLICY marketplace_trades_insert_friend_rules ON public.marketplace_trades
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    initiator_id = (SELECT auth.uid())
    AND trade_type = 'friend'
    AND status = 'negotiating'
    AND listing_id IS NULL
    AND proposal_id IS NULL
    AND current_offer IS NULL
    AND final_trade IS NULL
    AND completed_at IS NULL
    AND cancelled_at IS NULL
    AND validated_at IS NULL
    AND confirmation_started_at IS NULL
    AND validated_by_initiator IS FALSE
    AND validated_by_partner IS FALSE
    AND COALESCE(confirmed_by_initiator, false) IS FALSE
    AND COALESCE(confirmed_by_partner, false) IS FALSE
    AND public.is_student()
    AND public.same_school(partner_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = marketplace_trades.partner_id
        AND p.role = 'student'::public.user_role
    )
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = (SELECT auth.uid()) AND f.addressee_id = marketplace_trades.partner_id)
          OR (f.requester_id = marketplace_trades.partner_id AND f.addressee_id = (SELECT auth.uid()))
        )
    )
  );

COMMENT ON POLICY marketplace_trades_insert_friend_rules ON public.marketplace_trades IS
  '2026-10-04 : création directe = échange friend vierge, entre deux élèves amis (amitié acceptée) de la même école.';

-- -----------------------------------------------------------------------------
-- 5. DELETE : l'historique est conservé. RESTRICTIVE USING (false) neutralise
--    marketplace_trades_delete_participants sans la supprimer. Le DELETE de
--    rollback interne d'accept_proposal_atomic (postgres) n'est pas visé.
-- -----------------------------------------------------------------------------
CREATE POLICY marketplace_trades_delete_never ON public.marketplace_trades
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON POLICY marketplace_trades_delete_never ON public.marketplace_trades IS
  '2026-10-04 : les élèves ne suppriment plus d''échange ; l''historique est conservé.';
