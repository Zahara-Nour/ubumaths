/**
 * Create Missing Card Stats
 * ==========================
 *
 * Creates initial srs_card_stats for assigned deck cards that don't have stats yet.
 * This fixes decks that were assigned before automatic stats creation was implemented.
 */

-- Create initial stats for cards in assigned decks that have no stats yet
INSERT INTO srs_card_stats (
  user_id,
  card_reference_type,
  card_reference_id,
  difficulty,
  stability,
  state,
  last_review,
  next_review,
  total_reviews,
  review_history
)
SELECT DISTINCT
  sd.owner_id as user_id,
  sc.card_type as card_reference_type,
  CASE
    WHEN sc.card_type = 'template' THEN sc.template_id
    ELSE sc.id
  END as card_reference_id,
  5.0::real as difficulty, -- Default FSRS difficulty
  0.1::real as stability, -- Very short initial stability for new cards
  'new'::TEXT as state,
  NULL::timestamptz as last_review,
  NOW() as next_review, -- Available immediately for review
  0::integer as total_reviews,
  '[]'::jsonb as review_history
FROM srs_cards sc
INNER JOIN srs_decks sd ON sc.deck_id = sd.id
WHERE sd.is_assigned = true -- Only for assigned decks
  AND NOT EXISTS ( -- Only if stats don't already exist
    SELECT 1 FROM srs_card_stats scs
    WHERE scs.user_id = sd.owner_id
      AND scs.card_reference_type = sc.card_type
      AND scs.card_reference_id = CASE
        WHEN sc.card_type = 'template' THEN sc.template_id
        ELSE sc.id
      END
  );

-- Report what was done
DO $$
DECLARE
  created_count INTEGER;
BEGIN
  GET DIAGNOSTICS created_count = ROW_COUNT;
  RAISE NOTICE 'Created % missing card stats', created_count;
END $$;
