-- Migration: Add tags column to constructions table
-- This enables categorization and filtering of geometric constructions

-- ============================================================================
-- ALTER TABLE
-- ============================================================================

-- Add tags column (array of text, defaults to empty array)
do $$
begin
    if not exists (
        select 1
        from information_schema.columns
        where table_name = 'constructions'
        and column_name = 'tags'
    ) then
        alter table constructions add column tags text[] default '{}';
    end if;
end $$;

-- Add comment for documentation
comment on column constructions.tags is 'Array of tags for categorizing and filtering constructions (e.g., ["circle", "triangle", "beginner"])';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- GIN index for efficient tag filtering using array operators
-- Supports queries like: WHERE tags @> ARRAY['circle'] (contains tag)
-- or: WHERE tags && ARRAY['circle', 'triangle'] (overlaps with tags)
create index if not exists idx_constructions_tags on constructions using gin(tags);
