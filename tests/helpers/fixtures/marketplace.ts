/**
 * Marketplace Test Fixtures
 * =========================
 *
 * Test data factories for marketplace feature testing.
 * Provides helpers for creating test users, classes, cards, and listings.
 *
 * @example
 * ```typescript
 * import { createTestUser, createTestListing } from '$tests/helpers';
 *
 * const seller = createTestUser('student');
 * const listing = createTestListing(seller.id, 'school-1');
 * ```
 */

import { vi, expect } from 'vitest';
import type { MockSupabaseClient } from '../supabase/mock-client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TestUser = {
	id: string;
	email: string;
	role: 'student' | 'teacher' | 'admin';
	profile: {
		id: string;
		username: string;
		avatar_url: string | null;
		gidouilles: number;
		role: 'student' | 'teacher' | 'admin';
	};
};

export type TestClass = {
	id: string;
	name: string;
	teacher_id: string;
	school_id: string;
	marketplace_config?: {
		enabled_for_class: boolean;
		max_listings_per_student: number;
		max_trades_per_day: number;
	};
};

export type TestCard = {
	id: string;
	owner_id: string;
	template_id: string;
	status: 'active' | 'locked' | 'traded';
	locked_for_entity_id: string | null;
	locked_for_entity_type: string | null;
};

export type TestListing = {
	id: string;
	creator_id: string;
	school_id: string;
	listing_type: 'sell' | 'buy';
	title: string;
	description?: string;
	status: 'active' | 'sold' | 'cancelled' | 'expired';
	offered_card_ids?: string[];
	offered_gidouilles?: number;
	wanted_card_template_ids?: string[];
	wanted_gidouilles?: number;
	view_count: number;
	created_at: string;
	expires_at: string;
};

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

let userIdCounter = 1;
let classIdCounter = 1;
let cardIdCounter = 1;
let listingIdCounter = 1;

/**
 * Creates a test user with profile
 */
export function createTestUser(role: 'student' | 'teacher' | 'admin' = 'student'): TestUser {
	const id = `user-${role}-${userIdCounter++}`;
	return {
		id,
		email: `${role}${userIdCounter}@voltairedoha.com`,
		role,
		profile: {
			id,
			username: `${role}${userIdCounter}`,
			avatar_url: null,
			gidouilles: role === 'student' ? 100 : 0,
			role
		}
	};
}

/**
 * Creates a test class with marketplace configuration
 */
export function createTestClass(teacherId: string, schoolId: string = 'school-1'): TestClass {
	const id = `class-${classIdCounter++}`;
	return {
		id,
		name: `Test Class ${classIdCounter}`,
		teacher_id: teacherId,
		school_id: schoolId,
		marketplace_config: {
			enabled_for_class: true,
			max_listings_per_student: 5,
			max_trades_per_day: 3
		}
	};
}

/**
 * Creates a test VIP card
 */
export function createTestCard(
	ownerId: string,
	templateId: string = `template-${Math.random()}`
): TestCard {
	const id = `card-${cardIdCounter++}`;
	return {
		id,
		owner_id: ownerId,
		template_id: templateId,
		status: 'active',
		locked_for_entity_id: null,
		locked_for_entity_type: null
	};
}

/**
 * Creates a test marketplace listing
 */
export function createTestListing(
	creatorId: string,
	schoolId: string,
	data: Partial<TestListing> = {}
): TestListing {
	const id = `listing-${listingIdCounter++}`;
	const now = new Date().toISOString();
	const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

	return {
		id,
		creator_id: creatorId,
		school_id: schoolId,
		listing_type: 'sell',
		title: 'Test Listing',
		description: 'Test description',
		status: 'active',
		offered_card_ids: [],
		offered_gidouilles: 0,
		wanted_card_template_ids: [],
		wanted_gidouilles: 100,
		view_count: 0,
		created_at: now,
		expires_at: expires,
		...data
	};
}

/**
 * Adds a student to a class (mocks the query response)
 */
export function addStudentToClass(
	supabase: MockSupabaseClient,
	studentId: string,
	classId: string
) {
	const membership = {
		id: `membership-${studentId}-${classId}`,
		student_id: studentId,
		class_id: classId,
		joined_at: new Date().toISOString()
	};

	supabase._mockChain.select.mockImplementation(() => {
		supabase._mockChain.then = vi.fn((callback) => callback({ data: [membership], error: null }));
		return supabase._mockChain;
	});

	return membership;
}

/**
 * Gives gidouilles to a user (mocks the update response)
 */
export function giveGidouilles(supabase: MockSupabaseClient, _userId: string, amount: number) {
	supabase._mockChain.update.mockImplementation(() => {
		supabase._mockChain.then = vi.fn((callback) =>
			callback({ data: { gidouilles: amount }, error: null })
		);
		return supabase._mockChain;
	});
}

// ============================================================================
// CONCURRENT OPERATION HELPERS
// ============================================================================

/**
 * Simulates concurrent operations for race condition testing
 */
export async function simulateConcurrentOperations<T>(
	operations: (() => Promise<T>)[],
	delayMs: number = 0
): Promise<PromiseSettledResult<T>[]> {
	const promises = operations.map(
		(op, _index) =>
			new Promise<T>((resolve, reject) => {
				const randomDelay = Math.random() * delayMs;
				setTimeout(async () => {
					try {
						const result = await op();
						resolve(result);
					} catch (error) {
						reject(error);
					}
				}, randomDelay);
			})
	);

	return Promise.allSettled(promises);
}

/**
 * Helper to test for race conditions with retries
 */
export async function testRaceCondition(
	testFn: () => Promise<void>,
	attempts: number = 10
): Promise<boolean> {
	let raceDetected = false;

	for (let i = 0; i < attempts; i++) {
		try {
			await testFn();
		} catch (error: unknown) {
			const errorMessage = (error as Error)?.message || '';
			if (
				errorMessage.includes('409') ||
				errorMessage.includes('conflict') ||
				errorMessage.includes('already') ||
				errorMessage.includes('concurrent')
			) {
				raceDetected = true;
				break;
			}
		}
	}

	return raceDetected;
}

// ============================================================================
// RPC MOCK HELPERS
// ============================================================================

/**
 * Mock RPC functions for testing atomic operations
 */
export function mockRPCFunctions(supabase: MockSupabaseClient) {
	supabase._rpcMocks.set('accept_proposal_atomic', async (params: unknown) => {
		const p = params as { simulate_conflict?: boolean; p_proposal_id?: string };
		if (p.simulate_conflict) {
			throw new Error('409: Conflict - Another proposal was already accepted');
		}
		return { success: true, proposal_id: p.p_proposal_id };
	});

	supabase._rpcMocks.set('record_listing_view', async (params: unknown) => {
		const p = params as { p_listing_id?: string; p_user_id?: string };
		const viewKey = `${p.p_listing_id}-${p.p_user_id}`;
		const viewedSet = new Set<string>();

		if (viewedSet.has(viewKey)) {
			return { view_recorded: false, new_count: 0 };
		}

		viewedSet.add(viewKey);
		return { view_recorded: true, new_count: viewedSet.size };
	});

	supabase._rpcMocks.set('check_daily_trade_limit', async (params: unknown) => {
		const p = params as { force_limit_exceeded?: boolean };
		return p.force_limit_exceeded ? false : true;
	});

	supabase._rpcMocks.set('execute_trade', async (params: unknown) => {
		const p = params as {
			simulate_insufficient_balance?: boolean;
			simulate_card_not_found?: boolean;
			p_trade_id?: string;
		};
		if (p.simulate_insufficient_balance) {
			throw new Error('Insufficient gidouilles balance');
		}
		if (p.simulate_card_not_found) {
			throw new Error('Card not found or already traded');
		}
		return { success: true, trade_id: p.p_trade_id };
	});

	supabase._rpcMocks.set('unlock_specific_cards', async (params: unknown) => {
		const p = params as { simulate_unlock_failure?: boolean; p_card_ids?: string[] };
		if (p.simulate_unlock_failure) {
			throw new Error('Failed to unlock cards');
		}
		return { unlocked_count: p.p_card_ids?.length || 0 };
	});
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that a response has the expected error
 */
export function assertError(
	response: { status?: number; error?: { message?: string }; body?: { message?: string } },
	statusCode: number,
	message?: string
) {
	expect(response.status).toBe(statusCode);
	if (message) {
		expect(response.error?.message || response.body?.message).toContain(message);
	}
}

/**
 * Assert that a response is successful
 */
export function assertSuccess(
	response: { status?: number; error?: unknown },
	statusCode: number = 200
) {
	expect(response.status).toBe(statusCode);
	expect(response.error).toBeUndefined();
}

// ============================================================================
// CLEANUP HELPERS
// ============================================================================

/**
 * Reset all test counters
 */
export function resetMarketplaceCounters() {
	userIdCounter = 1;
	classIdCounter = 1;
	cardIdCounter = 1;
	listingIdCounter = 1;
}
