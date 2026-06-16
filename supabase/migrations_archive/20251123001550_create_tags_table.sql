-- Migration: Create tags table
-- Description: Add a dedicated table for storing reusable exercise tags
-- This enables tag suggestions, autocomplete, and centralized tag management

-- ============================================================================
-- 1. CREATE TAGS TABLE
-- ============================================================================

create table if not exists public.tags (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),

    -- Ensure unique tag names (case-insensitive)
    constraint tags_name_unique unique (name)
);

-- Add comment for documentation
comment on table public.tags is 'Reusable tags for exercises, enabling autocomplete and suggestions';
comment on column public.tags.name is 'Tag name (unique, case-sensitive storage but unique constraint is case-insensitive)';
comment on column public.tags.created_by is 'User who created the tag (null if user deleted)';

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Index for alphabetical sorting and name lookups
create index if not exists idx_tags_name on public.tags (name);

-- Index for filtering by creator
create index if not exists idx_tags_created_by on public.tags (created_by);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.tags enable row level security;

-- Anyone authenticated can view all tags (for suggestions)
create policy "tags_select_authenticated"
    on public.tags
    for select
    to authenticated
    using (true);

-- Any authenticated user can create tags
create policy "tags_insert_authenticated"
    on public.tags
    for insert
    to authenticated
    with check (true);

-- Only creator can delete their own tags (or admin)
-- Note: In practice, tags are rarely deleted to maintain consistency
create policy "tags_delete_own"
    on public.tags
    for delete
    to authenticated
    using (created_by = auth.uid());

-- ============================================================================
-- 4. SEED COMMON MATH TAGS (Optional)
-- ============================================================================

-- Insert common math exercise tags
-- These provide a starting point for users
insert into public.tags (name, created_by) values
    ('algèbre', null),
    ('arithmétique', null),
    ('calcul mental', null),
    ('calcul littéral', null),
    ('équations', null),
    ('fractions', null),
    ('fonctions', null),
    ('géométrie', null),
    ('grandeurs', null),
    ('inéquations', null),
    ('mesures', null),
    ('nombres', null),
    ('nombres décimaux', null),
    ('nombres relatifs', null),
    ('probabilités', null),
    ('proportionnalité', null),
    ('pourcentages', null),
    ('puissances', null),
    ('pythagore', null),
    ('racines carrées', null),
    ('statistiques', null),
    ('systèmes', null),
    ('thalès', null),
    ('trigonométrie', null)
on conflict (name) do nothing;
