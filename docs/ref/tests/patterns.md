# Testing Patterns

Common testing patterns and best practices used in UbuMaths.

## Test Structure

### AAA Pattern (Arrange-Act-Assert)

```typescript
describe('calculateDamage', () => {
	it('should apply element advantage bonus', () => {
		// Arrange
		const attacker = { element: 'fire', level: 10, baseDamage: 50 };
		const defender = { element: 'earth' }; // Fire beats Earth

		// Act
		const damage = calculateDamage(attacker, defender);

		// Assert
		expect(damage).toBe(75); // 50% bonus
	});
});
```

### Descriptive Test Names

```typescript
// Good - describes behavior
it('should return 401 when user is not authenticated', async () => {});
it('should create profile when new user signs up', async () => {});
it('should deduplicate messages from broadcast and postgres_changes', async () => {});

// Avoid - too vague
it('should work', async () => {});
it('handles error', async () => {});
```

### Grouped Tests with Context

```typescript
describe('ChatStore', () => {
	describe('sendMessage', () => {
		describe('when user is authenticated', () => {
			it('should add optimistic message immediately', async () => {});
			it('should broadcast message to channel', async () => {});
			it('should replace optimistic with DB message', async () => {});
		});

		describe('when user is not authenticated', () => {
			it('should throw AuthenticationError', async () => {});
		});

		describe('when network fails', () => {
			it('should rollback optimistic message', async () => {});
			it('should show error toast', async () => {});
		});
	});
});
```

## Setup and Teardown

### beforeEach / afterEach

```typescript
describe('ProfileService', () => {
	let supabase: ReturnType<typeof createMockSupabase>;
	let service: ProfileService;

	beforeEach(() => {
		supabase = createMockSupabase();
		service = new ProfileService(supabase);
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should fetch profile', async () => {
		mockSuccess(supabase, { id: 'user-1', name: 'Test' });
		const profile = await service.getProfile('user-1');
		expect(profile.name).toBe('Test');
	});
});
```

### beforeAll / afterAll (Database Tests)

```typescript
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

	it('should create profile on user signup', async () => {});
});
```

## Parameterized Tests

### describe.each

```typescript
const TABLE_TEST_CASES = [
	{ table: 'profiles', createData: () => TestData.profile().create() },
	{ table: 'classes', createData: () => TestData.class(teacherId).create() },
	{ table: 'exercises', createData: () => TestData.exercise(teacherId).create() }
];

describe.each(TABLE_TEST_CASES)('$table table', ({ table, createData }) => {
	it('should update updated_at timestamp', async () => {
		const record = await createData();
		const originalUpdatedAt = record.updated_at;

		await sleep(100);
		await updateRecord(table, record.id, { name: 'Updated' });

		const updated = await getRecord(table, record.id);
		expect(updated.updated_at).not.toBe(originalUpdatedAt);
	});
});
```

### it.each

```typescript
it.each([
	{ input: 0, expected: 'zero' },
	{ input: 1, expected: 'one' },
	{ input: 2, expected: 'two' },
	{ input: -1, expected: 'negative' }
])('numberToWord($input) returns "$expected"', ({ input, expected }) => {
	expect(numberToWord(input)).toBe(expected);
});
```

### Matrix Testing

```typescript
const ROLES = ['student', 'teacher', 'admin'] as const;
const ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

describe.each(ROLES)('Role: %s', (role) => {
	describe.each(ACTIONS)('Action: %s', (action) => {
		it(`should handle ${action} permission correctly`, async () => {
			const result = await checkPermission(role, action);
			expect(result).toBe(EXPECTED_PERMISSIONS[role][action]);
		});
	});
});
```

## Async Testing

### Basic Async/Await

```typescript
it('should fetch data', async () => {
	const result = await fetchData();
	expect(result).toBeDefined();
});
```

### Waiting for Conditions

```typescript
import { waitForCondition } from 'tests/database/helpers/trigger-test-helpers';

it('should update profile after trigger', async () => {
	await insertAuthUser({ id: userId, email: testEmail });

	// Wait for async trigger to complete
	await waitForCondition(
		async () => {
			const { data } = await supabase.from('profiles').select().eq('id', userId);
			return data !== null && data.length > 0;
		},
		5000,
		100
	);

	const { data: profile } = await supabase.from('profiles').select().eq('id', userId).single();
	expect(profile.role).toBe('student');
});
```

### Promise Rejection Testing

```typescript
it('should reject with validation error', async () => {
	await expect(validateInput(invalidData)).rejects.toThrow('Validation failed');
});

// Alternative using try/catch
it('should throw validation error', async () => {
	expect.assertions(1);
	try {
		await validateInput(invalidData);
	} catch (error) {
		expect(error.message).toBe('Validation failed');
	}
});
```

## Error Handling Tests

### Expected Errors

```typescript
it('should throw on invalid input', () => {
	expect(() => parseJSON('invalid')).toThrow(SyntaxError);
	expect(() => parseJSON('invalid')).toThrow('Unexpected token');
});
```

### API Error Responses

```typescript
it('should return 400 for invalid request', async () => {
	const request = createMockRequest({ invalid: 'data' });
	const locals = createMockLocals('user-123');

	const response = await POST({ request, locals });

	expect(response.status).toBe(400);
	const body = await response.json();
	expect(body.error).toContain('validation');
});
```

### Error Boundary Testing

```typescript
it('should handle database connection error gracefully', async () => {
	mockError(supabase, 'Connection refused');

	const result = await service.getData();

	expect(result).toEqual({ data: null, error: 'Service unavailable' });
});
```

## Snapshot Testing

### Basic Snapshots

```typescript
it('should generate expected output', () => {
	const result = generateReport(testData);
	expect(result).toMatchSnapshot();
});
```

### Inline Snapshots

```typescript
it('should format date correctly', () => {
	const formatted = formatDate(new Date('2025-01-15'));
	expect(formatted).toMatchInlineSnapshot(`"January 15, 2025"`);
});
```

### Snapshot Best Practices

```typescript
// Good - small, focused snapshots
it('should render user card', () => {
	const html = renderUserCard({ name: 'Test', avatar: null });
	expect(html).toMatchSnapshot();
});

// Avoid - large snapshots are hard to review
it('should render entire page', () => {
	const html = renderPage();
	expect(html).toMatchSnapshot(); // Don't do this
});
```

## Test Isolation

### Independent Tests

```typescript
describe('CartService', () => {
	// Each test gets fresh state
	let cart: CartService;

	beforeEach(() => {
		cart = new CartService();
	});

	it('should add item', () => {
		cart.add({ id: '1', qty: 1 });
		expect(cart.items).toHaveLength(1);
	});

	it('should be empty initially', () => {
		// Not affected by previous test
		expect(cart.items).toHaveLength(0);
	});
});
```

### Cleanup Test Data

```typescript
describe('Database Operations', () => {
	const testRecords: string[] = [];

	afterEach(async () => {
		// Clean up any records created during test
		for (const id of testRecords) {
			await supabase.from('records').delete().eq('id', id);
		}
		testRecords.length = 0;
	});

	it('should create record', async () => {
		const { data } = await supabase.from('records').insert({ name: 'Test' }).select().single();
		testRecords.push(data.id); // Track for cleanup
		expect(data.name).toBe('Test');
	});
});
```

## Test Categories

### Critical Tests

```typescript
// Mark critical tests for priority in CI
describe('CRITICAL: Authentication', () => {
	it('should reject invalid tokens', async () => {});
	it('should handle token expiration', async () => {});
});
```

### Skip/Only Modifiers

```typescript
// Skip a test temporarily
it.skip('should handle edge case (TODO: fix)', () => {});

// Run only this test (don't commit!)
it.only('debugging this test', () => {});

// Skip entire describe block
describe.skip('Legacy feature', () => {});

// Conditional skip
it.skipIf(process.env.CI)('requires local database', async () => {});
```

### TODO Tests

```typescript
// Placeholder for future tests
it.todo('should handle concurrent updates');
it.todo('should rate limit requests');
```

## Performance Testing

### Timing Assertions

```typescript
it('should complete within 100ms', async () => {
	const start = performance.now();

	await heavyOperation();

	const duration = performance.now() - start;
	expect(duration).toBeLessThan(100);
});
```

### Benchmarking (vi.bench)

```typescript
import { bench, describe } from 'vitest';

describe('Performance', () => {
	bench('fast algorithm', () => {
		fastSort(largeArray);
	});

	bench('slow algorithm', () => {
		slowSort(largeArray);
	});
});
```

## Coverage Patterns

### Boundary Testing

```typescript
describe('validateAge', () => {
	// Test boundaries explicitly
	it('should accept minimum age (0)', () => {
		expect(validateAge(0)).toBe(true);
	});

	it('should accept maximum age (150)', () => {
		expect(validateAge(150)).toBe(true);
	});

	it('should reject below minimum (-1)', () => {
		expect(validateAge(-1)).toBe(false);
	});

	it('should reject above maximum (151)', () => {
		expect(validateAge(151)).toBe(false);
	});
});
```

### Branch Coverage

```typescript
function getStatus(score: number, isPassing: boolean): string {
	if (score >= 90) {
		return 'excellent';
	} else if (score >= 70 && isPassing) {
		return 'good';
	} else if (isPassing) {
		return 'passing';
	}
	return 'failing';
}

describe('getStatus', () => {
	it('returns "excellent" for score >= 90', () => {
		expect(getStatus(90, true)).toBe('excellent');
		expect(getStatus(95, false)).toBe('excellent'); // isPassing doesn't matter
	});

	it('returns "good" for 70-89 when passing', () => {
		expect(getStatus(70, true)).toBe('good');
		expect(getStatus(89, true)).toBe('good');
	});

	it('returns "passing" for < 70 when passing', () => {
		expect(getStatus(60, true)).toBe('passing');
	});

	it('returns "failing" when not passing and < 70', () => {
		expect(getStatus(69, false)).toBe('failing');
		expect(getStatus(0, false)).toBe('failing');
	});
});
```

## Integration Test Patterns

### Database + API

```typescript
describe('POST /api/classes', () => {
	beforeEach(async () => {
		// Seed required data
		await TestData.profile().withRole('teacher').create();
	});

	afterEach(async () => {
		await cleanupAllTestData();
	});

	it('should create class in database', async () => {
		const response = await fetch('/api/classes', {
			method: 'POST',
			body: JSON.stringify({ name: 'Test Class' })
		});

		expect(response.status).toBe(201);

		// Verify database state
		const { data } = await supabase.from('classes').select().eq('name', 'Test Class');
		expect(data).toHaveLength(1);
	});
});
```

### End-to-End Flow

```typescript
describe('Student enrollment flow', () => {
	it('should complete full enrollment', async () => {
		// Step 1: Teacher creates class
		const classCode = await createClass(teacherId, 'Math 101');

		// Step 2: Student joins with code
		await joinClass(studentId, classCode);

		// Step 3: Verify enrollment
		const { data } = await supabase
			.from('class_members')
			.select()
			.eq('class_id', classId)
			.eq('student_id', studentId);

		expect(data).toHaveLength(1);
		expect(data[0].status).toBe('active');
	});
});
```
