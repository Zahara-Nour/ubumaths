-- Migration: Create python_tags table (separate from the math `tags` table)
-- Created: 2026-05-08
-- Description:
--   The math exercise system has its own `tags` table (created
--   2025-11-23). The Python exercise system needs its own vocabulary,
--   distinct from math tags, so we add a parallel table python_tags
--   following the same shape and policies. The python-examples-library
--   tag list (src/lib/data/python-examples/types.ts) is used as the
--   initial seed.

-- ============================================================================
-- 1. CREATE python_tags TABLE
-- ============================================================================

create table if not exists public.python_tags (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),

    constraint python_tags_name_unique unique (name)
);

comment on table public.python_tags is 'Reusable tags for python exercises (separate from the generic math `tags` table).';
comment on column public.python_tags.name is 'Tag name (unique, case-sensitive storage; unique constraint).';
comment on column public.python_tags.created_by is 'User who created the tag (null for seeded entries or deleted user).';

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

create index if not exists idx_python_tags_name on public.python_tags (name);
create index if not exists idx_python_tags_created_by on public.python_tags (created_by);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

alter table public.python_tags enable row level security;

-- Anyone authenticated can view all tags (for suggestions)
create policy "python_tags_select_authenticated"
    on public.python_tags
    for select
    to authenticated
    using (true);

-- Any authenticated user can create tags
create policy "python_tags_insert_authenticated"
    on public.python_tags
    for insert
    to authenticated
    with check (true);

-- Only creator can delete their own tags
create policy "python_tags_delete_own"
    on public.python_tags
    for delete
    to authenticated
    using (created_by = auth.uid());

-- ============================================================================
-- 4. SEED FROM EXAMPLE_TAGS (python-examples-library/types.ts)
--    minus the 4 class-level tags (college, lycee, nsi, superieur) which
--    now live in the dedicated `level` column on python_exercises.
-- ============================================================================

insert into public.python_tags (name) values
    -- bases
    ('variables'), ('types'), ('operateurs'), ('print'), ('input'), ('f-strings'),
    -- flux
    ('if'), ('while'), ('for'), ('comprehensions'),
    -- fonctions
    ('parametres'), ('defaults'), ('args-kwargs'), ('lambda'), ('recursion'),
    -- collections
    ('list'), ('tuple'), ('dict'), ('set'), ('slicing'),
    -- strings
    ('methodes-string'), ('regex'), ('formatage'),
    -- oop
    ('class'), ('heritage'), ('dataclass'), ('properties'),
    -- io
    ('fichiers'), ('json'), ('csv'),
    -- exceptions
    ('try-except'), ('custom-exceptions'),
    -- maths
    ('math'), ('sympy'), ('numpy'), ('random'), ('fractions'), ('statistics'),
    -- visualisation
    ('matplotlib'),
    -- algorithmes
    ('tri'), ('recherche'), ('graphe'), ('arbre'), ('complexite'),
    -- concepts transverses
    ('match'), ('decorateurs'), ('generators'), ('encapsulation'), ('simulation'), ('3d')
on conflict (name) do nothing;
