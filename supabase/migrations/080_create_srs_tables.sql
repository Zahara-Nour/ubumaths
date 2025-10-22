-- ============================================================================
-- SRS (Spaced Repetition System) Tables
-- ============================================================================
--
-- Creates tables for Anki-style spaced repetition learning system.
--
-- Architecture:
-- - srs_decks: Collections of flashcards (owned by students or teachers)
-- - srs_cards: Individual flashcards (template-based or custom)
-- - srs_card_stats: FSRS metadata (global per user + card reference)
-- - srs_review_sessions: Study session history
-- - srs_deck_assignments: Teacher → Student deck assignments
--
-- FSRS Algorithm:
-- - Uses FSRS-6 (Free Spaced Repetition Scheduler)
-- - Tracks Difficulty, Stability, Retrievability (DSR model)
-- - 4 grades: Again (1), Hard (2), Good (3), Easy (4)
--
-- Migration: 080
-- Created: 2025-10-22
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- srs_decks: Flashcard decks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS srs_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Deck info
  name TEXT NOT NULL,
  description TEXT,

  -- Ownership
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Deck type
  deck_type TEXT NOT NULL CHECK (deck_type IN ('official', 'personal')),

  -- Whether this deck was assigned by a teacher (read-only for student)
  is_assigned BOOLEAN NOT NULL DEFAULT false,

  -- FSRS configuration (JSONB)
  -- {
  --   "desiredRetention": 0.9,
  --   "parameters": [0.212, 1.2931, ...],  -- Optional custom params
  --   "maximumInterval": 36500
  -- }
  config JSONB NOT NULL DEFAULT '{
    "desiredRetention": 0.9,
    "maximumInterval": 36500
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- srs_cards: Individual flashcards
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS srs_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Deck membership
  deck_id UUID NOT NULL REFERENCES srs_decks(id) ON DELETE CASCADE,

  -- Card type
  card_type TEXT NOT NULL CHECK (card_type IN ('template', 'custom')),

  -- For template-based cards: reference to question_templates
  template_id UUID REFERENCES question_templates(id) ON DELETE CASCADE,

  -- For custom cards: front and back content (JSONB ContentField[])
  front_content JSONB,
  back_content JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_template_card_has_template_id
    CHECK (card_type != 'template' OR template_id IS NOT NULL),
  CONSTRAINT check_custom_card_has_content
    CHECK (card_type != 'custom' OR (front_content IS NOT NULL AND back_content IS NOT NULL))
);

-- ----------------------------------------------------------------------------
-- srs_card_stats: FSRS metadata (global per user + card reference)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS srs_card_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User ownership
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Card reference (template or custom)
  card_reference_type TEXT NOT NULL CHECK (card_reference_type IN ('template', 'custom')),
  card_reference_id UUID NOT NULL,

  -- ===== FSRS DSR Model =====

  -- Difficulty (D): 1-10, higher = more difficult
  difficulty REAL NOT NULL DEFAULT 5.0 CHECK (difficulty >= 1 AND difficulty <= 10),

  -- Stability (S): Days before retrievability drops to 90%
  stability REAL NOT NULL DEFAULT 0.0 CHECK (stability >= 0),

  -- Card state
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review', 'relearning')),

  -- ===== Scheduling =====

  -- When last reviewed
  last_review TIMESTAMPTZ,

  -- When next review is due
  next_review TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ===== Statistics =====

  -- Total number of reviews
  total_reviews INTEGER NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),

  -- Review history (JSONB array)
  -- [{
  --   "date": "2025-10-22T10:00:00Z",
  --   "grade": 3,
  --   "elapsedDays": 5.2,
  --   "retrievability": 0.88,
  --   "timeSpent": 15
  -- }]
  review_history JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one stats entry per user + card reference
  CONSTRAINT unique_user_card_reference UNIQUE (user_id, card_reference_type, card_reference_id)
);

-- ----------------------------------------------------------------------------
-- srs_review_sessions: Study session history
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS srs_review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session info
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES srs_decks(id) ON DELETE CASCADE,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Statistics
  cards_reviewed INTEGER NOT NULL DEFAULT 0 CHECK (cards_reviewed >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  total_time INTEGER NOT NULL DEFAULT 0 CHECK (total_time >= 0), -- seconds
  average_time REAL NOT NULL DEFAULT 0 CHECK (average_time >= 0), -- seconds

  -- Constraint: correct_count <= cards_reviewed
  CONSTRAINT check_correct_count_valid CHECK (correct_count <= cards_reviewed)
);

-- ----------------------------------------------------------------------------
-- srs_deck_assignments: Teacher → Student deck assignments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS srs_deck_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source deck (teacher's template deck)
  source_deck_id UUID NOT NULL REFERENCES srs_decks(id) ON DELETE CASCADE,

  -- Assignment info
  assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL, -- Student ID or Class ID
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('student', 'class')),

  -- Metadata
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- srs_decks indexes
CREATE INDEX idx_srs_decks_owner_id ON srs_decks(owner_id);
CREATE INDEX idx_srs_decks_deck_type ON srs_decks(deck_type);
CREATE INDEX idx_srs_decks_is_assigned ON srs_decks(is_assigned);

-- srs_cards indexes
CREATE INDEX idx_srs_cards_deck_id ON srs_cards(deck_id);
CREATE INDEX idx_srs_cards_card_type ON srs_cards(card_type);
CREATE INDEX idx_srs_cards_template_id ON srs_cards(template_id) WHERE template_id IS NOT NULL;

-- srs_card_stats indexes
CREATE INDEX idx_srs_card_stats_user_id ON srs_card_stats(user_id);
CREATE INDEX idx_srs_card_stats_next_review ON srs_card_stats(next_review);
CREATE INDEX idx_srs_card_stats_state ON srs_card_stats(state);
CREATE INDEX idx_srs_card_stats_reference ON srs_card_stats(card_reference_type, card_reference_id);

-- srs_review_sessions indexes
CREATE INDEX idx_srs_review_sessions_user_id ON srs_review_sessions(user_id);
CREATE INDEX idx_srs_review_sessions_deck_id ON srs_review_sessions(deck_id);
CREATE INDEX idx_srs_review_sessions_started_at ON srs_review_sessions(started_at DESC);

-- srs_deck_assignments indexes
CREATE INDEX idx_srs_deck_assignments_source_deck ON srs_deck_assignments(source_deck_id);
CREATE INDEX idx_srs_deck_assignments_assigned_by ON srs_deck_assignments(assigned_by);
CREATE INDEX idx_srs_deck_assignments_assigned_to ON srs_deck_assignments(assigned_to);
CREATE INDEX idx_srs_deck_assignments_type ON srs_deck_assignments(assignment_type);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on srs_decks
CREATE TRIGGER update_srs_decks_updated_at
BEFORE UPDATE ON srs_decks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on srs_cards
CREATE TRIGGER update_srs_cards_updated_at
BEFORE UPDATE ON srs_cards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on srs_card_stats
CREATE TRIGGER update_srs_card_stats_updated_at
BEFORE UPDATE ON srs_card_stats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE srs_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE srs_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE srs_card_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE srs_review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE srs_deck_assignments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- srs_decks policies
-- ----------------------------------------------------------------------------

-- Users can view their own decks
CREATE POLICY "Users can view their own decks"
ON srs_decks FOR SELECT
USING (auth.uid() = owner_id);

-- Users can create their own decks
CREATE POLICY "Users can create their own decks"
ON srs_decks FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Users can update their own non-assigned decks
CREATE POLICY "Users can update their own non-assigned decks"
ON srs_decks FOR UPDATE
USING (auth.uid() = owner_id AND is_assigned = false);

-- Users can delete their own non-assigned decks
CREATE POLICY "Users can delete their own non-assigned decks"
ON srs_decks FOR DELETE
USING (auth.uid() = owner_id AND is_assigned = false);

-- ----------------------------------------------------------------------------
-- srs_cards policies
-- ----------------------------------------------------------------------------

-- Users can view cards in their decks
CREATE POLICY "Users can view cards in their decks"
ON srs_cards FOR SELECT
USING (
  deck_id IN (
    SELECT id FROM srs_decks WHERE owner_id = auth.uid()
  )
);

-- Users can create cards in their non-assigned decks
CREATE POLICY "Users can create cards in their non-assigned decks"
ON srs_cards FOR INSERT
WITH CHECK (
  deck_id IN (
    SELECT id FROM srs_decks WHERE owner_id = auth.uid() AND is_assigned = false
  )
);

-- Users can update cards in their non-assigned decks
CREATE POLICY "Users can update cards in their non-assigned decks"
ON srs_cards FOR UPDATE
USING (
  deck_id IN (
    SELECT id FROM srs_decks WHERE owner_id = auth.uid() AND is_assigned = false
  )
);

-- Users can delete cards in their non-assigned decks
CREATE POLICY "Users can delete cards in their non-assigned decks"
ON srs_cards FOR DELETE
USING (
  deck_id IN (
    SELECT id FROM srs_decks WHERE owner_id = auth.uid() AND is_assigned = false
  )
);

-- ----------------------------------------------------------------------------
-- srs_card_stats policies
-- ----------------------------------------------------------------------------

-- Users can view their own card stats
CREATE POLICY "Users can view their own card stats"
ON srs_card_stats FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own card stats
CREATE POLICY "Users can create their own card stats"
ON srs_card_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own card stats
CREATE POLICY "Users can update their own card stats"
ON srs_card_stats FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own card stats
CREATE POLICY "Users can delete their own card stats"
ON srs_card_stats FOR DELETE
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- srs_review_sessions policies
-- ----------------------------------------------------------------------------

-- Users can view their own review sessions
CREATE POLICY "Users can view their own review sessions"
ON srs_review_sessions FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own review sessions
CREATE POLICY "Users can create their own review sessions"
ON srs_review_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own review sessions
CREATE POLICY "Users can update their own review sessions"
ON srs_review_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- srs_deck_assignments policies
-- ----------------------------------------------------------------------------

-- Teachers can view assignments they created
CREATE POLICY "Teachers can view their own assignments"
ON srs_deck_assignments FOR SELECT
USING (
  auth.uid() = assigned_by
  OR (
    assignment_type = 'student' AND auth.uid() = assigned_to
  )
);

-- Teachers can create assignments
CREATE POLICY "Teachers can create assignments"
ON srs_deck_assignments FOR INSERT
WITH CHECK (auth.uid() = assigned_by AND is_teacher_or_admin());

-- Teachers can delete their assignments
CREATE POLICY "Teachers can delete their assignments"
ON srs_deck_assignments FOR DELETE
USING (auth.uid() = assigned_by AND is_teacher_or_admin());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

/**
 * Get cards due for review for a specific deck
 *
 * Returns cards that:
 * - Belong to the deck
 * - Are due for review (next_review <= now)
 * - Have stats for the current user
 *
 * @param p_user_id - User ID
 * @param p_deck_id - Deck ID
 * @returns Array of card IDs due for review
 */
CREATE OR REPLACE FUNCTION get_due_cards_for_deck(
  p_user_id UUID,
  p_deck_id UUID
)
RETURNS TABLE (
  card_id UUID,
  template_id UUID,
  card_type TEXT,
  difficulty REAL,
  stability REAL,
  state TEXT,
  next_review TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS card_id,
    c.template_id,
    c.card_type,
    COALESCE(s.difficulty, 5.0) AS difficulty,
    COALESCE(s.stability, 0.0) AS stability,
    COALESCE(s.state, 'new'::TEXT) AS state,
    COALESCE(s.next_review, NOW()) AS next_review
  FROM srs_cards c
  LEFT JOIN srs_card_stats s ON (
    s.user_id = p_user_id
    AND s.card_reference_type = c.card_type
    AND (
      (c.card_type = 'template' AND s.card_reference_id::text = c.template_id::text)
      OR (c.card_type = 'custom' AND s.card_reference_id::text = c.id::text)
    )
  )
  WHERE
    c.deck_id = p_deck_id
    AND COALESCE(s.next_review, NOW()) <= NOW()
  ORDER BY COALESCE(s.next_review, NOW()) ASC;
END;
$$;

/**
 * Get total cards count and due count for a deck
 *
 * @param p_user_id - User ID
 * @param p_deck_id - Deck ID
 * @returns (total_cards, due_count, new_count, learning_count, review_count)
 */
CREATE OR REPLACE FUNCTION get_deck_stats(
  p_user_id UUID,
  p_deck_id UUID
)
RETURNS TABLE (
  total_cards BIGINT,
  due_count BIGINT,
  new_count BIGINT,
  learning_count BIGINT,
  review_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE srs_decks IS 'SRS flashcard decks (official from bank or personal custom)';
COMMENT ON TABLE srs_cards IS 'Individual flashcards (template-based or custom front/back)';
COMMENT ON TABLE srs_card_stats IS 'FSRS metadata (global per user + card reference)';
COMMENT ON TABLE srs_review_sessions IS 'Study session history for analytics';
COMMENT ON TABLE srs_deck_assignments IS 'Teacher → Student deck assignments (triggers deck copy)';

COMMENT ON COLUMN srs_decks.deck_type IS 'official = from question bank, personal = custom student deck';
COMMENT ON COLUMN srs_decks.is_assigned IS 'true = assigned by teacher (read-only for student)';
COMMENT ON COLUMN srs_decks.config IS 'FSRS configuration (desiredRetention, parameters, maxInterval)';

COMMENT ON COLUMN srs_cards.card_type IS 'template = references question_templates, custom = front/back content';
COMMENT ON COLUMN srs_cards.template_id IS 'For template cards: FK to question_templates';
COMMENT ON COLUMN srs_cards.front_content IS 'For custom cards: Front content (JSONB ContentField[])';
COMMENT ON COLUMN srs_cards.back_content IS 'For custom cards: Back content (JSONB ContentField[])';

COMMENT ON COLUMN srs_card_stats.card_reference_type IS 'template or custom (determines which ID to use)';
COMMENT ON COLUMN srs_card_stats.card_reference_id IS 'template_id OR custom card_id (UUID)';
COMMENT ON COLUMN srs_card_stats.difficulty IS 'FSRS Difficulty (D): 1-10, higher = more difficult';
COMMENT ON COLUMN srs_card_stats.stability IS 'FSRS Stability (S): Days before retrievability drops to 90%';
COMMENT ON COLUMN srs_card_stats.review_history IS 'JSONB array of review history entries';

COMMENT ON FUNCTION get_due_cards_for_deck IS 'Get cards due for review in a specific deck for a user';
COMMENT ON FUNCTION get_deck_stats IS 'Get statistics for a deck (total cards, due count, state counts)';
