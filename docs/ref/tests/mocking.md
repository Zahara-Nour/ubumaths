# Mocking Strategies

Comprehensive guide to mocking in UbuMaths tests.

## Supabase Client Mocking

### Overview

The project uses a **chainable mock pattern** for Supabase queries:

```typescript
// Real Supabase query
const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

// Mock must support same chain
```

### Core Mock Implementation

**Location**: `$tests/helpers` (barrel export from `tests/helpers/supabase/`)

```typescript
import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

export function createMockSupabase() {
	const mockChain = {
		// Chain methods - return this
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		upsert: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		neq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		not: vi.fn().mockReturnThis(),
		or: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		range: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		gt: vi.fn().mockReturnThis(),
		lt: vi.fn().mockReturnThis(),
		is: vi.fn().mockReturnThis(),
		contains: vi.fn().mockReturnThis(),

		// Terminal methods - return data
		single: vi.fn(),
		maybeSingle: vi.fn(),

		// Thenable protocol for implicit awaits
		then: vi.fn()
	};

	return {
		from: vi.fn(() => mockChain),
		rpc: vi.fn(),
		_mockChain: mockChain
	} as unknown as SupabaseClient<Database> & { _mockChain: typeof mockChain };
}
```

### Configuring Mock Responses

#### Success Response

```typescript
import { createMockSupabase, mockSuccess } from '$tests/helpers';

const supabase = createMockSupabase();

// For explicit .single() calls
mockSuccess(supabase, { id: '123', name: 'Test' });

// For implicit awaits (thenable protocol)
mockSuccess(supabase, { id: '123', name: 'Test' }, 'then');

// For .maybeSingle() calls
mockSuccess(supabase, { id: '123' }, 'maybeSingle');
```

#### Error Response

```typescript
import { createMockSupabase, mockError } from '$tests/helpers';

const supabase = createMockSupabase();

// For explicit .single() calls
mockError(supabase, 'Not found');

// For implicit awaits
mockError(supabase, 'Not found', 'then');
```

#### Sequential Responses

```typescript
import { createMockSupabase, mockSequence } from '$tests/helpers';

const supabase = createMockSupabase();

// Multiple sequential calls
mockSequence(supabase, [
	{ data: { role: 'teacher' }, error: null },
	{ data: { id: 'class-123' }, error: null },
	{ data: null, error: { message: 'Not found' } }
]);
```

### Thenable Protocol (Critical)

**Problem**: Supabase queries can be awaited without calling `.single()`:

```typescript
// Both patterns work in real Supabase
const result1 = await supabase.from('table').select('*').single();
const result2 = await supabase.from('table').select('*'); // Implicit await
```

**Solution**: Use `mockImplementationOnce` for thenable, NOT `mockResolvedValueOnce`:

```typescript
// CORRECT - Works with thenable protocol
supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
  return Promise.resolve(onFulfilled({ data: { id: '123' }, error: null }));
});

// WRONG - Will timeout!
supabase._mockChain.then.mockResolvedValueOnce({ data: {...}, error: null });
```

### Mock Request & Locals

```typescript
import { createMockRequest, createMockLocals, createMockURL } from '$tests/helpers';

// Mock request with JSON body
const request = createMockRequest({ name: 'Test' }, 'POST');

// Mock locals with authenticated user
const locals = createMockLocals('user-123', mockSupabase);

// Mock locals for unauthenticated request
const unauthLocals = createMockLocals();

// Mock URL with search params
const url = createMockURL({ classId: 'class-123', page: '1' });
```

### Testing API Routes

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
		const locals = createMockLocals(); // No userId

		const response = await POST({ request, locals });

		expect(response.status).toBe(401);
	});

	it('creates resource for authenticated user', async () => {
		mockSuccess(supabase, { id: 'new-id', name: 'Test' });

		const request = createMockRequest({ name: 'Test' });
		const locals = createMockLocals('user-123', supabase);

		const response = await POST({ request, locals });

		expect(response.status).toBe(201);
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

## Module Mocking

### SvelteKit Modules

```typescript
// Mock $app/environment
vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: true,
	version: '1.0.0'
}));

// Mock $app/stores
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn((fn) => {
			fn({ url: new URL('http://localhost'), params: {} });
			return () => {};
		})
	}
}));

// Mock $app/navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn()
}));
```

### Internal Modules

```typescript
// Mock a store
vi.mock('./friends.svelte', () => ({
	friendsManager: {
		get friendships() {
			return [];
		}
	}
}));

// Mock a utility
vi.mock('$lib/utils/logger', () => ({
	createLogger: vi.fn(() => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}))
}));
```

### Dynamic Mock Values

```typescript
// Mutable mock state
const mockState = {
	browser: true,
	user: null as { id: string } | null
};

vi.mock('$app/environment', () => ({
	get browser() {
		return mockState.browser;
	}
}));

// Change mock state per test
it('handles SSR', () => {
	mockState.browser = false;
	// Test SSR behavior
});

afterEach(() => {
	mockState.browser = true; // Reset
});
```

## Realtime Channel Mocking

### Mock Channel with Event Simulation

```typescript
interface MockRealtimeChannel extends RealtimeChannel {
	channelName: string;
	simulateBroadcast: (event: string, payload: unknown) => void;
	simulatePostgresChanges: (payload: unknown) => void;
}

function createMockChannel(name: string): MockRealtimeChannel {
	const listeners = new Map<string, Map<string, ((payload: unknown) => void)[]>>();

	const channel = {
		channelName: name,
		on: vi.fn(function (
			this: MockRealtimeChannel,
			type: string,
			config: { event: string },
			callback: (payload: unknown) => void
		) {
			if (!listeners.has(type)) {
				listeners.set(type, new Map());
			}
			const typeListeners = listeners.get(type)!;
			if (!typeListeners.has(config.event)) {
				typeListeners.set(config.event, []);
			}
			typeListeners.get(config.event)!.push(callback);
			return this;
		}),
		send: vi.fn(() => Promise.resolve('ok' as const)),
		subscribe: vi.fn(function (this: MockRealtimeChannel) {
			return this;
		}),
		unsubscribe: vi.fn(),

		// Simulate broadcast events
		simulateBroadcast: (event: string, payload: unknown) => {
			const typeListeners = listeners.get('broadcast');
			if (typeListeners) {
				const callbacks = typeListeners.get(event);
				if (callbacks) {
					callbacks.forEach((cb) => cb({ payload }));
				}
			}
		},

		// Simulate postgres_changes events
		simulatePostgresChanges: (payload: unknown) => {
			const typeListeners = listeners.get('postgres_changes');
			if (typeListeners) {
				const callbacks = typeListeners.get('INSERT');
				if (callbacks) {
					callbacks.forEach((cb) => cb(payload));
				}
			}
		}
	} as unknown as MockRealtimeChannel;

	return channel;
}
```

### Usage in Tests

```typescript
describe('Realtime Integration', () => {
	let mockChannel: MockRealtimeChannel;
	let supabase: SupabaseClient<Database>;

	beforeEach(() => {
		mockChannel = createMockChannel('test-channel');
		supabase = {
			channel: vi.fn(() => mockChannel),
			removeChannel: vi.fn()
		} as unknown as SupabaseClient<Database>;
	});

	it('handles broadcast message', async () => {
		// Setup store with mock
		store.init(supabase);

		// Simulate incoming broadcast
		mockChannel.simulateBroadcast('new_message', {
			id: 'msg-1',
			content: 'Hello'
		});

		// Assert store updated
		expect(store.messages).toContainEqual(expect.objectContaining({ id: 'msg-1' }));
	});
});
```

## Timer Mocking

### Fake Timers

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

describe('Debounced function', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('debounces calls', async () => {
		const callback = vi.fn();
		const debounced = debounce(callback, 100);

		debounced();
		debounced();
		debounced();

		expect(callback).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);

		expect(callback).toHaveBeenCalledTimes(1);
	});
});
```

### Date Mocking

```typescript
import { vi } from 'vitest';

it('handles date operations', () => {
	const mockDate = new Date('2025-01-15T10:00:00Z');
	vi.setSystemTime(mockDate);

	const result = getFormattedDate();

	expect(result).toBe('January 15, 2025');

	vi.useRealTimers();
});
```

## Random Number Seeding

### Deterministic RNG

```typescript
// tests/fixtures/game-fixtures.ts
let originalRandom: () => number;

export function seedRandom(seed: number): void {
	originalRandom = Math.random;
	let state = seed;
	Math.random = () => {
		state = (state * 1103515245 + 12345) & 0x7fffffff;
		return state / 0x7fffffff;
	};
}

export function resetRandom(): void {
	if (originalRandom) {
		Math.random = originalRandom;
	}
}
```

### Usage

```typescript
import { seedRandom, resetRandom } from 'tests/fixtures/game-fixtures';

describe('Random-dependent tests', () => {
	beforeEach(() => seedRandom(12345));
	afterEach(() => resetRandom());

	it('generates consistent results', () => {
		const result1 = generateRandom();
		const result2 = generateRandom();

		// Same seed = same results every time
		expect(result1).toBe(0.5);
		expect(result2).toBe(0.25);
	});
});
```

## Common Mock Data

```typescript
// tests/helpers/supabase/mock-client.ts (exported via $tests/helpers)
export const mockIds = {
	teacher: 'teacher-123',
	student: 'student-456',
	student2: 'student-789',
	class: 'class-abc',
	assessment: 'assessment-xyz',
	assignment: 'assignment-def',
	exercise: 'exercise-ghi'
};

export const mockProfiles = {
	teacher: {
		id: mockIds.teacher,
		role: 'teacher',
		firstname: 'John',
		lastname: 'Doe',
		email: 'teacher@voltairedoha.com',
		is_test: false
	},
	student: {
		id: mockIds.student,
		role: 'student',
		firstname: 'Alice',
		lastname: 'Smith',
		email: 'student@voltairedoha.com',
		is_test: false
	}
};
```

## Mock Best Practices

### 1. Clear Mocks Between Tests

```typescript
afterEach(() => {
	vi.clearAllMocks(); // Clear call history
	vi.resetAllMocks(); // Reset to initial state
});
```

### 2. Verify Mock Calls

```typescript
it('calls supabase correctly', async () => {
	await functionUnderTest();

	expect(supabase.from).toHaveBeenCalledWith('profiles');
	expect(supabase._mockChain.eq).toHaveBeenCalledWith('id', 'user-123');
	expect(supabase._mockChain.single).toHaveBeenCalled();
});
```

### 3. Type-Safe Mocks

```typescript
import type { MockedFunction } from 'vitest';

const mockFn = vi.fn() as MockedFunction<typeof realFunction>;
mockFn.mockResolvedValue(expectedResult);
```

### 4. Partial Mocks

```typescript
vi.mock('$lib/utils/complex-module', async () => {
	const actual = await vi.importActual('$lib/utils/complex-module');
	return {
		...actual,
		onlyThisFunction: vi.fn() // Only mock specific export
	};
});
```

### 5. Spy on Methods

```typescript
const spy = vi.spyOn(object, 'method');

await functionUnderTest();

expect(spy).toHaveBeenCalledWith('expected', 'args');

spy.mockRestore(); // Restore original
```
