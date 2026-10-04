-- =============================================================================
-- Échanges : la confirmation est refusée après le délai de 5 minutes
-- =============================================================================
--
-- Défaut relevé le 2026-10-04 : le délai de 5 minutes de la phase de
-- confirmation n'était vérifié que par la route
-- src/routes/api/marketplace/trades/[id]/confirm/+server.ts
-- (CONFIRMATION_TIMEOUT = 5 * 60 * 1000). Un élève pouvait écrire
-- `confirmed_by_<lui> = true` directement par PostgREST après l'expiration,
-- puis appeler `rpc/execute_trade`.
--
-- DÉCISION DE DAVID (2026-10-04) : un élève ne peut plus confirmer après
-- l'expiration du délai.
--
-- Correctif : extension du trigger `guard_marketplace_trade_update` (dernière
-- version : 20261004230000, corps repris EXACTEMENT, un bloc ajouté avant
-- RETURN NEW). Pour les rôles de l'API (authenticated, anon), passer SA propre
-- confirmation à true exige confirmation_started_at non NULL et
-- now() - confirmation_started_at <= interval '5 minutes'. La valeur testée
-- est celle qui sera écrite (après le bloc qui fige confirmation_started_at) ;
-- set_trade_validation_timestamp_trigger, qui passe après, ne se déclenche que
-- si une validation change, auquel cas l'heure repart de now().
-- Délai : même valeur que la route, documentée des deux côtés (une constante
-- SQL et une constante TypeScript ne se partagent pas).
--
-- execute_trade N'EST PAS modifiée : la garde du trigger suffit.
--   - execute_trade exige déjà les 4 drapeaux (20261004190000) ; pour les rôles
--     de l'API, confirmed_by_* ne passe à true qu'à travers ce trigger, donc
--     dans le délai. Les écritures des fonctions SECURITY DEFINER et du client
--     service ne sont pas contrôlées, comme avant.
--   - Le flux marché (accept_proposal_atomic) insère les 4 drapeaux à true
--     SANS confirmation_started_at, puis appelle execute_trade : une garde de
--     délai dans execute_trade devrait l'excepter (NULL), et refuserait en
--     plus un échange confirmé à temps par les deux mais exécuté juste après
--     la limite (seconde confirmation à 4 min 59 s) : un refus sans faute.
--   - Ce trigger n'est qu'un BEFORE UPDATE : l'INSERT d'accept_proposal_atomic
--     ne le traverse pas, et il passe par postgres (current_user ≠ API).
--
-- QUI PERD QUOI : un élève qui confirme après 5 minutes (ou sans phase
-- commencée) reçoit 42501 au lieu d'une écriture acceptée. La route /confirm
-- renvoyait déjà 410 dans ce cas avant d'écrire : aucun écran ne change.
-- Personne ne gagne d'accès.
--
-- Tests : tests/integration/echanges-delai-confirmation.test.ts
--
-- ROLLBACK (non destructif) : réexécuter le corps précédent (20261004230000),
-- recopié en fin de fichier avec son COMMENT. CREATE OR REPLACE conserve les
-- droits et le trigger.
-- =============================================================================

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

  -- Début de la phase de confirmation (2026-10-04, décision de David) : l'heure
  -- est celle de la base. Posée : figée (l'ancienne valeur est gardée, sans
  -- erreur, le store renvoie encore la sienne). Remise à NULL : permise.
  IF NEW.confirmation_started_at IS NOT NULL THEN
    IF OLD.confirmation_started_at IS NULL THEN
      NEW.confirmation_started_at := now();
    ELSE
      NEW.confirmation_started_at := OLD.confirmation_started_at;
    END IF;
  END IF;

  -- Délai de confirmation (2026-10-04, décision de David) : passer SA propre
  -- confirmation à true exige une phase commencée depuis 5 minutes au plus.
  -- Valeur effective (après le bloc précédent), telle qu'elle sera écrite.
  -- ⚠️ Même délai que CONFIRMATION_TIMEOUT dans
  -- src/routes/api/marketplace/trades/[id]/confirm/+server.ts.
  IF (v_is_initiator AND NEW.confirmed_by_initiator IS TRUE AND OLD.confirmed_by_initiator IS NOT TRUE)
     OR (NOT v_is_initiator AND NEW.confirmed_by_partner IS TRUE AND OLD.confirmed_by_partner IS NOT TRUE) THEN
    IF NEW.confirmation_started_at IS NULL
       OR now() - NEW.confirmation_started_at > interval '5 minutes' THEN
      RAISE EXCEPTION 'Le délai de confirmation (5 minutes) est dépassé : revalidez l''offre.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_marketplace_trade_update() IS
  '2026-10-04 : pour les rôles de l''API, un participant ne modifie que sa moitié de l''offre, sa validation, sa confirmation (l''autre : remise à false seulement), ou annule. Offre changée → validation de l''autre et confirmations à false. confirmation_started_at : posée par la base (now()), figée ensuite, remise à NULL permise. Sa confirmation : au plus 5 minutes après confirmation_started_at.';

-- =============================================================================
-- ROLLBACK — corps précédent (20261004230000_srs_stats_echanges_delai.sql),
-- à réexécuter tel quel (décommenté)
-- =============================================================================
--
-- CREATE OR REPLACE FUNCTION public.guard_marketplace_trade_update()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SET search_path = ''
-- AS $$
-- DECLARE
--   v_uid uuid := auth.uid();
--   v_is_initiator boolean;
--   v_own text;
--   v_other text;
--   v_own_half jsonb;
--   v_empty constant jsonb := '{"cards": [], "gidouilles": 0}'::jsonb;
-- BEGIN
--   -- Confiance : seuls les rôles de l'API sont contrôlés. Une fonction
--   -- SECURITY DEFINER (postgres) ou le client service passent.
--   IF current_user NOT IN ('authenticated', 'anon') THEN
--     RETURN NEW;
--   END IF;
--
--   IF v_uid IS NULL
--      OR (v_uid IS DISTINCT FROM OLD.initiator_id AND v_uid IS DISTINCT FROM OLD.partner_id) THEN
--     RAISE EXCEPTION 'Vous n''êtes pas participant à cet échange.' USING ERRCODE = '42501';
--   END IF;
--
--   v_is_initiator := (v_uid = OLD.initiator_id);
--   v_own := CASE WHEN v_is_initiator THEN 'from_initiator' ELSE 'from_partner' END;
--   v_other := CASE WHEN v_is_initiator THEN 'from_partner' ELSE 'from_initiator' END;
--
--   IF OLD.status IS DISTINCT FROM 'negotiating' THEN
--     RAISE EXCEPTION 'Un échange terminé ou annulé ne se modifie plus.' USING ERRCODE = '42501';
--   END IF;
--
--   -- Colonnes figées : identité de l'échange, issue, horodatage de validation.
--   IF NEW.id IS DISTINCT FROM OLD.id
--      OR NEW.trade_type IS DISTINCT FROM OLD.trade_type
--      OR NEW.initiator_id IS DISTINCT FROM OLD.initiator_id
--      OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
--      OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
--      OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id
--      OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
--      OR NEW.last_offer_by IS DISTINCT FROM OLD.last_offer_by
--      OR NEW.final_trade IS DISTINCT FROM OLD.final_trade
--      OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
--      OR NEW.created_at IS DISTINCT FROM OLD.created_at
--      OR NEW.validated_at IS DISTINCT FROM OLD.validated_at THEN
--     RAISE EXCEPTION 'Ces informations de l''échange ne se modifient pas.' USING ERRCODE = '42501';
--   END IF;
--
--   -- Statut : seule l'annulation est permise ; cancelled_at ne bouge qu'avec elle.
--   IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IS DISTINCT FROM 'cancelled' THEN
--     RAISE EXCEPTION 'Un échange ne peut qu''être annulé.' USING ERRCODE = '42501';
--   END IF;
--   IF NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at AND NEW.status IS DISTINCT FROM 'cancelled' THEN
--     RAISE EXCEPTION 'Un échange ne peut qu''être annulé.' USING ERRCODE = '42501';
--   END IF;
--
--   -- Drapeaux de l'autre : remise à false permise, passage à true interdit.
--   IF v_is_initiator THEN
--     IF NEW.validated_by_partner IS TRUE AND OLD.validated_by_partner IS NOT TRUE
--        OR NEW.confirmed_by_partner IS TRUE AND OLD.confirmed_by_partner IS NOT TRUE THEN
--       RAISE EXCEPTION 'Vous ne pouvez pas valider ou confirmer à la place de l''autre élève.'
--         USING ERRCODE = '42501';
--     END IF;
--   ELSE
--     IF NEW.validated_by_initiator IS TRUE AND OLD.validated_by_initiator IS NOT TRUE
--        OR NEW.confirmed_by_initiator IS TRUE AND OLD.confirmed_by_initiator IS NOT TRUE THEN
--       RAISE EXCEPTION 'Vous ne pouvez pas valider ou confirmer à la place de l''autre élève.'
--         USING ERRCODE = '42501';
--     END IF;
--   END IF;
--
--   -- Sa propre confirmation : seulement une fois l'offre validée des deux côtés.
--   IF (v_is_initiator AND NEW.confirmed_by_initiator IS TRUE AND OLD.confirmed_by_initiator IS NOT TRUE)
--      OR (NOT v_is_initiator AND NEW.confirmed_by_partner IS TRUE AND OLD.confirmed_by_partner IS NOT TRUE) THEN
--     IF NOT (NEW.validated_by_initiator IS TRUE AND NEW.validated_by_partner IS TRUE) THEN
--       RAISE EXCEPTION 'L''offre doit être validée par les deux élèves avant d''être confirmée.'
--         USING ERRCODE = '42501';
--     END IF;
--   END IF;
--
--   -- Offre : seule sa propre moitié change.
--   IF NEW.current_offer IS DISTINCT FROM OLD.current_offer THEN
--     IF NEW.current_offer IS NOT NULL AND (
--          jsonb_typeof(NEW.current_offer) IS DISTINCT FROM 'object'
--          OR EXISTS (
--            SELECT 1 FROM jsonb_object_keys(NEW.current_offer) AS k(cle)
--            WHERE k.cle NOT IN ('from_initiator', 'from_partner')
--          )) THEN
--       RAISE EXCEPTION 'Offre mal formée.' USING ERRCODE = '22023';
--     END IF;
--
--     -- Une moitié absente vaut une moitié vide (l'échange naît sans offre).
--     IF COALESCE(NEW.current_offer -> v_other, v_empty)
--        IS DISTINCT FROM COALESCE(OLD.current_offer -> v_other, v_empty) THEN
--       RAISE EXCEPTION 'Vous ne pouvez modifier que votre propre offre.' USING ERRCODE = '42501';
--     END IF;
--
--     v_own_half := NEW.current_offer -> v_own;
--     IF v_own_half IS NOT NULL AND NOT (
--          jsonb_typeof(v_own_half) = 'object'
--          AND jsonb_typeof(COALESCE(v_own_half -> 'cards', '[]'::jsonb)) = 'array'
--          AND NOT EXISTS (
--            SELECT 1 FROM jsonb_array_elements(COALESCE(v_own_half -> 'cards', '[]'::jsonb)) AS e(carte)
--            WHERE jsonb_typeof(e.carte) IS DISTINCT FROM 'string'
--          )
--          -- Entier écrit sans point ni signe : execute_trade fait
--          -- `->> 'gidouilles')::INTEGER`, qui échoue sur « 5.0 » (jsonb garde
--          -- l'échelle ; « 5e0 », lui, est rangé en « 5 »).
--          -- 9 chiffres au plus : reste dans un INTEGER.
--          AND jsonb_typeof(COALESCE(v_own_half -> 'gidouilles', '0'::jsonb)) = 'number'
--          AND (COALESCE(v_own_half ->> 'gidouilles', '0')) ~ '^[0-9]{1,9}$'
--        ) THEN
--       RAISE EXCEPTION 'Offre mal formée : cartes = liste d''identifiants, gidouilles = entier positif.'
--         USING ERRCODE = '22023';
--     END IF;
--
--     -- L'autre doit revalider ; personne n'a confirmé CETTE offre.
--     IF v_is_initiator THEN
--       NEW.validated_by_partner := false;
--     ELSE
--       NEW.validated_by_initiator := false;
--     END IF;
--     NEW.confirmed_by_initiator := false;
--     NEW.confirmed_by_partner := false;
--   END IF;
--
--   -- Une validation retirée (refus, expiration) annule les confirmations :
--   -- on valide PUIS on confirme, à chaque tour.
--   IF (OLD.validated_by_initiator IS TRUE AND NEW.validated_by_initiator IS NOT TRUE)
--      OR (OLD.validated_by_partner IS TRUE AND NEW.validated_by_partner IS NOT TRUE) THEN
--     NEW.confirmed_by_initiator := false;
--     NEW.confirmed_by_partner := false;
--   END IF;
--
--   -- Début de la phase de confirmation (2026-10-04, décision de David) : l'heure
--   -- est celle de la base. Posée : figée (l'ancienne valeur est gardée, sans
--   -- erreur, le store renvoie encore la sienne). Remise à NULL : permise.
--   IF NEW.confirmation_started_at IS NOT NULL THEN
--     IF OLD.confirmation_started_at IS NULL THEN
--       NEW.confirmation_started_at := now();
--     ELSE
--       NEW.confirmation_started_at := OLD.confirmation_started_at;
--     END IF;
--   END IF;
--
--   RETURN NEW;
-- END;
-- $$;
--
-- COMMENT ON FUNCTION public.guard_marketplace_trade_update() IS
--   '2026-10-04 : pour les rôles de l''API, un participant ne modifie que sa moitié de l''offre, sa validation, sa confirmation (l''autre : remise à false seulement), ou annule. Offre changée → validation de l''autre et confirmations à false. confirmation_started_at : posée par la base (now()), figée ensuite, remise à NULL permise.';
