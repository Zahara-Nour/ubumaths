-- ============================================================================
-- EXERCISES TABLE - Math Exercise Bank System
-- ============================================================================
-- This table stores mathematical exercises with markdown content that can be:
-- - Displayed on web with MathLive rendering
-- - Transpiled to LaTeX/Typst for PDF generation
-- - Tagged and filtered for organization

-- ============================================================================
-- EXERCISES TABLE
-- ============================================================================

create table if not exists public.exercises (
    -- Primary key
    id uuid primary key default gen_random_uuid(),

    -- Metadata
    title text,
    source text, -- Source reference (e.g., book name, author)
    difficulty integer not null check (difficulty between 1 and 3), -- 1=easy, 2=medium, 3=hard
    tags text[] not null default '{}', -- Ex: ['algèbre', 'équations', '3ème']

    -- Content (markdown with $...$ and $$...$$ for LaTeX)
    statement_md text not null, -- Exercise statement in markdown
    solution_md text not null, -- Solution/correction in markdown

    -- Additional metadata
    estimated_time_minutes integer, -- Estimated completion time
    grade_levels text[], -- Ex: ['3', '2', 'SPE_1']
    topic text, -- Topic category (e.g., 'Algèbre', 'Géométrie')

    -- Audit fields
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid not null references public.profiles(id) on delete cascade
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Performance indexes
create index if not exists idx_exercises_created_by on public.exercises(created_by);
create index if not exists idx_exercises_difficulty on public.exercises(difficulty);
create index if not exists idx_exercises_tags on public.exercises using gin(tags);
create index if not exists idx_exercises_grade_levels on public.exercises using gin(grade_levels);
create index if not exists idx_exercises_topic on public.exercises(topic);
create index if not exists idx_exercises_created_at on public.exercises(created_at desc);

-- Full-text search index on title and source
create index if not exists idx_exercises_search on public.exercises
    using gin(to_tsvector('french', coalesce(title, '') || ' ' || coalesce(source, '')));

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.exercises enable row level security;

-- Teachers can view all exercises
create policy "Teachers can view all exercises"
    on public.exercises
    for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
    );

-- Teachers can create exercises
create policy "Teachers can create exercises"
    on public.exercises
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
        and created_by = auth.uid()
    );

-- Teachers can update their own exercises
create policy "Teachers can update own exercises"
    on public.exercises
    for update
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
        and created_by = auth.uid()
    )
    with check (
        created_by = auth.uid()
    );

-- Teachers can delete their own exercises
create policy "Teachers can delete own exercises"
    on public.exercises
    for delete
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
        and created_by = auth.uid()
    );

-- ============================================================================
-- STORAGE BUCKET FOR EXERCISE IMAGES
-- ============================================================================

-- Create storage bucket for exercise images
insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Teachers can upload images
create policy "Teachers can upload exercise images"
    on storage.objects
    for insert
    to authenticated
    with check (
        bucket_id = 'exercise-images'
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
    );

-- Everyone can view images (public bucket)
create policy "Anyone can view exercise images"
    on storage.objects
    for select
    to public
    using (bucket_id = 'exercise-images');

-- Teachers can update their own images
create policy "Teachers can update own exercise images"
    on storage.objects
    for update
    to authenticated
    using (
        bucket_id = 'exercise-images'
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
        and owner = auth.uid()
    );

-- Teachers can delete their own images
create policy "Teachers can delete own exercise images"
    on storage.objects
    for delete
    to authenticated
    using (
        bucket_id = 'exercise-images'
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
        and owner = auth.uid()
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
create or replace function public.update_exercises_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Trigger to auto-update updated_at
create trigger exercises_updated_at
    before update on public.exercises
    for each row
    execute function public.update_exercises_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.exercises is 'Mathematical exercises with markdown content and metadata';
comment on column public.exercises.statement_md is 'Exercise statement in markdown with $...$ and $$...$$ for LaTeX math';
comment on column public.exercises.solution_md is 'Solution/correction in markdown with LaTeX math';
comment on column public.exercises.difficulty is 'Difficulty level: 1=easy, 2=medium, 3=hard';
comment on column public.exercises.tags is 'Array of tags for categorization and filtering';
comment on column public.exercises.grade_levels is 'Applicable grade levels (e.g., ["3", "2", "SPE_1"])';
