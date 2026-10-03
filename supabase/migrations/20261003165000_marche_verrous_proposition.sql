-- =============================================================================
-- Marché : verrous des cartes d'une proposition sous l'id de la PROPOSITION
-- =============================================================================
--
-- Partie PRÉALABLE au code de la livraison suivante, appliquée AVANT son
-- déploiement : strictement permissive ou neutre pour le code actuel.
--
-- Jusqu'ici, la route verrouillait les cartes offertes par une proposition sous
-- l'id de l'ANNONCE : le refus et le retrait (qui déverrouillent par
-- proposition) les laissaient verrouillées, et un échec de lock_cards (qui
-- efface tout ce qui est verrouillé sous l'id reçu) effaçait les verrous du
-- vendeur. Le nouveau code verrouille sous l'id de la proposition.
--
--   1. validate_locked_entity_reference (trigger de marketplace_locked_cards)
--      accepte aussi l'id d'une proposition pour locked_for = 'listing'
--      (lock_cards, non modifiée, n'accepte que 'listing' / 'trade').
--      → permissif : tout ce qui passait passe toujours.
--   2. accept_proposal_atomic lève aussi les verrous posés sous l'id de la
--      proposition acceptée (les cartes ont changé de main).
--      → neutre pour le code actuel, qui ne pose aucun verrou sous cet id.
--      Aucun autre changement du corps : la garde d'appelant (Q140) vient avec
--      la migration 20261003170000, appliquée après le déploiement du code.
--
-- Qui gagne quel accès : personne. Aucune donnée touchée (mesure prod du
-- 2026-10-03 : 10 verrous, tous de vendeurs, sous l'id de leur annonce ; aucun
-- verrou de proposant à migrer).
--
-- Corps repris de la production (pg_get_functiondef, 2026-10-03), md5(prosrc)
-- identiques en prod et en local : validate_locked_entity_reference
-- f17e874db745fd85cc6434177271559e, accept_proposal_atomic
-- f0db9c04d99758124de843301072084b. CREATE OR REPLACE conserve propriétaire,
-- SECURITY DEFINER / INVOKER, search_path et droits.
--
-- Migration additive (deux CREATE OR REPLACE).
--
-- ROLLBACK : rejouer les deux définitions d'origine ci-dessous.
--
-- CREATE OR REPLACE FUNCTION public.validate_locked_entity_reference()
--  RETURNS trigger
--  LANGUAGE plpgsql
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- BEGIN
--     -- Check if entity exists in either marketplace_listings or marketplace_trades
--     IF NOT EXISTS (
--         SELECT 1 FROM public.marketplace_listings WHERE id = NEW.locked_entity_id
--     ) AND NOT EXISTS (
--         SELECT 1 FROM public.marketplace_trades WHERE id = NEW.locked_entity_id
--     ) THEN
--         RAISE EXCEPTION 'locked_entity_id % does not exist in marketplace_listings or marketplace_trades', NEW.locked_entity_id;
--     END IF;
--
--     -- Validate locked_for matches the actual entity type
--     IF NEW.locked_for = 'listing' AND NOT EXISTS (
--         SELECT 1 FROM public.marketplace_listings WHERE id = NEW.locked_entity_id
--     ) THEN
--         RAISE EXCEPTION 'locked_entity_id % is not a valid listing', NEW.locked_entity_id;
--     END IF;
--
--     IF NEW.locked_for = 'trade' AND NOT EXISTS (
--         SELECT 1 FROM public.marketplace_trades WHERE id = NEW.locked_entity_id
--     ) THEN
--         RAISE EXCEPTION 'locked_entity_id % is not a valid trade', NEW.locked_entity_id;
--     END IF;
--
--     RETURN NEW;
-- END;
-- $function$;
--
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
--   IF v_listing.creator_id != p_user_id THEN
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

CREATE OR REPLACE FUNCTION public.validate_locked_entity_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
    -- Check if entity exists in either marketplace_listings or marketplace_trades
    IF NOT EXISTS (
        SELECT 1 FROM public.marketplace_listings WHERE id = NEW.locked_entity_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_trades WHERE id = NEW.locked_entity_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_proposals WHERE id = NEW.locked_entity_id
    ) THEN
        RAISE EXCEPTION 'locked_entity_id % does not exist in marketplace_listings or marketplace_trades', NEW.locked_entity_id;
    END IF;

    -- Validate locked_for matches the actual entity type
    -- Une carte offerte par une PROPOSITION est verrouillée sous l'id de la
    -- proposition (locked_for = 'listing' : lock_cards n'accepte que listing/trade).
    IF NEW.locked_for = 'listing' AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_listings WHERE id = NEW.locked_entity_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_proposals WHERE id = NEW.locked_entity_id
    ) THEN
        RAISE EXCEPTION 'locked_entity_id % is not a valid listing', NEW.locked_entity_id;
    END IF;

    IF NEW.locked_for = 'trade' AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_trades WHERE id = NEW.locked_entity_id
    ) THEN
        RAISE EXCEPTION 'locked_entity_id % is not a valid trade', NEW.locked_entity_id;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_proposal_atomic(p_proposal_id uuid, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal marketplace_proposals;
  v_listing marketplace_listings;
  v_trade_id UUID;
  v_current_offer JSONB;
  v_execute_result JSONB;
BEGIN
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

  IF v_listing.creator_id != p_user_id THEN
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
  INSERT INTO marketplace_trades (
    id, initiator_id, partner_id, trade_type, status,
    listing_id, proposal_id, current_offer, created_at, updated_at
  ) VALUES (
    v_trade_id, v_listing.creator_id, v_proposal.proposer_id,
    'marketplace', 'negotiating',
    v_listing.id, v_proposal.id,
    v_current_offer, NOW(), NOW()
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
