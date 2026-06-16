-- ============================================================================
-- Migration: Create Kanban tables (boards, columns, cards) + RLS
-- ============================================================================
-- Adds a lightweight Kanban (Trello-style) feature for students and teachers.
--
-- Two flavours of boards:
--   * Personal board: class_id IS NULL, owned by a single user (any role).
--     Only the owner sees and edits it.
--   * Class board:    class_id IS NOT NULL, owned by the teacher of the class.
--     The teacher has full control (rename board, manage columns, manage cards).
--     Students who are members of the class can view the board and freely
--     create / edit / move / delete CARDS (but not columns and not the board
--     itself).
--
-- Notes:
--   * Card ordering uses DOUBLE PRECISION "position" (fractional indexing).
--   * Title length constraints are enforced at the DB level; richer validation
--     (description max length, etc.) lives in the Zod schemas on the API side.
--   * Two SECURITY DEFINER helpers are introduced (is_class_member,
--     can_access_kanban_board, can_access_kanban_column) to keep RLS policies
--     readable and to avoid RLS recursion when joining through class_members.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper functions
-- ----------------------------------------------------------------------------

-- is_class_member: TRUE if the calling user is enrolled as a student in the
-- given class. SECURITY DEFINER bypasses RLS on class_members, which is needed
-- because we will call this from kanban_* policies.
CREATE OR REPLACE FUNCTION public.is_class_member(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.class_members
        WHERE class_id = p_class_id
          AND student_id = auth.uid()
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_class_member(UUID) TO authenticated;
COMMENT ON FUNCTION public.is_class_member(UUID) IS
    'TRUE if auth.uid() is a member (student) of the given class. SECURITY DEFINER to avoid RLS recursion through class_members.';

-- can_access_kanban_board: TRUE if the calling user owns the board OR the
-- board belongs to a class and the user is teacher/member of that class.
-- SECURITY DEFINER so we can read kanban_boards.owner_id / class_id without
-- recursing into kanban_boards' own RLS.
CREATE OR REPLACE FUNCTION public.can_access_kanban_board(p_board_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_owner_id UUID;
    v_class_id UUID;
BEGIN
    SELECT owner_id, class_id
    INTO v_owner_id, v_class_id
    FROM public.kanban_boards
    WHERE id = p_board_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_owner_id = auth.uid() THEN
        RETURN TRUE;
    END IF;

    IF v_class_id IS NOT NULL THEN
        RETURN public.is_class_teacher(v_class_id)
            OR public.is_class_member(v_class_id);
    END IF;

    RETURN FALSE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_kanban_board(UUID) TO authenticated;
COMMENT ON FUNCTION public.can_access_kanban_board(UUID) IS
    'TRUE if auth.uid() can see a kanban board: owner, class teacher, or class member.';

-- can_access_kanban_column: convenience wrapper resolving column -> board.
CREATE OR REPLACE FUNCTION public.can_access_kanban_column(p_column_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_board_id UUID;
BEGIN
    SELECT board_id
    INTO v_board_id
    FROM public.kanban_columns
    WHERE id = p_column_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    RETURN public.can_access_kanban_board(v_board_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_kanban_column(UUID) TO authenticated;
COMMENT ON FUNCTION public.can_access_kanban_column(UUID) IS
    'TRUE if auth.uid() can access the board owning the given column. Used to gate kanban_cards policies.';

-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------

CREATE TABLE kanban_boards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE kanban_boards IS
    'Kanban boards. owner_id is always set. class_id NULL = personal board; class_id NOT NULL = class board owned by the class teacher.';
COMMENT ON COLUMN kanban_boards.owner_id IS
    'For personal boards: the user owning the board. For class boards: the teacher of the class. Enforced by INSERT WITH CHECK via is_class_teacher(class_id). class_id is treated as immutable by the API (Zod schemas).';

CREATE TABLE kanban_columns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
    position DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE kanban_columns IS
    'Columns inside a kanban board. Position is a DOUBLE PRECISION (fractional indexing) so reordering is O(1).';

CREATE TABLE kanban_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    description TEXT,
    position DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE kanban_cards IS
    'Cards inside a kanban column. description holds ubumark/markdown content (length capped at 50000 chars by the API Zod schema).';

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_kanban_boards_owner ON kanban_boards(owner_id);
CREATE INDEX idx_kanban_boards_class
    ON kanban_boards(class_id)
    WHERE class_id IS NOT NULL;

CREATE INDEX idx_kanban_columns_board ON kanban_columns(board_id);
CREATE INDEX idx_kanban_cards_column ON kanban_cards(column_id);

-- ----------------------------------------------------------------------------
-- 4. updated_at triggers (reuses existing update_updated_at_column())
-- ----------------------------------------------------------------------------

CREATE TRIGGER update_kanban_boards_updated_at
    BEFORE UPDATE ON kanban_boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_cards_updated_at
    BEFORE UPDATE ON kanban_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;

-- --- kanban_boards policies ---

-- SELECT: owner, or class teacher / class member when class board
CREATE POLICY "kanban_boards_select"
    ON kanban_boards FOR SELECT
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR (
            class_id IS NOT NULL
            AND (
                public.is_class_teacher(class_id)
                OR public.is_class_member(class_id)
            )
        )
    );

-- INSERT: user must create the board for themselves, and if it's a class
-- board, they must be the teacher of that class.
CREATE POLICY "kanban_boards_insert"
    ON kanban_boards FOR INSERT
    TO authenticated
    WITH CHECK (
        owner_id = auth.uid()
        AND (
            class_id IS NULL
            OR public.is_class_teacher(class_id)
        )
    );

-- UPDATE: only the owner can rename / modify the board itself
CREATE POLICY "kanban_boards_update"
    ON kanban_boards FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (
        owner_id = auth.uid()
        AND (
            class_id IS NULL
            OR public.is_class_teacher(class_id)
        )
    );

-- DELETE: only the owner can delete the board (cascades to columns and cards)
CREATE POLICY "kanban_boards_delete"
    ON kanban_boards FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- --- kanban_columns policies ---

-- SELECT: anyone who can access the parent board
CREATE POLICY "kanban_columns_select"
    ON kanban_columns FOR SELECT
    TO authenticated
    USING (public.can_access_kanban_board(board_id));

-- INSERT / UPDATE / DELETE: only the board owner can manage columns
CREATE POLICY "kanban_columns_insert"
    ON kanban_columns FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.kanban_boards b
            WHERE b.id = board_id
              AND b.owner_id = auth.uid()
        )
    );

CREATE POLICY "kanban_columns_update"
    ON kanban_columns FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.kanban_boards b
            WHERE b.id = board_id
              AND b.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.kanban_boards b
            WHERE b.id = board_id
              AND b.owner_id = auth.uid()
        )
    );

CREATE POLICY "kanban_columns_delete"
    ON kanban_columns FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.kanban_boards b
            WHERE b.id = board_id
              AND b.owner_id = auth.uid()
        )
    );

-- --- kanban_cards policies ---

-- SELECT / INSERT / UPDATE / DELETE: anyone who can access the parent board
-- can fully manage cards. For class boards this is the desired behaviour:
-- students (members) can freely create / edit / move / delete cards.
CREATE POLICY "kanban_cards_select"
    ON kanban_cards FOR SELECT
    TO authenticated
    USING (public.can_access_kanban_column(column_id));

CREATE POLICY "kanban_cards_insert"
    ON kanban_cards FOR INSERT
    TO authenticated
    WITH CHECK (public.can_access_kanban_column(column_id));

CREATE POLICY "kanban_cards_update"
    ON kanban_cards FOR UPDATE
    TO authenticated
    USING (public.can_access_kanban_column(column_id))
    WITH CHECK (public.can_access_kanban_column(column_id));

CREATE POLICY "kanban_cards_delete"
    ON kanban_cards FOR DELETE
    TO authenticated
    USING (public.can_access_kanban_column(column_id));
