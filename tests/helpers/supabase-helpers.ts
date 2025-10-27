/**
 * Supabase Test Helper Functions
 * ==============================
 *
 * Shared helper functions for creating properly mocked Supabase clients.
 * Provides utilities for:
 * - Mock Supabase client creation with chainable query builder
 * - Proper mock chain configuration (CRITICAL for tests to work)
 * - Common test assertions
 *
 * Key Pattern:
 * - Return the SAME chain object from `from()` calls
 * - Properly configure all chain methods to return `this`
 * - Set up terminal operations (`.single()`, `.then()`) to resolve with mock data
 */

import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// MOCK SUPABASE CLIENT
// ============================================================================

/**
 * Create a mock Supabase client with chainable query builder
 *
 * Returns a mock that simulates the Supabase API for testing.
 * Use _mockChain methods to configure return values.
 *
 * CRITICAL: This returns the SAME chain object on each `from()` call,
 * which allows tests to configure mocks that persist across calls.
 *
 * THENABLE PROTOCOL:
 * The mock implements the thenable protocol, allowing query chains
 * to be awaited directly without calling `.single()`:
 *
 * ```typescript
 * // Both patterns work:
 * const result1 = await supabase.from('table').select('*').single();
 * const result2 = await supabase.from('table').select('*'); // Implicit await
 * ```
 *
 * IMPORTANT: For thenable protocol, use mockImplementationOnce(), NOT mockResolvedValueOnce()!
 * mockResolvedValueOnce() doesn't properly implement the thenable protocol and will timeout.
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 *
 * // Configure mock for explicit .single() calls
 * supabase._mockChain.single.mockResolvedValueOnce({
 *   data: { id: '123', name: 'Test' },
 *   error: null
 * });
 *
 * // Configure mock for implicit awaits (thenable protocol) - CORRECT WAY
 * supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
 *   return Promise.resolve(onFulfilled({ data: { id: '123' }, error: null }));
 * });
 *
 * // WRONG - This will timeout! Don't use mockResolvedValueOnce with .then()
 * // supabase._mockChain.then.mockResolvedValueOnce({ data: {...}, error: null });
 *
 * // Use the mock
 * const result = await supabase.from('table').select('*');
 * ```
 */
export function createMockSupabase() {
	const mockChain = {
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
		single: vi.fn(),
		maybeSingle: vi.fn(),
		// Implement thenable protocol for implicit awaits
		// The mock chain itself needs to be thenable
		then: vi.fn()
	};

	return {
		from: vi.fn(() => mockChain),
		rpc: vi.fn(),
		_mockChain: mockChain
	} as unknown as SupabaseClient<Database> & { _mockChain: typeof mockChain };
}

/**
 * Create mock request object for API route tests
 */
export function createMockRequest(data?: Record<string, unknown>, method: string = 'POST') {
	return {
		method,
		json: vi.fn().mockResolvedValue(data || {}),
		formData: vi.fn(),
		headers: new Headers()
	} as unknown as Request;
}

/**
 * Create mock locals object for API route tests
 */
export function createMockLocals(
	userId?: string,
	supabase?: ReturnType<typeof createMockSupabase>
) {
	return {
		supabase: supabase || createMockSupabase(),
		user: userId ? { id: userId } : null,
		safeGetSession: vi.fn().mockResolvedValue(
			userId
				? {
						user: { id: userId },
						session: { access_token: 'mock-token' }
					}
				: null // Return null when no user (for 401 tests)
		)
	};
}

/**
 * Create mock URL with search params
 */
export function createMockURL(searchParams: Record<string, string> = {}) {
	const url = new URL('http://localhost');
	Object.entries(searchParams).forEach(([key, value]) => {
		url.searchParams.set(key, value);
	});
	return url;
}

// ============================================================================
// MOCK CONFIGURATION HELPERS
// ============================================================================

/**
 * Configure mock chain to return successful data response
 *
 * @param supabase - The mock Supabase client
 * @param data - The data to return
 * @param method - The method to mock ('single', 'maybeSingle', or 'then' for implicit awaits)
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 *
 * // For explicit .single() calls
 * mockSuccess(supabase, { id: '123', name: 'Test' });
 *
 * // For implicit awaits (thenable protocol)
 * mockSuccess(supabase, { id: '123', name: 'Test' }, 'then');
 * ```
 */
export function mockSuccess<T = unknown>(
	supabase: ReturnType<typeof createMockSupabase>,
	data: T,
	method: 'single' | 'then' | 'maybeSingle' = 'single'
) {
	const response = { data, error: null };

	if (method === 'then') {
		// For thenable protocol, use mockImplementationOnce (mockResolvedValueOnce doesn't work!)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(supabase._mockChain.then as any).mockImplementationOnce(
			(
				onFulfilled?: (value: typeof response) => typeof response | PromiseLike<typeof response>
			) => {
				return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
			}
		);
	} else {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(supabase._mockChain[method] as any).mockResolvedValueOnce(response);
	}
}

/**
 * Configure mock chain to return error response
 *
 * @param supabase - The mock Supabase client
 * @param errorMessage - The error message to return
 * @param method - The method to mock ('single', 'maybeSingle', or 'then' for implicit awaits)
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 *
 * // For explicit .single() calls
 * mockError(supabase, 'Not found');
 *
 * // For implicit awaits (thenable protocol)
 * mockError(supabase, 'Not found', 'then');
 * ```
 */
export function mockError(
	supabase: ReturnType<typeof createMockSupabase>,
	errorMessage: string,
	method: 'single' | 'then' | 'maybeSingle' = 'single'
) {
	const response = { data: null, error: { message: errorMessage } };

	if (method === 'then') {
		// For thenable protocol, use mockImplementationOnce (mockResolvedValueOnce doesn't work!)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(supabase._mockChain.then as any).mockImplementationOnce(
			(
				onFulfilled?: (value: typeof response) => typeof response | PromiseLike<typeof response>
			) => {
				return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
			}
		);
	} else {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(supabase._mockChain[method] as any).mockResolvedValueOnce(response);
	}
}

/**
 * Configure mock chain for multiple sequential calls
 *
 * @param supabase - The mock Supabase client
 * @param responses - Array of responses to return in sequence
 * @param method - The method to mock ('single', 'maybeSingle', or 'then' for implicit awaits)
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 *
 * // For explicit .single() calls
 * mockSequence(supabase, [
 *   { data: { role: 'teacher' }, error: null },
 *   { data: { id: '123' }, error: null }
 * ]);
 *
 * // For implicit awaits (thenable protocol)
 * mockSequence(supabase, [
 *   { data: { role: 'teacher' }, error: null },
 *   { data: { id: '123' }, error: null }
 * ], 'then');
 * ```
 */
export function mockSequence<T = unknown>(
	supabase: ReturnType<typeof createMockSupabase>,
	responses: Array<{ data: T | null; error: { message: string } | null }>,
	method: 'single' | 'then' | 'maybeSingle' = 'single'
) {
	if (method === 'then') {
		// For thenable protocol, use mockImplementationOnce (mockResolvedValueOnce doesn't work!)
		responses.forEach((response) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(supabase._mockChain.then as any).mockImplementationOnce(
				(
					onFulfilled?: (value: typeof response) => typeof response | PromiseLike<typeof response>
				) => {
					return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
				}
			);
		});
	} else {
		responses.forEach((response) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(supabase._mockChain[method] as any).mockResolvedValueOnce(response);
		});
	}
}

// ============================================================================
// COMMON TEST DATA
// ============================================================================

export const mockIds = {
	teacher: 'teacher-123',
	student: 'student-456',
	student2: 'student-789',
	class: 'class-abc',
	assessment: 'assessment-xyz',
	assignment: 'assignment-def',
	exercise: 'exercise-ghi',
	riddle: 'riddle-jkl',
	message: 'message-mno'
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
	},
	testStudent: {
		id: 'test-student',
		role: 'student',
		firstname: 'Test',
		lastname: 'User',
		email: 'test@voltairedoha.com',
		is_test: true
	}
};

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that a Supabase query was called with specific table
 */
export function expectTableQuery(
	supabase: ReturnType<typeof createMockSupabase>,
	tableName: string
) {
	expect(supabase.from).toHaveBeenCalledWith(tableName);
}

/**
 * Assert that a response has the expected error status
 */
export async function expectErrorResponse(
	response: Response,
	status: number,
	errorMessage: string
) {
	expect(response.status).toBe(status);
	const data = await response.json();
	expect(data.error).toBe(errorMessage);
}

/**
 * Assert that a response is successful
 */
export async function expectSuccessResponse(response: Response, status: number = 200) {
	expect(response.status).toBe(status);
	const data = await response.json();
	expect(data.error).toBeUndefined();
	return data;
}
