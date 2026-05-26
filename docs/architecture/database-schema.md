# Database Schema

This document tracks the high-level structure of the UbuMaths Supabase database.
It is **not** exhaustive — the source of truth is `supabase/migrations/`. Add a
new section here whenever you introduce a feature-level table cluster (chat,
game, kanban, etc.).

## Conventions

- All tables use `UUID` primary keys (`gen_random_uuid()` default).
- All timestamps are `TIMESTAMPTZ`.
- `updated_at` columns are bumped by the shared trigger function
  `update_updated_at_column()` (defined in `001_initial_schema.sql`).
- Row Level Security is enabled on every public table. SECURITY DEFINER helper
  functions live in `public` with `SET search_path = public, pg_temp`.

---

## Kanban

Introduced by `supabase/migrations/20260526190624_create_kanban_tables.sql`.

Lightweight Trello-style organisation tool available to students and teachers.

### Tables

#### `kanban_boards`

| Column       | Type          | Notes                                                                 |
| ------------ | ------------- | --------------------------------------------------------------------- |
| `id`         | `UUID` PK     | Default `gen_random_uuid()`.                                          |
| `owner_id`   | `UUID` FK     | -> `profiles(id)` ON DELETE CASCADE. Always set.                      |
| `class_id`   | `UUID` FK     | -> `classes(id)` ON DELETE CASCADE. NULL for personal boards.         |
| `title`      | `TEXT`        | NOT NULL, `char_length BETWEEN 1 AND 200`.                            |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`.                                                      |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. Bumped by trigger `update_kanban_boards_updated_at`. |

Two flavours:

- **Personal** (`class_id IS NULL`): private to `owner_id`, any role.
- **Class** (`class_id IS NOT NULL`): owned by the class teacher (enforced at
  API level — RLS only checks `is_class_teacher(class_id)` on INSERT). Students
  enrolled in the class can read the board and manage its cards.

Indexes:

- `idx_kanban_boards_owner` on `owner_id`.
- `idx_kanban_boards_class` on `class_id` (partial: `WHERE class_id IS NOT NULL`).

#### `kanban_columns`

| Column       | Type               | Notes                                           |
| ------------ | ------------------ | ----------------------------------------------- |
| `id`         | `UUID` PK          |                                                 |
| `board_id`   | `UUID` FK          | -> `kanban_boards(id)` ON DELETE CASCADE.       |
| `title`      | `TEXT`             | NOT NULL, `char_length BETWEEN 1 AND 100`.      |
| `position`   | `DOUBLE PRECISION` | NOT NULL. Fractional indexing for O(1) reorder. |
| `created_at` | `TIMESTAMPTZ`      | Default `NOW()`.                                |

Indexes: `idx_kanban_columns_board` on `board_id`.

#### `kanban_cards`

| Column        | Type               | Notes                                                                |
| ------------- | ------------------ | -------------------------------------------------------------------- |
| `id`          | `UUID` PK          |                                                                      |
| `column_id`   | `UUID` FK          | -> `kanban_columns(id)` ON DELETE CASCADE.                           |
| `title`       | `TEXT`             | NOT NULL, `char_length BETWEEN 1 AND 200`.                           |
| `description` | `TEXT`             | Nullable. ubumark/markdown. Length capped at 50000 chars by API Zod. |
| `position`    | `DOUBLE PRECISION` | NOT NULL. Fractional indexing.                                       |
| `created_at`  | `TIMESTAMPTZ`      |                                                                      |
| `updated_at`  | `TIMESTAMPTZ`      | Bumped by trigger `update_kanban_cards_updated_at`.                  |

Indexes: `idx_kanban_cards_column` on `column_id`.

### Helper functions

- `is_class_member(p_class_id UUID) RETURNS BOOLEAN` — SECURITY DEFINER, STABLE.
  TRUE if `auth.uid()` is in `class_members.student_id` for the given class.
  Granted to `authenticated`.
- `can_access_kanban_board(p_board_id UUID) RETURNS BOOLEAN` — SECURITY DEFINER,
  STABLE. TRUE if the caller is the board owner, OR the board is a class board
  and the caller is teacher / member of that class.
- `can_access_kanban_column(p_column_id UUID) RETURNS BOOLEAN` — SECURITY
  DEFINER, STABLE. Wrapper that resolves the column to its board and delegates
  to `can_access_kanban_board`.

All three pin `search_path = public, pg_temp` per the security hardening policy
(see `20260523215052_harden_function_search_path.sql`).

### Row Level Security

| Table            | SELECT                                    | INSERT                                                     | UPDATE                                | DELETE           |
| ---------------- | ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------- | ---------------- |
| `kanban_boards`  | owner OR (class board AND teacher/member) | `owner_id = auth.uid()` AND (no class OR teacher of class) | owner only                            | owner only       |
| `kanban_columns` | `can_access_kanban_board(board_id)`       | board owner only                                           | board owner only                      | board owner only |
| `kanban_cards`   | `can_access_kanban_column(column_id)`     | `can_access_kanban_column(column_id)`                      | `can_access_kanban_column(column_id)` | as INSERT        |

The card policies are intentionally permissive — for class boards we want
students (class members) to freely create / edit / move / delete cards while
columns and the board itself stay locked to the teacher.

### TypeScript types

Until the migration is pushed and `pnpm db:types` is re-run, the row interfaces
live as stopgap definitions in `src/lib/types/database-helpers.ts` under the
`Kanban Types (STOPGAP)` section. After regeneration, swap each interface for
a `Tables<'kanban_boards'>` alias and keep the `*Insert` / `*Update` and
`KanbanBoardWithCounts` composite types in place.
