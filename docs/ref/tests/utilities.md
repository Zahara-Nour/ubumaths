# Test Utilities Reference

Complete reference for test helper functions and utilities.

## Directory Overview

```
tests/helpers/                     # Main helpers (import via $tests/helpers)
├── index.ts                       # Barrel export
├── supabase/
│   ├── mock-client.ts             # createMockSupabase
│   ├── mock-locals.ts             # createMockLocals
│   ├── mock-request.ts            # createMockRequest
│   └── mock-helpers.ts            # mockSuccess, mockError, mockSequence
└── fixtures/
    └── profiles.ts                # mockIds, mockProfiles, factories

tests/database/helpers/            # Database-specific helpers
├── postgres-client.ts             # Direct PostgreSQL access
├── test-data-factory.ts           # Builder pattern for test data
└── trigger-test-helpers.ts        # Core DB utilities

e2e/helpers/                       # E2E test helpers
├── auth-helpers.ts                # E2E authentication
└── image-helpers.ts               # Image testing
```

## Quick Start

```typescript
// Import all helpers from unified barrel export
import {
	createMockSupabase,
	createMockLocals,
	mockSuccess,
	mockError,
	mockIds,
	createMockProfile
} from '$tests/helpers';
```

## Supabase Helpers

**Location**: `$tests/helpers` (barrel export from `tests/helpers/supabase/`)

### createMockSupabase()

Creates a chainable mock Supabase client.

```typescript
import { createMockSupabase } from '$tests/helpers';

const supabase = createMockSupabase();

// Returns mock with chainable query builder
supabase.from('table').select('*').eq('id', '123').single();
```

**Returns**: `SupabaseClient<Database> & { _mockChain: MockChain }`

### mockSuccess(supabase, data, method?)

Configure mock to return successful response.

```typescript
import { createMockSupabase, mockSuccess } from '$tests/helpers';

const supabase = createMockSupabase();

// For .single() calls
mockSuccess(supabase, { id: '123', name: 'Test' });

// For .maybeSingle() calls
mockSuccess(supabase, { id: '123' }, 'maybeSingle');

// For implicit awaits (thenable)
mockSuccess(supabase, { id: '123' }, 'then');
```

**Parameters**:

- `supabase`: Mock Supabase client
- `data`: Data to return
- `method`: `'single'` | `'maybeSingle'` | `'then'` (default: `'single'`)

### mockError(supabase, errorMessage, method?)

Configure mock to return error response.

```typescript
import { createMockSupabase, mockError } from '$tests/helpers';

const supabase = createMockSupabase();

mockError(supabase, 'Not found');
mockError(supabase, 'Database error', 'then');
```

**Parameters**:

- `supabase`: Mock Supabase client
- `errorMessage`: Error message string
- `method`: `'single'` | `'maybeSingle'` | `'then'` (default: `'single'`)

### mockSequence(supabase, responses, method?)

Configure mock for multiple sequential calls.

```typescript
import { createMockSupabase, mockSequence } from '$tests/helpers';

const supabase = createMockSupabase();

mockSequence(supabase, [
	{ data: { role: 'teacher' }, error: null },
	{ data: { id: 'class-123' }, error: null },
	{ data: null, error: { message: 'Not found' } }
]);
```

### createMockRequest(data?, method?)

Create mock Request object for API tests.

```typescript
import { createMockRequest } from '$tests/helpers';

const request = createMockRequest({ name: 'Test' }, 'POST');

// Has mocked json() method
const body = await request.json();
```

**Parameters**:

- `data`: Request body (optional)
- `method`: HTTP method (default: `'POST'`)

### createMockLocals(userId?, supabase?)

Create mock SvelteKit locals object.

```typescript
import { createMockLocals, createMockSupabase } from '$tests/helpers';

// Unauthenticated user
const locals = createMockLocals();

// Authenticated user
const supabase = createMockSupabase();
const authLocals = createMockLocals('user-123', supabase);
```

**Parameters**:

- `userId`: User ID for authenticated user (optional)
- `supabase`: Mock Supabase client (optional, creates new if not provided)

### createMockURL(searchParams?)

Create mock URL with search parameters.

```typescript
import { createMockURL } from '$tests/helpers';

const url = createMockURL({ classId: 'class-123', page: '2' });
// url.searchParams.get('classId') === 'class-123'
```

### Assertion Helpers

```typescript
import { expectTableQuery, expectErrorResponse, expectSuccessResponse } from '$tests/helpers';

// Verify table was queried
expectTableQuery(supabase, 'profiles');

// Verify error response
await expectErrorResponse(response, 400, 'Validation failed');

// Verify success response
const data = await expectSuccessResponse(response, 201);
```

### Mock Data Constants

```typescript
import { mockIds, mockProfiles } from '$tests/helpers';

mockIds.teacher; // 'teacher-123'
mockIds.student; // 'student-456'
mockIds.class; // 'class-abc'

mockProfiles.teacher.email; // 'teacher@voltairedoha.com'
mockProfiles.student.role; // 'student'
```

## Database Test Helpers

**Location**: `tests/database/helpers/trigger-test-helpers.ts`

### createTestSupabaseClient()

Create Supabase client for tests (respects RLS).

```typescript
import { createTestSupabaseClient } from 'tests/database/helpers/trigger-test-helpers';

const client = createTestSupabaseClient();
```

### createServiceRoleClient()

Create service role client (bypasses RLS).

```typescript
import { createServiceRoleClient } from 'tests/database/helpers/trigger-test-helpers';

const client = createServiceRoleClient();
// Can access all data regardless of RLS policies
```

### generateTestId(prefix)

Generate valid UUID for PostgreSQL.

```typescript
import { generateTestId } from 'tests/database/helpers/trigger-test-helpers';

const userId = generateTestId('user');
// Returns: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
```

### generateTestEmail(prefix?)

Generate unique test email.

```typescript
import { generateTestEmail } from 'tests/database/helpers/trigger-test-helpers';

const email = generateTestEmail('student');
// Returns: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx@test.com'
```

### cleanupAllTestData()

Remove all test data from database.

```typescript
import { cleanupAllTestData } from 'tests/database/helpers/trigger-test-helpers';

afterEach(async () => {
	await cleanupAllTestData();
});
```

### waitForCondition(condition, timeout?, interval?)

Wait for async condition to be true.

```typescript
import { waitForCondition } from 'tests/database/helpers/trigger-test-helpers';

await waitForCondition(
	async () => {
		const { data } = await supabase.from('profiles').select().eq('id', userId);
		return data !== null && data.length > 0;
	},
	5000, // timeout ms (default)
	100 // polling interval ms (default)
);
```

### closeConnections()

Close all database connections.

```typescript
import { closeConnections } from 'tests/database/helpers/trigger-test-helpers';

afterAll(async () => {
	await closeConnections();
});
```

## Test Data Factory

**Location**: `tests/database/helpers/test-data-factory.ts`

### TestData Factory

```typescript
import { TestData } from 'tests/database/helpers/test-data-factory';

// Create profile
const profile = await TestData.profile()
	.withRole('teacher')
	.withFullName('John Doe')
	.withGidouilles(100)
	.create();

// Create class
const testClass = await TestData.class(teacherId).withName('Math 101').archived().create();

// Create exercise
const exercise = await TestData.exercise(teacherId)
	.withDifficulty(3)
	.withStatement('What is 2+2?')
	.withSolution('4')
	.create();

// Create game combat
const combat = await TestData.gameCombat(organizerId, monsterId)
	.withStatus('active')
	.withXp(500)
	.create();

// Create private message
const message = await TestData.privateMessage(senderId)
	.withSubject('Test')
	.withPlainText('Hello')
	.isGroupMessage()
	.create();

// Create error log
const error = await TestData.errorLog()
	.withType('client_js')
	.withMessage('Test error')
	.withSeverity('error')
	.create();
```

### Builder Classes

Each builder has fluent API:

```typescript
// ProfileBuilder
new ProfileBuilder()
  .withId(id)
  .withEmail(email)
  .withRole('student' | 'teacher' | 'admin')
  .withFullName(name)
  .withGidouilles(amount)
  .create()

// ClassBuilder
new ClassBuilder(teacherId)
  .withName(name)
  .archived()
  .create()

// ExerciseBuilder
new ExerciseBuilder(createdBy)
  .withDifficulty(level)
  .withStatement(text)
  .withSolution(text)
  .create()

// GameCombatBuilder
new GameCombatBuilder(organizerId, monsterId?)
  .withStatus('active' | 'completed' | 'cancelled')
  .withOutcome('victory' | 'defeat')
  .withXp(amount)
  .withReadyPlayers(playerIds)
  .create()

// PrivateMessageBuilder
new PrivateMessageBuilder(senderId)
  .withSubject(subject)
  .withPlainText(text)
  .isGroupMessage()
  .withRecipientCount(count)
  .create()

// ErrorLogBuilder
new ErrorLogBuilder()
  .withType(errorType)
  .withMessage(message)
  .withUrl(url)
  .withFile(path, lineNumber?)
  .withUserId(userId)
  .withSeverity(severity)
  .create()
```

## Game Fixtures

**Location**: `tests/fixtures/game-fixtures.ts`

### Factory Functions

```typescript
import {
	createTestPlayer,
	createTestMonster,
	createTestSpell,
	createTestCombat,
	createTestChallenge
} from 'tests/fixtures/game-fixtures';

// Create player with overrides
const player = createTestPlayer({
	level: 10,
	xp: 5000,
	pyrs_fire: 200
});

// Create monster by category
const monster = createTestMonster('legendary', {
	element: 'fire',
	level: 20
});

// Create spell
const spell = createTestSpell({
	element: 'water',
	power: 50
});

// Create combat
const combat = createTestCombat({
	playerIds: ['player-1', 'player-2'],
	monsterId: 'monster-1'
});

// Create challenge by type and difficulty
const challenge = createTestChallenge('addition', 3);
```

### Seed Data Collections

```typescript
import { TEST_MONSTERS, TEST_CHALLENGES, TEST_SPELLS } from 'tests/fixtures/game-fixtures';

// Pre-defined monsters
TEST_MONSTERS.fire; // Fire elemental monster
TEST_MONSTERS.legendary; // Legendary dragon

// Pre-defined challenges
TEST_CHALLENGES.addition_easy;
TEST_CHALLENGES.multiplication_hard;

// Pre-defined spells
TEST_SPELLS.fireball;
TEST_SPELLS.heal;
```

### Seeded Random

```typescript
import { seedRandom, resetRandom } from 'tests/fixtures/game-fixtures';

describe('Random tests', () => {
	beforeEach(() => {
		seedRandom(12345); // Deterministic seed
	});

	afterEach(() => {
		resetRandom(); // Restore Math.random
	});

	it('generates consistent results', () => {
		// Same seed = same random sequence
		expect(Math.random()).toBe(0.5);
	});
});
```

## E2E Auth Helpers

**Location**: `e2e/helpers/auth-helpers.ts`

### Login Functions

```typescript
import { login, loginAsTeacher, loginAsStudent, loginAsAdmin } from 'e2e/helpers/auth-helpers';

// Generic login
await login(page, 'email@example.com', 'password', /\/dashboard/);

// Role-specific login
await loginAsTeacher(page);
await loginAsStudent(page);
await loginAsAdmin(page);

// Custom credentials
await loginAsTeacher(page, 'custom@email.com', 'custompass');
```

### Session Management

```typescript
import { logout, clearSession, getAuthCookie } from 'e2e/helpers/auth-helpers';

// Logout
await logout(page);

// Clear all session data
await clearSession(page);

// Get auth cookie
const cookie = await getAuthCookie(page);
```

### Assertions

```typescript
import {
	expectAuthenticated,
	expectNotAuthenticated,
	expectProtectedRouteRedirects,
	expectRoleAccess,
	expectRoleForbidden,
	expectAuthCookieExists,
	expectAuthCookieNotExists
} from 'e2e/helpers/auth-helpers';

// Authentication state
await expectAuthenticated(page);
await expectNotAuthenticated(page);

// Protected routes
await expectProtectedRouteRedirects(page, '/dashboard/teacher');

// Role access
await expectRoleAccess(page, 'teacher');
await expectRoleForbidden(page, 'admin');

// Auth cookies
await expectAuthCookieExists(page);
await expectAuthCookieNotExists(page);
```

### Test User Credentials

```typescript
import { getTestUsers, type UserRole, type TestUser } from 'e2e/helpers/auth-helpers';

const users = getTestUsers();

users.teacher.email; // 'teacher@voltairedoha.com'
users.teacher.password; // 'test-password-secure-123'
users.teacher.role; // 'teacher'

users.student.email;
users.admin.email;
```

## PostgreSQL Client

**Location**: `tests/database/helpers/postgres-client.ts`

### Direct PostgreSQL Access

```typescript
import {
	insertAuthUser,
	deleteTestAuthUsers,
	closePostgresClient
} from 'tests/database/helpers/postgres-client';

// Insert auth.users entry (triggers profile creation)
await insertAuthUser({
	id: 'user-123',
	email: 'test@test.com',
	fullName: 'Test User'
});

// Delete all test users from auth.users
await deleteTestAuthUsers();

// Close connection pool
await closePostgresClient();
```

## Common Patterns

### API Route Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './+server';
import {
	createMockSupabase,
	createMockRequest,
	createMockLocals,
	mockSuccess,
	mockError
} from '$tests/helpers';

describe('POST /api/endpoint', () => {
	let supabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('returns 401 for unauthenticated user', async () => {
		const request = createMockRequest({ data: 'test' });
		const locals = createMockLocals();

		const response = await POST({ request, locals });

		expect(response.status).toBe(401);
	});

	it('returns 400 for invalid input', async () => {
		const request = createMockRequest({ invalid: true });
		const locals = createMockLocals('user-123', supabase);

		const response = await POST({ request, locals });

		expect(response.status).toBe(400);
	});

	it('creates resource successfully', async () => {
		mockSuccess(supabase, { id: 'new-123' });

		const request = createMockRequest({ name: 'Test' });
		const locals = createMockLocals('user-123', supabase);

		const response = await POST({ request, locals });

		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body.id).toBe('new-123');
	});

	it('handles database error', async () => {
		mockError(supabase, 'Database error');

		const request = createMockRequest({ name: 'Test' });
		const locals = createMockLocals('user-123', supabase);

		const response = await POST({ request, locals });

		expect(response.status).toBe(500);
	});
});
```

### Database Trigger Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData,
	closeConnections
} from '../helpers/trigger-test-helpers';
import { TestData } from '../helpers/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('MyTrigger', () => {
	let client: SupabaseClient<Database>;

	beforeAll(async () => {
		client = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	it('should trigger on insert', async () => {
		const profile = await TestData.profile().withRole('student').create();

		// Wait for trigger
		await new Promise((r) => setTimeout(r, 200));

		// Verify trigger effect
		const { data } = await client.from('target_table').select().eq('user_id', profile.id);

		expect(data).toHaveLength(1);
	});
});
```

### Store Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { myStore } from './myStore.svelte';

vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: true,
	version: '1.0.0'
}));

describe('myStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should initialize with defaults', () => {
		expect(myStore.items).toEqual([]);
		expect(myStore.loading).toBe(false);
	});

	it('should add item', () => {
		myStore.addItem({ id: '1', name: 'Test' });

		expect(myStore.items).toHaveLength(1);
		expect(myStore.items[0].name).toBe('Test');
	});

	it('should compute derived state', () => {
		myStore.addItem({ id: '1', price: 10 });
		myStore.addItem({ id: '2', price: 20 });

		expect(myStore.total).toBe(30);
	});
});
```
