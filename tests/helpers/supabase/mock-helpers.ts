/**
 * Mock Configuration Helpers
 * ==========================
 *
 * Helper functions for configuring mock Supabase responses.
 * Provides convenient utilities for:
 * - mockSuccess: Configure successful data responses
 * - mockError: Configure error responses
 * - mockSequence: Configure sequential responses for multiple calls
 *
 * CRITICAL: For thenable protocol (.then), use mockImplementationOnce(), NOT mockResolvedValueOnce()!
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 *
 * // Mock successful .single() call
 * mockSuccess(supabase, { id: '123', name: 'Test' });
 *
 * // Mock error response
 * mockError(supabase, 'Not found');
 *
 * // Mock sequence of responses
 * mockSequence(supabase, [
 *   { data: { role: 'teacher' }, error: null },
 *   { data: { id: '123' }, error: null }
 * ]);
 * ```
 */

import { expect } from 'vitest';
import type { MockSupabaseClient, SupabaseResponse } from './mock-client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Terminal method types that can be mocked */
export type TerminalMethod = 'single' | 'maybeSingle' | 'then';

/**
 * Response structure for mock configuration
 */
export interface MockResponse<T = unknown> {
	data: T | null;
	error: { message: string; code?: string; details?: string } | null;
}

// ============================================================================
// MOCK SUCCESS HELPER
// ============================================================================

/**
 * Configure mock chain to return successful data response.
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
 * const result = await supabase.from('table').select('*').single();
 * // result.data === { id: '123', name: 'Test' }
 *
 * // For implicit awaits (thenable protocol)
 * mockSuccess(supabase, [{ id: '1' }, { id: '2' }], 'then');
 * const result = await supabase.from('table').select('*');
 * // result.data === [{ id: '1' }, { id: '2' }]
 * ```
 */
export function mockSuccess<T = unknown>(
	supabase: MockSupabaseClient,
	data: T,
	method: TerminalMethod = 'single'
): void {
	const response: SupabaseResponse<T> = { data, error: null };

	if (method === 'then') {
		// For thenable protocol, use mockImplementationOnce (mockResolvedValueOnce doesn't work!)
		supabase._mockChain.then.mockImplementationOnce(
			(
				onFulfilled?: (
					value: SupabaseResponse<T>
				) => SupabaseResponse<T> | PromiseLike<SupabaseResponse<T>>
			) => {
				return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
			}
		);
	} else {
		supabase._mockChain[method].mockResolvedValueOnce(response);
	}
}

// ============================================================================
// MOCK ERROR HELPER
// ============================================================================

/**
 * Configure mock chain to return error response.
 *
 * @param supabase - The mock Supabase client
 * @param errorMessage - The error message to return
 * @param method - The method to mock ('single', 'maybeSingle', or 'then' for implicit awaits)
 * @param errorCode - Optional error code
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 *
 * // For explicit .single() calls
 * mockError(supabase, 'Not found');
 * const result = await supabase.from('table').select('*').single();
 * // result.error.message === 'Not found'
 *
 * // For implicit awaits (thenable protocol)
 * mockError(supabase, 'Database error', 'then');
 * const result = await supabase.from('table').select('*');
 * // result.error.message === 'Database error'
 *
 * // With error code
 * mockError(supabase, 'Unauthorized', 'single', 'AUTH_ERROR');
 * ```
 */
export function mockError(
	supabase: MockSupabaseClient,
	errorMessage: string,
	method: TerminalMethod = 'single',
	errorCode?: string
): void {
	const response: SupabaseResponse<null> = {
		data: null,
		error: { message: errorMessage, code: errorCode }
	};

	if (method === 'then') {
		// For thenable protocol, use mockImplementationOnce (mockResolvedValueOnce doesn't work!)
		supabase._mockChain.then.mockImplementationOnce(
			(
				onFulfilled?: (
					value: SupabaseResponse<null>
				) => SupabaseResponse<null> | PromiseLike<SupabaseResponse<null>>
			) => {
				return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
			}
		);
	} else {
		supabase._mockChain[method].mockResolvedValueOnce(response);
	}
}

// ============================================================================
// MOCK SEQUENCE HELPER
// ============================================================================

/**
 * Configure mock chain for multiple sequential calls.
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
 *   { data: { id: '123', name: 'Test' }, error: null },
 *   { data: null, error: { message: 'Not found' } }
 * ]);
 *
 * // First call returns teacher role
 * // Second call returns the item
 * // Third call returns error
 *
 * // For implicit awaits (thenable protocol)
 * mockSequence(supabase, [
 *   { data: [{ id: '1' }], error: null },
 *   { data: [{ id: '2' }], error: null }
 * ], 'then');
 * ```
 */
export function mockSequence<T = unknown>(
	supabase: MockSupabaseClient,
	responses: Array<MockResponse<T>>,
	method: TerminalMethod = 'single'
): void {
	if (method === 'then') {
		// For thenable protocol, use mockImplementationOnce (mockResolvedValueOnce doesn't work!)
		responses.forEach((response) => {
			supabase._mockChain.then.mockImplementationOnce(
				(
					onFulfilled?: (value: MockResponse<T>) => MockResponse<T> | PromiseLike<MockResponse<T>>
				) => {
					return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
				}
			);
		});
	} else {
		responses.forEach((response) => {
			supabase._mockChain[method].mockResolvedValueOnce(response);
		});
	}
}

// ============================================================================
// MOCK RPC HELPERS
// ============================================================================

/**
 * Configure a mock RPC function to return success data.
 *
 * @param supabase - The mock Supabase client
 * @param functionName - The RPC function name
 * @param data - The data to return (or a function that receives params and returns data)
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 *
 * // Static return value
 * mockRpcSuccess(supabase, 'get_user_stats', { total: 100, correct: 85 });
 *
 * // Dynamic return based on params
 * mockRpcSuccess(supabase, 'get_user_by_id', (params) => {
 *   return { id: params.user_id, name: 'Test User' };
 * });
 * ```
 */
export function mockRpcSuccess<T = unknown>(
	supabase: MockSupabaseClient,
	functionName: string,
	data: T | ((params: unknown) => T | Promise<T>)
): void {
	supabase._rpcMocks.set(functionName, data);
}

/**
 * Configure a mock RPC function to return an error.
 *
 * @param supabase - The mock Supabase client
 * @param functionName - The RPC function name
 * @param errorMessage - The error message
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 * mockRpcError(supabase, 'execute_trade', 'Insufficient balance');
 *
 * const result = await supabase.rpc('execute_trade', { amount: 1000 });
 * // result.error.message === 'Insufficient balance'
 * ```
 */
export function mockRpcError(
	supabase: MockSupabaseClient,
	functionName: string,
	errorMessage: string
): void {
	supabase._rpcMocks.set(functionName, () => {
		throw new Error(errorMessage);
	});
}

/**
 * Clear all RPC mocks.
 *
 * @param supabase - The mock Supabase client
 */
export function clearRpcMocks(supabase: MockSupabaseClient): void {
	supabase._rpcMocks.clear();
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that a Supabase query was called with specific table.
 *
 * @param supabase - The mock Supabase client
 * @param tableName - Expected table name
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 * await supabase.from('profiles').select('*');
 * expectTableQuery(supabase, 'profiles'); // Passes
 * ```
 */
export function expectTableQuery(supabase: MockSupabaseClient, tableName: string): void {
	expect(supabase.from).toHaveBeenCalledWith(tableName);
}

/**
 * Assert that a response has the expected error status.
 *
 * @param response - The Response object
 * @param status - Expected HTTP status code
 * @param errorMessage - Expected error message in response body
 *
 * @example
 * ```typescript
 * const response = await POST({ request, locals });
 * await expectErrorResponse(response, 400, 'Invalid input');
 * ```
 */
export async function expectErrorResponse(
	response: Response,
	status: number,
	errorMessage: string
): Promise<void> {
	expect(response.status).toBe(status);
	const data = await response.json();
	expect(data.error).toBe(errorMessage);
}

/**
 * Assert that a response is successful.
 *
 * @param response - The Response object
 * @param status - Expected HTTP status code (default: 200)
 * @returns The parsed response data
 *
 * @example
 * ```typescript
 * const response = await POST({ request, locals });
 * const data = await expectSuccessResponse(response, 201);
 * expect(data.id).toBeDefined();
 * ```
 */
export async function expectSuccessResponse<T = Record<string, unknown>>(
	response: Response,
	status: number = 200
): Promise<T> {
	expect(response.status).toBe(status);
	const data = await response.json();
	expect(data.error).toBeUndefined();
	return data as T;
}

// ============================================================================
// ADVANCED MOCK HELPERS
// ============================================================================

/**
 * Mock a complete query chain with custom method behavior.
 * Useful for complex scenarios where you need to mock intermediate methods.
 *
 * @param supabase - The mock Supabase client
 * @param methodOverrides - Object mapping method names to mock implementations
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 *
 * mockQueryChain(supabase, {
 *   eq: vi.fn().mockImplementation((column, value) => {
 *     if (column === 'id' && value === 'special') {
 *       supabase._mockChain.single.mockResolvedValueOnce({
 *         data: { special: true },
 *         error: null
 *       });
 *     }
 *     return supabase._mockChain;
 *   })
 * });
 * ```
 */
export function mockQueryChain(
	supabase: MockSupabaseClient,
	methodOverrides: Partial<
		Record<keyof MockSupabaseClient['_mockChain'], ReturnType<typeof import('vitest').vi.fn>>
	>
): void {
	Object.entries(methodOverrides).forEach(([method, implementation]) => {
		const key = method as keyof MockSupabaseClient['_mockChain'];
		if (supabase._mockChain[key] && implementation) {
			supabase._mockChain[key].mockImplementation(implementation);
		}
	});
}

/**
 * Mock insert operation with automatic ID generation.
 *
 * @param supabase - The mock Supabase client
 * @param generateId - Function to generate ID (default: UUID-like string)
 * @param additionalFields - Additional fields to merge into inserted data
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 * mockInsertWithId(supabase, () => 'generated-id-123');
 *
 * const result = await supabase.from('items').insert({ name: 'Test' }).select().single();
 * // result.data.id === 'generated-id-123'
 * ```
 */
export function mockInsertWithId(
	supabase: MockSupabaseClient,
	generateId: () => string = () => `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	additionalFields: Record<string, unknown> = {}
): void {
	let insertedData: Record<string, unknown> = {};

	supabase._mockChain.insert.mockImplementation((data: Record<string, unknown>) => {
		insertedData = {
			id: generateId(),
			...data,
			...additionalFields,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};
		return supabase._mockChain;
	});

	supabase._mockChain.single.mockImplementation(() => {
		return Promise.resolve({ data: insertedData, error: null });
	});
}

/**
 * Mock update operation that merges with existing data.
 *
 * @param supabase - The mock Supabase client
 * @param existingData - The existing data to merge with updates
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 * mockUpdateMerge(supabase, { id: '123', name: 'Original', count: 0 });
 *
 * const result = await supabase.from('items').update({ count: 1 }).eq('id', '123').select().single();
 * // result.data === { id: '123', name: 'Original', count: 1, updated_at: '...' }
 * ```
 */
export function mockUpdateMerge(
	supabase: MockSupabaseClient,
	existingData: Record<string, unknown>
): void {
	let updatedData: Record<string, unknown> = { ...existingData };

	supabase._mockChain.update.mockImplementation((data: Record<string, unknown>) => {
		updatedData = {
			...existingData,
			...data,
			updated_at: new Date().toISOString()
		};
		return supabase._mockChain;
	});

	supabase._mockChain.single.mockImplementation(() => {
		return Promise.resolve({ data: updatedData, error: null });
	});
}
