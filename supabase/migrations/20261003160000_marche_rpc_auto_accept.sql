-- =============================================================================
-- Marché : auto-acceptation d'une offre exacte, vérifiée sous verrou
-- =============================================================================
--
-- Défaut d'audit (course TOCTOU) : la route POST
-- /api/marketplace/listings/[id]/proposals compare l'offre du proposant à la
-- demande de l'annonce, PUIS appelle accept_proposal_atomic, qui relit la
-- proposition en base. Entre les deux, le proposant pouvait modifier sa
-- proposition (policy UPDATE) : la comparaison portait sur une offre, l'échange
-- en exécutait une autre. Et la comparaison de la route travaille sur un
-- ENSEMBLE de modèles : une annonce qui demande [A, A] se contentait d'une
-- seule carte A.
--
-- Nouvelle fonction auto_accept_exact_proposal(p_proposal_id), réservée au
-- serveur (service_role) :
--   1. verrouille la proposition puis l'annonce (FOR UPDATE NOWAIT, même
--      ordre qu'accept_proposal_atomic) ; une ligne déjà verrouillée rend
--      {success:false, reason:'busy'} au lieu d'attendre (execute_trade met à
--      jour les propositions de l'annonce : attendre exposait à un
--      interblocage) ;
--   2. recalcule l'égalité offre / demande SUR LES LIGNES VERROUILLÉES,
--      en multiensemble (deux A demandés = deux cartes A distinctes offertes ;
--      une même instance citée deux fois ne compte qu'une fois → refus) ;
--      sémantique de la route conservée sinon : gidouilles offertes >= demandées,
--      cartes en plus admises pour une annonce qui demande des cartes, aucune
--      carte pour une annonce qui ne demande que des gidouilles ;
--   3. refuse aussi une proposition d'une autre école que l'annonce (ou d'un
--      élève sans école), et des cartes consommées (usedAt) ou verrouillées
--      pour une autre entité que cette proposition (reason 'cards_unavailable') ;
--   4. si l'offre est exacte, exécute l'échange par accept_proposal_atomic,
--      dans la même transaction (les verrous sont déjà tenus).
-- Une offre non exacte rend {success:false, reason:'not_exact'} : rien ne bouge,
-- la proposition reste en attente.
--
-- Question d'accès : personne ne gagne d'accès. La fonction n'est exécutable
-- que par le serveur (REVOKE PUBLIC / anon / authenticated, garde interne).
-- Aucun appelant n'existe encore : la route l'appellera dans une PR suivante
-- (database.ts est généré depuis la production).
--
-- Migration additive : une fonction créée, aucune donnée touchée.
--
-- ROLLBACK :
--   DROP FUNCTION IF EXISTS public.auto_accept_exact_proposal(uuid);
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_accept_exact_proposal(p_proposal_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal marketplace_proposals;
  v_listing marketplace_listings;
  v_wanted text[];
  v_wanted_gidouilles integer;
  v_offered text[];
  v_offered_gidouilles integer;
  v_proposer_school uuid;
  v_proposer_cards jsonb;
  v_exact boolean := false;
  v_accept json;
BEGIN
  -- Réservée au serveur : un élève ne déclenche pas l'acceptation au nom du vendeur.
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Réservé au serveur' USING ERRCODE = '42501';
  END IF;

  -- Même ordre de verrouillage qu'accept_proposal_atomic : proposition, puis annonce.
  SELECT * INTO v_proposal
  FROM marketplace_proposals
  WHERE id = p_proposal_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_proposal.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'reason', 'not_pending');
  END IF;

  SELECT * INTO v_listing
  FROM marketplace_listings
  WHERE id = v_proposal.listing_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND OR v_listing.status <> 'active' THEN
    RETURN json_build_object('success', false, 'reason', 'listing_inactive');
  END IF;

  IF v_listing.creator_id = v_proposal.proposer_id THEN
    RETURN json_build_object('success', false, 'reason', 'own_listing');
  END IF;

  -- L'école est la frontière du marché.
  SELECT school_id, vip_cards INTO v_proposer_school, v_proposer_cards
  FROM profiles
  WHERE id = v_proposal.proposer_id;

  IF v_proposer_school IS NULL OR v_proposer_school IS DISTINCT FROM v_listing.school_id THEN
    RETURN json_build_object('success', false, 'reason', 'other_school');
  END IF;

  -- Cartes offertes indisponibles : consommées, ou verrouillées pour une autre
  -- entité que cette proposition (annonce, échange, autre proposition).
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(v_proposal.offered_card_ids, '{}'::text[])) AS i
    WHERE (v_proposer_cards -> i ->> 'usedAt') IS NOT NULL
       OR EXISTS (
         SELECT 1 FROM marketplace_locked_cards lc
         WHERE lc.card_instance_id = i
           AND lc.locked_entity_id <> v_proposal.id
       )
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'cards_unavailable');
  END IF;

  -- Comparaison sur les lignes verrouillées, jamais sur ce que la route a lu.
  v_wanted := COALESCE(v_listing.wanted_card_template_ids, '{}'::text[]);
  v_wanted_gidouilles := COALESCE(v_listing.wanted_gidouilles, 0);
  v_offered := COALESCE(v_proposal.offered_card_ids, '{}'::text[]);
  v_offered_gidouilles := COALESCE(v_proposal.offered_gidouilles, 0);

  IF cardinality(v_wanted) = 0 AND v_wanted_gidouilles > 0 THEN
    -- Annonce qui ne demande que des gidouilles.
    v_exact := v_offered_gidouilles >= v_wanted_gidouilles AND cardinality(v_offered) = 0;

  ELSIF cardinality(v_wanted) > 0 AND cardinality(v_offered) > 0 THEN
    v_exact :=
      -- une même instance citée deux fois ne vaut qu'une carte
      cardinality(v_offered) = (SELECT count(DISTINCT i) FROM unnest(v_offered) AS i)
      -- chaque carte offerte est bien dans l'inventaire du proposant
      AND NOT EXISTS (
        SELECT 1 FROM unnest(v_offered) AS i
        WHERE (v_proposer_cards -> i ->> 'cardId') IS NULL
      )
      -- multiensemble : chaque modèle demandé n fois est offert au moins n fois
      AND NOT EXISTS (
        SELECT 1
        FROM (SELECT t, count(*) AS n FROM unnest(v_wanted) AS t GROUP BY t) AS w
        WHERE w.n > (
          SELECT count(*) FROM unnest(v_offered) AS i
          WHERE v_proposer_cards -> i ->> 'cardId' = w.t
        )
      )
      AND (v_wanted_gidouilles <= 0 OR v_offered_gidouilles >= v_wanted_gidouilles);
  END IF;

  IF NOT v_exact THEN
    RETURN json_build_object('success', false, 'reason', 'not_exact');
  END IF;

  -- Échange exécuté dans la même transaction, verrous déjà tenus.
  v_accept := accept_proposal_atomic(p_proposal_id, v_listing.creator_id);

  IF COALESCE((v_accept ->> 'success')::boolean, false) THEN
    RETURN json_build_object(
      'success', true,
      'trade_id', v_accept ->> 'trade_id'
    );
  END IF;

  RETURN json_build_object(
    'success', false,
    'reason', 'accept_failed',
    'error', COALESCE(v_accept ->> 'error', 'Erreur inconnue')
  );

EXCEPTION
  WHEN lock_not_available THEN
    -- Une autre transaction tient la proposition ou l'annonce : on n'attend pas.
    RETURN json_build_object('success', false, 'reason', 'busy');
END;
$function$;

COMMENT ON FUNCTION public.auto_accept_exact_proposal(uuid) IS
  'Serveur seul : accepte une proposition si, sous verrou, son offre couvre exactement la demande de l''annonce (multiensemble).';

REVOKE ALL ON FUNCTION public.auto_accept_exact_proposal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_accept_exact_proposal(uuid) TO service_role;
