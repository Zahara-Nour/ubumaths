-- ============================================================================
-- Migration: Kanban tags (colored labels) — v1.3 sub-feature
-- ----------------------------------------------------------------------------
-- Adds two tables:
--
-- 1. `kanban_tags` — per-board label palette (name + colour). Scope is the
--    board itself: a tag from board A is invisible to board B. Names are
--    unique within a board (case-sensitive).
--
-- 2. `kanban_card_tags` — many-to-many junction between cards and tags. The
--    junction is the source of truth for "which tags are on this card".
--
-- Permissions:
-- - Tag CRUD (mgmt of the palette): board owner only.
-- - Assignment of an existing tag to a card: anyone with board access (so
--   class members can label their cards on a class board).
-- - Hard cap of 20 tags / board enforced by a partial CHECK via a function
--   (Postgres doesn't allow subqueries in CHECK directly).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Tables
-- --------------------------------------------------------------------------

-- Fixed colour palette as an enum so we keep a tight UI mapping (8 tokens).
CREATE TYPE kanban_tag_color AS ENUM (
    'green',
    'yellow',
    'orange',
    'red',
    'purple',
    'blue',
    'sky',
    'gray'
);

CREATE TABLE kanban_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
    color kanban_tag_color NOT NULL DEFAULT 'gray',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Name is unique per board (case-sensitive). Lower-casing would be nicer
    -- but Postgres' UNIQUE doesn't natively support LOWER() expressions in
    -- table syntax — easy to add later via a unique index if needed.
    UNIQUE (board_id, name)
);

COMMENT ON TABLE kanban_tags IS
    'Per-board label palette. Tags are board-scoped; deleting the board cascades to the palette.';

CREATE INDEX idx_kanban_tags_board_id ON kanban_tags (board_id);

CREATE TABLE kanban_card_tags (
    card_id UUID NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES kanban_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (card_id, tag_id)
);

COMMENT ON TABLE kanban_card_tags IS
    'Many-to-many junction between kanban_cards and kanban_tags. PK enforces no duplicate associations.';

-- Reverse lookup index for "all cards carrying tag X".
CREATE INDEX idx_kanban_card_tags_tag_id ON kanban_card_tags (tag_id);

-- --------------------------------------------------------------------------
-- 2. 20-tags-per-board cap (enforced via trigger, not CHECK)
-- --------------------------------------------------------------------------
-- CHECK can't reference other rows, so we use a BEFORE INSERT trigger.
-- Updates don't change the count, so no AFTER UPDATE trigger needed.

CREATE OR REPLACE FUNCTION public.enforce_kanban_tags_per_board_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.kanban_tags
    WHERE board_id = NEW.board_id;

    IF v_count >= 20 THEN
        RAISE EXCEPTION 'Limite de 20 tags par tableau atteinte'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_kanban_tags_per_board_cap
    BEFORE INSERT ON kanban_tags
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_kanban_tags_per_board_cap();

COMMENT ON FUNCTION public.enforce_kanban_tags_per_board_cap() IS
    'Caps each board at 20 tags. Subqueries are not allowed in CHECK constraints so we use a BEFORE INSERT trigger.';

-- --------------------------------------------------------------------------
-- 3. RLS — kanban_tags (board owner manages the palette; anyone with board
--    access can read tags)
-- --------------------------------------------------------------------------

ALTER TABLE kanban_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_tags_select"
    ON kanban_tags FOR SELECT
    TO authenticated
    USING (can_access_kanban_board(board_id));

CREATE POLICY "kanban_tags_insert"
    ON kanban_tags FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM kanban_boards b
            WHERE b.id = board_id AND b.owner_id = auth.uid()
        )
    );

CREATE POLICY "kanban_tags_update"
    ON kanban_tags FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM kanban_boards b
            WHERE b.id = board_id AND b.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM kanban_boards b
            WHERE b.id = board_id AND b.owner_id = auth.uid()
        )
    );

CREATE POLICY "kanban_tags_delete"
    ON kanban_tags FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM kanban_boards b
            WHERE b.id = board_id AND b.owner_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------------
-- 4. RLS — kanban_card_tags (anyone with card access can attach / detach)
-- --------------------------------------------------------------------------

ALTER TABLE kanban_card_tags ENABLE ROW LEVEL SECURITY;

-- Helper: can the current user touch this (card_id, tag_id) association?
-- Both must belong to a board the user can access, AND the tag must belong
-- to the SAME board as the card (no cross-board pollution).
CREATE OR REPLACE FUNCTION public.can_manage_kanban_card_tag(p_card_id UUID, p_tag_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_card_board UUID;
    v_tag_board UUID;
BEGIN
    SELECT col.board_id INTO v_card_board
    FROM public.kanban_cards c
    JOIN public.kanban_columns col ON col.id = c.column_id
    WHERE c.id = p_card_id;

    SELECT board_id INTO v_tag_board
    FROM public.kanban_tags
    WHERE id = p_tag_id;

    IF v_card_board IS NULL OR v_tag_board IS NULL THEN
        RETURN FALSE;
    END IF;
    IF v_card_board <> v_tag_board THEN
        RETURN FALSE;
    END IF;

    RETURN public.can_access_kanban_board(v_card_board);
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_kanban_card_tag(UUID, UUID) TO authenticated;

CREATE POLICY "kanban_card_tags_select"
    ON kanban_card_tags FOR SELECT
    TO authenticated
    USING (can_manage_kanban_card_tag(card_id, tag_id));

CREATE POLICY "kanban_card_tags_insert"
    ON kanban_card_tags FOR INSERT
    TO authenticated
    WITH CHECK (can_manage_kanban_card_tag(card_id, tag_id));

CREATE POLICY "kanban_card_tags_delete"
    ON kanban_card_tags FOR DELETE
    TO authenticated
    USING (can_manage_kanban_card_tag(card_id, tag_id));

-- No UPDATE policy: the association has no mutable fields. Updates would
-- need to delete + insert.
