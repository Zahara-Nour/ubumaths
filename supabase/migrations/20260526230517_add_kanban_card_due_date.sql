-- ============================================================================
-- Migration: add due_date to kanban_cards
-- ----------------------------------------------------------------------------
-- Adds an optional due date on kanban cards. Stored as TIMESTAMPTZ so we can
-- carry timezone information end-to-end, but the API and UI treat it as a
-- date-only value (the time component is set to 00:00:00 UTC by the client).
--
-- RLS: inherited from existing kanban_cards policies — no change.
-- ============================================================================

ALTER TABLE kanban_cards
    ADD COLUMN due_date TIMESTAMPTZ NULL;

COMMENT ON COLUMN kanban_cards.due_date IS
    'Optional due date for the card. Stored as TIMESTAMPTZ but the application treats it as a calendar date (no meaningful time component).';

-- Partial index on non-null due dates: used by future "sort by due date" /
-- "overdue cards" features. Doesn't bloat the table while most cards are
-- date-less.
CREATE INDEX IF NOT EXISTS idx_kanban_cards_due_date
    ON kanban_cards (due_date)
    WHERE due_date IS NOT NULL;
