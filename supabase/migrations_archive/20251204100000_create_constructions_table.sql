-- Migration: Create constructions table for geometric construction animations
-- This table stores InstrumenPoche-style construction scripts

-- ============================================================================
-- TABLE DEFINITION
-- ============================================================================

create table if not exists constructions (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    script jsonb not null,
    author_id uuid references public.profiles(id) on delete set null,
    is_public boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Add comments for documentation
comment on table constructions is 'Stores geometric construction animation scripts (InstrumenPoche-style)';
comment on column constructions.id is 'Unique identifier for the construction';
comment on column constructions.title is 'Title of the construction (French)';
comment on column constructions.description is 'Optional description of the construction';
comment on column constructions.script is 'JSON object containing the construction script';
comment on column constructions.author_id is 'Reference to the user who created this construction';
comment on column constructions.is_public is 'Whether this construction is visible to all authenticated users';
comment on column constructions.created_at is 'Timestamp when the construction was created';
comment on column constructions.updated_at is 'Timestamp when the construction was last updated';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for faster queries by author
create index if not exists idx_constructions_author_id on constructions(author_id);

-- Index for faster queries of public constructions
create index if not exists idx_constructions_is_public on constructions(is_public) where is_public = true;

-- Index for sorting by date
create index if not exists idx_constructions_created_at on constructions(created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
alter table constructions enable row level security;

-- Policy: Users can read their own constructions
create policy "Users can read own constructions"
    on constructions
    for select
    using (auth.uid() = author_id);

-- Policy: Users can read public constructions
create policy "Users can read public constructions"
    on constructions
    for select
    using (is_public = true);

-- Policy: Users can insert their own constructions
create policy "Users can insert own constructions"
    on constructions
    for insert
    with check (auth.uid() = author_id);

-- Policy: Users can update their own constructions
create policy "Users can update own constructions"
    on constructions
    for update
    using (auth.uid() = author_id)
    with check (auth.uid() = author_id);

-- Policy: Users can delete their own constructions
create policy "Users can delete own constructions"
    on constructions
    for delete
    using (auth.uid() = author_id);

-- ============================================================================
-- TRIGGER FOR updated_at
-- ============================================================================

-- Function to update the updated_at timestamp
create or replace function update_constructions_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at on update
create trigger constructions_updated_at_trigger
    before update on constructions
    for each row
    execute function update_constructions_updated_at();
