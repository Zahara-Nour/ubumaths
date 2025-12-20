# Exercises System - Troubleshooting Guide

> **Last Updated**: 2025-12-10
>
> **Related**: [Index](./index.md) | [API Reference](./api-reference.md) | [Database Schema](./database-schema.md)

---

## Table of Contents

- [Instance Generation Errors](#instance-generation-errors)
- [Assignment Issues](#assignment-issues)
- [Completion Tracking Issues](#completion-tracking-issues)
- [Access Control Issues](#access-control-issues)
- [Search Issues](#search-issues)
- [Performance Issues](#performance-issues)
- [Import/Export Issues](#importexport-issues)
- [Database Issues](#database-issues)
- [UI/Component Issues](#uicomponent-issues)
- [Debugging Tools](#debugging-tools)

---

## Instance Generation Errors

### Circular Dependency Detected

**Symptom**: Error message "Circular dependency detected: a → b → a"

**Cause**: Variable A references B, and B references A (directly or indirectly).

**Solution**:

```typescript
// BAD - Circular dependency
variables: [
	{ name: 'a', expression: '{{b}}' },
	{ name: 'b', expression: '{{a}}' } // Error!
];

// GOOD - Define in order
variables: [
	{ name: 'a', expression: '{{1..10}}' },
	{ name: 'b', expression: '{{eval:a*2}}' } // a is defined first
];
```

**Debugging**:

```typescript
import { detectCircularDependencies } from '$lib/ubumark';

const result = detectCircularDependencies(exercise.variables);
if (!result.valid) {
	console.log('Circular deps:', result.errors);
}
```

---

### Undefined Variable Reference

**Symptom**: Error "Undefined variable: {{c}}"

**Cause**: Content references a variable not defined in `variables` array.

**Solution**:

1. Check spelling of variable name in content
2. Ensure variable is defined in `variables` array
3. Variables must be defined before they're referenced

```typescript
// BAD - 'total' not defined
variables: [
  { name: 'a', expression: '{{1..10}}' }
],
statement_md: 'Result is {{total}}'  // Error: 'total' undefined

// GOOD
variables: [
  { name: 'a', expression: '{{1..10}}' },
  { name: 'total', expression: '{{eval:a*2}}' }
],
statement_md: 'Result is {{total}}'
```

---

### Expression Evaluation Error

**Symptom**: Error "Failed to evaluate expression: ..."

**Causes**:

- Syntax error in `{{eval:...}}` expression
- Division by zero
- Invalid JavaScript in expression

**Solutions**:

```typescript
// BAD - Syntax error
{ name: 'x', expression: '{{eval:a+}}' }  // Missing operand

// BAD - Division by zero risk
{ name: 'x', expression: '{{eval:a/b}}' }  // b could be 0

// GOOD - Safe division
variables: [
  { name: 'a', expression: '{{1..10}}' },
  { name: 'b', expression: '{{1..10!0}}' },  // Exclude 0
  { name: 'x', expression: '{{eval:a/b}}' }
]
```

---

### Same Values Every Time (per_student mode)

**Symptom**: Student always sees same values even after "regenerate"

**Cause**: This is expected behavior for `per_student` mode.

**Solution**: If you want different values each time, use `on_demand` mode:

```typescript
// per_student: Same values per student (deterministic)
distribution_mode: 'per_student';

// on_demand: New values each time (random)
distribution_mode: 'on_demand';
```

---

## Assignment Issues

### "Not authorized to assign this exercise"

**Symptom**: 403 error when creating assignment

**Causes**:

1. Teacher doesn't own the exercise
2. Exercise doesn't exist
3. Session expired

**Debugging**:

```typescript
// Check exercise ownership
const { data: exercise } = await supabase
	.from('exercises')
	.select('created_by')
	.eq('id', exerciseId)
	.single();

console.log('Exercise owner:', exercise?.created_by);
console.log('Current user:', userId);
console.log('Match:', exercise?.created_by === userId);
```

---

### Duplicate Assignment Error

**Symptom**: Error "duplicate key value violates unique constraint"

**Cause**: Trying to assign same exercise to same student/class twice.

**Solution**:

```typescript
// Check if assignment exists first
const { data: existing } = await supabase
	.from('exercise_assignments')
	.select('id')
	.eq('exercise_id', exerciseId)
	.eq('student_id', studentId)
	.single();

if (existing) {
	// Update existing instead of creating new
	await updateAssignment(supabase, existing.id, updates, userId);
} else {
	// Create new assignment
	await createExerciseAssignment(supabase, data, userId);
}
```

---

### Student Can't See Assigned Exercise

**Symptom**: Exercise doesn't appear in student's list

**Causes**:

1. Assignment `is_active = false`
2. Student not in assigned class
3. RLS policy blocking access

**Debugging**:

```sql
-- Check assignment exists and is active
SELECT * FROM exercise_assignments
WHERE exercise_id = 'xxx' AND is_active = true;

-- Check student access
SELECT student_has_exercise_access('exercise-id', 'student-id');

-- Check class membership (for class assignments)
SELECT * FROM class_members WHERE student_id = 'student-id';
```

---

### Assignment Not Cascading to Class Members

**Symptom**: Class assignment created, but individual students can't access

**Cause**: RLS policy checks `class_members` table for class assignments.

**Debugging**:

```sql
-- Verify class membership
SELECT cm.*, p.full_name
FROM class_members cm
JOIN profiles p ON cm.student_id = p.id
WHERE cm.class_id = 'class-id';

-- Check if class assignment exists
SELECT * FROM exercise_assignments
WHERE class_id = 'class-id' AND is_active = true;
```

---

## Completion Tracking Issues

### View Count Not Incrementing

**Symptom**: `view_count` stays at 1 despite multiple views

**Cause**: `markExerciseAsViewed` not being called, or UPSERT failing.

**Debugging**:

```typescript
// Manual test
const result = await markExerciseAsViewed(supabase, exerciseId, studentId, assignmentId);
console.log('View result:', result);

// Check current completion record
const { data } = await supabase
	.from('exercise_completions')
	.select('*')
	.eq('exercise_id', exerciseId)
	.eq('student_id', studentId)
	.single();
console.log('Completion:', data);
```

---

### Completion Status Not Persisting

**Symptom**: Marking complete works, but refreshing shows incomplete

**Causes**:

1. RLS policy preventing update
2. Transaction not committed
3. Wrong student_id

**Debugging**:

```sql
-- Check completion record directly
SELECT * FROM exercise_completions
WHERE exercise_id = 'xxx' AND student_id = 'yyy';

-- Check RLS policy
SET ROLE authenticated;
SET request.jwt.claim.sub = 'student-id';
SELECT * FROM exercise_completions WHERE student_id = 'student-id';
```

---

### Completion Stats Wrong

**Symptom**: Dashboard shows incorrect completion rates

**Cause**: Statistics function returning stale data.

**Solution**: Verify the `get_exercise_completion_stats` function:

```sql
SELECT * FROM get_exercise_completion_stats('exercise-id');

-- Manual verification
SELECT
  COUNT(*) as total_completions,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed,
  AVG(view_count) as avg_views
FROM exercise_completions
WHERE exercise_id = 'exercise-id';
```

---

## Access Control Issues

### Student Can Access Unassigned Exercise

**Symptom**: Student sees exercise they shouldn't have access to

**Causes**:

1. Exercise `is_public = true`
2. Public assignment exists
3. RLS policy misconfigured

**Debugging**:

```sql
-- Check exercise visibility
SELECT id, is_public FROM exercises WHERE id = 'xxx';

-- Check for public assignment
SELECT * FROM exercise_assignments
WHERE exercise_id = 'xxx' AND assigned_to_type = 'public';

-- Full access check
SELECT student_has_exercise_access('exercise-id', 'student-id');
```

---

### Teacher Can't Edit Own Exercise

**Symptom**: 403 error when updating exercise

**Causes**:

1. `created_by` doesn't match current user
2. Session expired / wrong user logged in

**Debugging**:

```typescript
// Verify ownership
const { data: exercise } = await supabase
	.from('exercises')
	.select('created_by')
	.eq('id', exerciseId)
	.single();

const {
	data: { user }
} = await supabase.auth.getUser();

console.log('Exercise owner:', exercise?.created_by);
console.log('Current user:', user?.id);
```

---

## Search Issues

### Full-Text Search Returns No Results

**Symptom**: Search query returns empty even with matching exercises

**Causes**:

1. French FTS index not created
2. Search term not stemmed correctly
3. Content in wrong column

**Debugging**:

```sql
-- Test FTS directly
SELECT id, title
FROM exercises
WHERE to_tsvector('french', coalesce(title, '') || ' ' || statement_md)
  @@ websearch_to_tsquery('french', 'pythagore');

-- Check index exists
SELECT indexname FROM pg_indexes
WHERE tablename = 'exercises' AND indexname LIKE '%fulltext%';
```

**Solution**: Rebuild index if missing:

```sql
CREATE INDEX IF NOT EXISTS idx_exercises_fulltext ON exercises
USING gin(to_tsvector('french',
  coalesce(title, '') || ' ' ||
  coalesce(statement_md, '') || ' ' ||
  coalesce(solution_md, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
));
```

---

### Search Too Slow

**Symptom**: Search takes >1 second

**Causes**:

1. Missing GIN index
2. Very large result set
3. Complex query pattern

**Solution**:

```typescript
// Add pagination to limit results
const { data } = await supabase
	.from('exercises')
	.select('id, title, difficulty') // Select only needed columns
	.textSearch('fts_column', query, { config: 'french' })
	.limit(50); // Limit results
```

---

## Performance Issues

### Slow Exercise List Loading

**Symptom**: Teacher dashboard takes >2 seconds to load

**Causes**:

1. Loading too many exercises at once
2. N+1 query problem
3. Missing indexes

**Solutions**:

```typescript
// Use pagination
const { data } = await getTeacherExercises(
	supabase,
	teacherId,
	filters,
	{ page: 1, limit: 50 } // Don't load all at once
);

// Select only needed columns
const { data } = await supabase
	.from('exercises')
	.select('id, title, difficulty, tags, updated_at') // Not statement_md, solution_md
	.eq('created_by', teacherId)
	.limit(50);
```

---

### Slow Student Exercise List

**Symptom**: Student dashboard slow with many assignments

**Cause**: `get_student_exercises` RPC function doing complex joins.

**Debugging**:

```sql
EXPLAIN ANALYZE
SELECT * FROM get_student_exercises('student-id');
```

**Solution**: Ensure indexes exist on foreign keys:

```sql
-- Verify indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'exercise_assignments';
```

---

## Import/Export Issues

### Import Validation Failure

**Symptom**: "Invalid exercise format" error

**Causes**:

1. Missing required fields (`statement_md`, `solution_md`, `difficulty`)
2. Wrong `difficulty` value (must be 1, 2, or 3)
3. Invalid JSON structure

**Debugging**:

```typescript
import { exerciseExportSchema } from '$lib/exercises/validation';

const result = exerciseExportSchema.safeParse(importedData);
if (!result.success) {
	console.log('Validation errors:', result.error.issues);
}
```

---

### Duplicate Detection Not Working

**Symptom**: Same exercise imported multiple times

**Cause**: Hash mismatch due to whitespace differences.

**Solution**: Normalize content before hashing:

```typescript
const normalized = (title + statement_md).trim().replace(/\s+/g, ' ');
const hash = createHash('sha256').update(normalized).digest('hex');
```

---

## Database Issues

### Migration Failed

**Symptom**: Error during `pnpm db:migrate`

**Common Causes**:

1. Table already exists
2. Foreign key constraint violation
3. RLS policy syntax error

**Solutions**:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'exercises'
);

-- Drop and recreate (CAUTION: data loss)
DROP TABLE IF EXISTS exercises CASCADE;

-- Then re-run migration
```

---

### RLS Policy Blocking All Access

**Symptom**: All queries return empty results

**Debugging**:

```sql
-- Temporarily disable RLS (admin only)
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;

-- Check if data exists
SELECT COUNT(*) FROM exercises;

-- Re-enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Test specific policy
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-id';
SELECT * FROM exercises LIMIT 5;
```

---

## UI/Component Issues

### ExerciseDisplay Not Rendering

**Symptom**: Blank component or error boundary triggered

**Causes**:

1. Missing `exercise` prop
2. Invalid markdown syntax
3. MathLive rendering error

**Debugging**:

```svelte
<script>
	// Add error boundary
	let error = $state<Error | null>(null);
</script>

{#if error}
	<pre>Error: {error.message}</pre>
{:else}
	<ExerciseDisplay {exercise} />
{/if}
```

---

### Solution Not Showing

**Symptom**: "Show Solution" button does nothing

**Causes**:

1. `showSolution` not bound correctly
2. `solution_md` is empty
3. Component state issue

**Debugging**:

```svelte
<script>
	let showSolution = $state(false);

	$effect(() => {
		console.log('showSolution:', showSolution);
		console.log('solution_md:', exercise.solution_md);
	});
</script>

<ExerciseDisplay {exercise} bind:showSolution />
```

---

### Variables Not Displaying in Preview

**Symptom**: Template shows `{{a}}` instead of resolved value

**Causes**:

1. Mode set to wrong value
2. Instance generation failed silently
3. Variables array empty

**Debugging**:

```svelte
<script>
	import { generateExerciseInstance } from '$lib/exercises/generator/instance-generator';

	const result = generateExerciseInstance(exercise, { seed: 12345 });
	console.log('Generation result:', result);
	console.log('Variables:', exercise.variables);
	console.log('Instance:', result.instance);
</script>
```

---

## Debugging Tools

### Server-Side Logging

```typescript
// In +server.ts or +page.server.ts
import { dev } from '$app/environment';

if (dev) {
	console.log('[Exercises] Request:', {
		exerciseId,
		userId,
		action: 'create_assignment'
	});
}
```

### Database Query Logging

```sql
-- Enable query logging (local dev only)
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- View logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Client-Side Debug Component

```svelte
<!-- Add to page for debugging -->
{#if dev}
	<details class="mt-4 rounded bg-muted p-4">
		<summary>Debug Info</summary>
		<pre>{JSON.stringify({ exercise, assignment, completion }, null, 2)}</pre>
	</details>
{/if}
```

### Supabase Dashboard

1. Go to Supabase Dashboard → Table Editor
2. Check `exercises`, `exercise_assignments`, `exercise_completions` tables
3. Use SQL Editor for direct queries
4. Check Logs for RLS policy violations

---

## Getting Help

If issues persist:

1. Check existing documentation in `docs/ref/exercices/`
2. Search codebase for similar patterns
3. Review recent commits affecting exercises system
4. Check Supabase logs for database errors
