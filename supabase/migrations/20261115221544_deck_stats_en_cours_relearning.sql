-- =============================================================================
-- Tuile « En cours » d'un paquet : learning + relearning (chantier `fsrs`, Q7)
-- =============================================================================
--
-- Décision de David (2026-11-15). `get_deck_stats.learning_count` comptait
-- `learning` seul. Depuis la PR 1b du chantier (#2705), `learning` ne dure
-- qu'une révision, et une question ratée (`relearning`) n'y figurait jamais.
-- « En cours » compte désormais les deux.
--
-- Accès : inchangé. Corps de 20261004230000 recopié (gardes comprises) ; seul
-- le filtre de `learning_count` change. Signature et colonnes identiques : pas
-- de `db:types`.
--
-- Rollback : recréer la fonction de 20261004230000_srs_stats_echanges_delai.sql
-- (bloc 1), c'est-à-dire remettre
--   COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'learning')::BIGINT AS learning_count,
-- =============================================================================

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
    COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') IN ('learning', 'relearning'))::BIGINT AS learning_count,
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
