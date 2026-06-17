-- ============================================================================
-- EXERCISE SHARING & TEMPLATES MIGRATION
-- ============================================================================
-- This migration adds features for:
-- 1. Public/private exercise sharing between teachers
-- 2. Exercise templates (system templates + user-created templates)
-- 3. Favorite exercises system
-- ============================================================================

-- ============================================================================
-- 1. ADD PUBLIC SHARING TO EXERCISES TABLE
-- ============================================================================

-- Add is_public column to exercises
alter table public.exercises
add column if not exists is_public boolean not null default false;

-- Index for filtering public exercises
create index if not exists idx_exercises_is_public
on public.exercises(is_public)
where is_public = true;

-- Index for public exercises by difficulty (common filter)
create index if not exists idx_exercises_public_difficulty
on public.exercises(is_public, difficulty)
where is_public = true;

-- Update RLS policies to allow teachers to view public exercises from other teachers
-- (The existing "Teachers can view all exercises" policy already covers this)

-- ============================================================================
-- 2. EXERCISE TEMPLATES TABLE
-- ============================================================================

create table if not exists public.exercise_templates (
    -- Primary key
    id uuid primary key default gen_random_uuid(),

    -- Template metadata
    title text not null,
    description text,

    -- Template data (clean exercise format without id/dates)
    template_data jsonb not null,

    -- System vs user templates
    is_system boolean not null default false,

    -- Audit fields
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references public.profiles(id) on delete cascade,

    -- Constraints
    check (
        -- System templates don't need created_by
        (is_system = true and created_by is null) or
        -- User templates must have created_by
        (is_system = false and created_by is not null)
    )
);

-- ============================================================================
-- INDEXES FOR TEMPLATES
-- ============================================================================

create index if not exists idx_templates_is_system
on public.exercise_templates(is_system);

create index if not exists idx_templates_created_by
on public.exercise_templates(created_by)
where is_system = false;

create index if not exists idx_templates_created_at
on public.exercise_templates(created_at desc);

-- ============================================================================
-- RLS POLICIES FOR TEMPLATES
-- ============================================================================

alter table public.exercise_templates enable row level security;

-- Everyone can view system templates
create policy "Anyone can view system templates"
    on public.exercise_templates
    for select
    to authenticated
    using (is_system = true);

-- Teachers can view their own templates
create policy "Teachers can view own templates"
    on public.exercise_templates
    for select
    to authenticated
    using (
        is_system = false
        and created_by = auth.uid()
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
    );

-- Teachers can create their own templates
create policy "Teachers can create templates"
    on public.exercise_templates
    for insert
    to authenticated
    with check (
        is_system = false
        and created_by = auth.uid()
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
    );

-- Teachers can update their own templates
create policy "Teachers can update own templates"
    on public.exercise_templates
    for update
    to authenticated
    using (
        is_system = false
        and created_by = auth.uid()
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
    )
    with check (
        is_system = false
        and created_by = auth.uid()
    );

-- Teachers can delete their own templates
create policy "Teachers can delete own templates"
    on public.exercise_templates
    for delete
    to authenticated
    using (
        is_system = false
        and created_by = auth.uid()
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
    );

-- ============================================================================
-- 3. EXERCISE FAVORITES TABLE
-- ============================================================================

create table if not exists public.exercise_favorites (
    -- Composite primary key
    user_id uuid not null references public.profiles(id) on delete cascade,
    exercise_id uuid not null references public.exercises(id) on delete cascade,

    -- Audit
    created_at timestamptz not null default now(),

    -- Primary key
    primary key (user_id, exercise_id)
);

-- ============================================================================
-- INDEXES FOR FAVORITES
-- ============================================================================

create index if not exists idx_favorites_user_id
on public.exercise_favorites(user_id);

create index if not exists idx_favorites_exercise_id
on public.exercise_favorites(exercise_id);

create index if not exists idx_favorites_created_at
on public.exercise_favorites(created_at desc);

-- ============================================================================
-- RLS POLICIES FOR FAVORITES
-- ============================================================================

alter table public.exercise_favorites enable row level security;

-- Teachers can view their own favorites
create policy "Teachers can view own favorites"
    on public.exercise_favorites
    for select
    to authenticated
    using (
        user_id = auth.uid()
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
    );

-- Teachers can add favorites
create policy "Teachers can add favorites"
    on public.exercise_favorites
    for insert
    to authenticated
    with check (
        user_id = auth.uid()
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
    );

-- Teachers can remove their own favorites
create policy "Teachers can remove own favorites"
    on public.exercise_favorites
    for delete
    to authenticated
    using (
        user_id = auth.uid()
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'teacher'
        )
    );

-- ============================================================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp for templates
create or replace function public.update_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Trigger to auto-update updated_at for templates
create trigger templates_updated_at
    before update on public.exercise_templates
    for each row
    execute function public.update_templates_updated_at();

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================

comment on table public.exercise_templates is 'Templates for creating exercises (system templates + user-created)';
comment on column public.exercise_templates.template_data is 'Clean exercise format (JSONB) without id, created_at, etc.';
comment on column public.exercise_templates.is_system is 'True for built-in system templates, false for user-created templates';

comment on table public.exercise_favorites is 'Teachers can favorite public exercises from other teachers';

comment on column public.exercises.is_public is 'When true, exercise is visible in the public library to all teachers';
