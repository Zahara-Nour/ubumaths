-- Migration: Create spreadsheets table for user spreadsheet data
-- This table stores spreadsheet calculator data with cells, formulas, and formatting

-- ============================================================================
-- TABLE DEFINITION
-- ============================================================================

create table if not exists spreadsheets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    name varchar(255) not null default 'Sans titre',
    description text,
    data jsonb not null default '{"version":1,"cells":{},"metadata":{"name":"Sans titre","rows":20,"cols":20}}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Add comments for documentation
comment on table spreadsheets is 'Stores user spreadsheet data with cells, formulas, and formatting';
comment on column spreadsheets.id is 'Unique identifier for the spreadsheet';
comment on column spreadsheets.user_id is 'Reference to the user who owns this spreadsheet';
comment on column spreadsheets.name is 'User-visible name of the spreadsheet';
comment on column spreadsheets.description is 'Optional description of the spreadsheet';
comment on column spreadsheets.data is 'JSONB containing the spreadsheet data (version, cells, metadata)';
comment on column spreadsheets.created_at is 'Timestamp when the spreadsheet was created';
comment on column spreadsheets.updated_at is 'Timestamp when the spreadsheet was last updated';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for faster queries by user
create index if not exists idx_spreadsheets_user_id on spreadsheets(user_id);

-- Index for sorting by date
create index if not exists idx_spreadsheets_updated_at on spreadsheets(updated_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
alter table spreadsheets enable row level security;

-- Policy: Users can read their own spreadsheets
create policy "Users can read own spreadsheets"
    on spreadsheets
    for select
    using (auth.uid() = user_id);

-- Policy: Users can insert their own spreadsheets
create policy "Users can insert own spreadsheets"
    on spreadsheets
    for insert
    with check (auth.uid() = user_id);

-- Policy: Users can update their own spreadsheets
create policy "Users can update own spreadsheets"
    on spreadsheets
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policy: Users can delete their own spreadsheets
create policy "Users can delete own spreadsheets"
    on spreadsheets
    for delete
    using (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER FOR updated_at
-- ============================================================================

-- Function to update the updated_at timestamp
create or replace function update_spreadsheets_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at on update
create trigger spreadsheets_updated_at_trigger
    before update on spreadsheets
    for each row
    execute function update_spreadsheets_updated_at();
