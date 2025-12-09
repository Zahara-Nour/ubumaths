# Database Testing

Testing PostgreSQL triggers, RLS policies, and database integrations.

## Overview

Database tests require a **local Supabase instance** running in Docker:

```bash
# Start local Supabase
pnpm db:start

# Run trigger tests
pnpm test:triggers

# Run integration tests
pnpm test:integration
```

## Local Supabase Setup

### Prerequisites

- Docker installed and running
- Supabase CLI (`pnpm add -g supabase`)

### Start Local Instance

```bash
# Start all services
pnpm db:start

# Check status
npx supabase status

# Access Studio dashboard
open http://localhost:54323

# Stop services
pnpm db:stop

# Reset database (wipe all data)
npx supabase db reset
```

### Services & Ports

| Service    | Port       | Purpose         |
| ---------- | ---------- | --------------- |
| PostgreSQL | 54322      | Database        |
| PostgREST  | 54321      | REST API        |
| GoTrue     | (internal) | Authentication  |
| Studio     | 54323      | Admin dashboard |

## Test Configuration

### Trigger Tests (`vitest.triggers.config.ts`)

```typescript
export default defineConfig({
	plugins: [sveltekit()],
	test: {
		name: 'triggers',
		environment: 'node',
		include: ['tests/database/triggers/**/*.{test,spec}.{js,ts}'],
		testTimeout: 30000,
		hookTimeout: 30000,
		pool: 'forks',
		poolOptions: {
			forks: { singleFork: true }
		}
	}
});
```

**Key Settings**:

- `testTimeout: 30000` - 30s for slow DB operations
- `pool: 'forks'` - Process isolation
- `singleFork: true` - Sequential execution (shared DB state)

## Database Test Helpers

### Location: `tests/database/helpers/`

```
tests/database/helpers/
├── postgres-client.ts       # Direct PostgreSQL connection
├── supabase-client.ts       # Supabase client factory
├── test-data-factory.ts     # Builder pattern for test data
└── trigger-test-helpers.ts  # Core utilities
```

### Supabase Client Creation

```typescript
// tests/database/helpers/trigger-test-helpers.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// Anon client (respects RLS)
export function createTestSupabaseClient(): SupabaseClient<Database> {
	const url = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
	const anonKey = process.env.SUPABASE_TEST_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

	return createClient<Database>(url, anonKey, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

// Service role client (bypasses RLS)
export function createServiceRoleClient(): SupabaseClient<Database> {
	const url = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
	const serviceRoleKey =
		process.env.SUPABASE_TEST_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

	return createClient<Database>(url, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}
```

### ID and Email Generation

```typescript
// Generate valid UUID for PostgreSQL
export function generateTestId(prefix: string): string {
	return crypto.randomUUID();
}

// Generate unique test email
export function generateTestEmail(prefix = 'test'): string {
	return `${generateTestId(prefix)}@test.com`;
}
```

### Wait for Async Operations

```typescript
export async function waitForCondition(
	condition: () => Promise<boolean>,
	timeout = 5000,
	interval = 100
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	throw new Error(`Condition not met within ${timeout}ms`);
}
```

## Test Data Factory

### Builder Pattern

```typescript
// tests/database/helpers/test-data-factory.ts
import type { Database } from '$lib/types/database';

type Tables = Database['public']['Tables'];

export class ProfileBuilder {
	private data: Partial<Tables['profiles']['Insert']> = {};

	constructor() {
		this.data = {
			id: generateTestId('user'),
			email: generateTestEmail('user'),
			role: 'student',
			full_name: 'Test User',
			created_at: new Date().toISOString()
		};
	}

	withId(id: string): this {
		this.data.id = id;
		return this;
	}

	withRole(role: 'student' | 'teacher' | 'admin'): this {
		this.data.role = role;
		return this;
	}

	withFullName(name: string): this {
		this.data.full_name = name;
		return this;
	}

	async create(): Promise<Tables['profiles']['Row']> {
		const client = createServiceRoleClient();

		// Create auth.users entry (triggers profile creation)
		await insertAuthUser({
			id: this.data.id!,
			email: this.data.email!,
			fullName: this.data.full_name
		});

		// Wait for trigger to complete
		let profile = null;
		for (let i = 0; i < 10; i++) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			const { data } = await client.from('profiles').select().eq('id', this.data.id!);
			if (data?.length > 0) {
				profile = data[0];
				break;
			}
		}

		if (!profile) {
			throw new Error(`Profile not created by trigger for ID: ${this.data.id}`);
		}

		// Update with custom data
		const { data, error } = await client
			.from('profiles')
			.update(this.data as Tables['profiles']['Update'])
			.eq('id', this.data.id!)
			.select();

		if (error) throw error;
		return data[0];
	}
}
```

### Factory Functions

```typescript
// Convenience factory
export const TestData = {
	profile: () => new ProfileBuilder(),
	class: (teacherId: string) => new ClassBuilder(teacherId),
	exercise: (createdBy: string) => new ExerciseBuilder(createdBy),
	gameCombat: (organizerId: string) => new GameCombatBuilder(organizerId),
	privateMessage: (senderId: string) => new PrivateMessageBuilder(senderId),
	errorLog: () => new ErrorLogBuilder()
};
```

### Usage

```typescript
// Create test data with builder
const teacher = await TestData.profile().withRole('teacher').withFullName('John Doe').create();

const testClass = await TestData.class(teacher.id).withName('Math 101').create();

const student = await TestData.profile().withRole('student').create();
```

## Writing Trigger Tests

### Basic Structure

```typescript
// tests/database/triggers/profile-triggers.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData,
	closeConnections,
	generateTestId,
	generateTestEmail
} from '../helpers/trigger-test-helpers';
import { insertAuthUser, deleteTestAuthUsers } from '../helpers/postgres-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('Profile Triggers', () => {
	let serviceClient: SupabaseClient<Database>;

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	describe('handle_new_user trigger', () => {
		it('should create profile when user signs up', async () => {
			const userId = generateTestId('user');
			const email = generateTestEmail();

			// Insert auth user (trigger fires)
			await insertAuthUser({ id: userId, email, fullName: 'Test User' });

			// Wait for async trigger
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Verify profile created
			const { data: profile, error } = await serviceClient
				.from('profiles')
				.select()
				.eq('id', userId)
				.single();

			expect(error).toBeNull();
			expect(profile).toBeDefined();
			expect(profile.email).toBe(email);
			expect(profile.role).toBe('student'); // Default role
		});

		it('should set default gidouilles for new student', async () => {
			const userId = generateTestId('user');
			const email = generateTestEmail();

			await insertAuthUser({ id: userId, email });
			await new Promise((resolve) => setTimeout(resolve, 200));

			const { data: profile } = await serviceClient
				.from('profiles')
				.select()
				.eq('id', userId)
				.single();

			expect(profile.gidouilles).toBe(0);
		});
	});
});
```

### Testing updated_at Triggers

```typescript
describe('Timestamp Triggers', () => {
	const TABLE_CASES = [
		{ table: 'profiles', createData: async () => await TestData.profile().create() },
		{
			table: 'classes',
			createData: async (teacherId: string) => await TestData.class(teacherId).create()
		}
	];

	describe.each(TABLE_CASES)('$table table', ({ table, createData }) => {
		it('should update updated_at on modification', async () => {
			const teacherId = (await TestData.profile().withRole('teacher').create()).id;
			const record = await createData(teacherId);
			const originalUpdatedAt = record.updated_at;

			// Wait to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Update record
			const { data, error } = await serviceClient
				.from(table as never)
				.update({ name: 'Updated Name' })
				.eq('id', record.id)
				.select()
				.single();

			expect(error).toBeNull();
			expect(data.updated_at).not.toBe(originalUpdatedAt);
			expect(new Date(data.updated_at) > new Date(originalUpdatedAt)).toBe(true);
		});
	});
});
```

## Cleanup Strategies

### Per-Test Cleanup

```typescript
beforeEach(async () => {
	await cleanupAllTestData();
});
```

### Full Cleanup Function

```typescript
// tests/database/helpers/trigger-test-helpers.ts
export async function cleanupAllTestData(): Promise<void> {
	const serviceClient = createServiceRoleClient();

	// Order matters - delete children before parents
	const tables = [
		'game_challenge_attempts',
		'game_combats',
		'game_player_achievements',
		// ... more tables
		'class_members',
		'classes',
		'profiles'
	];

	for (const table of tables) {
		try {
			await serviceClient
				.from(table as never)
				.delete()
				.like('email', '%@test.com%');
		} catch (error) {
			// Some tables don't have email column
			console.debug(`Cleanup ${table}:`, error);
		}
	}

	// Clean auth.users using direct PostgreSQL
	await deleteTestAuthUsers();
}
```

### Test Data Markers

Use `@test.com` email suffix to identify test data:

```typescript
// All test emails use @test.com
generateTestEmail('user') // Returns: "{uuid}@test.com"
	// Cleanup targets this pattern
	.like('email', '%@test.com%');
```

## Direct PostgreSQL Access

For operations Supabase client can't do (like auth schema):

```typescript
// tests/database/helpers/postgres-client.ts
import pg from 'pg';

const pool = new pg.Pool({
	connectionString:
		process.env.SUPABASE_DB_URL || 'postgresql://postgres:postgres@localhost:54322/postgres'
});

export async function insertAuthUser(params: {
	id: string;
	email: string;
	fullName?: string;
}): Promise<void> {
	const client = await pool.connect();
	try {
		await client.query(
			`
      INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        raw_user_meta_data, created_at, updated_at
      ) VALUES (
        $1, $2, 'test-password', NOW(),
        $3, NOW(), NOW()
      )
    `,
			[params.id, params.email, JSON.stringify({ full_name: params.fullName })]
		);
	} finally {
		client.release();
	}
}

export async function deleteTestAuthUsers(): Promise<void> {
	const client = await pool.connect();
	try {
		await client.query(`
      DELETE FROM auth.users WHERE email LIKE '%@test.com'
    `);
	} finally {
		client.release();
	}
}

export async function closePostgresClient(): Promise<void> {
	await pool.end();
}
```

## RLS Policy Testing

### Test with Different Roles

```typescript
describe('RLS Policies', () => {
	let serviceClient: SupabaseClient<Database>;

	beforeAll(() => {
		serviceClient = createServiceRoleClient();
	});

	describe('profiles table', () => {
		it('should allow user to read own profile', async () => {
			const profile = await TestData.profile().create();

			// Create anon client and authenticate as user
			const userClient = createTestSupabaseClient();
			// Note: Full RLS testing requires authenticated session

			const { data, error } = await serviceClient.from('profiles').select().eq('id', profile.id);

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
		});

		it('should restrict access to other profiles', async () => {
			// Create two users
			const user1 = await TestData.profile().create();
			const user2 = await TestData.profile().create();

			// Test that user1 cannot access user2's sensitive data
			// (Implementation depends on your RLS policies)
		});
	});
});
```

## Integration Tests

### API + Database

```typescript
// tests/integration/api-classes.test.ts
describe('POST /api/classes', () => {
	let serviceClient: SupabaseClient<Database>;
	let teacherId: string;

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		teacherId = teacher.id;
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	it('should create class in database', async () => {
		// Make API request (simulated or real)
		const { data, error } = await serviceClient
			.from('classes')
			.insert({
				teacher_id: teacherId,
				name: 'Test Class',
				join_code: 'TEST123'
			})
			.select()
			.single();

		expect(error).toBeNull();
		expect(data.name).toBe('Test Class');

		// Verify in database
		const { data: verified } = await serviceClient
			.from('classes')
			.select()
			.eq('id', data.id)
			.single();

		expect(verified).toBeDefined();
	});
});
```

## Running Database Tests

### Commands

```bash
# Start Supabase first
pnpm db:start

# Run trigger tests
pnpm test:triggers

# Run with watch mode
pnpm test:triggers:watch

# Run integration tests
pnpm test:integration

# Run specific test file
pnpm test:triggers -- profile-triggers
```

### CI Considerations

Database tests are NOT run in CI by default (require Docker):

```yaml
# To enable in CI:
jobs:
  database-tests:
    runs-on: ubuntu-latest
    services:
      supabase:
        image: supabase/postgres
        # ... configuration
    steps:
      - run: pnpm test:triggers
```

## Best Practices

### 1. Always Clean Up

```typescript
afterEach(async () => {
	await cleanupAllTestData();
});

afterAll(async () => {
	await closeConnections();
});
```

### 2. Use Service Role for Setup

```typescript
// Use service role to bypass RLS during setup
const serviceClient = createServiceRoleClient();
await serviceClient.from('profiles').insert(testData);
```

### 3. Wait for Async Triggers

```typescript
// Triggers may be async - wait for completion
await new Promise((resolve) => setTimeout(resolve, 200));
// Or use waitForCondition for more control
```

### 4. Test Both Success and Failure

```typescript
it('should create profile on signup', async () => {
	/* ... */
});
it('should fail with duplicate email', async () => {
	/* ... */
});
```

### 5. Use Builder Pattern

```typescript
// Clear, readable test data creation
const student = await TestData.profile()
	.withRole('student')
	.withFullName('Alice Smith')
	.withGidouilles(100)
	.create();
```
