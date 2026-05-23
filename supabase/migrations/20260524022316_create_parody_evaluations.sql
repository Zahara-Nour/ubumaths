-- Migration: Create parody_evaluations
-- Description: Table + Storage bucket for "Les presques évaluations" — a public
-- collection of parody assessment PDFs uploaded by teachers and visible to all
-- visitors (including non-authenticated).
--
-- Storage strategy: PDFs are stored in a public Supabase Storage bucket
-- so the page can serve them directly via getPublicUrl() without an API layer.
-- Metadata (title, description, grade_levels, tags) lives in this table.
--
-- Access model:
--   - Read: public (anyone, even anonymous)
--   - Create: any authenticated teacher
--   - Update/Delete: only the original uploader (created_by)

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================

create table if not exists public.parody_evaluations (
    id uuid primary key default gen_random_uuid(),

    -- Display metadata
    title text not null,
    description text,

    -- Storage info
    storage_path text not null,
    file_name text not null,
    mime_type text not null check (mime_type = 'application/pdf'),
    file_size integer not null check (file_size > 0 and file_size <= 10485760), -- 10 MB max

    -- Categorization (text[] mirrors exercises/worksheets pattern)
    grade_levels text[] not null default '{}',
    tags text[] not null default '{}',

    -- Audit
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Sanity constraint: at least one grade level required
    constraint parody_evaluations_grade_levels_not_empty check (array_length(grade_levels, 1) >= 1)
);

comment on table public.parody_evaluations is
    'Public parody assessment PDFs ("Les presques évaluations") uploaded by teachers.';
comment on column public.parody_evaluations.storage_path is
    'Path inside the parody-evaluations Storage bucket.';
comment on column public.parody_evaluations.grade_levels is
    'GradeCode array (e.g., {"3","2"}). At least one required.';
comment on column public.parody_evaluations.tags is
    'Theme tags (e.g., {"algèbre","géométrie"}). Optional, references public.tags by name.';

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

create index if not exists idx_parody_evaluations_created_at
    on public.parody_evaluations (created_at desc);

create index if not exists idx_parody_evaluations_created_by
    on public.parody_evaluations (created_by);

create index if not exists idx_parody_evaluations_grade_levels
    on public.parody_evaluations using gin (grade_levels);

create index if not exists idx_parody_evaluations_tags
    on public.parody_evaluations using gin (tags);

-- ============================================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================================

create or replace function public.update_parody_evaluations_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger update_parody_evaluations_updated_at_trigger
    before update on public.parody_evaluations
    for each row
    execute function public.update_parody_evaluations_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

alter table public.parody_evaluations enable row level security;

-- Public read (anyone, even anonymous)
create policy "parody_evaluations_select_public"
    on public.parody_evaluations
    for select
    to public
    using (true);

-- Insert: any authenticated teacher
create policy "parody_evaluations_insert_teachers"
    on public.parody_evaluations
    for insert
    to authenticated
    with check (
        created_by = auth.uid()
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
    );

-- Update: only owner
create policy "parody_evaluations_update_owner"
    on public.parody_evaluations
    for update
    to authenticated
    using (created_by = auth.uid())
    with check (created_by = auth.uid());

-- Delete: only owner
create policy "parody_evaluations_delete_owner"
    on public.parody_evaluations
    for delete
    to authenticated
    using (created_by = auth.uid());

-- ============================================================================
-- 5. STORAGE BUCKET
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('parody-evaluations', 'parody-evaluations', true)
on conflict (id) do nothing;

-- ============================================================================
-- 6. STORAGE POLICIES
-- ============================================================================

-- Public read (matches the public access model)
create policy "parody_evaluations_storage_select_public"
    on storage.objects
    for select
    to public
    using (bucket_id = 'parody-evaluations');

-- Teachers can upload
create policy "parody_evaluations_storage_insert_teachers"
    on storage.objects
    for insert
    to authenticated
    with check (
        bucket_id = 'parody-evaluations'
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
    );

-- Teachers can update their own uploaded files (defensive — spec says PDF
-- replacement is not allowed via UI, but keep the policy aligned with the
-- table-level UPDATE policy in case of future changes).
create policy "parody_evaluations_storage_update_owner"
    on storage.objects
    for update
    to authenticated
    using (
        bucket_id = 'parody-evaluations'
        and owner = auth.uid()
    );

-- Teachers can delete their own uploaded files
create policy "parody_evaluations_storage_delete_owner"
    on storage.objects
    for delete
    to authenticated
    using (
        bucket_id = 'parody-evaluations'
        and owner = auth.uid()
    );
