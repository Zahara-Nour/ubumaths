# Database Trigger Tests

Comprehensive documentation for UbuMaths database trigger test suite.

**Last Updated**: 2025-10-28

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start Guide](#quick-start-guide)
3. [Test Coverage Summary](#test-coverage-summary)
4. [Test Patterns & Examples](#test-patterns--examples)
5. [Infrastructure Details](#infrastructure-details)
6. [Test File Reference](#test-file-reference)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [Maintenance](#maintenance)
10. [References](#references)

---

## Overview

### What Are Database Triggers?

Database triggers are automatic database operations that execute in response to specific events (INSERT, UPDATE, DELETE). In UbuMaths, triggers handle critical business logic:

- Auto-creating user profiles when auth users sign up
- Synchronizing denormalized data (e.g., `profiles.class_ids` array)
- Updating timestamps (`updated_at` columns)
- Enforcing business rules (e.g., single active deck per user)
- Processing content (extracting plain text, detecting profanity)
- Managing complex workflows (game rewards, chat systems)

### Why Test Triggers?

Unlike application code, database triggers:

- Run **outside** the application layer (cannot unit test in isolation)
- Execute **automatically** with database operations (hard to debug)
- Contain **critical business logic** (bugs affect data integrity)
- Are **difficult to rollback** once deployed (schema migrations)

**Solution**: Integration tests against a real PostgreSQL database using Supabase local instance.

### Test Approach

**Integration Tests with Real Database**

- Tests run against a local Supabase instance (PostgreSQL + Auth + Storage)
- Docker-based environment (isolated, reproducible)
- Real database triggers, functions, and RLS policies
- Service role client for elevated permissions (bypass RLS, access auth schema)

**NOT Unit Tests with Mocks**

- No mocking of database, triggers, or Supabase client
- Tests verify actual PostgreSQL behavior, not simulated behavior

### Test Coverage

**Total**: 139 tests across 11 test files
**Triggers Covered**: 72 triggers (including 42 `updated_at` triggers tested via parameterization)
**Migrations Covered**: 26+ migration files (out of 116 total migrations)

---

## Quick Start Guide

### Prerequisites

1. **Docker Desktop**: Required for Supabase local instance
   - [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Ensure Docker daemon is running

2. **Node.js & pnpm**: Already installed if running UbuMaths locally
   - Node.js 20+
   - pnpm 8+

3. **Supabase CLI**: Installed automatically via `package.json` dev dependencies

### Starting Supabase Local Instance

```bash
# Start Supabase (runs in Docker)
npx supabase start

# Expected output:
# Started supabase local development setup.
#
#          API URL: http://localhost:54321
#      GraphQL URL: http://localhost:54321/graphql/v1
#           DB URL: postgresql://postgres:postgres@localhost:54322/postgres
#       Studio URL: http://localhost:54323
#     Inbucket URL: http://localhost:54324
#       JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
#         anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note**: The first `supabase start` can take 5-10 minutes to download Docker images.

### Running Trigger Tests

```bash
# Run all trigger tests (139 tests)
pnpm test:triggers

# Run in watch mode (re-run on file changes)
pnpm test:triggers:watch

# Run specific test file
pnpm vitest tests/database/triggers/profile-triggers.test.ts

# Run tests matching pattern
pnpm vitest tests/database/triggers --grep "game"
```

### Interpreting Results

**Successful Test Run**:

```
 ✓ tests/database/triggers/profile-triggers.test.ts (7)
   ✓ Profile Triggers (7)
     ✓ on_auth_user_created → handle_new_user() (4)
       ✓ should create profile when user signs up via Supabase Auth
       ✓ should handle missing full_name metadata gracefully
       ✓ should handle duplicate profile attempt gracefully (ON CONFLICT)
       ✓ should not fail user creation even if profile creation fails
     ✓ update_profiles_updated_at (BEFORE UPDATE) (3)
       ✓ should update updated_at timestamp when profile is updated
       ✓ should set updated_at to NOW() on each update
       ✓ should not modify updated_at on INSERT

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  10:23:45
   Duration  1.23s
```

**Failed Test**:

```
 ✗ tests/database/triggers/game-triggers.test.ts (15)
   ✓ trigger_create_game_profile_on_user_creation (3)
   ✗ trigger_award_gidouilles_on_combat_victory (5)
     ✗ should award gidouilles to organizer on combat victory
       AssertionError: expected 100 to be 115
         Expected: 115
         Actual:   100
```

**Common Warnings (Safe to Ignore)**:

- `Cleanup ${table}: [PostgresError]` - Table doesn't have `email` column, expected behavior
- `debug:` prefixed logs - Debug output from test helpers

### Stopping Supabase

```bash
# Stop Supabase (keeps data for next run)
npx supabase stop

# Stop and remove all data (fresh start next time)
npx supabase stop --no-backup
```

---

## Test Coverage Summary

### Test Files Overview

| Test File                             | Tests | Triggers Tested    | Migration Reference                                               |
| ------------------------------------- | ----- | ------------------ | ----------------------------------------------------------------- |
| **profile-triggers.test.ts**          | 7     | 2                  | `001_initial_schema.sql`, `005_fix_existing_users.sql`            |
| **updated-at-triggers.test.ts**       | 18    | 42 (parameterized) | Multiple migrations (all tables with `updated_at`)                |
| **game-triggers.test.ts**             | 15    | 4                  | `002_create_game_tables.sql`, `009_navadra_game_enhancements.sql` |
| **sync-triggers.test.ts**             | 10    | 2                  | `003_sync_class_members.sql`                                      |
| **chat-triggers.test.ts**             | 14    | 4                  | `007_chat_system.sql`, `012_chat_profanity_filter.sql`            |
| **messaging-triggers.test.ts**        | 20    | 6                  | `004_messaging_system.sql`, `013_message_profanity_filter.sql`    |
| **error-monitoring-triggers.test.ts** | 13    | 3                  | `020241027153426_add_error_logging.sql`                           |
| **template-triggers.test.ts**         | 13    | 3                  | `020241027221412_exercise_template_system.sql`                    |
| **assignment-triggers.test.ts**       | 12    | 1                  | `020241027005912_create_exercise_assignments.sql`                 |
| **cleanup-triggers.test.ts**          | 9     | 2                  | `008_cleanup_triggers.sql`                                        |

**Total**: 131 tests covering 69 triggers across 10 test files

### Trigger Categories

**Profile Management** (2 triggers)

- Auto-create profile on auth user creation
- Update `updated_at` on profile changes

**Timestamp Management** (42 triggers)

- Auto-update `updated_at` on UPDATE for all tables with timestamp tracking

**Game System** (4 triggers)

- Auto-create game profile for students
- Award gidouilles (currency) on combat victory
- Update player combat stats (wins/losses)
- Ensure single active spell deck per user

**Class Synchronization** (2 triggers)

- Sync `profiles.class_ids` array when student joins class
- Remove from `profiles.class_ids` when student leaves class

**Chat System** (4 triggers)

- Create class chat room on class creation
- Add student to class chat on enrollment
- Process message content (extract plain text, detect profanity)
- Update conversation last message metadata

**Messaging System** (6 triggers)

- Process private message content (plain text extraction)
- Detect profanity in messages
- Track message inbox entries
- Auto-delete old message drafts

**Error Monitoring** (3 triggers)

- Increment occurrence count for duplicate errors
- Set `is_duplicate` flag for known errors
- Track error frequency

**Template System** (3 triggers)

- Sync template exercises when original updates
- Cascade deletions to cloned exercises
- Track template usage

**Assignment Tracking** (1 trigger)

- Update `last_viewed_at` when view count increments

**Cleanup** (2 triggers)

- Delete orphaned conversation participants
- Clean up completed assessments

---

## Test Patterns & Examples

### Pattern 1: Simple Trigger Test

**Use Case**: Testing a basic AFTER INSERT trigger that creates related data.

**Example**: Profile creation on auth user signup

```typescript
it('should create profile when user signs up via Supabase Auth', async () => {
	// Arrange: Prepare test data
	const userId = generateTestId('user');
	const userEmail = generateTestEmail('signup');
	const fullName = 'John Doe';

	// Act: Insert into auth.users (simulates Supabase Auth signup)
	// Trigger: on_auth_user_created → handle_new_user()
	await serviceClient.from('users' as never).insert({
		id: userId,
		email: userEmail,
		raw_user_meta_data: { full_name: fullName }
	} as never);

	// Wait for async trigger to execute
	await new Promise((resolve) => setTimeout(resolve, 100));

	// Assert: Verify trigger created profile automatically
	const { data: profile, error } = await serviceClient
		.from('profiles')
		.select()
		.eq('id', userId)
		.single();

	expect(error).toBeNull();
	expect(profile).toBeDefined();
	expect(profile?.id).toBe(userId);
	expect(profile?.email).toBe(userEmail);
	expect(profile?.full_name).toBe(fullName);
	expect(profile?.role).toBe('student'); // Default role
});
```

**Key Points**:

- Use `serviceClient` for auth schema access
- Wait 100ms for async triggers
- Cast to `never` type for auth schema operations
- Test default values and business logic

### Pattern 2: Parameterized Tests

**Use Case**: Testing the same trigger pattern across multiple tables.

**Example**: `updated_at` triggers on 42 tables

```typescript
// Define test data for each table
const TABLES_WITH_UPDATED_AT = [
	{
		table: 'profiles',
		createData: async () => await TestData.profile().create(),
		updateField: 'full_name',
		updateValue: 'Updated Name'
	},
	{
		table: 'classes',
		createData: async () => {
			const teacher = await TestData.profile().withRole('teacher').create();
			return await TestData.class(teacher.id).create();
		},
		updateField: 'name',
		updateValue: 'Updated Class'
	}
	// ... 40 more tables
];

// Parameterized test suite
describe.each(TABLES_WITH_UPDATED_AT)(
	'$table table',
	({ table, createData, updateField, updateValue }) => {
		it('should set updated_at to NOW() when record is updated', async () => {
			// Arrange: Create test record
			const record = await createData();
			const originalUpdatedAt = record.updated_at;

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Act: Update the record (trigger fires)
			const { data: updatedRecord } = await serviceClient
				.from(table as never)
				.update({ [updateField]: updateValue } as never)
				.eq('id', record.id)
				.select()
				.single();

			// Assert: updated_at should change
			expect(updatedRecord).toBeDefined();
			expect(updatedRecord.updated_at).toBeDefined();

			if (originalUpdatedAt) {
				const originalTime = new Date(originalUpdatedAt).getTime();
				const updatedTime = new Date(updatedRecord.updated_at).getTime();
				expect(updatedTime).toBeGreaterThan(originalTime);
			}
		});
	}
);
```

**Key Points**:

- `describe.each()` runs same tests for each table
- Reduces 126+ lines of duplicate code to ~50 lines
- Test data factories handle complex dependencies
- Type assertions required for dynamic table names

### Pattern 3: Testing WHEN Clauses

**Use Case**: Verifying that triggers only fire under specific conditions.

**Example**: Ensure single active deck (only fires when `is_active` changes to `true`)

```typescript
it('should only fire when is_active changes to true (WHEN clause)', async () => {
	// Arrange: Create 2 decks, one active
	const student = await TestData.profile().withRole('student').create();

	await new Promise((resolve) => setTimeout(resolve, 100));

	const { data: deck1 } = await serviceClient
		.from('game_spell_decks')
		.insert({
			user_id: student.id,
			name: 'Deck 1',
			is_active: true
		})
		.select()
		.single();

	const { data: deck2 } = await serviceClient
		.from('game_spell_decks')
		.insert({
			user_id: student.id,
			name: 'Deck 2',
			is_active: false // Not active
		})
		.select()
		.single();

	// Act: Update deck2 NAME but keep is_active = false
	// Trigger WHEN clause: WHEN (NEW.is_active = true AND OLD.is_active = false)
	// This should NOT fire the trigger
	await serviceClient
		.from('game_spell_decks')
		.update({ name: 'Updated Deck 2' })
		.eq('id', deck2!.id);

	await new Promise((resolve) => setTimeout(resolve, 100));

	// Assert: deck1 should still be active (trigger didn't fire)
	const { data: deck1After } = await serviceClient
		.from('game_spell_decks')
		.select('is_active')
		.eq('id', deck1!.id)
		.single();

	expect(deck1After?.is_active).toBe(true);
});
```

**Key Points**:

- Test both positive case (WHEN condition true) and negative case (WHEN condition false)
- Verify trigger doesn't fire when WHEN clause is false
- Document WHEN clause in test description

### Pattern 4: Using Test Helpers & Factories

**Use Case**: Reducing boilerplate and improving test readability.

**Example**: Creating complex test data with builders

```typescript
import { TestData } from '../helpers/test-data-factory';

it('should award gidouilles to all ready participants', async () => {
	// Arrange: Use builders for clean, fluent test data creation
	const organizer = await TestData.profile().withRole('student').withGidouilles(100).create();

	const participant1 = await TestData.profile().withRole('student').withGidouilles(50).create();

	const participant2 = await TestData.profile().withRole('student').withGidouilles(75).create();

	// Wait for game_players creation trigger
	await new Promise((resolve) => setTimeout(resolve, 200));

	const combat = await TestData.gameCombat(organizer.id)
		.withStatus('active')
		.withXp(100)
		.withReadyPlayers([participant1.id, participant2.id])
		.create();

	// Act: Complete combat with victory (trigger fires)
	await serviceClient
		.from('game_combats')
		.update({ status: 'completed', outcome: 'victory' })
		.eq('id', combat.id);

	await new Promise((resolve) => setTimeout(resolve, 200));

	// Assert: All should receive gidouilles (15 each = 100 XP / 10 + 5 bonus)
	const { data: profiles } = await serviceClient
		.from('profiles')
		.select('id, gidouilles')
		.in('id', [organizer.id, participant1.id, participant2.id]);

	const gidouillesMap = new Map(profiles?.map((p) => [p.id, p.gidouilles]));

	expect(gidouillesMap.get(organizer.id)).toBe(115); // 100 + 15
	expect(gidouillesMap.get(participant1.id)).toBe(65); // 50 + 15
	expect(gidouillesMap.get(participant2.id)).toBe(90); // 75 + 15
});
```

**Available Builders**:

```typescript
TestData.profile() // ProfileBuilder
	.withRole('teacher')
	.withGidouilles(100)
	.create();

TestData.class(teacherId) // ClassBuilder
	.withName('Math 101')
	.archived()
	.create();

TestData.exercise(createdBy) // ExerciseBuilder
	.withType('multiple_choice')
	.withQuestion('What is 2+2?')
	.create();

TestData.gameCombat(organizerId) // GameCombatBuilder
	.withStatus('completed')
	.withOutcome('victory')
	.withXp(100)
	.create();

TestData.privateMessage(senderId) // PrivateMessageBuilder
	.withSubject('Test')
	.isGroupMessage()
	.create();

TestData.errorLog() // ErrorLogBuilder
	.withType('client_js')
	.withSeverity('error')
	.create();
```

**Helper Functions**:

```typescript
import {
	createServiceRoleClient, // Service role Supabase client
	generateTestId, // Generate unique test IDs
	generateTestEmail, // Generate test emails (@test.com)
	cleanupAllTestData, // Clean all test data
	waitForCondition // Poll until condition true
} from '../helpers/trigger-test-helpers';

// Example: Wait for async trigger completion
await waitForCondition(
	async () => {
		const { data } = await serviceClient
			.from('game_players')
			.select()
			.eq('user_id', student.id)
			.maybeSingle();
		return data !== null;
	},
	5000, // Timeout: 5 seconds
	100 // Poll interval: 100ms
);
```

---

## Infrastructure Details

### Supabase CLI Setup

**Location**: `supabase/config.toml`

The project uses Supabase local development environment:

```toml
[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323
api_url = "http://localhost"

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
```

**Key Ports**:

- `54321`: Supabase API (used by tests)
- `54322`: PostgreSQL database
- `54323`: Supabase Studio (web UI)
- `54324`: Inbucket (email testing)

### Test Helpers

**Location**: `tests/database/helpers/trigger-test-helpers.ts`

**createServiceRoleClient()**

Creates Supabase client with service role key (bypasses RLS):

```typescript
export function createServiceRoleClient(): SupabaseClient<Database> {
	const url = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
	const serviceRoleKey =
		process.env.SUPABASE_TEST_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Default local key

	return createClient<Database>(url, serviceRoleKey, {
		auth: {
			persistSession: false, // Don't persist sessions in tests
			autoRefreshToken: false // Don't auto-refresh tokens
		}
	});
}
```

**Why Service Role Client?**

- Access to `auth.users` table (simulating Supabase Auth operations)
- Bypass Row Level Security (RLS) policies
- Delete test data across all tables (cleanup)
- Insert into tables the anon user cannot access

**cleanupAllTestData()**

Cleans up test data after each test:

```typescript
export async function cleanupAllTestData(): Promise<void> {
	const serviceClient = createServiceRoleClient();

	// Order matters - delete children before parents
	const tables = [
		// Game system (children first)
		'game_challenge_attempts',
		'game_combats',
		'game_player_achievements',
		'game_spell_decks',
		'game_players',

		// Assessments & exercises
		'assessment_responses',
		'assessment_attempts',
		'assessments',
		'exercise_completions',
		'exercises',

		// ... 25+ more tables

		// User data (parent last)
		'profiles'
	];

	for (const table of tables) {
		try {
			// Delete rows where email contains @test.com
			await serviceClient
				.from(table as never)
				.delete()
				.like('email', '%@test.com%');
		} catch (error) {
			// Some tables don't have email column - that's OK
			console.debug(`Cleanup ${table}:`, error);
		}
	}
}
```

**Test Data Markers**:

- All test emails end with `@test.com`
- Cleanup deletes rows where `email LIKE '%@test.com%'`
- Tables without `email` column skip cleanup (safe)

**waitForCondition()**

Polls until async condition is true:

```typescript
export async function waitForCondition(
	condition: () => Promise<boolean>,
	timeout = 5000,
	interval = 100
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return; // Condition met
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	throw new Error(`Condition not met within ${timeout}ms`);
}
```

**Usage**:

```typescript
// Wait for game_players row to be created by trigger
await waitForCondition(
	async () => {
		const { data } = await serviceClient
			.from('game_players')
			.select()
			.eq('user_id', student.id)
			.maybeSingle();
		return data !== null;
	},
	5000, // 5 second timeout
	100 // Check every 100ms
);
```

### Test Data Factories

**Location**: `tests/database/helpers/test-data-factory.ts`

**Builder Pattern**: Fluent API for creating test data with sensible defaults.

**Example: ProfileBuilder**

```typescript
export class ProfileBuilder {
	private data: Partial<Tables['profiles']['Insert']> = {};

	constructor() {
		// Sensible defaults
		this.data = {
			id: generateTestId('user'),
			email: generateTestEmail('user'),
			role: 'student',
			full_name: 'Test User',
			created_at: new Date().toISOString()
		};
	}

	withRole(role: 'student' | 'teacher' | 'admin'): this {
		this.data.role = role;
		this.data.full_name = `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`;
		return this;
	}

	withGidouilles(amount: number): this {
		this.data.gidouilles = amount;
		return this;
	}

	async create(): Promise<Tables['profiles']['Row']> {
		const client = createServiceRoleClient();
		const { data, error } = await client.from('profiles').insert(this.data).select().single();

		if (error) throw error;
		return data;
	}
}
```

**Benefits**:

- Sensible defaults (less setup boilerplate)
- Fluent API (readable test setup)
- Type-safe (TypeScript enforces valid data)
- Reusable across tests

### CI/CD Integration

**Location**: `.github/workflows/trigger-tests.yml`

GitHub Actions workflow runs trigger tests on:

- Push to `main` branch
- Pull requests to `main`
- Release branches (`release/**`)
- Manual trigger (`workflow_dispatch`)

```yaml
name: Database Trigger Tests

on:
  push:
    branches: [main, release/**]
  pull_request:
    branches: [main, release/**]
  workflow_dispatch:

jobs:
  trigger-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Start Supabase local instance
        run: npx supabase start

      - name: Run trigger tests
        run: pnpm test:triggers

      - name: Stop Supabase
        if: always()
        run: npx supabase stop --no-backup

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: trigger-test-results
          path: |
            test-results/
            .supabase/logs/
          retention-days: 7
```

**Key Features**:

- Runs in clean Ubuntu environment
- 15-minute timeout (prevents hung tests)
- Uploads logs on failure (debugging)
- Cleans up Supabase after run (`--no-backup`)

---

## Test File Reference

### profile-triggers.test.ts

**Tests**: 7
**Triggers Tested**: 2
**Migration**: `supabase/migrations/001_initial_schema.sql`, `005_fix_existing_users.sql`

**Triggers**:

1. **on_auth_user_created** (AFTER INSERT on `auth.users`)
   - Function: `handle_new_user()`
   - Creates profile when user signs up
   - Extracts `full_name` from metadata
   - Defaults to email if no name provided
   - Handles duplicate profile gracefully (ON CONFLICT)

2. **update_profiles_updated_at** (BEFORE UPDATE on `profiles`)
   - Sets `updated_at = NOW()`

**Key Test Cases**:

- Profile creation with full metadata
- Profile creation with missing `full_name`
- Duplicate profile handling (ON CONFLICT)
- Failsafe: user creation succeeds even if profile fails
- `updated_at` timestamp updates
- `updated_at` not set on INSERT

**Location**: `/Users/david/Coding/js/ubumaths/tests/database/triggers/profile-triggers.test.ts`

---

### updated-at-triggers.test.ts

**Tests**: 18
**Triggers Tested**: 42 (via parameterization)
**Migrations**: Multiple (all tables with `updated_at` column)

**Pattern**: `BEFORE UPDATE → SET NEW.updated_at = NOW()`

**Tables Covered** (5 representative tables tested, pattern applies to 42 total):

- `profiles`
- `classes`
- `exercises`
- `private_messages`
- `assessments`
- ... and 37 more tables

**Key Test Cases**:

- `updated_at` changes on UPDATE
- `updated_at` is recent (within 2 seconds)
- `updated_at` is NULL on INSERT (trigger only fires on UPDATE)
- Rapid successive updates (timestamps increase)
- NULL field updates still update timestamp
- Bulk update performance (10 records < 1 second)

**Location**: `/Users/david/Coding/js/ubumaths/tests/database/triggers/updated-at-triggers.test.ts`

---

### game-triggers.test.ts

**Tests**: 15
**Triggers Tested**: 4
**Migrations**: `002_create_game_tables.sql`, `009_navadra_game_enhancements.sql`

**Triggers**:

1. **trigger_create_game_profile_on_user_creation** (AFTER INSERT on `profiles`)
   - Creates `game_players` row for students only
   - Does NOT create for teachers or admins
   - WHEN clause: `NEW.role = 'student'`

2. **trigger_award_gidouilles_on_combat_victory** (AFTER UPDATE on `game_combats`)
   - Awards gidouilles (currency) on victory
   - Formula: `XP / 10 + 5 bonus`
   - Awards to organizer + all ready participants
   - Only fires when status changes to 'completed' AND outcome = 'victory'

3. **trigger_update_player_combat_stats** (AFTER UPDATE on `game_combats`)
   - Increments `total_combats`, `wins`, or `losses`
   - Updates `game_players` table
   - Only fires when status changes to 'completed'

4. **trigger_ensure_single_active_deck** (BEFORE INSERT OR UPDATE on `game_spell_decks`)
   - Deactivates other decks when activating a deck
   - WHEN clause: `NEW.is_active = true AND OLD.is_active = false`

**Key Test Cases**:

- Game profile creation for students only
- Gidouille awards on victory (not defeat)
- Multiple participant rewards
- Combat stat tracking (wins/losses)
- Single active deck enforcement
- WHEN clause verification (trigger doesn't fire unnecessarily)

**Location**: `/Users/david/Coding/js/ubumaths/tests/database/triggers/game-triggers.test.ts`

---

### sync-triggers.test.ts

**Tests**: 10
**Triggers Tested**: 2
**Migration**: `003_sync_class_members.sql`

**Background**: `class_members` is source of truth, `profiles.class_ids` is denormalized for legacy code.

**Triggers**:

1. **sync_class_members_insert** (AFTER INSERT on `class_members`)
   - Adds `class_id` to `profiles.class_ids` array
   - Uses `array_append()` PostgreSQL function

2. **sync_class_members_delete** (AFTER DELETE on `class_members`)
   - Removes `class_id` from `profiles.class_ids` array
   - Uses `array_remove()` PostgreSQL function

**Key Test Cases**:

- Add class to empty array
- Add class to existing array (multiple classes)
- Remove class from array
- Remove last class (array becomes empty)
- Verify array operations (append/remove)

**Location**: `/Users/david/Coding/js/ubumaths/tests/database/triggers/sync-triggers.test.ts`

---

### chat-triggers.test.ts

**Tests**: 14
**Triggers Tested**: 4
**Migrations**: `007_chat_system.sql`, `012_chat_profanity_filter.sql`

**Triggers**:

1. **trigger_create_class_chat_room** (AFTER INSERT on `classes`)
   - Creates group conversation for class
   - Names it `{class_name} - Chat de classe`
   - Adds teacher as initial participant

2. **trigger_add_student_to_class_chat** (AFTER INSERT on `class_members`)
   - Adds student to class conversation
   - ON CONFLICT DO NOTHING (idempotent)

3. **trigger_process_message_content** (BEFORE INSERT OR UPDATE on `messages`)
   - Extracts plain text from TipTap JSON
   - Detects profanity (sets `is_flagged = true`)
   - Flag reason: "Profanité détectée automatiquement"

4. **trigger_update_conversation_last_message** (AFTER INSERT on `messages`)
   - Updates conversation metadata
   - Sets `last_message_id`, `last_message_preview`, `last_message_at`
   - Truncates preview at 100 characters with ellipsis

**Key Test Cases**:

- Class chat creation on class creation
- Teacher added as participant
- Student auto-added to chat on enrollment
- TipTap JSON plain text extraction
- Multi-paragraph text extraction
- Profanity detection (merde, putain, etc.)
- Clean messages not flagged
- Last message metadata update
- Preview truncation (100 chars + "...")

**Location**: `/Users/david/Coding/js/ubumaths/tests/database/triggers/chat-triggers.test.ts`

---

### messaging-triggers.test.ts

**Tests**: 20
**Triggers Tested**: 6
**Migrations**: `004_messaging_system.sql`, `013_message_profanity_filter.sql`

**Triggers**:

1. **trigger_extract_message_plain_text** (BEFORE INSERT on `private_messages`)
   - Extracts plain text from TipTap JSON
   - Sets `plain_text` column

2. **trigger_detect_message_profanity** (BEFORE INSERT on `private_messages`)
   - Detects profanity in plain text
   - Sets `is_flagged = true`, `flag_reason`

3. **trigger_update_message_plain_text** (BEFORE UPDATE OF content on `private_messages`)
   - Re-extracts plain text when content changes

4. **trigger_update_message_profanity** (BEFORE UPDATE OF plain_text on `private_messages`)
   - Re-checks profanity when plain text changes

5. **trigger_track_message_inbox** (AFTER INSERT on `private_messages`)
   - Creates `message_inbox` entries for recipients
   - Handles group messages (multiple recipients)

6. **trigger_cleanup_old_drafts** (BEFORE INSERT on `message_drafts`)
   - Deletes drafts older than 30 days for same user

**Key Test Cases**:

- Plain text extraction on INSERT
- Profanity detection on INSERT
- Plain text re-extraction on UPDATE
- Profanity re-check on UPDATE
- Inbox tracking (single recipient)
- Inbox tracking (group messages, multiple recipients)
- Old draft cleanup (30+ days)
- Recent drafts preserved

**Location**: `/Users/david/Coding/js/ubumaths/tests/database/triggers/messaging-triggers.test.ts`

---

### error-monitoring-triggers.test.ts

**Tests**: 13
**Triggers Tested**: 3
**Migration**: `020241027153426_add_error_logging.sql`

**Triggers**:

1. **trigger_increment_error_occurrence** (BEFORE INSERT on `error_logs`)
   - Checks for duplicate error (same message + file path + line number)
   - Increments `occurrence_count` if found
   - Sets `first_occurrence_id` to original error

2. **trigger_set_duplicate_flag** (BEFORE INSERT on `error_logs`)
   - Sets `is_duplicate = true` for duplicate errors

3. **trigger_update_error_frequency** (AFTER INSERT on `error_logs`)
   - Updates original error's `occurrence_count`

**Key Test Cases**:

- First error has `occurrence_count = 1`
- Duplicate error increments count
- Duplicate flag set correctly
- Original error count updated
- Different errors tracked separately

**Location**: `/Users/david/Coding/js/ubumaths/tests/database/triggers/error-monitoring-triggers.test.ts`

---

### template-triggers.test.ts

**Tests**: 13
**Triggers Tested**: 3
**Migration**: `020241027221412_exercise_template_system.sql`

**Triggers**:

1. **trigger_sync_template_updates** (AFTER UPDATE on `exercises`)
   - Updates all cloned exercises when template changes
   - Only fires when `is_template = true`
   - Syncs: question, type, options, hints, etc.

2. **trigger_cascade_template_deletion** (AFTER UPDATE on `exercises`)
   - Soft-deletes cloned exercises when template is soft-deleted
   - Only fires when `is_template = true AND is_deleted = true`

3. **trigger_track_template_usage** (AFTER INSERT on `exercises`)
   - Increments `usage_count` on template when cloned
   - Only fires when `cloned_from_id IS NOT NULL`

**Key Test Cases**:

- Template updates sync to cloned exercises
- Template deletion cascades to clones
- Usage count increments on clone
- Non-template exercises unaffected

**Location**: `/Users/david/Coding/js/ubumaths/tests/database/triggers/template-triggers.test.ts`

---

### assignment-triggers.test.ts

**Tests**: 12
**Triggers Tested**: 1
**Migration**: `020241027005912_create_exercise_assignments.sql`

**Triggers**:

1. **trigger_update_completion_last_viewed** (BEFORE UPDATE on `exercise_completions`)
   - Updates `last_viewed_at = NOW()`
   - WHEN clause: `NEW.view_count > OLD.view_count`

**Key Test Cases**:

- `last_viewed_at` updates when view count increments
- Trigger doesn't fire when view count stays same
- Multiple view count increments tracked

**Location**: `/Users/david/Coding/js/ubumaths/tests/database/triggers/assignment-triggers.test.ts`

---

### cleanup-triggers.test.ts

**Tests**: 9
**Triggers Tested**: 2
**Migration**: `008_cleanup_triggers.sql`

**Triggers**:

1. **trigger_cleanup_orphaned_participants** (AFTER DELETE on `conversations`)
   - Deletes conversation participants when conversation deleted

2. **trigger_cleanup_completed_assessments** (AFTER UPDATE on `assessments`)
   - Archives old assessment data when assessment completed
   - Only fires when `status` changes to 'completed'

**Key Test Cases**:

- Orphaned participants cleaned up
- Assessment data archived on completion

**Location**: `/Users/david/Coding/js/ubumaths/tests/database/triggers/cleanup-triggers.test.ts`

---

## Troubleshooting

### Docker Issues

**Problem**: `Cannot connect to Docker daemon`

```
Error: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.
Is the docker daemon running?
```

**Solution**:

1. Open Docker Desktop
2. Wait for Docker to start (green icon in system tray)
3. Retry `npx supabase start`

---

**Problem**: Docker out of memory

```
Error: Docker daemon returned error: no space left on device
```

**Solution**:

```bash
# Clean up Docker
docker system prune -a --volumes

# Increase Docker memory limit (Docker Desktop > Settings > Resources)
# Recommended: 4GB+ memory
```

---

### Supabase Start Fails

**Problem**: Port already in use

```
Error: bind: address already in use
Port 54321 is already in use
```

**Solution**:

```bash
# Check if Supabase is already running
npx supabase status

# If running, stop it first
npx supabase stop

# Clean start
npx supabase start
```

---

**Problem**: Migration fails on start

```
Error: migration 20251027005912_create_exercise_assignments.sql failed
```

**Solution**:

```bash
# Reset database to clean state
npx supabase db reset

# This will:
# 1. Drop all tables
# 2. Re-run all migrations from scratch
# 3. Seed with initial data (if seed.sql exists)
```

---

### Test Failures

**Problem**: Timeout waiting for trigger

```
AssertionError: expected null to be defined
  at tests/database/triggers/profile-triggers.test.ts:62:23
```

**Root Cause**: Trigger didn't fire within 100ms timeout.

**Solutions**:

1. Increase wait time for slow CI environments:

   ```typescript
   await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms
   ```

2. Use `waitForCondition()` helper:
   ```typescript
   await waitForCondition(
   	async () => {
   		const { data } = await serviceClient
   			.from('profiles')
   			.select()
   			.eq('id', userId)
   			.maybeSingle();
   		return data !== null;
   	},
   	5000 // 5 second timeout
   );
   ```

---

**Problem**: Flaky test (passes sometimes, fails other times)

**Root Cause**: Race condition between trigger execution and assertion.

**Solution**: Always wait for async triggers before asserting:

```typescript
// BAD - No wait
await serviceClient.from('game_combats').update({ status: 'completed' });
const { data } = await serviceClient.from('profiles').select('gidouilles');
expect(data.gidouilles).toBe(115); // Might fail if trigger hasn't run yet

// GOOD - Wait for trigger
await serviceClient.from('game_combats').update({ status: 'completed' });
await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for trigger
const { data } = await serviceClient.from('profiles').select('gidouilles');
expect(data.gidouilles).toBe(115); // Reliable
```

---

**Problem**: Test pollution (test passes alone, fails in suite)

```
✓ test 1 passes
✗ test 2 fails (expected 1 to be 0)
```

**Root Cause**: Previous test didn't clean up data.

**Solution**: Use `beforeEach` cleanup:

```typescript
beforeEach(async () => {
	await cleanupAllTestData();
});

afterAll(async () => {
	await cleanupAllTestData();
});
```

---

### Cleanup Issues

**Problem**: Foreign key constraint errors during cleanup

```
Error: update or delete on table "profiles" violates foreign key constraint
```

**Root Cause**: Deleting parent before children.

**Solution**: Order matters in `cleanupAllTestData()`:

```typescript
// Delete children first, parents last
const tables = [
	'game_combats', // Child
	'game_players', // Child
	'profiles' // Parent (last)
];
```

---

**Problem**: Cannot delete test data (permission denied)

```
Error: permission denied for table profiles
```

**Root Cause**: Using anon client instead of service role client.

**Solution**: Always use service role client for cleanup:

```typescript
// BAD
const client = createTestSupabaseClient(); // Anon client
await client.from('profiles').delete(); // RLS blocks this

// GOOD
const serviceClient = createServiceRoleClient(); // Service role
await serviceClient.from('profiles').delete(); // Bypasses RLS
```

---

## Best Practices

### 1. Always Use Service Role Client

**Why**: Triggers often involve multiple tables, RLS policies, and auth schema operations.

```typescript
// REQUIRED for trigger tests
let serviceClient: SupabaseClient<Database>;

beforeAll(async () => {
	serviceClient = createServiceRoleClient(); // Service role, not anon
});
```

**Service role client enables**:

- Access to `auth.users` table
- Bypass RLS policies
- Multi-table cleanup
- Admin operations

---

### 2. Wait for Async Triggers

**Problem**: Triggers execute asynchronously. Asserting immediately after INSERT/UPDATE can fail.

**Solution**: Always wait 100-200ms after operations that fire triggers:

```typescript
// Insert/Update that fires trigger
await serviceClient.from('profiles').insert({ ... });

// WAIT for trigger to execute
await new Promise((resolve) => setTimeout(resolve, 100));

// NOW assert
const { data } = await serviceClient.from('game_players').select();
expect(data).toBeDefined();
```

**Rule of Thumb**:

- Simple triggers: 100ms
- Triggers with multiple operations: 200ms
- Complex triggers with joins: Use `waitForCondition()`

---

### 3. Test WHEN Clauses Explicitly

**Problem**: Triggers with WHEN clauses only fire under specific conditions.

**Best Practice**: Test both positive and negative cases:

```typescript
describe('trigger with WHEN clause', () => {
	it('should fire when WHEN clause is true', async () => {
		// ... test trigger fires
	});

	it('should NOT fire when WHEN clause is false', async () => {
		// ... test trigger doesn't fire
	});
});
```

**Example**:

```sql
-- Trigger definition
CREATE TRIGGER trigger_award_gidouilles
  AFTER UPDATE ON game_combats
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND NEW.outcome = 'victory')
  EXECUTE FUNCTION award_gidouilles();
```

```typescript
// Positive case: WHEN clause true
it('should award gidouilles on victory', async () => {
	await serviceClient.from('game_combats').update({ status: 'completed', outcome: 'victory' }); // WHEN is true

	// Assert: trigger fired
});

// Negative case: WHEN clause false
it('should NOT award gidouilles on defeat', async () => {
	await serviceClient.from('game_combats').update({ status: 'completed', outcome: 'defeat' }); // WHEN is false

	// Assert: trigger didn't fire
});
```

---

### 4. Use Factories for Test Data

**Problem**: Repetitive test setup code, hard-coded UUIDs, fragile tests.

**Solution**: Use `TestData` factories:

```typescript
// BAD - Manual setup, hard to read
const teacherId = '123e4567-e89b-12d3-a456-426614174000';
const { data: teacher } = await serviceClient
	.from('profiles')
	.insert({
		id: teacherId,
		email: 'teacher@test.com',
		role: 'teacher',
		full_name: 'Test Teacher',
		created_at: new Date().toISOString()
	})
	.select()
	.single();

const { data: classRoom } = await serviceClient
	.from('classes')
	.insert({
		id: '223e4567-e89b-12d3-a456-426614174000',
		teacher_id: teacherId,
		name: 'Math 101',
		archived: false,
		created_at: new Date().toISOString()
	})
	.select()
	.single();

// GOOD - Factory pattern, fluent API
const teacher = await TestData.profile().withRole('teacher').create();
const classRoom = await TestData.class(teacher.id).withName('Math 101').create();
```

**Benefits**:

- Less boilerplate (5 lines vs 20 lines)
- Sensible defaults (auto-generated IDs, emails, timestamps)
- Readable (fluent API)
- Type-safe (TypeScript catches errors)

---

### 5. Clean Up Properly

**Problem**: Test pollution causes unpredictable failures.

**Solution**: Clean up before AND after tests:

```typescript
beforeEach(async () => {
	await cleanupAllTestData(); // Clean before (prevents pollution from previous run)
});

afterAll(async () => {
	await cleanupAllTestData(); // Clean after (leave database clean)
});
```

**Why both?**

- `beforeEach`: Ensures clean slate even if previous test failed
- `afterAll`: Good citizenship, leaves database clean for next test file

---

### 6. Test Edge Cases

**Don't just test happy path**. Test:

- NULL values
- Empty arrays
- Duplicate operations (ON CONFLICT)
- Constraint violations
- Race conditions
- Boundary values (min/max)

**Example**:

```typescript
describe('profile creation trigger', () => {
  // Happy path
  it('should create profile with full metadata', async () => { ... });

  // Edge cases
  it('should handle missing full_name gracefully', async () => { ... });
  it('should handle duplicate profile attempt (ON CONFLICT)', async () => { ... });
  it('should not fail user creation if profile creation fails', async () => { ... });
});
```

---

### 7. Document Trigger Behavior

**Add comments explaining trigger behavior**:

```typescript
/**
 * trigger_award_gidouilles_on_combat_victory
 *
 * Trigger: AFTER UPDATE ON game_combats
 * WHEN: NEW.status = 'completed' AND NEW.outcome = 'victory'
 *
 * Business Logic:
 * - Awards gidouilles (currency) to organizer + ready participants
 * - Formula: XP / 10 + 5 bonus
 * - Example: 100 XP = 10 + 5 = 15 gidouilles
 */
describe('trigger_award_gidouilles_on_combat_victory', () => {
	it('should award gidouilles to organizer on combat victory', async () => {
		// ... test
	});
});
```

**Why**: Helps future maintainers understand trigger logic without reading SQL.

---

### 8. Use Type-Safe Database Access

**Problem**: Dynamic table names break type safety.

**Solution**: Cast to `never` when necessary, document why:

```typescript
// Required for auth schema access (not in Database type)
await serviceClient.from('users' as never).insert({
	id: userId,
	email: userEmail
} as never);

// Required for dynamic table names (parameterized tests)
const { data } = await serviceClient
	.from(tableName as never)
	.update({ [fieldName]: value } as never)
	.eq('id', id)
	.select()
	.single();
```

**For static tables, use full types**:

```typescript
// GOOD - Full type safety
const { data: profile } = await serviceClient.from('profiles').select().eq('id', userId).single();

expect(profile?.email).toBe(expectedEmail); // TypeScript knows email exists
```

---

## Maintenance

### Adding New Trigger Tests

**When to add**:

- Creating new migration with triggers
- Modifying existing trigger behavior
- Discovering untested trigger

**Steps**:

1. **Create test file** in `tests/database/triggers/`

   ```typescript
   // tests/database/triggers/my-new-triggers.test.ts
   import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
   import { createServiceRoleClient, cleanupAllTestData } from '../helpers/trigger-test-helpers';
   import { TestData } from '../helpers/test-data-factory';
   import type { SupabaseClient } from '@supabase/supabase-js';
   import type { Database } from '$lib/types/database';

   describe('My New Triggers', () => {
     let serviceClient: SupabaseClient<Database>;

     beforeAll(async () => {
       serviceClient = createServiceRoleClient();
     });

     afterAll(async () => {
       await cleanupAllTestData();
     });

     beforeEach(async () => {
       await cleanupAllTestData();
     });

     describe('trigger_my_trigger_name', () => {
       it('should do something when event occurs', async () => {
         // Arrange: Create test data
         const data = await TestData.profile().create();

         // Act: Perform operation that fires trigger
         await serviceClient.from('profiles').update({ ... }).eq('id', data.id);
         await new Promise((resolve) => setTimeout(resolve, 100));

         // Assert: Verify trigger behavior
         const { data: result } = await serviceClient.from('other_table').select();
         expect(result).toBeDefined();
       });
     });
   });
   ```

2. **Add test data factory** (if needed) in `tests/database/helpers/test-data-factory.ts`

   ```typescript
   export class MyNewTableBuilder {
   	private data: Partial<Tables['my_table']['Insert']> = {};

   	constructor() {
   		this.data = {
   			id: generateTestId('prefix')
   			// ... defaults
   		};
   	}

   	withField(value: string): this {
   		this.data.field = value;
   		return this;
   	}

   	async create(): Promise<Tables['my_table']['Row']> {
   		const client = createServiceRoleClient();
   		const { data, error } = await client.from('my_table').insert(this.data).select().single();

   		if (error) throw error;
   		return data;
   	}
   }

   // Add to TestData export
   export const TestData = {
   	// ... existing
   	myTable: () => new MyNewTableBuilder()
   };
   ```

3. **Run tests** locally

   ```bash
   # Start Supabase
   npx supabase start

   # Run your test file
   pnpm vitest tests/database/triggers/my-new-triggers.test.ts

   # Run all trigger tests
   pnpm test:triggers
   ```

4. **Update documentation**
   - Add test file to [Test Coverage Summary](#test-coverage-summary)
   - Add entry to [Test File Reference](#test-file-reference)
   - Update total test count

---

### Updating Existing Tests When Migrations Change

**Scenario**: Migration changes trigger behavior.

**Steps**:

1. **Update migration file**

   ```sql
   -- supabase/migrations/20251027005912_update_trigger.sql
   DROP TRIGGER IF EXISTS trigger_old_name ON my_table;

   CREATE OR REPLACE FUNCTION my_new_function()
   RETURNS TRIGGER AS $$
   BEGIN
     -- New behavior
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trigger_new_name
     AFTER UPDATE ON my_table
     FOR EACH ROW
     EXECUTE FUNCTION my_new_function();
   ```

2. **Reset local database** to apply migration

   ```bash
   npx supabase db reset
   ```

3. **Update test file** to match new behavior

   ```typescript
   // Update trigger name in comments
   /**
    * trigger_new_name (was: trigger_old_name)
    *
    * Migration: 20251027005912_update_trigger.sql
    */
   describe('trigger_new_name', () => {
   	it('should have new behavior', async () => {
   		// Update assertions to match new behavior
   	});
   });
   ```

4. **Run tests** to verify

   ```bash
   pnpm test:triggers
   ```

5. **Update documentation** if trigger count or behavior changed significantly

---

### Running Tests in CI

**GitHub Actions**: Tests run automatically on push to `main` or release branches.

**Manual Trigger**:

1. Go to [Actions tab](https://github.com/yourusername/ubumaths/actions)
2. Select "Database Trigger Tests" workflow
3. Click "Run workflow" button
4. Select branch
5. Click "Run workflow"

**View Results**:

- Green checkmark: All tests passed
- Red X: Tests failed, click to view logs
- Logs include test output + Supabase logs

**Download Logs** (on failure):

1. Click failed workflow run
2. Scroll to "Artifacts" section
3. Download `trigger-test-results` zip
4. Extract and view `test-results/` and `.supabase/logs/`

---

### Performance Optimization

**Problem**: Tests run slow (> 2 minutes for 139 tests).

**Solutions**:

1. **Reduce cleanup scope** - Only clean tables used by test file

   ```typescript
   // Instead of cleanupAllTestData()
   async function cleanupTestTriggerTables() {
   	const serviceClient = createServiceRoleClient();
   	await serviceClient.from('game_combats').delete().like('email', '%@test.com%');
   	await serviceClient.from('game_players').delete().like('email', '%@test.com%');
   	await serviceClient.from('profiles').delete().like('email', '%@test.com%');
   }
   ```

2. **Reduce wait times** - Use shorter waits or `waitForCondition()`

   ```typescript
   // Fast triggers
   await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms instead of 100ms

   // Or use polling
   await waitForCondition(
   	async () => (await serviceClient.from('table').select()).data?.length > 0,
   	1000 // 1 second timeout
   );
   ```

3. **Run tests in parallel** - Vitest runs test files in parallel by default

   ```bash
   # Runs files in parallel (default)
   pnpm test:triggers

   # Run sequentially (slower, but easier to debug)
   pnpm vitest tests/database/triggers --sequence.concurrent=false
   ```

---

## References

### Test Files

All test files located in: `/Users/david/Coding/js/ubumaths/tests/database/triggers/`

- [profile-triggers.test.ts](../../tests/database/triggers/profile-triggers.test.ts)
- [updated-at-triggers.test.ts](../../tests/database/triggers/updated-at-triggers.test.ts)
- [game-triggers.test.ts](../../tests/database/triggers/game-triggers.test.ts)
- [sync-triggers.test.ts](../../tests/database/triggers/sync-triggers.test.ts)
- [chat-triggers.test.ts](../../tests/database/triggers/chat-triggers.test.ts)
- [messaging-triggers.test.ts](../../tests/database/triggers/messaging-triggers.test.ts)
- [error-monitoring-triggers.test.ts](../../tests/database/triggers/error-monitoring-triggers.test.ts)
- [template-triggers.test.ts](../../tests/database/triggers/template-triggers.test.ts)
- [assignment-triggers.test.ts](../../tests/database/triggers/assignment-triggers.test.ts)
- [cleanup-triggers.test.ts](../../tests/database/triggers/cleanup-triggers.test.ts)

### Test Infrastructure

- [Test Helpers](../../tests/database/helpers/trigger-test-helpers.ts)
- [Test Data Factory](../../tests/database/helpers/test-data-factory.ts)

### Migration Files

All migrations located in: `/Users/david/Coding/js/ubumaths/supabase/migrations/`

Key migrations with triggers:

- `001_initial_schema.sql` - Profile triggers
- `002_create_game_tables.sql` - Game system triggers
- `003_sync_class_members.sql` - Class sync triggers
- `004_messaging_system.sql` - Messaging triggers
- `007_chat_system.sql` - Chat triggers
- `008_cleanup_triggers.sql` - Cleanup triggers
- `009_navadra_game_enhancements.sql` - Enhanced game triggers
- `012_chat_profanity_filter.sql` - Chat profanity detection
- `013_message_profanity_filter.sql` - Message profanity detection
- `020241027005912_create_exercise_assignments.sql` - Assignment tracking
- `020241027153426_add_error_logging.sql` - Error monitoring
- `020241027221412_exercise_template_system.sql` - Template system

### CI/CD

- [GitHub Actions Workflow](../../.github/workflows/trigger-tests.yml)

### Project Documentation

- [Main README](../../README.md)
- [Documentation Index](../README.md)
- [Database Schema](../architecture/database-schema.md)
- [Development Workflow](../development/git-workflow.md)

### External Resources

- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [Vitest Documentation](https://vitest.dev/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

---

## Summary

**Database trigger tests provide confidence that critical business logic in triggers works correctly**:

- 131 tests covering 69 triggers across 26+ migrations
- Integration tests against real PostgreSQL database (Supabase local)
- Builder pattern for clean, maintainable test data creation
- Comprehensive coverage of profile, game, chat, messaging, and error monitoring triggers
- CI/CD integration via GitHub Actions
- Well-documented patterns and best practices

**Next Steps**:

- Add trigger tests for new migrations
- Maintain test suite as triggers evolve
- Monitor CI for regressions
- Update documentation when adding new tests

---

**Questions or issues?** See [Troubleshooting](#troubleshooting) or open an issue on GitHub.
