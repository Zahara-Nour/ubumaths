/**
 * POST /api/vip-cards/sell - Unit Tests
 * ======================================
 *
 * Tests for selling VIP cards back to the system for gidouilles.
 * The RPC handles all business logic; these tests verify the endpoint's
 * input validation, RPC delegation, and response mapping.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '$tests/helpers/supabase/mock-client';
import { createMockLocals } from '$tests/helpers/supabase/mock-locals';
import { createMockRequest } from '$tests/helpers/supabase/mock-request';

const TEST_IDS = {
	student: '550e8400-e29b-41d4-a716-446655440001',
	cardInstance: '660e8400-e29b-41d4-a716-446655440010'
};

const STUDENT_PROFILE = {
	id: TEST_IDS.student,
	role: 'student',
	firstname: 'Test',
	lastname: 'Student',
	email: 'student@test.com',
	is_test: false,
	parental_consents: {}
};

// ============================================================================
// HELPERS
// ============================================================================

function createStudentLocals(supabase?: ReturnType<typeof createMockSupabase>) {
	const mockSupabase = supabase ?? createMockSupabase();
	// Mock the profile lookup used by requireRole -> requireAuth
	mockSupabase._mockChain.single.mockResolvedValue({
		data: STUDENT_PROFILE,
		error: null
	});
	return createMockLocals(TEST_IDS.student, mockSupabase, 'student');
}

async function callSellEndpoint(body: unknown, locals: any) {
	const { POST } = await import('../+server');
	const request = createMockRequest(body);
	return POST({ request, locals } as any);
}

/** Helper to catch HttpError and return its status and body */
async function callAndCatchError(body: unknown, locals: any) {
	try {
		await callSellEndpoint(body, locals);
		return null; // no error
	} catch (err: any) {
		return { status: err.status, body: err.body };
	}
}

// ============================================================================
// TESTS: Input Validation
// ============================================================================

describe('POST /api/vip-cards/sell - Input Validation', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('should reject missing cardInstanceId', async () => {
		const locals = createStudentLocals();
		await expect(callSellEndpoint({}, locals)).rejects.toThrow();
	});

	it('should reject invalid UUID for cardInstanceId', async () => {
		const locals = createStudentLocals();
		await expect(callSellEndpoint({ cardInstanceId: 'not-a-uuid' }, locals)).rejects.toThrow();
	});

	it('should reject extra fields (strict mode)', async () => {
		const locals = createStudentLocals();
		await expect(
			callSellEndpoint({ cardInstanceId: TEST_IDS.cardInstance, extraField: 'bad' }, locals)
		).rejects.toThrow();
	});
});

// ============================================================================
// TESTS: Authentication
// ============================================================================

describe('POST /api/vip-cards/sell - Authentication', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('should reject unauthenticated requests', async () => {
		const locals = createMockLocals();
		await expect(
			callSellEndpoint({ cardInstanceId: TEST_IDS.cardInstance }, locals)
		).rejects.toThrow();
	});

	it('should reject non-student roles', async () => {
		const supabase = createMockSupabase();
		supabase._mockChain.single.mockResolvedValue({
			data: { ...STUDENT_PROFILE, role: 'teacher' },
			error: null
		});
		const locals = createMockLocals(TEST_IDS.student, supabase, 'teacher');
		await expect(
			callSellEndpoint({ cardInstanceId: TEST_IDS.cardInstance }, locals)
		).rejects.toThrow();
	});
});

// ============================================================================
// TESTS: Successful Sale
// ============================================================================

describe('POST /api/vip-cards/sell - Success', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('should return success with sell price and new balance', async () => {
		const supabase = createMockSupabase();
		const locals = createStudentLocals(supabase);

		supabase._rpcMocks.set('sell_vip_card', async () => ({
			success: true,
			sellPrice: 3,
			cardId: 'bonus',
			cardName: 'Bonus',
			oldBalance: 50,
			newBalance: 53
		}));

		const response = await callSellEndpoint({ cardInstanceId: TEST_IDS.cardInstance }, locals);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.sellPrice).toBe(3);
		expect(data.newBalance).toBe(53);
		expect(data.cardId).toBe('bonus');
		expect(data.cardName).toBe('Bonus');
	});
});

// ============================================================================
// TESTS: RPC Error Handling
// ============================================================================

describe('POST /api/vip-cards/sell - RPC Errors', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('should return 404 when card not found', async () => {
		const supabase = createMockSupabase();
		const locals = createStudentLocals(supabase);

		supabase._rpcMocks.set('sell_vip_card', async () => ({
			success: false,
			error: 'Card instance not found'
		}));

		const err = await callAndCatchError({ cardInstanceId: TEST_IDS.cardInstance }, locals);

		expect(err).not.toBeNull();
		expect(err!.status).toBe(404);
	});

	it('should return 400 when card already used', async () => {
		const supabase = createMockSupabase();
		const locals = createStudentLocals(supabase);

		supabase._rpcMocks.set('sell_vip_card', async () => ({
			success: false,
			error: 'Cannot sell a card that has already been used'
		}));

		const err = await callAndCatchError({ cardInstanceId: TEST_IDS.cardInstance }, locals);

		expect(err).not.toBeNull();
		expect(err!.status).toBe(400);
	});

	it('should return 400 when card has pending activation', async () => {
		const supabase = createMockSupabase();
		const locals = createStudentLocals(supabase);

		supabase._rpcMocks.set('sell_vip_card', async () => ({
			success: false,
			error: 'Cannot sell a card with a pending activation request'
		}));

		const err = await callAndCatchError({ cardInstanceId: TEST_IDS.cardInstance }, locals);

		expect(err).not.toBeNull();
		expect(err!.status).toBe(400);
	});

	it('should return 400 when card is locked in marketplace', async () => {
		const supabase = createMockSupabase();
		const locals = createStudentLocals(supabase);

		supabase._rpcMocks.set('sell_vip_card', async () => ({
			success: false,
			error: 'Cannot sell a card that is listed or in a trade on the marketplace'
		}));

		const err = await callAndCatchError({ cardInstanceId: TEST_IDS.cardInstance }, locals);

		expect(err).not.toBeNull();
		expect(err!.status).toBe(400);
	});

	it('should return 400 with secondsRemaining when cooldown active', async () => {
		const supabase = createMockSupabase();
		const locals = createStudentLocals(supabase);

		supabase._rpcMocks.set('sell_vip_card', async () => ({
			success: false,
			error: 'Cooldown active: please wait before selling this card',
			secondsRemaining: 180
		}));

		const response = await callSellEndpoint({ cardInstanceId: TEST_IDS.cardInstance }, locals);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.success).toBe(false);
		expect(data.secondsRemaining).toBe(180);
	});

	it('should return 500 on RPC system error', async () => {
		const supabase = createMockSupabase();
		const locals = createStudentLocals(supabase);

		supabase._rpcMocks.set('sell_vip_card', () => {
			throw new Error('Connection refused');
		});

		const err = await callAndCatchError({ cardInstanceId: TEST_IDS.cardInstance }, locals);

		expect(err).not.toBeNull();
		expect(err!.status).toBe(500);
	});
});
