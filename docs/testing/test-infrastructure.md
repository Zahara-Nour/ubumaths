# Test Infrastructure Guide

**Last Updated**: October 27, 2025

Comprehensive guide to the shared test infrastructure for UbuMaths. Learn how to use the mock helpers and write effective tests.

---

## Overview

The shared test infrastructure provides:

- **Consistent mock creation** - Standardized Supabase client mocks
- **Helper functions** - Common patterns for requests, locals, URLs
- **Mock configuration** - Easy setup for success/error scenarios
- **Reusable test data** - Standard IDs and profiles
- **Assertion helpers** - Common test assertions

**Location**: `/tests/helpers/supabase-helpers.ts` (344 lines)

---

## Core Helper Functions

### 1. `createMockSupabase()`

Creates a mock Supabase client with a chainable query builder.

**Usage**:

```typescript
import { createMockSupabase } from '../../../../tests/helpers/supabase-helpers';

const supabase = createMockSupabase();
```

**Features**:

- Returns the same chain object for all `from()` calls
- Implements the thenable protocol (implicitly awaitable)
- All chain methods return `this` for chaining
- Exposes `_mockChain` for configuring return values

**The Chain Object**:

```typescript
{
  select, insert, update, delete, upsert,  // CRUD operations
  eq, neq, in, not, or,                     // Filters
  order, limit, range,                      // Sorting/pagination
  gte, lte, gt, lt, is, contains,          // Comparisons
  single, maybeSingle,                      // Terminal operations
  then                                      // Thenable protocol
}
```

**Example**:

```typescript
const supabase = createMockSupabase();

// Configure mock for .single() query
supabase._mockChain.single.mockResolvedValueOnce({
	data: { id: '123', name: 'Test' },
	error: null
});

// Use it
const { data } = await supabase.from('users').select('*').single();
```

---

### 2. `createMockRequest()`

Creates a mock HTTP request object for API route tests.

**Signature**:

```typescript
function createMockRequest(data?: Record<string, unknown>, method: string = 'POST'): Request;
```

**Usage**:

```typescript
const request = createMockRequest({ title: 'Test', content: 'Hello' }, 'POST');
```

**Example**:

```typescript
const request = createMockRequest({ studentIds: ['123', '456'] });
const response = await POST({ request, locals, params });
```

---

### 3. `createMockLocals()`

Creates a mock locals object with Supabase client and authentication.

**Signature**:

```typescript
function createMockLocals(
	userId?: string,
	supabase?: ReturnType<typeof createMockSupabase>
): Locals;
```

**Usage**:

```typescript
// Authenticated user
const locals = createMockLocals('teacher-123', supabase);

// Unauthenticated user (for 401 tests)
const locals = createMockLocals();
```

**Returns**:

```typescript
{
  supabase: SupabaseClient,
  user: { id: string } | null,
  safeGetSession: () => Promise<Session | null>
}
```

**Example**:

```typescript
const supabase = createMockSupabase();
const locals = createMockLocals('teacher-123', supabase);

// Now locals.supabase is the mock you can configure
supabase._mockChain.single.mockResolvedValueOnce({...});
```

---

### 4. `createMockURL()`

Creates a URL object with search parameters.

**Signature**:

```typescript
function createMockURL(searchParams?: Record<string, string>): URL;
```

**Usage**:

```typescript
const url = createMockURL({ classId: '123', status: 'active' });
// http://localhost?classId=123&status=active
```

---

## Mock Configuration Helpers

### 1. `mockSuccess()`

Configure mock to return successful response.

**Signature**:

```typescript
function mockSuccess(
	supabase: ReturnType<typeof createMockSupabase>,
	data: any,
	method: 'single' | 'then' | 'maybeSingle' = 'single'
): void;
```

**Usage**:

```typescript
const supabase = createMockSupabase();

// For .single() queries
mockSuccess(supabase, { id: '123', name: 'Test' });

// For implicit awaits (thenable protocol)
mockSuccess(supabase, [{ id: '1' }, { id: '2' }], 'then');
```

**Example**:

```typescript
test('should get user profile', async () => {
	const supabase = createMockSupabase();
	const locals = createMockLocals('user-123', supabase);

	mockSuccess(supabase, { role: 'teacher' });

	const profile = await getProfile(locals);
	expect(profile.role).toBe('teacher');
});
```

---

### 2. `mockError()`

Configure mock to return error response.

**Signature**:

```typescript
function mockError(
	supabase: ReturnType<typeof createMockSupabase>,
	errorMessage: string,
	method: 'single' | 'then' | 'maybeSingle' = 'single'
): void;
```

**Usage**:

```typescript
const supabase = createMockSupabase();

// For .single() queries
mockError(supabase, 'Not found');

// For implicit awaits
mockError(supabase, 'Database error', 'then');
```

**Example**:

```typescript
test('should handle database errors', async () => {
	const supabase = createMockSupabase();
	mockError(supabase, 'Connection failed');

	await expect(fetchData(supabase)).rejects.toThrow('Connection failed');
});
```

---

### 3. `mockSequence()`

Configure multiple sequential mocks at once.

**Signature**:

```typescript
function mockSequence(
	supabase: ReturnType<typeof createMockSupabase>,
	responses: Array<{ data: any; error: any }>,
	method: 'single' | 'then' | 'maybeSingle' = 'single'
): void;
```

**Usage**:

```typescript
const supabase = createMockSupabase();

// Mock 3 sequential queries
mockSequence(supabase, [
	{ data: { role: 'teacher' }, error: null }, // Query 1
	{ data: { id: 'assessment-123' }, error: null }, // Query 2
	{ data: [{ id: '1' }, { id: '2' }], error: null } // Query 3
]);
```

**Example**:

```typescript
test('should handle multiple queries', async () => {
	const supabase = createMockSupabase();

	mockSequence(supabase, [
		{ data: { role: 'teacher' }, error: null },
		{ data: { classId: '123' }, error: null }
	]);

	const result = await complexFunction(supabase);
	expect(result).toBeDefined();
});
```

---

## Standard Test Data

### Mock IDs

```typescript
import { mockIds } from '../../../../tests/helpers/supabase-helpers';

mockIds.teacher; // 'teacher-123'
mockIds.student; // 'student-456'
mockIds.student2; // 'student-789'
mockIds.class; // 'class-abc'
mockIds.assessment; // 'assessment-xyz'
mockIds.assignment; // 'assignment-def'
mockIds.exercise; // 'exercise-ghi'
mockIds.riddle; // 'riddle-jkl'
mockIds.message; // 'message-mno'
```

### Mock Profiles

```typescript
import { mockProfiles } from '../../../../tests/helpers/supabase-helpers';

mockProfiles.teacher; // Teacher profile
mockProfiles.student; // Student profile
mockProfiles.testStudent; // Test student (is_test: true)
```

**Example**:

```typescript
test('should authorize teacher', async () => {
	const supabase = createMockSupabase();
	mockSuccess(supabase, mockProfiles.teacher);

	const isAuthorized = await checkAuth(mockIds.teacher, supabase);
	expect(isAuthorized).toBe(true);
});
```

---

## Assertion Helpers

### 1. `expectTableQuery()`

Assert that a specific table was queried.

**Usage**:

```typescript
expectTableQuery(supabase, 'assessments');
```

**Example**:

```typescript
test('should query assessments table', async () => {
	const supabase = createMockSupabase();
	mockSuccess(supabase, []);

	await getAssessments(supabase);
	expectTableQuery(supabase, 'assessments');
});
```

---

### 2. `expectErrorResponse()`

Assert that a response has the expected error status and message.

**Usage**:

```typescript
await expectErrorResponse(response, 401, 'Unauthorized');
```

**Example**:

```typescript
test('should reject unauthenticated requests', async () => {
	const request = createMockRequest();
	const locals = createMockLocals(); // No user

	const response = await GET({ request, locals });
	await expectErrorResponse(response, 401, 'Unauthorized');
});
```

---

### 3. `expectSuccessResponse()`

Assert that a response is successful.

**Usage**:

```typescript
const data = await expectSuccessResponse(response, 200);
```

**Example**:

```typescript
test('should return assessment data', async () => {
	const request = createMockRequest();
	const locals = createMockLocals('teacher-123', supabase);
	mockSuccess(supabase, { id: '123', title: 'Test' });

	const response = await GET({ request, locals });
	const data = await expectSuccessResponse(response);
	expect(data.id).toBe('123');
});
```

---

## Critical Patterns

### Pattern 1: Always Clear Mocks First

```typescript
import { vi } from 'vitest';
import { createMockSupabase } from '../../../../tests/helpers/supabase-helpers';

let supabase: ReturnType<typeof createMockSupabase>;

// ✅ CORRECT ORDER
beforeEach(() => {
	vi.clearAllMocks(); // 1. Clear FIRST
	supabase = createMockSupabase(); // 2. Create SECOND
});

// ❌ WRONG ORDER - Destroys mocks!
beforeEach(() => {
	supabase = createMockSupabase();
	vi.clearAllMocks(); // Clears what we just created
});
```

**Why**: `vi.clearAllMocks()` removes all mock implementations, including the ones you just set up.

---

### Pattern 2: Thenable Protocol

For queries that are implicitly awaited (no `.single()` call), use `mockImplementationOnce()`:

```typescript
// ✅ CORRECT - Use mockImplementationOnce
supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
  return Promise.resolve(onFulfilled({ data: [...], error: null }));
});

// ❌ WRONG - Will timeout!
supabase._mockChain.then.mockResolvedValueOnce({ data: [...], error: null });
```

**Why**: The thenable protocol requires proper implementation, not just a resolved value.

---

### Pattern 3: Sequential Queries

When a function makes multiple queries, mock each one in order:

```typescript
// Function makes 3 queries:
// 1. Get user profile
// 2. Get assessment
// 3. Get attempts

supabase._mockChain.single.mockResolvedValueOnce({
  data: { role: 'teacher' },
  error: null
}); // Query 1

supabase._mockChain.single.mockResolvedValueOnce({
  data: { id: 'assessment-123' },
  error: null
}); // Query 2

supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
  return Promise.resolve(onFulfilled({ data: [...], error: null }));
}); // Query 3
```

**Why**: Each query consumes one mock. If you only mock once but the function makes 3 queries, the 2nd query will timeout.

---

### Pattern 4: Complex Call Chains

When testing API routes that call server functions:

```typescript
test('should assign assessment to students', async () => {
	const supabase = createMockSupabase();
	const locals = createMockLocals('teacher-123', supabase);
	const request = createMockRequest({ studentIds: ['s1', 's2'] });

	// API route checks auth
	mockSuccess(supabase, { role: 'teacher' });

	// assignAssessment() gets assessment
	mockSuccess(supabase, { id: 'a1', teacher_id: 'teacher-123' });

	// assignAssessment() gets students
	mockSuccess(supabase, [{ id: 's1' }, { id: 's2' }], 'then');

	// assignAssessment() creates assignments
	mockSuccess(supabase, [{ id: 'assign-1' }, { id: 'assign-2' }], 'then');

	// createNotification() inserts notification
	mockSuccess(supabase, { id: 'notif-1' }, 'then');

	// createNotification() gets recipients
	mockSuccess(supabase, [{ id: 's1' }, { id: 's2' }], 'then');

	const response = await POST({ request, locals, params: { id: 'a1' } });
	await expectSuccessResponse(response);
});
```

**Why**: Every database query across the entire call stack needs a mock. Trace the complete call chain.

---

## Complete Test Example

Here's a complete example showing all patterns:

```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
	createMockSupabase,
	createMockLocals,
	createMockRequest,
	mockSuccess,
	mockError,
	mockSequence,
	mockIds,
	mockProfiles
} from '../../../../tests/helpers/supabase-helpers';
import { GET, POST } from './+server';

describe('Assessments API', () => {
	let supabase: ReturnType<typeof createMockSupabase>;
	let locals: ReturnType<typeof createMockLocals>;

	beforeEach(() => {
		// CRITICAL: Clear first, create second
		vi.clearAllMocks();
		supabase = createMockSupabase();
		locals = createMockLocals(mockIds.teacher, supabase);
	});

	describe('GET /api/assessments', () => {
		test('should return assessments for teacher', async () => {
			const request = createMockRequest({}, 'GET');

			// Mock the queries
			mockSuccess(supabase, mockProfiles.teacher); // Auth check
			mockSuccess(supabase, [{ id: 'a1' }, { id: 'a2' }], 'then'); // Get assessments

			const response = await GET({ request, locals });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.length).toBe(2);
		});

		test('should reject unauthenticated requests', async () => {
			const request = createMockRequest({}, 'GET');
			const unauthLocals = createMockLocals(); // No user

			try {
				await GET({ request, locals: unauthLocals });
				expect.fail('Should have thrown');
			} catch (err: any) {
				expect(err.status).toBe(401);
				expect(err.body.message).toBe('Unauthorized');
			}
		});

		test('should handle database errors', async () => {
			const request = createMockRequest({}, 'GET');

			mockSuccess(supabase, mockProfiles.teacher); // Auth succeeds
			mockError(supabase, 'Connection failed', 'then'); // Query fails

			try {
				await GET({ request, locals });
				expect.fail('Should have thrown');
			} catch (err: any) {
				expect(err.status).toBe(500);
			}
		});
	});

	describe('POST /api/assessments', () => {
		test('should create new assessment', async () => {
			const request = createMockRequest({
				title: 'Test Assessment',
				exercises: ['e1', 'e2']
			});

			// Use mockSequence for multiple queries
			mockSequence(supabase, [
				{ data: mockProfiles.teacher, error: null }, // Auth
				{ data: { id: 'a1', title: 'Test' }, error: null } // Insert
			]);

			const response = await POST({ request, locals });
			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.id).toBe('a1');
		});
	});
});
```

---

## Troubleshooting

### Test Times Out

**Symptom**: Test hangs and times out after 5000ms.

**Cause**: Missing query mock. The function is waiting for a database response that never comes.

**Solution**: Count the queries in the function, add mocks for each one.

```typescript
// If function makes 3 queries, you need 3 mocks:
mockSuccess(supabase, {...}); // Query 1
mockSuccess(supabase, {...}); // Query 2
mockSuccess(supabase, {...}); // Query 3
```

---

### Cannot Destructure Property 'data'

**Symptom**: `TypeError: Cannot destructure property 'data' of undefined`

**Cause**: Query returned undefined instead of `{ data, error }`.

**Solution**: Check that you mocked the correct method (`.single()` vs `.then()`).

```typescript
// For queries with .single():
mockSuccess(supabase, data, 'single');

// For implicitly awaited queries:
mockSuccess(supabase, data, 'then');
```

---

### Mock Not Being Called

**Symptom**: Mock never gets called, test fails.

**Cause**: Either the query doesn't run, or you're checking the wrong mock.

**Solution**:

1. Verify the function actually makes the query
2. Check that you're mocking the right terminal operation
3. Ensure `beforeEach` has correct order (clear, then create)

---

### Thenable Protocol Timeout

**Symptom**: Query with implicit await times out.

**Cause**: Used `mockResolvedValueOnce()` instead of `mockImplementationOnce()`.

**Solution**: Use the correct pattern:

```typescript
// ✅ CORRECT
supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
  return Promise.resolve(onFulfilled({ data: [...], error: null }));
});

// ❌ WRONG
supabase._mockChain.then.mockResolvedValueOnce({ data: [...], error: null });
```

---

## Best Practices

### 1. Use Shared Helpers

Always prefer the shared helpers over creating your own mocks:

```typescript
// ✅ GOOD
import { createMockSupabase } from '../../../../tests/helpers/supabase-helpers';
const supabase = createMockSupabase();

// ❌ BAD
const supabase = {
	from: vi.fn(() => ({ select: vi.fn() }))
};
```

### 2. Reuse Standard Test Data

Use `mockIds` and `mockProfiles` for consistency:

```typescript
// ✅ GOOD
const locals = createMockLocals(mockIds.teacher, supabase);
mockSuccess(supabase, mockProfiles.teacher);

// ❌ BAD
const locals = createMockLocals('random-id-123', supabase);
mockSuccess(supabase, { id: 'random-id-123', role: 'teacher' });
```

### 3. Count Queries Before Writing Tests

Before writing test mocks:

1. Open the function implementation
2. Count how many database queries it makes
3. Note which use `.single()` vs implicit await
4. Write one mock per query

### 4. Test Error Paths with Try-Catch

For SvelteKit routes, error paths throw exceptions:

```typescript
try {
  await handler({...});
  expect.fail('Should have thrown');
} catch (err: any) {
  expect(err.status).toBe(expectedStatus);
}
```

### 5. Keep Tests Isolated

Each test should:

- Set up its own mocks
- Not depend on other tests
- Clean up after itself (handled by `beforeEach`)

---

## See Also

- [Test Suite Achievement](./test-suite-achievement.md) - How we achieved 100% pass rate
- [Common Test Patterns](./common-test-patterns.md) - Pattern reference
- [Testing README](./README.md) - Testing overview

---

**Last Updated**: October 27, 2025
**Maintained By**: Development Team
