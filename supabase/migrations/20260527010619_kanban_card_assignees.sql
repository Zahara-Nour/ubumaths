-- ============================================================================
-- Migration: Kanban card assignees (multi-user, with mixte permissions)
-- ----------------------------------------------------------------------------
-- Adds `kanban_card_assignees`, a many-to-many junction between cards and
-- profiles. Mostly useful on class boards: a teacher can distribute work to
-- specific students (or pairs), and each student can see "their" cards via a
-- "Mes cartes" filter on the board view.
--
-- Permissions (the "mixte" rule):
-- - Board owner (teacher on a class board, owner on a personal board): can
--   add / remove any board member as an assignee.
-- - Other board members (class students): can only self-(un)assign — i.e.
--   they can add themselves to a card or remove themselves, but cannot touch
--   somebody else's assignment.
--
-- Cleanup: when a student leaves a class, an AFTER DELETE trigger removes
-- their assignments from every card belonging to that class's boards. No
-- ON DELETE CASCADE is sufficient because the relationship goes through two
-- tables (class_members → board → column → card).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Table
-- --------------------------------------------------------------------------

CREATE TABLE kanban_card_assignees (
    card_id UUID NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Who performed the assignment. Useful for audit / display. SET NULL on
    -- delete so the assignment itself survives even if the actor leaves.
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    PRIMARY KEY (card_id, user_id)
);

COMMENT ON TABLE kanban_card_assignees IS
    'Many-to-many junction between kanban_cards and profiles. Identifies who is responsible for a card. PK enforces a single row per (card, user) pair.';

-- Reverse index for "all cards I am assigned to" / "Mes cartes" filter.
CREATE INDEX idx_kanban_card_assignees_user ON kanban_card_assignees (user_id);

-- --------------------------------------------------------------------------
-- 2. Helper: who can be assigned to a board?
-- --------------------------------------------------------------------------
-- A board member is either the owner, the class teacher (= owner in our
-- model for class boards), or a class_members entry. Used to enforce that
-- only people with board access can be assignees.

CREATE OR REPLACE FUNCTION public.is_kanban_board_member(p_board_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_owner UUID;
    v_class UUID;
    v_is_member BOOLEAN;
BEGIN
    SELECT owner_id, class_id INTO v_owner, v_class
    FROM public.kanban_boards
    WHERE id = p_board_id;

    IF v_owner IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Owner is always a board member.
    IF v_owner = p_user_id THEN
        RETURN TRUE;
    END IF;

    -- Personal board: only the owner counts.
    IF v_class IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Class board: any enrolled student is a member.
    SELECT EXISTS (
        SELECT 1 FROM public.class_members
        WHERE class_id = v_class AND student_id = p_user_id
    ) INTO v_is_member;

    RETURN COALESCE(v_is_member, FALSE);
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_kanban_board_member(UUID, UUID) TO authenticated;

-- --------------------------------------------------------------------------
-- 3. Helper: can the CURRENT user (de)assign a given card / user pair?
-- --------------------------------------------------------------------------
-- Combines validity (assignee must be a board member) and the mixte
-- authorisation rule (actor must be board owner OR acting on themselves).

CREATE OR REPLACE FUNCTION public.can_assign_kanban_card(p_card_id UUID, p_assignee UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_board UUID;
    v_owner UUID;
BEGIN
    -- Resolve the card's board.
    SELECT col.board_id INTO v_board
    FROM public.kanban_cards c
    JOIN public.kanban_columns col ON col.id = c.column_id
    WHERE c.id = p_card_id;

    IF v_board IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Assignee must be a board member.
    IF NOT public.is_kanban_board_member(v_board, p_assignee) THEN
        RETURN FALSE;
    END IF;

    -- Actor must have access to the board (sanity check; RLS already filters
    -- but this keeps the helper composable from non-RLS callers too).
    IF NOT public.can_access_kanban_board(v_board) THEN
        RETURN FALSE;
    END IF;

    SELECT owner_id INTO v_owner FROM public.kanban_boards WHERE id = v_board;

    -- Mixte rule: board owner has full control; everyone else can only act
    -- on themselves.
    IF v_owner = auth.uid() THEN
        RETURN TRUE;
    END IF;
    IF p_assignee = auth.uid() THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_assign_kanban_card(UUID, UUID) TO authenticated;

-- --------------------------------------------------------------------------
-- 4. RLS
-- --------------------------------------------------------------------------

ALTER TABLE kanban_card_assignees ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone with board access can see who is assigned.
CREATE POLICY "kanban_card_assignees_select"
    ON kanban_card_assignees FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_columns col ON col.id = c.column_id
            WHERE c.id = card_id
              AND can_access_kanban_board(col.board_id)
        )
    );

-- INSERT / DELETE: mixte rule via can_assign_kanban_card.
CREATE POLICY "kanban_card_assignees_insert"
    ON kanban_card_assignees FOR INSERT
    TO authenticated
    WITH CHECK (can_assign_kanban_card(card_id, user_id));

CREATE POLICY "kanban_card_assignees_delete"
    ON kanban_card_assignees FOR DELETE
    TO authenticated
    USING (can_assign_kanban_card(card_id, user_id));

-- No UPDATE policy: the row has no mutable fields a caller would want to
-- change. Updates need delete + insert.

-- --------------------------------------------------------------------------
-- 5. Cleanup trigger: when a student leaves a class, drop their assignments
--    on every card of that class's boards.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_kanban_assignees_on_class_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    DELETE FROM public.kanban_card_assignees a
    USING public.kanban_cards c,
          public.kanban_columns col,
          public.kanban_boards b
    WHERE a.user_id = OLD.student_id
      AND a.card_id = c.id
      AND c.column_id = col.id
      AND col.board_id = b.id
      AND b.class_id = OLD.class_id;

    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cleanup_kanban_assignees_on_class_leave
    AFTER DELETE ON class_members
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_kanban_assignees_on_class_leave();

COMMENT ON FUNCTION public.cleanup_kanban_assignees_on_class_leave() IS
    'When a student is removed from class_members, drop their assignments on every card belonging to that class''s kanban boards. Foreign-key cascades alone do not handle this because the path crosses three tables.';
