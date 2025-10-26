# Exercise Parameterization Migration Summary

## Overview

This migration adds parameterization support to the Exercises feature, enabling dynamic content generation with variables similar to the Questions feature.

## Files Created

### 1. Migration File

**Location:** `/Users/david/Coding/js/ubumaths/supabase/migrations/20251026153000_add_exercise_parameterization.sql`

**What it does:**

- Adds `variables` column (JSONB array) to store variable definitions
- Adds `distribution_mode` column (TEXT with CHECK constraint)
- Creates performance indexes for filtering parameterized exercises
- Adds helper function `is_exercise_parameterized(uuid)`
- Includes migration validation and rollback instructions

## Schema Changes

### New Columns

#### 1. `variables` (JSONB, NOT NULL, default: `[]`)

Stores an array of variable definitions for parameterization.

**Structure:**

```json
[
	{ "name": "a", "expression": "{{1-10}}" },
	{ "name": "b", "expression": "{{5-15}}" },
	{ "name": "sum", "expression": "{{eval:{{a}}+{{b}}}}" }
]
```

**Constraints:**

- Must be a JSON array (enforced by `exercises_variables_is_array` constraint)
- Cannot be null (empty array `[]` is used instead)

#### 2. `distribution_mode` (TEXT, NOT NULL, default: `'on_demand'`)

Controls how parameterized instances are distributed to students.

**Allowed values:**

- `'on_demand'`: Students can generate new instances anytime (default)
- `'per_student'`: Each student gets a unique deterministic instance
- `'per_group'`: Students in same group share the same instance

**Constraints:**

- Must be one of the three allowed values (enforced by `exercises_distribution_mode_valid` constraint)

### New Indexes

1. **`idx_exercises_has_variables`** - Partial index for filtering exercises with variables
2. **`idx_exercises_distribution_mode`** - Index for filtering by distribution mode
3. **`idx_exercises_public_parameterized`** - Composite index for public parameterized exercises

### New Functions

**`is_exercise_parameterized(exercise_id UUID)`**

- Returns: boolean
- Checks if an exercise has variables defined
- Useful for filtering and display logic

## Migration Workflow

### 1. Push the Migration

```bash
pnpm db:migrate
```

This will:

- Add the new columns to the `exercises` table
- Create the indexes
- Create the helper function
- Run validation checks

**Expected output:**

```
Migration validation successful!
  ✓ variables column created
  ✓ distribution_mode column created
  ✓ default values correct
  ✓ constraints applied

Next steps:
  1. Update src/lib/types/database.ts
  2. Update docs/architecture/database-schema.md
  3. Test parameterized exercise creation
```

### 2. Update TypeScript Types

**Manual Update Required**

See: `/Users/david/Coding/js/ubumaths/DATABASE_TYPES_UPDATE_INSTRUCTIONS.md`

In `src/lib/types/database.ts`, add these fields to the `exercises` table definition:

**Row type:**

```typescript
distribution_mode: string;
is_public: boolean;
variables: Json;
```

**Insert type:**

```typescript
distribution_mode?: string;
is_public?: boolean;
variables?: Json;
```

**Update type:**

```typescript
distribution_mode?: string;
is_public?: boolean;
variables?: Json;
```

### 3. Update Documentation

Update `/Users/david/Coding/js/ubumaths/docs/architecture/database-schema.md`:

Add to the `exercises` table documentation:

```markdown
#### Parameterization Columns

- `variables` (JSONB): Array of variable definitions for dynamic content generation
  - Each variable has: `name` (string) and `expression` (string)
  - Expression can contain: literals, variable refs `{{var}}`, random specs `{{1-10}}`, or eval `{{eval:expr}}`
  - Default: `[]` (empty array for non-parameterized exercises)

- `distribution_mode` (TEXT): Controls instance distribution
  - `'on_demand'`: Students generate new instances anytime (default)
  - `'per_student'`: Unique deterministic instance per student
  - `'per_group'`: Same instance for students in a group
```

## Testing

### 1. Create Parameterized Exercise

```sql
INSERT INTO exercises (
    title,
    statement_md,
    solution_md,
    difficulty,
    variables,
    distribution_mode,
    created_by
)
VALUES (
    'Square Area',
    'Calculate the area of a square with side length {{a}} cm.',
    'Area = side² = {{a}}² = {{area}} cm²',
    1,
    '[{"name":"a","expression":"{{5-15}}"},{"name":"area","expression":"{{eval:{{a}}*{{a}}}}"}]'::jsonb,
    'per_student',
    auth.uid()
);
```

### 2. Query Parameterized Exercises

```sql
-- Find all exercises with variables
SELECT id, title, variables, distribution_mode
FROM exercises
WHERE jsonb_array_length(variables) > 0;

-- Find public parameterized exercises
SELECT id, title, variables, distribution_mode
FROM exercises
WHERE is_public = true
  AND jsonb_array_length(variables) > 0;

-- Use helper function
SELECT id, title
FROM exercises
WHERE is_exercise_parameterized(id);
```

### 3. Verify Type Safety

```bash
pnpm check
```

Should pass without errors.

## Security Considerations

### RLS Policies

No new RLS policies are needed because:

1. Variables are part of exercise metadata (teacher-editable)
2. Distribution mode is set by teacher when creating/editing
3. Students don't directly interact with these columns (read-only)

Existing policies already cover:

- Teachers can create/update exercises (including new columns)
- Teachers can view all exercises
- Teachers can only modify their own exercises

## Rollback Instructions

If you need to rollback this migration:

```sql
-- Drop helper function
DROP FUNCTION IF EXISTS public.is_exercise_parameterized(uuid);

-- Drop indexes
DROP INDEX IF EXISTS public.idx_exercises_has_variables;
DROP INDEX IF EXISTS public.idx_exercises_distribution_mode;
DROP INDEX IF EXISTS public.idx_exercises_public_parameterized;

-- Remove columns (WARNING: This will delete data!)
ALTER TABLE public.exercises DROP COLUMN IF EXISTS variables;
ALTER TABLE public.exercises DROP COLUMN IF EXISTS distribution_mode;
```

## Integration with Parameterization System

The `variables` column stores data compatible with the shared parameterization library:

**Location:** `/Users/david/Coding/js/ubumaths/src/lib/shared/parameterization/`

**Key modules:**

- `types.ts` - Variable interface definition
- `resolver/variable-resolver.ts` - Resolves variables into values
- `parser/` - Parses markdown syntax ({{var}}, {{1-10}}, {{eval:expr}})
- `validator/` - Validates variable definitions (circular dependencies, etc.)

**Usage example:**

```typescript
import { resolveVariables } from '$lib/shared/parameterization';
import type { Variable } from '$lib/shared/parameterization/types';

// From database
const exercise = await supabase.from('exercises').select('*').eq('id', exerciseId).single();

// Resolve variables
const variables = exercise.variables as Variable[];
const resolved = await resolveVariables(variables);

// resolved.resolvedVariables contains the final values
// Can be used to replace {{var}} in exercise.statement_md
```

## Performance Notes

1. **Index Usage:**
   - `idx_exercises_has_variables` uses a partial index to efficiently filter parameterized exercises
   - `idx_exercises_public_parameterized` optimizes queries for the public library
   - Indexes are automatically used by PostgreSQL query planner

2. **JSONB Performance:**
   - JSONB column allows efficient querying and indexing
   - `jsonb_array_length()` is fast for checking if variables exist
   - Consider GIN index if you need to query variable names/expressions frequently

3. **Query Optimization:**
   - Use `jsonb_array_length(variables) > 0` instead of `variables != '[]'::jsonb` for better performance
   - The helper function `is_exercise_parameterized()` is marked as STABLE for query optimization

## Next Steps

1. **Frontend Integration:**
   - Update exercise creation/edit forms to include variable editor
   - Add distribution mode selector
   - Display parameterization status in exercise lists

2. **Instance Generation:**
   - Create exercise instance generation service
   - Handle per_student deterministic generation (use student ID as seed)
   - Handle per_group shared instances (use group ID as seed)

3. **Storage:**
   - Decide if/when to store generated instances
   - Consider caching strategies for per_student instances

4. **UI/UX:**
   - Show "Generate New" button for on_demand mode
   - Show locked instance for per_student/per_group modes
   - Display variable values after resolution

## Questions & Considerations

1. **Should we store generated instances?**
   - Pros: Consistency, audit trail, faster loading
   - Cons: Storage overhead, complexity
   - Recommendation: Start with on-the-fly generation, add storage if needed

2. **How to handle per_student deterministic generation?**
   - Use student UUID as seed for random number generator
   - Ensures same student always gets same values
   - Implemented in `src/lib/shared/parameterization/resolver/variable-resolver.ts`

3. **Migration strategy for existing exercises?**
   - All existing exercises will have `variables: []` and `distribution_mode: 'on_demand'`
   - No breaking changes - non-parameterized exercises work as before
   - Teachers can optionally add variables to existing exercises

## References

- **Parameterization System Docs:** `/Users/david/Coding/js/ubumaths/src/lib/shared/parameterization/README.md`
- **Questions Feature:** Similar parameterization implementation
- **Database Schema Docs:** `/Users/david/Coding/js/ubumaths/docs/architecture/database-schema.md`
