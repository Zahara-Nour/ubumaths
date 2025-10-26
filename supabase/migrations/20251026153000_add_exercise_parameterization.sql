-- ============================================================================
-- EXERCISE PARAMETERIZATION MIGRATION
-- ============================================================================
-- This migration adds parameterization support to exercises, enabling dynamic
-- content generation with variables similar to the Questions feature.
--
-- Features:
-- 1. Variables: JSONB array storing variable definitions (name + expression)
-- 2. Distribution modes: Control how instances are distributed to students
--
-- Variable Structure Example:
-- [
--   { "name": "a", "expression": "{{1-10}}" },
--   { "name": "b", "expression": "{{5-15}}" },
--   { "name": "sum", "expression": "{{eval:{{a}}+{{b}}}}" }
-- ]
--
-- Distribution Modes:
-- - 'on_demand': Students can generate new instances anytime (default)
-- - 'per_student': Each student gets a unique deterministic instance
-- - 'per_group': Students in same group share the same instance
-- ============================================================================

-- ============================================================================
-- 1. ADD VARIABLES COLUMN
-- ============================================================================

-- Add variables column to store parameterization definitions
alter table public.exercises
add column if not exists variables jsonb not null default '[]'::jsonb;

-- Add CHECK constraint to ensure variables is always a JSON array
alter table public.exercises
add constraint exercises_variables_is_array
check (jsonb_typeof(variables) = 'array');

-- ============================================================================
-- 2. ADD DISTRIBUTION_MODE COLUMN
-- ============================================================================

-- Add distribution_mode column with strict validation
alter table public.exercises
add column if not exists distribution_mode text not null default 'on_demand';

-- Add CHECK constraint for allowed distribution modes
alter table public.exercises
add constraint exercises_distribution_mode_valid
check (distribution_mode in ('on_demand', 'per_student', 'per_group'));

-- ============================================================================
-- 3. PERFORMANCE INDEXES
-- ============================================================================

-- Index for filtering exercises with parameterization
-- This helps quickly find exercises that use variables vs static exercises
create index if not exists idx_exercises_has_variables
on public.exercises ((jsonb_array_length(variables) > 0))
where jsonb_array_length(variables) > 0;

-- Index for filtering by distribution mode
-- Useful for querying exercises by how they distribute instances
create index if not exists idx_exercises_distribution_mode
on public.exercises(distribution_mode);

-- Composite index for common query: public parameterized exercises
-- This optimizes queries for the public exercise library showing only parameterized content
create index if not exists idx_exercises_public_parameterized
on public.exercises(is_public, distribution_mode)
where is_public = true and jsonb_array_length(variables) > 0;

-- ============================================================================
-- 4. UPDATE RLS POLICIES
-- ============================================================================

-- Note: Existing RLS policies already cover the new columns:
-- - Teachers can create/update exercises (including variables + distribution_mode)
-- - Teachers can view all exercises (including parameterization metadata)
-- - Teachers can only modify their own exercises
--
-- No new RLS policies are needed because:
-- 1. Variables are part of exercise metadata (teacher-editable)
-- 2. Distribution mode is set by teacher when creating/editing
-- 3. Students don't directly interact with these columns (read-only for display)

-- ============================================================================
-- 5. HELPER FUNCTION - Check if Exercise is Parameterized
-- ============================================================================

-- Function to determine if an exercise uses parameterization
-- Useful for filtering and display logic
create or replace function public.is_exercise_parameterized(exercise_id uuid)
returns boolean
language sql
stable
as $$
    select jsonb_array_length(variables) > 0
    from public.exercises
    where id = exercise_id;
$$;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

comment on column public.exercises.variables is 'JSONB array of variable definitions for parameterization. Each variable has: name (string) and expression (string). Expression can contain: literals, variable refs {{var}}, random specs {{1-10}}, or eval {{eval:expr}}';

comment on column public.exercises.distribution_mode is 'How parameterized instances are distributed: on_demand (students generate anytime), per_student (unique deterministic per student), per_group (same instance for group)';

comment on constraint exercises_variables_is_array on public.exercises is 'Ensures variables column contains a JSON array, not object or other type';

comment on constraint exercises_distribution_mode_valid on public.exercises is 'Restricts distribution_mode to valid values: on_demand, per_student, per_group';

-- ============================================================================
-- 7. ROLLBACK INSTRUCTIONS
-- ============================================================================

-- To rollback this migration, run:
--
-- -- Drop helper function
-- drop function if exists public.is_exercise_parameterized(uuid);
--
-- -- Drop indexes
-- drop index if exists public.idx_exercises_has_variables;
-- drop index if exists public.idx_exercises_distribution_mode;
-- drop index if exists public.idx_exercises_public_parameterized;
--
-- -- Remove columns (this will delete data!)
-- alter table public.exercises drop column if exists variables;
-- alter table public.exercises drop column if exists distribution_mode;

-- ============================================================================
-- 8. MIGRATION VALIDATION
-- ============================================================================

-- Verify the migration succeeded
do $$
declare
    v_variables_exists boolean;
    v_distribution_mode_exists boolean;
    v_default_value text;
begin
    -- Check if variables column exists
    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
        and table_name = 'exercises'
        and column_name = 'variables'
    ) into v_variables_exists;

    -- Check if distribution_mode column exists
    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
        and table_name = 'exercises'
        and column_name = 'distribution_mode'
    ) into v_distribution_mode_exists;

    -- Check default value for distribution_mode
    select column_default
    from information_schema.columns
    where table_schema = 'public'
    and table_name = 'exercises'
    and column_name = 'distribution_mode'
    into v_default_value;

    -- Validate results
    if not v_variables_exists then
        raise exception 'Migration validation failed: variables column not created';
    end if;

    if not v_distribution_mode_exists then
        raise exception 'Migration validation failed: distribution_mode column not created';
    end if;

    if v_default_value != '''on_demand''::text' then
        raise exception 'Migration validation failed: distribution_mode default value incorrect';
    end if;

    raise notice 'Migration validation successful!';
    raise notice '  ✓ variables column created';
    raise notice '  ✓ distribution_mode column created';
    raise notice '  ✓ default values correct';
    raise notice '  ✓ constraints applied';
    raise notice '';
    raise notice 'Next steps:';
    raise notice '  1. Update src/lib/types/database.ts';
    raise notice '  2. Update docs/architecture/database-schema.md';
    raise notice '  3. Test parameterized exercise creation';
end $$;
