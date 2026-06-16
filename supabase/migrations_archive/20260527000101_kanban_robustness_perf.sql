-- ============================================================================
-- Migration: Kanban robustness + perf
-- ----------------------------------------------------------------------------
-- Two changes:
--
-- 1. DB-level CHECK on `kanban_cards.description` (≤ 50000 chars). Until now
--    this was enforced only by Zod at the API boundary, which leaves a hole
--    for non-API writes (service-role scripts, future migrations, RPCs).
--
-- 2. `get_accessible_kanban_boards(p_limit, p_cursor)` RPC: replaces the
--    PostgREST nested-embed query in getAccessibleBoards. Returns each board
--    visible to the calling user enriched with the column / card counts,
--    sorted by `updated_at DESC` with cursor-based pagination.
--    The previous nested embed (`kanban_cards:kanban_columns(kanban_cards(count))`)
--    was ingenious but cryptic and harder to extend.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. CHECK constraint on description length
-- --------------------------------------------------------------------------
ALTER TABLE kanban_cards
    ADD CONSTRAINT kanban_cards_description_max_length
    CHECK (description IS NULL OR char_length(description) <= 50000);

COMMENT ON CONSTRAINT kanban_cards_description_max_length ON kanban_cards IS
    'Mirror of Zod max(50000) at the DB layer. Caps ubumark payload size and prevents accidental DB bloat from non-API writes.';

-- --------------------------------------------------------------------------
-- 2. RPC: get_accessible_kanban_boards
-- --------------------------------------------------------------------------
-- SECURITY DEFINER is INTENTIONALLY NOT used here: we want the underlying
-- kanban_boards SELECT to go through RLS, so the same visibility rules
-- (owner / class teacher / class member) apply transparently. We just count
-- the columns/cards via correlated sub-selects.
--
-- Cursor: pass the `updated_at` ISO string of the last board from the previous
-- page; rows with `updated_at < cursor` come next. Stable ordering tie-break
-- on `id` keeps results deterministic when two boards share an updated_at.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_accessible_kanban_boards(
    p_limit INT DEFAULT 100,
    p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    owner_id UUID,
    class_id UUID,
    title TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    column_count BIGINT,
    card_count BIGINT
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        b.id,
        b.owner_id,
        b.class_id,
        b.title,
        b.created_at,
        b.updated_at,
        (SELECT COUNT(*) FROM public.kanban_columns kc WHERE kc.board_id = b.id) AS column_count,
        (SELECT COUNT(*) FROM public.kanban_cards kca
            JOIN public.kanban_columns kcc ON kcc.id = kca.column_id
            WHERE kcc.board_id = b.id) AS card_count
    FROM public.kanban_boards b
    WHERE p_cursor IS NULL OR b.updated_at < p_cursor
    ORDER BY b.updated_at DESC, b.id DESC
    LIMIT GREATEST(1, LEAST(p_limit, 200));
$$;

GRANT EXECUTE ON FUNCTION public.get_accessible_kanban_boards(INT, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION public.get_accessible_kanban_boards(INT, TIMESTAMPTZ) IS
    'Returns kanban boards accessible to the calling user (via RLS) with column / card counts. Cursor-paginated by (updated_at DESC, id DESC). p_limit is clamped to [1, 200].';

-- --------------------------------------------------------------------------
-- 3. Composite indexes to support sort + counts efficiently
-- --------------------------------------------------------------------------
-- Card sort within a column (used by getBoardWithContent's PostgREST
-- referencedTable order; without this index the planner falls back to a sort).
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_position
    ON kanban_cards (column_id, position);

-- Column sort within a board (same reason).
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board_position
    ON kanban_columns (board_id, position);
