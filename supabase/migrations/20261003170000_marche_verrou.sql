-- =============================================================================
-- Marché : acceptation, propositions et annonces verrouillées (Q140, Q147)
-- =============================================================================
--
-- Décisions de David (questions d'accès tranchées le 2026-10-03) :
--
-- Q140 — accept_proposal_atomic(p_proposal_id, p_user_id), SECURITY DEFINER,
--   faisait confiance à p_user_id : un proposant passait l'id du vendeur et
--   forçait l'acceptation de SA proposition. → p_user_id doit valoir
--   auth.uid(), sauf appel service role ; p_user_id NULL refusé ; contrôle
--   « vendeur = creator_id » en IS DISTINCT FROM.
--
-- Q147 — une fois sa proposition faite, le proposant ne peut plus, par un appel
--   direct, que la RETIRER (status pending → withdrawn ; responded_at et
--   withdrawn_at libres, rien d'autre). Resoumission, montant, cartes : par la
--   route serveur (client service, après ses contrôles). Couvre aussi le
--   proposant qui se mettait lui-même status = 'accepted'.
--   Mise en œuvre : policy UPDATE restreinte (ALTER POLICY) + trigger qui fige
--   les autres colonnes (une policy ne voit pas l'ancienne ligne).
--
-- Q149 — le vendeur gardait une écriture large sur les propositions reçues : il
--   réécrivait les cartes offertes, ou même proposer_id (n'importe quel élève),
--   puis acceptait et dépouillait l'élève visé. → par un appel direct, le vendeur
--   ne peut plus que REFUSER : pending → rejected, seules status, responded_at et
--   response_message changent (policy + même trigger que Q147).
--
-- Audit — une proposition insérée en direct pouvait naître « accepted » : pour
--   les rôles de l'API, status = 'pending' et responded_at, withdrawn_at,
--   response_message NULL (trigger INSERT).
--
-- ORDRE : à appliquer APRÈS le déploiement du code de la même livraison (la
--   resoumission passe alors par le client service). Les verrous sous l'id de
--   la proposition sont dans 20261003165000, appliquée AVANT le déploiement.
--
-- Audit — le vendeur pouvait changer ce qu'offre son annonce (offered_card_ids,
--   offered_gidouilles) après réception des propositions, puis accepter.
--   → ce qu'offre une annonce, son école, son créateur et son type ne se
--   modifient plus par un appel direct (trigger ; aucun écran ne le fait :
--   PATCH /api/marketplace/listings/[id] n'accepte que wanted_*).
--
-- Audit — une proposition pouvait viser l'annonce d'une autre école.
--   → policy INSERT : l'annonce doit être de l'école du proposant (my_school()).
--
-- Triggers : ne refusent que pour les rôles de l'API (authenticated, anon) ;
-- le serveur (service_role) et les fonctions SECURITY DEFINER passent (même
-- convention que guard_profile_reserved_fields, 20261001180000).
--
-- Qui perd quel accès (miroir) : le proposant ne peut plus modifier sa
-- proposition en direct, sauf pour la retirer ; le vendeur ne peut plus que
-- refuser une proposition reçue, ni changer l'offre de son annonce ; personne ne propose hors de son école ; personne
-- n'accepte au nom d'un autre. Personne ne gagne d'accès. Aucune donnée touchée.
--
-- Corps d'accept_proposal_atomic : celui de 20261003165000 (prod f0db9c04d997…
-- + levée des verrous de la proposition acceptée), seule la garde est ajoutée ; policies identiques (md5 des définitions 520b2661…). CREATE OR
-- REPLACE conserve propriétaire, SECURITY DEFINER, search_path et droits.
--
-- Migration additive : CREATE OR REPLACE, ALTER POLICY, CREATE TRIGGER.
--
-- ROLLBACK (intégral) :
--
--   DROP TRIGGER IF EXISTS guard_marketplace_proposal_update_trg ON public.marketplace_proposals;
--   DROP FUNCTION IF EXISTS public.guard_marketplace_proposal_update();
--   DROP TRIGGER IF EXISTS guard_marketplace_proposal_insert_trg ON public.marketplace_proposals;
--   DROP FUNCTION IF EXISTS public.guard_marketplace_proposal_insert();
--   DROP TRIGGER IF EXISTS guard_marketplace_listing_update_trg ON public.marketplace_listings;
--   DROP FUNCTION IF EXISTS public.guard_marketplace_listing_update();
--
--   ALTER POLICY marketplace_proposals_update_authorized ON public.marketplace_proposals
--     USING (
--   ((proposer_id = auth.uid()) OR (EXISTS ( SELECT 1
--      FROM marketplace_listings l
--     WHERE ((l.id = marketplace_proposals.listing_id) AND (l.creator_id = auth.uid())))))
--     )
--     WITH CHECK (
--   ((proposer_id = auth.uid()) OR (EXISTS ( SELECT 1
--      FROM marketplace_listings l
--     WHERE ((l.id = marketplace_proposals.listing_id) AND (l.creator_id = auth.uid())))))
--     );
--
--   ALTER POLICY marketplace_proposals_insert_student ON public.marketplace_proposals
--     WITH CHECK (
--   ((proposer_id = auth.uid()) AND (EXISTS ( SELECT 1
--      FROM profiles p
--     WHERE ((p.id = auth.uid()) AND (p.role = 'student'::user_role)))) AND (NOT (EXISTS ( SELECT 1
--      FROM marketplace_listings l
--     WHERE ((l.id = marketplace_proposals.listing_id) AND (l.creator_id = auth.uid()))))) AND (EXISTS ( SELECT 1
--      FROM marketplace_listings l
--     WHERE ((l.id = marketplace_proposals.listing_id) AND (l.status = 'active'::text)))))
--     );
--
-- (accept_proposal_atomic revient à sa version de 20261003165000 :)
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

REVOKE ALL ON FUNCTION public.accept_proposal_atomic(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_proposal_atomic(uuid, uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Q147 : le proposant ne peut plus que retirer sa proposition en attente.
-- Q149 : le vendeur ne peut plus que la refuser.
-- -----------------------------------------------------------------------------
ALTER POLICY marketplace_proposals_update_authorized ON public.marketplace_proposals
  USING (
    ((proposer_id = auth.uid()) AND (status = 'pending'::text))
    OR ((status = 'pending'::text) AND (EXISTS ( SELECT 1
       FROM marketplace_listings l
      WHERE ((l.id = marketplace_proposals.listing_id) AND (l.creator_id = auth.uid())))))
  )
  WITH CHECK (
    ((proposer_id = auth.uid()) AND (status = 'withdrawn'::text))
    OR ((status = 'rejected'::text) AND (EXISTS ( SELECT 1
       FROM marketplace_listings l
      WHERE ((l.id = marketplace_proposals.listing_id) AND (l.creator_id = auth.uid())))))
  );

CREATE OR REPLACE FUNCTION public.guard_marketplace_proposal_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Q147 : le proposant, en direct, ne fait que retirer sa proposition en attente.
  IF OLD.proposer_id = auth.uid() THEN
    IF NOT (OLD.status = 'pending' AND NEW.status = 'withdrawn')
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
       OR NEW.proposer_id IS DISTINCT FROM OLD.proposer_id
       OR NEW.offered_card_ids IS DISTINCT FROM OLD.offered_card_ids
       OR NEW.offered_gidouilles IS DISTINCT FROM OLD.offered_gidouilles
       OR NEW.message IS DISTINCT FROM OLD.message
       OR NEW.response_message IS DISTINCT FROM OLD.response_message
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Une proposition faite ne peut plus qu''être retirée.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- Q149 : le vendeur, en direct, ne fait que refuser une proposition en attente.
  -- Tout le reste est figé, proposer_id en tête (le remplacer dépouillait un élève).
  IF EXISTS (
    SELECT 1 FROM public.marketplace_listings l
    WHERE l.id = OLD.listing_id AND l.creator_id = auth.uid()
  ) THEN
    IF NOT (OLD.status = 'pending' AND NEW.status = 'rejected')
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.proposer_id IS DISTINCT FROM OLD.proposer_id
       OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
       OR NEW.offered_card_ids IS DISTINCT FROM OLD.offered_card_ids
       OR NEW.offered_gidouilles IS DISTINCT FROM OLD.offered_gidouilles
       OR NEW.message IS DISTINCT FROM OLD.message
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.withdrawn_at IS DISTINCT FROM OLD.withdrawn_at THEN
      RAISE EXCEPTION 'Une proposition reçue ne peut qu''être refusée.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_marketplace_proposal_update() IS
  'Q147/Q149 : pour les rôles de l''API, le proposant ne peut que retirer (pending → withdrawn), le vendeur que refuser (pending → rejected).';

CREATE OR REPLACE FUNCTION public.guard_marketplace_proposal_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Une proposition naît en attente, sans réponse ni retrait.
  IF NEW.status IS DISTINCT FROM 'pending'
     OR NEW.responded_at IS NOT NULL
     OR NEW.withdrawn_at IS NOT NULL
     OR NEW.response_message IS NOT NULL THEN
    RAISE EXCEPTION 'Une proposition naît en attente.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_marketplace_proposal_insert() IS
  'Pour les rôles de l''API : une proposition est insérée pending, sans réponse ni retrait.';

CREATE TRIGGER guard_marketplace_proposal_insert_trg
  BEFORE INSERT ON public.marketplace_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_marketplace_proposal_insert();

CREATE TRIGGER guard_marketplace_proposal_update_trg
  BEFORE UPDATE ON public.marketplace_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_marketplace_proposal_update();

-- -----------------------------------------------------------------------------
-- Audit : ce qu'offre une annonce ne se modifie pas en direct.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_marketplace_listing_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.offered_card_ids IS DISTINCT FROM OLD.offered_card_ids
     OR NEW.offered_gidouilles IS DISTINCT FROM OLD.offered_gidouilles
     OR NEW.school_id IS DISTINCT FROM OLD.school_id
     OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
     OR NEW.listing_type IS DISTINCT FROM OLD.listing_type THEN
    RAISE EXCEPTION 'Ce qu''offre une annonce ne se modifie pas.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_marketplace_listing_update() IS
  'Pour les rôles de l''API : l''offre, l''école, le créateur et le type d''une annonce sont figés.';

CREATE TRIGGER guard_marketplace_listing_update_trg
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_marketplace_listing_update();

-- -----------------------------------------------------------------------------
-- Audit : une proposition vise une annonce active DE SON ÉCOLE.
-- -----------------------------------------------------------------------------
ALTER POLICY marketplace_proposals_insert_student ON public.marketplace_proposals
  WITH CHECK (
    (proposer_id = auth.uid())
    AND (EXISTS ( SELECT 1
       FROM profiles p
      WHERE ((p.id = auth.uid()) AND (p.role = 'student'::user_role))))
    AND (NOT (EXISTS ( SELECT 1
       FROM marketplace_listings l
      WHERE ((l.id = marketplace_proposals.listing_id) AND (l.creator_id = auth.uid())))))
    AND (EXISTS ( SELECT 1
       FROM marketplace_listings l
      WHERE ((l.id = marketplace_proposals.listing_id)
        AND (l.status = 'active'::text)
        AND (l.school_id = my_school()))))
  );
