/**
 * 2048 Score Endpoint - Milestone Insert via Service Role
 * ========================================================
 *
 * Verifies that achievement milestone inserts use the SERVICE-ROLE client,
 * not the authenticated user's client, because the RLS policy on
 * `student_achievements` rejects all inserts except from service_role.
 *
 * Regression context: the endpoint used to insert directly with the
 * authenticated client, which produced "new row violates row-level
 * security policy for table student_achievements" in production logs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture per-test via the mocked factory
let serviceRoleMock: ReturnType<typeof createTrackerClient>;

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => serviceRoleMock
}));

vi.mock('$lib/server/middleware/consent', () => ({
	requireConsent: vi.fn()
}));

// ============================================================================
// Minimal tracker client (just what the endpoint actually calls)
// ============================================================================

interface TrackerClient {
	from: ReturnType<typeof vi.fn>;
	rpc: ReturnType<typeof vi.fn>;
	insertSpy: ReturnType<typeof vi.fn>;
	selectSpy: ReturnType<typeof vi.fn>;
}

/**
 * Builds a Supabase-shaped client where we can answer per-table / per-RPC
 * with full chain support (`.from(t).insert(...).select(...)`,
 * `.rpc(name).maybeSingle()`, etc.) and we can inspect what was called.
 */
function createTrackerClient(options: {
	from?: Record<string, (chain: ChainBuilder) => ChainBuilder>;
	rpc?: Record<string, unknown | ((params: unknown) => unknown)>;
}): TrackerClient {
	const insertSpy = vi.fn();
	const selectSpy = vi.fn();

	const from = vi.fn((table: string) => {
		const chain = makeChain();
		const handler = options.from?.[table];
		// Wrap insert / select to also notify spies
		const wrappedInsert = chain.insert;
		chain.insert = vi.fn((...args: unknown[]) => {
			insertSpy(table, ...args);
			return wrappedInsert(...args);
		}) as any;
		const wrappedSelect = chain.select;
		chain.select = vi.fn((...args: unknown[]) => {
			selectSpy(table, ...args);
			return wrappedSelect(...args);
		}) as any;
		return handler ? handler(chain) : chain;
	});

	const rpc = vi.fn((name: string, params?: unknown) => {
		const handler = options.rpc?.[name];
		const result = typeof handler === 'function' ? handler(params) : handler;
		const promiseLike = {
			data: result ?? null,
			error: null
		};
		// Both `await rpc(...)` and `rpc(...).maybeSingle()` must work
		const chain = makeChain();
		chain.maybeSingle = vi.fn(() => Promise.resolve(promiseLike)) as any;
		chain.single = vi.fn(() => Promise.resolve(promiseLike)) as any;
		chain.then = ((onFulfilled?: (v: unknown) => unknown) =>
			onFulfilled
				? Promise.resolve(onFulfilled(promiseLike))
				: Promise.resolve(promiseLike)) as any;
		return chain;
	});

	return { from, rpc, insertSpy, selectSpy } as TrackerClient;
}

interface ChainBuilder {
	select: (...args: unknown[]) => ChainBuilder;
	insert: (...args: unknown[]) => ChainBuilder;
	update: (...args: unknown[]) => ChainBuilder;
	delete: () => ChainBuilder;
	eq: (...args: unknown[]) => ChainBuilder;
	in: (...args: unknown[]) => ChainBuilder;
	limit: (...args: unknown[]) => ChainBuilder;
	order: (...args: unknown[]) => ChainBuilder;
	single: () => Promise<{ data: unknown; error: unknown }>;
	maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
	then: <T>(onFulfilled?: (v: { data: unknown; error: unknown }) => T) => Promise<T>;
}

function makeChain(
	initialResult: { data: unknown; error: unknown } = { data: null, error: null }
): ChainBuilder {
	let result = initialResult;
	const chain: ChainBuilder = {
		select: vi.fn(() => chain),
		insert: vi.fn(() => chain),
		update: vi.fn(() => chain),
		delete: vi.fn(() => chain),
		eq: vi.fn(() => chain),
		in: vi.fn(() => chain),
		limit: vi.fn(() => chain),
		order: vi.fn(() => chain),
		single: vi.fn(() => Promise.resolve(result)),
		maybeSingle: vi.fn(() => Promise.resolve(result)),
		then: vi.fn((onFulfilled?: (v: { data: unknown; error: unknown }) => unknown) =>
			Promise.resolve(onFulfilled ? onFulfilled(result) : result)
		) as any
	};
	// Allow callers to set the result before awaiting
	(chain as any).__setResult = (r: { data: unknown; error: unknown }) => {
		result = r;
	};
	return chain;
}

// ============================================================================
// FIXTURES
// ============================================================================

const TEST_IDS = {
	student: '550e8400-e29b-41d4-a716-446655440001',
	school: '550e8400-e29b-41d4-a716-446655440010'
};

const studentProfile = {
	id: TEST_IDS.student,
	role: 'student' as const,
	email: 'student@example.com',
	firstname: 'Test',
	lastname: 'Student'
};

// Triggers `2048_first_2048` milestone
const milestoneBody = {
	score: 60000,
	reached_2048: true,
	reached_4096: false
};

function buildAuthClient(): TrackerClient {
	return createTrackerClient({
		from: {
			class_members: (chain) => {
				(chain as any).__setResult({
					data: { classes: { school_id: TEST_IDS.school } },
					error: null
				});
				return chain;
			},
			achievements: (chain) => {
				(chain as any).__setResult({
					data: [
						{
							id: '2048_first_2048',
							name: 'Premier 2048',
							metadata: { gidouilles_reward: 5 }
						},
						{
							id: '2048_score_50k',
							name: 'Score 50 000',
							metadata: { gidouilles_reward: 10 }
						}
					],
					error: null
				});
				return chain;
			},
			student_achievements: (chain) => {
				// SELECT of existing achievements returns empty array
				(chain as any).__setResult({ data: [], error: null });
				return chain;
			}
		},
		rpc: {
			upsert_2048_score: () => ({
				best_score: 60000,
				games_played: 1,
				is_new_best: true
			}),
			record_game_reward: () => ({
				actual_reward: 0.5,
				is_first_win: true,
				week_best_reward: 0.5
			})
		}
	});
}

function buildServiceRoleClient(): TrackerClient {
	return createTrackerClient({
		from: {
			student_achievements: (chain) => {
				// INSERT ... .select('id') returns inserted row
				(chain as any).__setResult({ data: [{ id: 'inserted-id' }], error: null });
				return chain;
			}
		},
		rpc: {
			update_student_gidouilles: () => null
		}
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe('POST /api/games/2048/scores - milestone inserts use service-role client', () => {
	let authClient: TrackerClient;

	beforeEach(() => {
		serviceRoleMock = buildServiceRoleClient();
		authClient = buildAuthClient();
	});

	it('uses the service-role client (not the authenticated client) to INSERT into student_achievements', async () => {
		const { POST } = await import('../+server');

		const request = new Request('http://localhost/api/games/2048/scores', {
			method: 'POST',
			body: JSON.stringify(milestoneBody),
			headers: { 'Content-Type': 'application/json' }
		});

		const locals = {
			supabase: authClient,
			user: { id: TEST_IDS.student },
			profile: studentProfile
		};

		await POST({ request, locals } as any);

		// Auth client must NEVER insert into student_achievements (RLS blocks it)
		const authInsertsOnStudentAchievements = authClient.insertSpy.mock.calls.filter(
			(c) => c[0] === 'student_achievements'
		);
		expect(authInsertsOnStudentAchievements).toHaveLength(0);

		// Service-role client MUST insert into student_achievements
		const serviceInsertsOnStudentAchievements = serviceRoleMock.insertSpy.mock.calls.filter(
			(c) => c[0] === 'student_achievements'
		);
		expect(serviceInsertsOnStudentAchievements.length).toBeGreaterThan(0);
	});

	it('uses the service-role client for update_student_gidouilles RPC', async () => {
		const { POST } = await import('../+server');

		const request = new Request('http://localhost/api/games/2048/scores', {
			method: 'POST',
			body: JSON.stringify(milestoneBody),
			headers: { 'Content-Type': 'application/json' }
		});

		const locals = {
			supabase: authClient,
			user: { id: TEST_IDS.student },
			profile: studentProfile
		};

		await POST({ request, locals } as any);

		const authGidouillesRpcCalls = authClient.rpc.mock.calls.filter(
			(c) => c[0] === 'update_student_gidouilles'
		);
		expect(authGidouillesRpcCalls).toHaveLength(0);

		const serviceGidouillesRpcCalls = serviceRoleMock.rpc.mock.calls.filter(
			(c) => c[0] === 'update_student_gidouilles'
		);
		expect(serviceGidouillesRpcCalls.length).toBeGreaterThan(0);
	});
});
