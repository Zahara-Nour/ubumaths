/**
 * Unified Mock Supabase Client
 * ============================
 *
 * Consolidates all mock Supabase implementations into a single, comprehensive mock.
 * This is the canonical source for mocking Supabase in tests.
 *
 * Features:
 * - All chainable query methods (select, insert, update, delete, etc.)
 * - All filter methods (eq, neq, in, not, or, gte, lte, etc.)
 * - Terminal methods (single, maybeSingle)
 * - Thenable protocol support (CRITICAL - use mockImplementationOnce for .then())
 * - RPC mock with configurable responses via _rpcMocks Map
 * - Auth mock for authentication-related tests
 * - Proper TypeScript types (NO `any`)
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
 * // Configure RPC mock
 * supabase._rpcMocks.set('my_function', async (params) => {
 *   return { success: true };
 * });
 * ```
 *
 * IMPORTANT: For thenable protocol, use mockImplementationOnce(), NOT mockResolvedValueOnce()!
 * mockResolvedValueOnce() doesn't properly implement the thenable protocol and will timeout.
 */

import { vi } from 'vitest';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Type for vitest mock function */
type MockFn = ReturnType<typeof vi.fn>;

/**
 * Mock chain object containing all chainable query builder methods.
 * Exposed via _mockChain for test configuration.
 */
export interface MockChain {
	// Query methods (chainable)
	select: MockFn;
	insert: MockFn;
	update: MockFn;
	delete: MockFn;
	upsert: MockFn;

	// Filter methods (chainable)
	eq: MockFn;
	neq: MockFn;
	in: MockFn;
	not: MockFn;
	or: MockFn;
	and: MockFn;
	order: MockFn;
	limit: MockFn;
	range: MockFn;
	gte: MockFn;
	lte: MockFn;
	gt: MockFn;
	lt: MockFn;
	is: MockFn;
	contains: MockFn;
	containedBy: MockFn;
	textSearch: MockFn;
	filter: MockFn;
	match: MockFn;
	like: MockFn;
	ilike: MockFn;
	overlaps: MockFn;

	// Utility methods (chainable)
	throwOnError: MockFn;
	returns: MockFn;

	// Terminal methods
	single: MockFn;
	maybeSingle: MockFn;

	// Thenable protocol - CRITICAL for implicit awaits
	then: MockFn;
}

/**
 * RPC mock function type - can be a static value or a function that receives params
 */
export type RpcMockValue = unknown | ((params: unknown) => unknown | Promise<unknown>);

/**
 * Mock auth object for authentication-related tests
 */
export interface MockAuth {
	getUser: MockFn;
	getSession: MockFn;
	signIn: MockFn;
	signOut: MockFn;
	onAuthStateChange: MockFn;
}

/**
 * Mock Supabase client type with test utilities exposed
 */
export interface MockSupabaseClient extends Omit<SupabaseClient<Database>, 'auth' | 'rpc'> {
	/** Access to configure chain method mocks */
	_mockChain: MockChain;

	/** Map for configuring RPC function mocks */
	_rpcMocks: Map<string, RpcMockValue>;

	/** Mock auth object */
	auth: MockAuth;

	/** RPC function mock */
	rpc: MockFn;

	/** From function mock */
	from: MockFn;

	/** Channel function mock for realtime */
	channel: MockFn;

	/** Remove channel mock */
	removeChannel: MockFn;
}

/**
 * Supabase response type for query results
 */
export interface SupabaseResponse<T> {
	data: T | null;
	error: { message: string; code?: string; details?: string } | null;
}

// ============================================================================
// MOCK SUPABASE CLIENT FACTORY
// ============================================================================

/**
 * Creates a comprehensive mock Supabase client with all query builder methods
 * and proper thenable protocol support.
 *
 * @returns Mock Supabase client with _mockChain and _rpcMocks exposed for configuration
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 *
 * // Mock a single() call
 * supabase._mockChain.single.mockResolvedValueOnce({
 *   data: { id: 'user-123', name: 'Alice' },
 *   error: null
 * });
 *
 * // Mock an implicit await (thenable)
 * supabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
 *   return Promise.resolve(onFulfilled({
 *     data: [{ id: '1' }, { id: '2' }],
 *     error: null
 *   }));
 * });
 *
 * // Mock an RPC call
 * supabase._rpcMocks.set('get_user_stats', async (params) => {
 *   return { total_exercises: 100, correct_answers: 85 };
 * });
 * ```
 */
export function createMockSupabase(): MockSupabaseClient {
	// RPC mocks storage
	const rpcMocks = new Map<string, RpcMockValue>();

	// Create the mock chain with all methods
	const mockChain: MockChain = {
		// Query methods - return this for chaining
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		upsert: vi.fn().mockReturnThis(),

		// Filter methods - return this for chaining
		eq: vi.fn().mockReturnThis(),
		neq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		not: vi.fn().mockReturnThis(),
		or: vi.fn().mockReturnThis(),
		and: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		range: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		gt: vi.fn().mockReturnThis(),
		lt: vi.fn().mockReturnThis(),
		is: vi.fn().mockReturnThis(),
		contains: vi.fn().mockReturnThis(),
		containedBy: vi.fn().mockReturnThis(),
		textSearch: vi.fn().mockReturnThis(),
		filter: vi.fn().mockReturnThis(),
		match: vi.fn().mockReturnThis(),
		like: vi.fn().mockReturnThis(),
		ilike: vi.fn().mockReturnThis(),
		overlaps: vi.fn().mockReturnThis(),

		// Utility methods - return this for chaining
		throwOnError: vi.fn().mockReturnThis(),
		returns: vi.fn().mockReturnThis(),

		// Terminal methods - don't chain, return results
		single: vi.fn(),
		maybeSingle: vi.fn(),

		// Thenable protocol - CRITICAL for implicit awaits
		// Default implementation returns empty data
		then: vi.fn((callback?: (value: SupabaseResponse<null>) => unknown) => {
			const result: SupabaseResponse<null> = { data: null, error: null };
			return callback ? Promise.resolve(callback(result)) : Promise.resolve(result);
		})
	};

	// Create mock auth object
	const mockAuth: MockAuth = {
		getUser: vi.fn().mockResolvedValue({
			data: { user: null },
			error: null
		}),
		getSession: vi.fn().mockResolvedValue({
			data: { session: null },
			error: null
		}),
		signIn: vi.fn().mockResolvedValue({
			data: { user: null, session: null },
			error: null
		}),
		signOut: vi.fn().mockResolvedValue({ error: null }),
		onAuthStateChange: vi.fn().mockReturnValue({
			data: { subscription: { unsubscribe: vi.fn() } }
		})
	};

	// Create mock channel for realtime
	const mockChannel = {
		on: vi.fn().mockReturnThis(),
		subscribe: vi.fn().mockReturnValue({ status: 'SUBSCRIBED' }),
		unsubscribe: vi.fn().mockResolvedValue('ok'),
		send: vi.fn().mockResolvedValue('ok'),
		track: vi.fn().mockResolvedValue('ok'),
		untrack: vi.fn().mockResolvedValue('ok')
	};

	// Create the mock client
	const client: MockSupabaseClient = {
		from: vi.fn(() => mockChain),

		rpc: vi.fn(async (name: string, params?: unknown) => {
			if (rpcMocks.has(name)) {
				const mock = rpcMocks.get(name);
				if (typeof mock === 'function') {
					try {
						const result = await mock(params);
						return { data: result, error: null };
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : String(error);
						return { data: null, error: { message: errorMessage } };
					}
				}
				return { data: mock, error: null };
			}
			return { data: null, error: null };
		}),

		auth: mockAuth,

		channel: vi.fn(() => mockChannel),

		removeChannel: vi.fn().mockResolvedValue('ok'),

		_mockChain: mockChain,
		_rpcMocks: rpcMocks
	} as unknown as MockSupabaseClient;

	return client;
}

// ============================================================================
// AUTH CONFIGURATION HELPERS
// ============================================================================

/**
 * Configure the mock auth to return an authenticated user
 *
 * @param supabase - The mock Supabase client
 * @param user - User data to return
 * @param session - Optional session data
 *
 * @example
 * ```typescript
 * const supabase = createMockSupabase();
 * configureAuthUser(supabase, {
 *   id: 'user-123',
 *   email: 'test@example.com'
 * });
 * ```
 */
export function configureAuthUser(
	supabase: MockSupabaseClient,
	user: Partial<User>,
	session?: Partial<Session>
): void {
	const fullUser: User = {
		id: user.id ?? 'mock-user-id',
		app_metadata: user.app_metadata ?? {},
		user_metadata: user.user_metadata ?? {},
		aud: user.aud ?? 'authenticated',
		created_at: user.created_at ?? new Date().toISOString(),
		email: user.email,
		phone: user.phone,
		...user
	};

	supabase.auth.getUser.mockResolvedValue({
		data: { user: fullUser },
		error: null
	});

	if (session) {
		const fullSession: Session = {
			access_token: session.access_token ?? 'mock-access-token',
			refresh_token: session.refresh_token ?? 'mock-refresh-token',
			expires_in: session.expires_in ?? 3600,
			expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
			token_type: session.token_type ?? 'bearer',
			user: fullUser,
			...session
		};

		supabase.auth.getSession.mockResolvedValue({
			data: { session: fullSession },
			error: null
		});
	}
}

/**
 * Configure the mock auth to return an unauthenticated state
 *
 * @param supabase - The mock Supabase client
 */
export function configureAuthUnauthenticated(supabase: MockSupabaseClient): void {
	supabase.auth.getUser.mockResolvedValue({
		data: { user: null },
		error: null
	});

	supabase.auth.getSession.mockResolvedValue({
		data: { session: null },
		error: null
	});
}

/**
 * Configure the mock auth to return an error
 *
 * @param supabase - The mock Supabase client
 * @param errorMessage - The error message to return
 */
export function configureAuthError(supabase: MockSupabaseClient, errorMessage: string): void {
	supabase.auth.getUser.mockResolvedValue({
		data: { user: null },
		error: { message: errorMessage }
	});

	supabase.auth.getSession.mockResolvedValue({
		data: { session: null },
		error: { message: errorMessage }
	});
}

// ============================================================================
// RESET HELPERS
// ============================================================================

/**
 * Reset all mocks on the Supabase client
 *
 * @param supabase - The mock Supabase client to reset
 */
export function resetMockSupabase(supabase: MockSupabaseClient): void {
	// Reset from and rpc
	supabase.from.mockClear();
	supabase.rpc.mockClear();
	supabase._rpcMocks.clear();

	// Reset all chain methods
	Object.values(supabase._mockChain).forEach((mock) => {
		if (typeof mock.mockClear === 'function') {
			mock.mockClear();
		}
	});

	// Restore default implementations for chainable methods
	supabase._mockChain.select.mockReturnThis();
	supabase._mockChain.insert.mockReturnThis();
	supabase._mockChain.update.mockReturnThis();
	supabase._mockChain.delete.mockReturnThis();
	supabase._mockChain.upsert.mockReturnThis();
	supabase._mockChain.eq.mockReturnThis();
	supabase._mockChain.neq.mockReturnThis();
	supabase._mockChain.in.mockReturnThis();
	supabase._mockChain.not.mockReturnThis();
	supabase._mockChain.or.mockReturnThis();
	supabase._mockChain.and.mockReturnThis();
	supabase._mockChain.order.mockReturnThis();
	supabase._mockChain.limit.mockReturnThis();
	supabase._mockChain.range.mockReturnThis();
	supabase._mockChain.gte.mockReturnThis();
	supabase._mockChain.lte.mockReturnThis();
	supabase._mockChain.gt.mockReturnThis();
	supabase._mockChain.lt.mockReturnThis();
	supabase._mockChain.is.mockReturnThis();
	supabase._mockChain.contains.mockReturnThis();
	supabase._mockChain.containedBy.mockReturnThis();
	supabase._mockChain.textSearch.mockReturnThis();
	supabase._mockChain.filter.mockReturnThis();
	supabase._mockChain.match.mockReturnThis();
	supabase._mockChain.like.mockReturnThis();
	supabase._mockChain.ilike.mockReturnThis();
	supabase._mockChain.overlaps.mockReturnThis();
	supabase._mockChain.throwOnError.mockReturnThis();
	supabase._mockChain.returns.mockReturnThis();

	// Restore default then implementation
	supabase._mockChain.then.mockImplementation(
		(callback?: (value: SupabaseResponse<null>) => unknown) => {
			const result: SupabaseResponse<null> = { data: null, error: null };
			return callback ? Promise.resolve(callback(result)) : Promise.resolve(result);
		}
	);

	// Reset auth mocks
	supabase.auth.getUser.mockClear();
	supabase.auth.getSession.mockClear();
	supabase.auth.signIn.mockClear();
	supabase.auth.signOut.mockClear();
	supabase.auth.onAuthStateChange.mockClear();

	// Restore default auth implementations
	supabase.auth.getUser.mockResolvedValue({
		data: { user: null },
		error: null
	});
	supabase.auth.getSession.mockResolvedValue({
		data: { session: null },
		error: null
	});

	// Reset channel mocks
	supabase.channel.mockClear();
	supabase.removeChannel.mockClear();
}
