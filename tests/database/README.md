# Database Trigger Tests

Comprehensive integration tests for PostgreSQL database triggers in UbuMaths.

## Overview

This directory contains integration tests for all 72 database triggers across 26 migration files. The tests verify that triggers correctly execute their intended side effects (auto-creating related records, updating aggregates, enforcing constraints, etc.).

### Why Integration Tests?

Unlike unit tests, these tests use a **real PostgreSQL database** running via Supabase CLI in Docker:

- ✅ Tests actual PL/pgSQL trigger code execution
- ✅ Validates RLS policy interactions
- ✅ Catches PostgreSQL-specific behavior
- ✅ Tests WHEN clauses and complex conditions
- ✅ Verifies SECURITY DEFINER functions work correctly

### Test Infrastructure

```
tests/database/
├── triggers/              # Trigger test files
│   ├── profile-triggers.test.ts        # ✅ Profile creation & updates
│   ├── updated-at-triggers.test.ts     # ✅ Parameterized suite (42 triggers)
│   ├── game-triggers.test.ts           # ✅ Game system triggers
│   ├── chat-triggers.test.ts           # ⏳ To implement
│   ├── messaging-triggers.test.ts      # ⏳ To implement
│   ├── error-monitoring-triggers.test.ts  # ⏳ To implement
│   ├── sync-triggers.test.ts           # ⏳ To implement
│   ├── template-triggers.test.ts       # ⏳ To implement
│   ├── cleanup-triggers.test.ts        # ⏳ To implement
│   └── assignment-triggers.test.ts     # ⏳ To implement
└── helpers/              # Test utilities
    ├── trigger-test-helpers.ts         # Supabase clients, cleanup, etc.
    └── test-data-factory.ts            # Builder pattern for test data
```

## Quick Start

### Prerequisites

1. **Docker Desktop** must be installed and running
2. **Supabase CLI** is already installed (see `package.json` devDependencies)

### Running Tests

```bash
# 1. Start local Supabase (runs migrations, starts PostgreSQL in Docker)
pnpm db:start

# 2. Run all trigger tests
pnpm test:triggers

# 3. Watch mode for development
pnpm test:triggers:watch

# 4. Stop Supabase when done
pnpm db:stop
```

**First time setup**: `pnpm db:start` downloads Docker images (~2-3 min). Subsequent starts are faster (~10-20 sec).

### Test Output

```bash
✓ tests/database/triggers/profile-triggers.test.ts (7 tests) 450ms
✓ tests/database/triggers/updated-at-triggers.test.ts (18 tests) 1.2s
✓ tests/database/triggers/game-triggers.test.ts (9 tests) 890ms

Test Files  3 passed (3)
     Tests  34 passed (34)
  Start at  12:00:00
  Duration  3.5s
```

## Writing Trigger Tests

### Pattern 1: Simple Trigger Test

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/trigger-test-helpers';
import { TestData } from '../helpers/test-data-factory';

describe('My Trigger Tests', () => {
	let serviceClient;

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	it('should do something when record is created', async () => {
		// Arrange: Create test data
		const user = await TestData.profile().withRole('student').create();

		// Act: Perform action that triggers the trigger
		await serviceClient.from('some_table').insert({ ... });

		// Wait for async trigger
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Assert: Verify side effect occurred
		const { data } = await serviceClient.from('related_table').select();
		expect(data).toHaveLength(1);
	});
});
```

### Pattern 2: Parameterized Tests (for similar triggers)

See `updated-at-triggers.test.ts` for a complete example testing 42 triggers with one suite:

```typescript
const TABLES_WITH_UPDATED_AT = [
	{
		table: 'profiles',
		createData: async () => await TestData.profile().create(),
		updateField: 'full_name',
		updateValue: 'Updated Name'
	}
	// ... more tables
];

describe.each(TABLES_WITH_UPDATED_AT)('$table table', ({ table, createData, ... }) => {
	it('should set updated_at to NOW() when record is updated', async () => {
		const record = await createData();
		// ... test logic
	});
});
```

### Pattern 3: Complex Triggers with WHEN Clauses

See `game-triggers.test.ts` for examples of:

- Triggers that only fire when specific conditions are met (WHEN clauses)
- Triggers affecting multiple records (FOREACH loops in PL/pgSQL)
- Interdependent triggers (one trigger's output affects another)

```typescript
it('should only fire when status changes to completed (WHEN clause)', async () => {
	const combat = await TestData.gameCombat(organizerId).withStatus('active').create();

	// Update OTHER fields - trigger should NOT fire
	await serviceClient.from('game_combats').update({ xp_gained: 200 }).eq('id', combat.id);

	// Verify trigger didn't fire
	expect(sideEffectDidNotOccur);

	// Update status to 'completed' - trigger SHOULD fire
	await serviceClient.from('game_combats').update({ status: 'completed' }).eq('id', combat.id);

	// Verify trigger fired
	expect(sideEffectOccurred);
});
```

## Test Helpers

### `trigger-test-helpers.ts`

**Supabase Clients:**

```typescript
// Service role client (bypasses RLS, can access all tables)
const serviceClient = createServiceRoleClient();

// Anon client (respects RLS policies)
const anonClient = createTestSupabaseClient();
```

**Cleanup:**

```typescript
// Clean up all test data (called in afterEach/afterAll)
await cleanupAllTestData();

// Custom cleanup for specific tables
await cleanupTestData(supabase, ['profiles', 'classes']);
```

**Wait for Async Triggers:**

```typescript
// Simple wait
await new Promise((resolve) => setTimeout(resolve, 100));

// Wait for condition
await waitForCondition(
	async () => {
		const { data } = await serviceClient.from('game_players').select().eq('user_id', userId);
		return data !== null;
	},
	5000, // timeout
	100 // polling interval
);
```

### `test-data-factory.ts`

Builder pattern for creating test data:

```typescript
// Simple creation
const student = await TestData.profile().withRole('student').create();

// Chained builder
const teacher = await TestData.profile()
	.withEmail('teacher@test.com')
	.withRole('teacher')
	.withFullName('Ms. Johnson')
	.create();

// Class
const class1 = await TestData.class(teacher.id).withName('Math 101').create();

// Exercise
const exercise = await TestData.exercise(teacher.id)
	.withQuestion('What is 2+2?')
	.withAnswer('4')
	.create();
```

## Troubleshooting

### Docker Issues

**Error: `Cannot connect to the Docker daemon`**

```bash
# Solution: Start Docker Desktop manually
open /Applications/Docker.app  # macOS

# Then try again
pnpm db:start
```

**Error: `Port 54321 already in use`**

```bash
# Solution: Stop existing Supabase instance
pnpm db:stop

# Or find and kill process using port
lsof -ti:54321 | xargs kill -9
```

### Test Failures

**Trigger didn't fire / Side effect not found**

1. **Add longer wait time** - Triggers can be async

   ```typescript
   await new Promise((resolve) => setTimeout(resolve, 200)); // Increase from 100ms
   ```

2. **Check RLS policies** - Use `createServiceRoleClient()` to bypass RLS:

   ```typescript
   // ❌ Wrong - RLS may block
   const client = createTestSupabaseClient();

   // ✅ Correct - Bypasses RLS
   const client = createServiceRoleClient();
   ```

3. **Verify trigger exists** - Check migration files:
   ```bash
   grep -r "CREATE TRIGGER my_trigger" supabase/migrations/
   ```

**Cleanup errors**

If cleanup fails, reset the database:

```bash
pnpm db:stop
pnpm db:reset  # Resets to clean state
pnpm db:start
```

## Remaining Work

### Completed (✅)

- [x] Test infrastructure & helpers
- [x] Profile triggers (7 tests)
- [x] Updated_at triggers - parameterized (18 tests)
- [x] Game system triggers (9 tests)

### To Implement (⏳)

1. **sync-triggers.test.ts** (Estimated: 1 hour)
   - `sync_class_members_insert/delete` - Class members ↔ profiles.class_ids sync

2. **chat-triggers.test.ts** (Estimated: 2 hours)
   - `trigger_create_class_chat_room` - Auto-create chat when class created
   - `trigger_add_student_to_class_chat` - Add student to chat on join
   - `trigger_process_message_content` - Parse TipTap JSON, detect profanity
   - `trigger_update_conversation_last_message` - Denormalize last message

3. **messaging-triggers.test.ts** (Estimated: 2 hours)
   - `trigger_update_message_search_index` - Full-text search TSVector
   - `trigger_update_search_index_on_attachment` - Update has_attachments flag
   - `trigger_update_folder_count_on_{insert,update,delete}` - Folder counts

4. **error-monitoring-triggers.test.ts** (Estimated: 1.5 hours)
   - `trigger_set_error_signature` - Generate MD5 signature for deduplication
   - `trigger_update_error_occurrence` - Upsert aggregated error_occurrences

5. **template-triggers.test.ts** (Estimated: 1 hour)
   - `trigger_save_template_version` - Version history on changes
   - `trigger_auto_log_template_changes` - Audit logging

6. **cleanup-triggers.test.ts** (Estimated: 1.5 hours)
   - `trigger_delete_exercise_images` - Delete images from Storage
   - Requires Storage setup (see "Storage Testing" below)

7. **assignment-triggers.test.ts** (Estimated: 30 min)
   - `trigger_update_completion_last_viewed` - Update last_viewed_at

### Total Remaining: ~9.5 hours

## Storage Testing (For cleanup-triggers.test.ts)

The `trigger_delete_exercise_images` trigger deletes files from Supabase Storage. To test:

### Option 1: Mock Storage (Easier)

```typescript
// Mock storage.objects table
await serviceClient.from('storage.objects' as never).insert({
	bucket_id: 'exercise-images',
	name: `${teacherId}/${exerciseId}/image.png`,
	owner: teacherId
} as never);

// Delete exercise - trigger should delete from storage.objects
await serviceClient.from('exercises').delete().eq('id', exerciseId);

// Verify deletion
const { data } = await serviceClient
	.from('storage.objects' as never)
	.select()
	.like('name', `%${exerciseId}%`);
expect(data).toHaveLength(0);
```

### Option 2: Real Storage (More thorough)

```typescript
// Upload real file
const { data } = await serviceClient.storage
	.from('exercise-images')
	.upload(`${teacherId}/${exerciseId}/test.png`, file);

// Delete exercise - trigger deletes from Storage
await serviceClient.from('exercises').delete().eq('id', exerciseId);

// Verify file deleted
const { data: files } = await serviceClient.storage
	.from('exercise-images')
	.list(`${teacherId}/${exerciseId}`);
expect(files).toHaveLength(0);
```

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/trigger-tests.yml`:

```yaml
name: Database Trigger Tests

on:
  push:
    branches:
      - main
      - release/**

jobs:
  trigger-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Install dependencies
        run: pnpm install

      - name: Start Supabase
        run: npx supabase start

      - name: Run trigger tests
        run: pnpm test:triggers

      - name: Stop Supabase
        if: always()
        run: npx supabase stop
```

## Best Practices

### 1. Always Clean Up

```typescript
afterAll(async () => {
	await cleanupAllTestData(); // ✅ Prevents test pollution
});

beforeEach(async () => {
	await cleanupAllTestData(); // ✅ Ensures test isolation
});
```

### 2. Use Service Role Client

```typescript
// ✅ Correct - Bypasses RLS for trigger tests
const client = createServiceRoleClient();

// ❌ Wrong - RLS may interfere
const client = createTestSupabaseClient();
```

### 3. Wait for Async Triggers

```typescript
// Trigger execution is async - always wait
await serviceClient.from('table').insert(...);
await new Promise(resolve => setTimeout(resolve, 100));  // ✅ Wait for trigger
const { data } = await serviceClient.from('related_table').select();
```

### 4. Test WHEN Clauses Explicitly

```typescript
// ✅ Test both branches of WHEN clause
it('should fire when condition is met', async () => {
	// ... test trigger fires
});

it('should NOT fire when condition is not met', async () => {
	// ... test trigger doesn't fire
});
```

### 5. Use Factories for Complex Data

```typescript
// ❌ Verbose, error-prone
const { data } = await serviceClient.from('profiles').insert({
	id: 'test-123',
	email: 'test@test.com',
	role: 'student',
	full_name: 'Test User',
	created_at: new Date().toISOString()
});

// ✅ Clean, maintainable
const student = await TestData.profile().withRole('student').create();
```

## Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Vitest Documentation](https://vitest.dev/)
- [PostgreSQL Trigger Docs](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [UbuMaths Migration Files](../../supabase/migrations/)

## Need Help?

1. Check migration files in `supabase/migrations/` to understand trigger behavior
2. Look at existing test files for patterns
3. Run tests with `--reporter=verbose` for detailed output
4. Check Supabase logs: `npx supabase logs db`
