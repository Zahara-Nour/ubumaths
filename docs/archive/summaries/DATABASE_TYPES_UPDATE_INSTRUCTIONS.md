# Database Types Update Instructions

After running the migration `20251026153000_add_exercise_parameterization.sql`, you need to update the TypeScript types.

## Manual Update Required

In `/Users/david/Coding/js/ubumaths/src/lib/types/database.ts`, locate the `exercises` table definition (around line 514) and add these three new fields to each of the three type definitions (Row, Insert, Update):

### 1. Add to `Row` type (around line 515):

Add these three fields in alphabetical order with the existing fields:

```typescript
distribution_mode: string;
is_public: boolean;
variables: Json;
```

The complete Row should look like:

```typescript
Row: {
    created_at: string;
    created_by: string;
    difficulty: number;
    distribution_mode: string;  // NEW
    estimated_time_minutes: number | null;
    grade_levels: string[] | null;
    id: string;
    is_public: boolean;  // NEW
    solution_md: string;
    source: string | null;
    statement_md: string;
    tags: string[];
    title: string | null;
    topic: string | null;
    updated_at: string;
    variables: Json;  // NEW
};
```

### 2. Add to `Insert` type (around line 530):

Add these three fields as OPTIONAL (with `?`):

```typescript
distribution_mode?: string;
is_public?: boolean;
variables?: Json;
```

### 3. Add to `Update` type (around line 545):

Add these three fields as OPTIONAL (with `?`):

```typescript
distribution_mode?: string;
is_public?: boolean;
variables?: Json;
```

## Verification

After making changes, run:

```bash
pnpm check
```

This should pass without errors.

## Alternative: Regenerate Types

If you prefer, you can regenerate the types from the database schema:

```bash
# After pushing the migration
pnpm db:migrate

# Generate types (if you have supabase gen types command set up)
supabase gen types typescript --local > src/lib/types/database.generated.ts
```

Then merge the generated types into `database.ts`.
