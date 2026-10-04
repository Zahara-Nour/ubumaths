-- =============================================================================
-- Statistiques d'un paquet SRS et délai de confirmation d'un échange
-- =============================================================================
--
-- Deux petits défauts relevés à l'audit du 2026-10-04.
--
-- 1. `get_deck_stats(p_user_id, p_deck_id)` (SECURITY DEFINER) vérifiait le
--    COMPTE (p_user_id = auth.uid(), ou prof/admin) mais pas le PAQUET : un
--    élève qui connaissait l'identifiant du paquet d'un camarade obtenait ses
--    compteurs (nombre de cartes, à revoir, nouvelles, en apprentissage).
--    Règle : le paquet doit être LISIBLE par l'appelant selon les deux
--    policies SELECT de `srs_decks`, reprises telles quelles :
--      « Users can view their own decks »           owner_id = auth.uid()
--      « Teachers can view assigned student decks » is_assigned = true ET une
--        assignation srs_deck_assignments(assigned_by = auth.uid(),
--        assigned_to = owner_id)
--    Il n'existe pas de policy SELECT admin sur `srs_decks` : l'admin suit la
--    même règle (ses paquets, et les copies qu'il a assignées).
--
--    INVENTAIRE DES APPELANTS (grep `get_deck_stats` dans src, chaînes et SQL
--    compris ; aucune fonction SQL ne l'appelle) — tous via locals.supabase,
--    donc auth.uid() = l'appelant :
--      a. dashboard/revisions/+page.server.ts : tout rôle, ses PROPRES paquets
--         (.eq('owner_id', user.id)) → propriétaire.
--      b. dashboard/teacher/srs/decks/+page.server.ts : prof/admin, ses
--         PROPRES paquets → propriétaire.
--      c. api/srs/decks/[id]/+server.ts (GET) : paquet relu avec
--         .eq('owner_id', user.id) avant l'appel → propriétaire.
--      d. dashboard/teacher/srs/decks/[id]/assignments/+page.server.ts :
--         prof/admin, la COPIE de l'élève (p_user_id = l'élève). La copie est
--         trouvée par findAssignedDeckCopy avec le client du prof, donc DÉJÀ à
--         travers la policy « Teachers can view assigned student decks » ;
--         la copie est écrite is_assigned = true et l'assignation avec
--         assigned_by = le prof (api/srs/decks/[id]/assign) → couvert.
--    Aucun chemin légitime hors de ces deux cases.
--
--    QUI PERD QUOI : un compte connecté qui demande les compteurs d'un paquet
--    qu'il ne peut pas lire (y compris un identifiant inexistant : 42501 au
--    lieu de zéros). Le prof et l'admin perdent les compteurs d'un paquet
--    d'élève qu'ils n'ont pas assigné eux-mêmes : aucun écran ne le fait.
--    Le client service (auth.uid() NULL) passe toujours, comme avant.
--
-- 2. `marketplace_trades.confirmation_started_at` : l'un ou l'autre élève
--    pouvait l'écrire (store `startConfirmationPhase`), donc la repousser sans
--    fin et prolonger le délai de 5 minutes vérifié par la route `/confirm`.
--    DÉCISION DE DAVID (2026-10-04) : un élève ne fixe plus cette heure, la
--    base la pose. Extension du trigger `guard_marketplace_trade_update`
--    (20261004190000), qui porte déjà la confiance par `current_user`. Pour
--    les rôles de l'API (authenticated, anon) :
--      - NULL → non NULL : la valeur envoyée est remplacée par now() ;
--      - non NULL → autre non NULL : l'ancienne valeur est conservée (écrasée
--        en silence, pas d'erreur : le store envoie encore sa propre heure
--        juste après la validation, et une erreur fermerait sa fenêtre) ;
--      - remise à NULL : permise (refus, expiration de /confirm).
--    Le trigger `set_trade_validation_timestamp_trigger` passe APRÈS (ordre
--    alphabétique) et reste maître du cas « les deux viennent de valider »
--    (now()) et « une validation retirée » (NULL). La contrainte
--    validate_timestamps_consistency reste inchangée.
--    Code applicatif inchangé : le store continue d'envoyer une heure que la
--    base écrase ; /confirm lit la valeur en base.
--
-- Tests : tests/integration/srs-stats-echanges-delai.test.ts
--
-- ROLLBACK (non destructif) : réexécuter les deux corps précédents, recopiés
-- en fin de fichier (get_deck_stats : 20261003210000 ; guard : 20261004190000,
-- avec son COMMENT). CREATE OR REPLACE conserve les droits et le trigger.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. get_deck_stats : le paquet doit être lisible par l'appelant.
--    Corps inchangé ; seule la seconde garde est ajoutée.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_deck_stats(p_user_id uuid, p_deck_id uuid)
 RETURNS TABLE(total_cards bigint, due_count bigint, new_count bigint, learning_count bigint, review_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 4, Q143) : SON compte, ou prof/admin (leurs écrans). auth.uid()
  -- NULL = appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Garde paquet (2026-10-04) : le paquet doit être lisible par l'appelant,
  -- selon les deux policies SELECT de srs_decks (« Users can view their own
  -- decks », « Teachers can view assigned student decks »), recopiées.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.srs_decks d
    WHERE d.id = p_deck_id
      AND (
        d.owner_id = auth.uid()
        OR (
          d.is_assigned = true
          AND EXISTS (
            SELECT 1
            FROM public.srs_deck_assignments sda
            WHERE sda.assigned_by = auth.uid()
              AND sda.assigned_to = d.owner_id
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'Accès refusé : paquet d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_cards,
    COUNT(*) FILTER (WHERE COALESCE(s.next_review, NOW()) <= NOW())::BIGINT AS due_count,
    COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'new')::BIGINT AS new_count,
    COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'learning')::BIGINT AS learning_count,
    COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'review')::BIGINT AS review_count
  FROM srs_cards c
  LEFT JOIN srs_card_stats s ON (
    s.user_id = p_user_id
    AND s.card_reference_type = c.card_type
    AND (
      (c.card_type = 'template' AND s.card_reference_id::text = c.template_id::text)
      OR (c.card_type = 'custom' AND s.card_reference_id::text = c.id::text)
    )
  )
  WHERE c.deck_id = p_deck_id;
END;
$function$
;

-- -----------------------------------------------------------------------------
-- 2. Échanges : confirmation_started_at posée par la base.
--    Corps de 20261004190000 inchangé ; seul le dernier bloc est ajouté.
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

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_marketplace_trade_update() IS
  '2026-10-04 : pour les rôles de l''API, un participant ne modifie que sa moitié de l''offre, sa validation, sa confirmation (l''autre : remise à false seulement), ou annule. Offre changée → validation de l''autre et confirmations à false. confirmation_started_at : posée par la base (now()), figée ensuite, remise à NULL permise.';

-- =============================================================================
-- ROLLBACK — corps précédents, à réexécuter tels quels (décommentés)
-- =============================================================================
--
-- ── get_deck_stats (20261003210000_rpc_lot4_hygiene.sql) ──────────────────
-- CREATE OR REPLACE FUNCTION public.get_deck_stats(p_user_id uuid, p_deck_id uuid)
--  RETURNS TABLE(total_cards bigint, due_count bigint, new_count bigint, learning_count bigint, review_count bigint)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- BEGIN
--   -- Garde (lot 4, Q143) : SON compte, ou prof/admin (leurs écrans). auth.uid()
--   -- NULL = appel au client service (anon n'a pas EXECUTE).
--   IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
--      AND NOT public.is_teacher_or_admin() THEN
--     RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
--   END IF;
--
--   RETURN QUERY
--   SELECT
--     COUNT(*)::BIGINT AS total_cards,
--     COUNT(*) FILTER (WHERE COALESCE(s.next_review, NOW()) <= NOW())::BIGINT AS due_count,
--     COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'new')::BIGINT AS new_count,
--     COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'learning')::BIGINT AS learning_count,
--     COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'review')::BIGINT AS review_count
--   FROM srs_cards c
--   LEFT JOIN srs_card_stats s ON (
--     s.user_id = p_user_id
--     AND s.card_reference_type = c.card_type
--     AND (
--       (c.card_type = 'template' AND s.card_reference_id::text = c.template_id::text)
--       OR (c.card_type = 'custom' AND s.card_reference_id::text = c.id::text)
--     )
--   )
--   WHERE c.deck_id = p_deck_id;
-- END;
-- $function$
-- ;
--
-- ── guard_marketplace_trade_update (20261004190000_echanges_garde_base.sql) ─
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
--   RETURN NEW;
-- END;
-- $$;
--
-- COMMENT ON FUNCTION public.guard_marketplace_trade_update() IS
--   '2026-10-04 : pour les rôles de l''API, un participant ne modifie que sa moitié de l''offre, sa validation, sa confirmation (l''autre : remise à false seulement), confirmation_started_at, ou annule. Offre changée → validation de l''autre et confirmations à false.';
--
