# Common Test Patterns

**Last Updated**: October 27, 2025

Quick reference guide for common testing patterns in UbuMaths. Use these battle-tested patterns to write reliable tests efficiently.

---

## Table of Contents

1. [Mock Setup Patterns](#mock-setup-patterns)
2. [Query Mocking Patterns](#query-mocking-patterns)
3. [Error Handling Patterns](#error-handling-patterns)
4. [API Route Testing](#api-route-testing)
5. [Server Function Testing](#server-function-testing)
6. [Complex Scenario Patterns](#complex-scenario-patterns)

---

## Mock Setup Patterns

### Pattern 1: Standard Test Setup

**The Golden Rule**: Always clear mocks BEFORE creating new ones.

```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createMockSupabase, createMockLocals } from '../../../../tests/helpers/supabase-helpers';

describe('Feature Tests', () => {
	let supabase: ReturnType<typeof createMockSupabase>;
	let locals: ReturnType<typeof createMockLocals>;

	beforeEach(() => {
		// CRITICAL: Clear FIRST, create SECOND
		vi.clearAllMocks();
		supabase = createMockSupabase();
		locals = createMockLocals('user-123', supabase);
	});

	test('should work correctly', async () => {
		// Test code here
	});
});
```

**Why This Matters**:

- `vi.clearAllMocks()` removes all mock implementations
- If called AFTER creating mocks, it destroys them
- Always: Clear → Create → Configure

---

### Pattern 2: Multiple User Contexts

Test with different user types (teacher, student, admin, unauthenticated).

```typescript
import { mockIds, mockProfiles } from '../../../../tests/helpers/supabase-helpers';

describe('Authorization Tests', () => {
	let supabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	test('should allow teacher access', async () => {
		const locals = createMockLocals(mockIds.teacher, supabase);
		supabase._mockChain.single.mockResolvedValueOnce({
			data: mockProfiles.teacher,
			error: null
		});

		const result = await performAction(locals);
		expect(result).toBeDefined();
	});

	test('should deny student access', async () => {
		const locals = createMockLocals(mockIds.student, supabase);
		supabase._mockChain.single.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		await expect(performAction(locals)).rejects.toThrow('Forbidden');
	});

	test('should deny unauthenticated access', async () => {
		const locals = createMockLocals(); // No user ID

		await expect(performAction(locals)).rejects.toThrow('Unauthorized');
	});
});
```

---

## Query Mocking Patterns

### Pattern 3: Single Query with .single()

For queries that explicitly call `.single()`.

```typescript
test('should fetch single record', async () => {
	const supabase = createMockSupabase();

	// Mock .single() call
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { id: '123', name: 'Test' },
		error: null
	});

	const { data } = await supabase.from('users').select('*').eq('id', '123').single();

	expect(data.id).toBe('123');
});
```

---

### Pattern 4: Implicit Await (Thenable Protocol)

For queries awaited without calling `.single()`.

```typescript
test('should fetch multiple records', async () => {
	const supabase = createMockSupabase();

	// Mock thenable protocol - USE mockImplementationOnce, NOT mockResolvedValueOnce
	supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
		return Promise.resolve(
			onFulfilled({
				data: [{ id: '1' }, { id: '2' }],
				error: null
			})
		);
	});

	const { data } = await supabase.from('users').select('*').eq('status', 'active');
	// Note: No .single() - uses thenable protocol

	expect(data.length).toBe(2);
});
```

**Critical**: Use `mockImplementationOnce()`, NOT `mockResolvedValueOnce()` for thenable protocol!

---

### Pattern 5: Sequential Queries

When a function makes multiple queries in sequence.

```typescript
test('should handle multiple sequential queries', async () => {
	const supabase = createMockSupabase();
	const locals = createMockLocals('teacher-123', supabase);

	// Mock queries in order they're called
	// Query 1: Get user profile
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { role: 'teacher' },
		error: null
	});

	// Query 2: Get assessment
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { id: 'a1', title: 'Test' },
		error: null
	});

	// Query 3: Get attempts (implicit await)
	supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
		return Promise.resolve(
			onFulfilled({
				data: [{ id: '1' }, { id: '2' }],
				error: null
			})
		);
	});

	const result = await functionWithThreeQueries(locals);
	expect(result).toBeDefined();
});
```

**Rule**: Count queries in implementation → Mock each one in order.

---

### Pattern 6: Using Helper Functions

Simplify common mocking scenarios with helper functions.

```typescript
import { mockSuccess, mockError, mockSequence } from '../../../../tests/helpers/supabase-helpers';

test('should succeed', async () => {
	const supabase = createMockSupabase();

	// Simple success mock
	mockSuccess(supabase, { id: '123' });

	const result = await queryData(supabase);
	expect(result.id).toBe('123');
});

test('should handle errors', async () => {
	const supabase = createMockSupabase();

	// Simple error mock
	mockError(supabase, 'Not found');

	await expect(queryData(supabase)).rejects.toThrow();
});

test('should handle sequence', async () => {
	const supabase = createMockSupabase();

	// Multiple queries at once
	mockSequence(supabase, [
		{ data: { role: 'teacher' }, error: null },
		{ data: { id: 'a1' }, error: null },
		{ data: [{ id: '1' }], error: null }
	]);

	const result = await complexFunction(supabase);
	expect(result).toBeDefined();
});
```

---

## Error Handling Patterns

### Pattern 7: SvelteKit Error Handling

SvelteKit's `error()` function throws exceptions, not returns.

```typescript
import { error } from '@sveltejs/kit';

// In route handler:
if (!authorized) {
	error(403, 'Forbidden');
}

// In test:
test('should reject unauthorized users', async () => {
	const request = createMockRequest();
	const locals = createMockLocals('student-123', supabase);

	// Mock student profile
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { role: 'student' },
		error: null
	});

	// Use try-catch, not response status
	try {
		await GET({ request, locals, params: { id: 'a1' } });
		expect.fail('Should have thrown an error');
	} catch (err: any) {
		expect(err.status).toBe(403);
		expect(err.body.message).toBe('Forbidden');
	}
});
```

**Key Points**:

- ✅ Use try-catch
- ✅ Check `err.status` and `err.body.message`
- ❌ Don't check `response.status`

---

### Pattern 8: Database Error Handling

Test how functions handle database errors.

```typescript
test('should handle database connection error', async () => {
	const supabase = createMockSupabase();
	const locals = createMockLocals('user-123', supabase);

	// Mock database error
	supabase._mockChain.single.mockResolvedValueOnce({
		data: null,
		error: { message: 'Connection failed', code: 'PGRST301' }
	});

	await expect(fetchData(locals)).rejects.toThrow('Connection failed');
});

test('should return null on not found', async () => {
	const supabase = createMockSupabase();

	// Not found is different from error
	supabase._mockChain.maybeSingle.mockResolvedValueOnce({
		data: null,
		error: null // No error, just no data
	});

	const result = await findUser('nonexistent', supabase);
	expect(result).toBeNull();
});
```

---

## API Route Testing

### Pattern 9: GET Route with Auth

```typescript
import { GET } from './+server';

test('GET should return data for authenticated user', async () => {
	const supabase = createMockSupabase();
	const locals = createMockLocals('teacher-123', supabase);
	const request = createMockRequest({}, 'GET');

	// Mock auth check
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { role: 'teacher' },
		error: null
	});

	// Mock data query
	supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
		return Promise.resolve(
			onFulfilled({
				data: [{ id: '1' }, { id: '2' }],
				error: null
			})
		);
	});

	const response = await GET({ request, locals });
	const data = await response.json();

	expect(response.status).toBe(200);
	expect(data.length).toBe(2);
});
```

---

### Pattern 10: POST Route with Validation

```typescript
import { POST } from './+server';

test('POST should create resource', async () => {
	const supabase = createMockSupabase();
	const locals = createMockLocals('teacher-123', supabase);
	const request = createMockRequest({
		title: 'Test',
		description: 'Description'
	});

	// Mock auth
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { role: 'teacher' },
		error: null
	});

	// Mock insert
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { id: 'new-123', title: 'Test' },
		error: null
	});

	const response = await POST({ request, locals });
	const data = await response.json();

	expect(response.status).toBe(201);
	expect(data.id).toBe('new-123');
});

test('POST should validate required fields', async () => {
	const supabase = createMockSupabase();
	const locals = createMockLocals('teacher-123', supabase);
	const request = createMockRequest({
		/* missing title */
	});

	try {
		await POST({ request, locals });
		expect.fail('Should have thrown validation error');
	} catch (err: any) {
		expect(err.status).toBe(400);
		expect(err.body.message).toContain('title');
	}
});
```

---

### Pattern 11: Route with URL Parameters

```typescript
import { GET } from './+server';

test('GET should filter by query params', async () => {
	const supabase = createMockSupabase();
	const locals = createMockLocals('teacher-123', supabase);
	const url = createMockURL({ classId: '123', status: 'active' });
	const request = new Request(url);

	// Mock auth
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { role: 'teacher' },
		error: null
	});

	// Mock filtered query
	supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
		return Promise.resolve(
			onFulfilled({
				data: [{ id: '1', classId: '123' }],
				error: null
			})
		);
	});

	const response = await GET({ request, locals });
	const data = await response.json();

	expect(data.length).toBe(1);
	expect(data[0].classId).toBe('123');
});
```

---

## Server Function Testing

### Pattern 12: Pure Server Function

Test server functions that don't make external calls.

```typescript
import { calculateScore } from './scoring';

test('should calculate score correctly', () => {
	const attempts = [
		{ isCorrect: true, points: 10 },
		{ isCorrect: false, points: 0 },
		{ isCorrect: true, points: 15 }
	];

	const score = calculateScore(attempts);
	expect(score).toBe(25);
});

test('should return 0 for empty attempts', () => {
	const score = calculateScore([]);
	expect(score).toBe(0);
});
```

---

### Pattern 13: Server Function with Database

```typescript
import { getAssessmentWithAttempts } from './assessments';

test('should fetch assessment with attempts', async () => {
	const supabase = createMockSupabase();

	// Mock assessment query
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { id: 'a1', title: 'Test' },
		error: null
	});

	// Mock attempts query
	supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
		return Promise.resolve(
			onFulfilled({
				data: [{ id: '1' }, { id: '2' }],
				error: null
			})
		);
	});

	const result = await getAssessmentWithAttempts('a1', supabase);

	expect(result.assessment.id).toBe('a1');
	expect(result.attempts.length).toBe(2);
});
```

---

### Pattern 14: Server Function with RPC

For functions using Supabase RPC (stored procedures).

```typescript
import { calculateStatistics } from './statistics';

test('should call RPC for statistics', async () => {
	const supabase = createMockSupabase();

	// Mock RPC call
	supabase.rpc.mockResolvedValueOnce({
		data: { average: 85, median: 87, count: 50 },
		error: null
	});

	const stats = await calculateStatistics('class-123', supabase);

	expect(supabase.rpc).toHaveBeenCalledWith('calculate_class_statistics', {
		class_id: 'class-123'
	});
	expect(stats.average).toBe(85);
});
```

---

## Complex Scenario Patterns

### Pattern 15: Testing Complete Call Chains

When API route → Server function → Nested function.

```typescript
test('POST /assign should call entire chain', async () => {
	const supabase = createMockSupabase();
	const locals = createMockLocals('teacher-123', supabase);
	const request = createMockRequest({ studentIds: ['s1', 's2'] });

	// Step 1: Route checks auth
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { role: 'teacher' },
		error: null
	});

	// Step 2: assignAssessment() gets assessment
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { id: 'a1', teacher_id: 'teacher-123' },
		error: null
	});

	// Step 3: assignAssessment() gets students
	supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
		return Promise.resolve(
			onFulfilled({
				data: [{ id: 's1' }, { id: 's2' }],
				error: null
			})
		);
	});

	// Step 4: assignAssessment() inserts assignments
	supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
		return Promise.resolve(
			onFulfilled({
				data: [{ id: 'assign-1' }, { id: 'assign-2' }],
				error: null
			})
		);
	});

	// Step 5: createNotification() inserts notification
	supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
		return Promise.resolve(
			onFulfilled({
				data: { id: 'notif-1' },
				error: null
			})
		);
	});

	// Step 6: createNotification() gets recipients
	supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
		return Promise.resolve(
			onFulfilled({
				data: [{ id: 's1' }, { id: 's2' }],
				error: null
			})
		);
	});

	const response = await POST({ request, locals, params: { id: 'a1' } });
	expect(response.status).toBe(200);
});
```

**Key**: Count ALL queries across ALL functions in the call chain.

---

### Pattern 16: Testing with Query Counters

When the same table is queried multiple times.

```typescript
test('should handle multiple queries to same table', async () => {
	const supabase = createMockSupabase();
	let queryCount = 0;

	// Use mockImplementation (not mockImplementationOnce) for counter
	supabase._mockChain.then.mockImplementation((onFulfilled) => {
		queryCount++;

		if (queryCount === 1) {
			return Promise.resolve(
				onFulfilled({
					data: { id: 'first' },
					error: null
				})
			);
		} else if (queryCount === 2) {
			return Promise.resolve(
				onFulfilled({
					data: { id: 'second' },
					error: null
				})
			);
		} else {
			return Promise.resolve(
				onFulfilled({
					data: { id: 'third' },
					error: null
				})
			);
		}
	});

	const result = await functionWithMultipleSameTableQueries(supabase);
	expect(result).toBeDefined();
});
```

---

### Pattern 17: Testing with Default Fields

Functions often add default fields to database records.

```typescript
import { createExercise } from './exercises';

test('should add default fields', async () => {
	const supabase = createMockSupabase();
	const locals = createMockLocals('teacher-123', supabase);

	const input = {
		title: 'Test Exercise',
		questions: ['q1', 'q2']
	};

	// Mock insert - function adds defaults
	supabase._mockChain.single.mockResolvedValueOnce({
		data: {
			...input,
			distribution_mode: 'sequential', // Added by function
			variables: [], // Added by function
			created_at: '2025-10-27' // Added by database
		},
		error: null
	});

	const result = await createExercise(input, locals);

	// Expect defaults to be present
	expect(result.distribution_mode).toBe('sequential');
	expect(result.variables).toEqual([]);
});
```

---

### Pattern 18: Testing Conditional Logic

```typescript
test('should take different paths based on role', async () => {
	const supabase = createMockSupabase();

	// Test teacher path
	const teacherLocals = createMockLocals('teacher-123', supabase);
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { role: 'teacher' },
		error: null
	});
	supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
		return Promise.resolve(
			onFulfilled({
				data: [{ id: '1' }, { id: '2' }, { id: '3' }], // All assessments
				error: null
			})
		);
	});

	const teacherResult = await getAccessibleAssessments(teacherLocals);
	expect(teacherResult.length).toBe(3);

	// Reset for student path
	vi.clearAllMocks();
	const studentSupabase = createMockSupabase();
	const studentLocals = createMockLocals('student-456', studentSupabase);

	studentSupabase._mockChain.single.mockResolvedValueOnce({
		data: { role: 'student' },
		error: null
	});
	studentSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
		return Promise.resolve(
			onFulfilled({
				data: [{ id: '1' }], // Only assigned assessments
				error: null
			})
		);
	});

	const studentResult = await getAccessibleAssessments(studentLocals);
	expect(studentResult.length).toBe(1);
});
```

---

## Quick Reference Table

| Scenario                    | Method to Mock | Pattern                        |
| --------------------------- | -------------- | ------------------------------ |
| Query with `.single()`      | `.single`      | `mockResolvedValueOnce()`      |
| Query with implicit await   | `.then`        | `mockImplementationOnce()`     |
| Query with `.maybeSingle()` | `.maybeSingle` | `mockResolvedValueOnce()`      |
| Multiple sequential queries | Multiple mocks | One mock per query             |
| RPC call                    | `supabase.rpc` | `mockResolvedValueOnce()`      |
| Error response              | Any method     | `{ data: null, error: {...} }` |
| SvelteKit error             | N/A            | try-catch block                |

---

## Common Mistakes to Avoid

### ❌ Wrong Mock Order

```typescript
beforeEach(() => {
	supabase = createMockSupabase();
	vi.clearAllMocks(); // WRONG - Destroys mocks
});
```

### ❌ Wrong Thenable Implementation

```typescript
// WRONG - Will timeout
supabase._mockChain.then.mockResolvedValueOnce({...});

// CORRECT
supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
  return Promise.resolve(onFulfilled({...}));
});
```

### ❌ Checking Response Status for Errors

```typescript
// WRONG - error() throws, doesn't return
const response = await handler({...});
expect(response.status).toBe(401);

// CORRECT
try {
  await handler({...});
  expect.fail('Should have thrown');
} catch (err: any) {
  expect(err.status).toBe(401);
}
```

### ❌ Not Enough Mocks

```typescript
// WRONG - Function makes 3 queries, only 1 mock
supabase._mockChain.single.mockResolvedValueOnce({...});
await functionWithThreeQueries(); // Will timeout on query 2

// CORRECT - Mock all 3 queries
supabase._mockChain.single.mockResolvedValueOnce({...}); // 1
supabase._mockChain.then.mockImplementationOnce(...);     // 2
supabase._mockChain.single.mockResolvedValueOnce({...}); // 3
```

---

## See Also

- [Test Infrastructure Guide](./test-infrastructure.md) - Shared helper functions
- [Test Suite Achievement](./test-suite-achievement.md) - 100% pass rate story
- [Testing README](./README.md) - Testing overview

---

**Last Updated**: October 27, 2025
**Maintained By**: Development Team
