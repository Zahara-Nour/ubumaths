/**
 * VIP Card Drawing API - Security & Functional Test Suite
 * =========================================================
 *
 * Tests the POST /api/rewards/draw-vip-cards endpoint with comprehensive
 * security validation, edge cases, and functional scenarios.
 *
 * Critical Security Tests (P0):
 * - Students cannot draw free cards (cost = 0)
 * - Teachers can draw free cards
 * - Cost validation (proportional limit)
 * - Insufficient balance handling
 * - VIP card already used
 * - VIP card doesn't exist
 * - Unauthorized access
 * - Invalid count boundaries
 *
 * Input Validation Tests (P1):
 * - Zod schema validation
 * - Type safety
 *
 * Functional Tests (P2):
 * - Successful gidouilles payment
 * - Successful VIP card payment
 * - Multiple cards draw
 *
 * @module api/rewards/draw-vip-cards/+server.test
 */

import { describe, it, expect, vi, type Mock } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Mock user IDs for testing (valid UUIDs)
 */
const mockIds = {
	teacher: '550e8400-e29b-41d4-a716-446655440001',
	student1: '550e8400-e29b-41d4-a716-446655440002',
	student2: '550e8400-e29b-41d4-a716-446655440003',
	vipCardInstance: '550e8400-e29b-41d4-a716-446655440004',
	invalidUuid: 'not-a-uuid'
};

/**
 * Create a mock Supabase client
 */
function createMockSupabase(): SupabaseClient {
	return {
		rpc: vi.fn()
	} as unknown as SupabaseClient;
}

/**
 * Create a mock RequestEvent with proper typing
 */
function createMockRequest(
	body: unknown,
	userId: string | null = mockIds.teacher,
	role: 'teacher' | 'student' | 'admin' = 'teacher'
): RequestEvent {
	const mockSupabase = createMockSupabase();

	return {
		request: new Request('http://localhost/api/rewards/draw-vip-cards', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		}),
		locals: {
			user: userId ? { id: userId, role } : null,
			supabase: mockSupabase
		}
	} as unknown as RequestEvent;
}

/**
 * Mock successful RPC response for drawing cards
 */
function mockSuccessfulDraw(mockSupabase: SupabaseClient, count: number) {
	const cards = Array.from({ length: count }, (_, i) => ({
		cardId: 'bonus',
		instanceId: `instance-${i}`,
		earnedAt: new Date().toISOString()
	}));

	(mockSupabase.rpc as Mock).mockResolvedValueOnce({
		data: { cards },
		error: null
	});

	return cards;
}

/**
 * Mock RPC error response
 */
function mockRpcError(mockSupabase: SupabaseClient, errorMessage: string) {
	(mockSupabase.rpc as Mock).mockResolvedValueOnce({
		data: null,
		error: { message: errorMessage }
	});
}

// ============================================================================
// TEST SUITE: P0 - CRITICAL SECURITY TESTS
// ============================================================================

describe('POST /api/rewards/draw-vip-cards - P0 Security Tests', () => {
	describe('Free Cards (cost = 0) Security', () => {
		it('should reject student drawing free cards (cost = 0)', async () => {
			const request = createMockRequest(
				{
					studentId: mockIds.student1,
					count: 1,
					paymentMethod: 'gidouilles',
					gidouillesCost: 0
				},
				mockIds.student1,
				'student'
			);

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockRpcError(
				mockSupabase,
				'Unauthorized: Students cannot draw free cards (cost must be > 0)'
			);

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('cannot draw free cards') }
			});
		});

		it('should allow teacher drawing free cards (cost = 0)', async () => {
			const request = createMockRequest(
				{
					studentId: mockIds.student1,
					count: 1,
					paymentMethod: 'gidouilles',
					gidouillesCost: 0
				},
				mockIds.teacher,
				'teacher'
			);

			const mockSupabase = request.locals.supabase as SupabaseClient;
			const _cards = mockSuccessfulDraw(mockSupabase, 1);

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.cards).toHaveLength(1);
			expect(result.cards[0].cardId).toBe('bonus');

			// Verify RPC was called with correct parameters
			expect(mockSupabase.rpc).toHaveBeenCalledWith('draw_multiple_vip_cards', {
				p_student_id: mockIds.student1,
				p_count: 1,
				p_payment_method: 'gidouilles',
				p_gidouilles_cost: 0,
				p_vip_card_instance_id: null
			});
		});

		it('should allow admin drawing free cards (cost = 0)', async () => {
			const request = createMockRequest(
				{
					studentId: mockIds.student1,
					count: 2,
					paymentMethod: 'gidouilles',
					gidouillesCost: 0
				},
				mockIds.teacher,
				'admin'
			);

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockSuccessfulDraw(mockSupabase, 2);

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.cards).toHaveLength(2);
		});
	});

	describe('Cost Proportional Limit Validation', () => {
		it('should reject cost exceeding proportional limit (1 card, cost > 10)', async () => {
			const request = createMockRequest(
				{
					studentId: mockIds.student1,
					count: 1,
					paymentMethod: 'gidouilles',
					gidouillesCost: 50 // Max is 10 for 1 card
				},
				mockIds.teacher,
				'teacher'
			);

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockRpcError(mockSupabase, 'Invalid gidouilles_cost: Maximum 10 gidouilles for 1 cards');

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('Maximum 10 gidouilles') }
			});
		});

		it('should reject cost exceeding proportional limit (3 cards, cost > 30)', async () => {
			const request = createMockRequest(
				{
					studentId: mockIds.student1,
					count: 3,
					paymentMethod: 'gidouilles',
					gidouillesCost: 40 // Max is 30 for 3 cards
				},
				mockIds.teacher,
				'teacher'
			);

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockRpcError(mockSupabase, 'Invalid gidouilles_cost: Maximum 30 gidouilles for 3 cards');

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('Maximum 30 gidouilles') }
			});
		});

		it('should accept cost at proportional limit (5 cards, cost = 50)', async () => {
			const request = createMockRequest(
				{
					studentId: mockIds.student1,
					count: 5,
					paymentMethod: 'gidouilles',
					gidouillesCost: 50 // Exactly at limit
				},
				mockIds.teacher,
				'teacher'
			);

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockSuccessfulDraw(mockSupabase, 5);

			const response = await POST(request);
			expect(response.status).toBe(200);
		});
	});

	describe('Insufficient Balance', () => {
		it('should reject draw when student has insufficient gidouilles', async () => {
			const request = createMockRequest(
				{
					studentId: mockIds.student1,
					count: 1,
					paymentMethod: 'gidouilles',
					gidouillesCost: 10
				},
				mockIds.teacher,
				'teacher'
			);

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockRpcError(
				mockSupabase,
				'Insufficient gidouilles: Required 10, available 5 (shortfall: 5)'
			);

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('Insufficient gidouilles') }
			});
		});

		it('should reject draw when student has 0 balance', async () => {
			const request = createMockRequest(
				{
					studentId: mockIds.student1,
					count: 1,
					paymentMethod: 'gidouilles',
					gidouillesCost: 5
				},
				mockIds.teacher,
				'teacher'
			);

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockRpcError(mockSupabase, 'Insufficient gidouilles: Required 5, available 0 (shortfall: 5)');

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('Insufficient gidouilles') }
			});
		});
	});

	describe('VIP Card Already Used', () => {
		it('should reject using an already used VIP card', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'vip_card',
				vipCardInstanceId: mockIds.vipCardInstance
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockRpcError(
				mockSupabase,
				'VIP card already used: This card was used at 2025-11-04T10:30:00Z'
			);

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('VIP card already used') }
			});
		});
	});

	describe('VIP Card Not Found', () => {
		it('should reject using non-existent VIP card instance', async () => {
			const nonExistentId = '550e8400-e29b-41d4-a716-999999999999'; // Valid UUID format
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'vip_card',
				vipCardInstanceId: nonExistentId
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockRpcError(mockSupabase, `VIP card not found: Instance ID ${nonExistentId} does not exist`);

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('VIP card not found') }
			});
		});
	});

	describe('Unauthorized Access', () => {
		it('should reject unauthenticated requests', async () => {
			const request = createMockRequest(
				{
					studentId: mockIds.student1,
					count: 1,
					paymentMethod: 'gidouilles',
					gidouillesCost: 5
				},
				null // No user
			);

			await expect(POST(request)).rejects.toThrow();
		});

		it('should reject student drawing cards for another student', async () => {
			const request = createMockRequest(
				{
					studentId: mockIds.student2, // Different student
					count: 1,
					paymentMethod: 'gidouilles',
					gidouillesCost: 5
				},
				mockIds.student1,
				'student'
			);

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockRpcError(
				mockSupabase,
				'Unauthorized: You can only draw cards for yourself or your students'
			);

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('Unauthorized') }
			});
		});

		it('should reject teacher drawing cards for student not in their class', async () => {
			const request = createMockRequest(
				{
					studentId: mockIds.student2,
					count: 1,
					paymentMethod: 'gidouilles',
					gidouillesCost: 5
				},
				mockIds.teacher,
				'teacher'
			);

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockRpcError(mockSupabase, 'Unauthorized: Student is not in your classes');

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('not in your classes') }
			});
		});
	});

	describe('Invalid Count Boundaries', () => {
		it('should reject count = 0 (Zod validation)', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 0, // Invalid
				paymentMethod: 'gidouilles',
				gidouillesCost: 0
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('at least 1') }
			});
		});

		it('should reject count = 11 (Zod validation)', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 11, // Invalid
				paymentMethod: 'gidouilles',
				gidouillesCost: 10
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('more than 10') }
			});
		});

		it('should reject count = -1 (Zod validation)', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: -1, // Invalid
				paymentMethod: 'gidouilles',
				gidouillesCost: 5
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('at least 1') }
			});
		});

		it('should accept count = 1 (minimum valid)', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 5
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockSuccessfulDraw(mockSupabase, 1);

			const response = await POST(request);
			expect(response.status).toBe(200);
		});

		it('should accept count = 10 (maximum valid)', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 10,
				paymentMethod: 'gidouilles',
				gidouillesCost: 50
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockSuccessfulDraw(mockSupabase, 10);

			const response = await POST(request);
			expect(response.status).toBe(200);
		});
	});
});

// ============================================================================
// TEST SUITE: P1 - INPUT VALIDATION TESTS
// ============================================================================

describe('POST /api/rewards/draw-vip-cards - P1 Input Validation', () => {
	describe('Zod Schema Validation', () => {
		it('should reject missing studentId', async () => {
			const request = createMockRequest({
				// studentId missing
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 5
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject invalid studentId (not UUID)', async () => {
			const request = createMockRequest({
				studentId: mockIds.invalidUuid,
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 5
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('Invalid student ID') }
			});
		});

		it('should reject missing paymentMethod', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1
				// paymentMethod missing
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject invalid paymentMethod', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'crypto' // Invalid
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject missing gidouillesCost when paymentMethod=gidouilles', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'gidouilles'
				// gidouillesCost missing
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject missing vipCardInstanceId when paymentMethod=vip_card', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'vip_card'
				// vipCardInstanceId missing
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject negative gidouillesCost', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: -5
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('negative') }
			});
		});

		it('should reject gidouillesCost > 100', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 101
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('100') }
			});
		});

		it('should reject invalid vipCardInstanceId (not UUID)', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'vip_card',
				vipCardInstanceId: 'not-a-uuid'
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: expect.stringContaining('Invalid VIP card instance ID') }
			});
		});
	});

	describe('Type Safety', () => {
		it('should reject studentId as number instead of string', async () => {
			const request = createMockRequest({
				studentId: 12345, // Wrong type
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 5
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject count as string instead of number', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: '5', // Wrong type
				paymentMethod: 'gidouilles',
				gidouillesCost: 5
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject gidouillesCost as string instead of number', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: '10' // Wrong type
			});

			await expect(POST(request)).rejects.toMatchObject({
				status: 400
			});
		});
	});
});

// ============================================================================
// TEST SUITE: P2 - FUNCTIONAL TESTS
// ============================================================================

describe('POST /api/rewards/draw-vip-cards - P2 Functional Tests', () => {
	describe('Successful Gidouilles Payment', () => {
		it('should successfully draw 1 card with gidouilles payment', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 5
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			const _expectedCards = mockSuccessfulDraw(mockSupabase, 1);

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.cards).toHaveLength(1);
			expect(result.cards[0]).toHaveProperty('cardId');
			expect(result.cards[0]).toHaveProperty('instanceId');
			expect(result.cards[0]).toHaveProperty('earnedAt');

			// Verify RPC call structure
			expect(mockSupabase.rpc).toHaveBeenCalledWith('draw_multiple_vip_cards', {
				p_student_id: mockIds.student1,
				p_count: 1,
				p_payment_method: 'gidouilles',
				p_gidouilles_cost: 5,
				p_vip_card_instance_id: null
			});
		});

		it('should return proper response structure for gidouilles payment', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 3,
				paymentMethod: 'gidouilles',
				gidouillesCost: 15
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockSuccessfulDraw(mockSupabase, 3);

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result).toHaveProperty('cards');
			expect(Array.isArray(result.cards)).toBe(true);
			expect(result.cards).toHaveLength(3);

			// Verify each card has required fields
			result.cards.forEach((card: unknown) => {
				expect(card).toHaveProperty('cardId');
				expect(card).toHaveProperty('instanceId');
				expect(card).toHaveProperty('earnedAt');
			});
		});
	});

	describe('Successful VIP Card Payment', () => {
		it('should successfully draw cards using VIP card payment', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 2,
				paymentMethod: 'vip_card',
				vipCardInstanceId: mockIds.vipCardInstance
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockSuccessfulDraw(mockSupabase, 2);

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.cards).toHaveLength(2);

			// Verify RPC called with VIP card parameters
			expect(mockSupabase.rpc).toHaveBeenCalledWith('draw_multiple_vip_cards', {
				p_student_id: mockIds.student1,
				p_count: 2,
				p_payment_method: 'vip_card',
				p_gidouilles_cost: null,
				p_vip_card_instance_id: mockIds.vipCardInstance
			});
		});

		it('should return proper response structure for VIP card payment', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'vip_card',
				vipCardInstanceId: mockIds.vipCardInstance
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockSuccessfulDraw(mockSupabase, 1);

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.cards).toHaveLength(1);
			expect(result.cards[0].cardId).toBeTruthy();
			expect(result.cards[0].instanceId).toBeTruthy();
			expect(result.cards[0].earnedAt).toBeTruthy();
		});
	});

	describe('Multiple Cards Draw', () => {
		it('should successfully draw 5 cards', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 5,
				paymentMethod: 'gidouilles',
				gidouillesCost: 25
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockSuccessfulDraw(mockSupabase, 5);

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.cards).toHaveLength(5);
		});

		it('should return unique instanceIds for multiple cards', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 3,
				paymentMethod: 'gidouilles',
				gidouillesCost: 15
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			const cards = [
				{ cardId: 'bonus', instanceId: 'instance-1', earnedAt: new Date().toISOString() },
				{ cardId: 'super-bonus', instanceId: 'instance-2', earnedAt: new Date().toISOString() },
				{ cardId: 'choix', instanceId: 'instance-3', earnedAt: new Date().toISOString() }
			];

			(mockSupabase.rpc as Mock).mockResolvedValueOnce({
				data: { cards },
				error: null
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.cards).toHaveLength(3);

			// Extract instanceIds
			const instanceIds = result.cards.map((card: { instanceId: string }) => card.instanceId);

			// Verify all are unique
			const uniqueIds = new Set(instanceIds);
			expect(uniqueIds.size).toBe(3);
		});

		it('should successfully draw maximum 10 cards', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 10,
				paymentMethod: 'gidouilles',
				gidouillesCost: 100
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockSuccessfulDraw(mockSupabase, 10);

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.cards).toHaveLength(10);
		});
	});

	describe('Error Handling', () => {
		it('should handle RPC function errors gracefully', async () => {
			const request = createMockRequest({
				studentId: mockIds.student1,
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 5
			});

			const mockSupabase = request.locals.supabase as SupabaseClient;
			mockRpcError(mockSupabase, 'Database connection failed');

			await expect(POST(request)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Database connection failed' }
			});
		});

		it('should handle malformed JSON in request body', async () => {
			const request = {
				request: new Request('http://localhost/api/rewards/draw-vip-cards', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: '{invalid json}'
				}),
				locals: {
					user: { id: mockIds.teacher, role: 'teacher' },
					supabase: createMockSupabase()
				}
			} as unknown as RequestEvent;

			await expect(POST(request)).rejects.toThrow();
		});
	});
});

// ============================================================================
// TEST SUITE: RACE CONDITION TESTS (TODO - Requires Supabase)
// ============================================================================

describe('POST /api/rewards/draw-vip-cards - Race Condition Tests', () => {
	it.todo(
		'should prevent double-spend when student makes 2 simultaneous draws with insufficient balance',
		async () => {
			// TODO: This test requires actual Supabase instance with SELECT FOR UPDATE
			// Test scenario:
			// - Student has 10 gidouilles
			// - Makes 2 simultaneous API calls, each trying to spend 10 gidouilles
			// Expected outcome:
			// - One request succeeds, balance becomes 0
			// - Other request fails with "Insufficient gidouilles"
			// - Final balance is 0 (not -10)
			//
			// Implementation note:
			// This requires integration testing with Docker Supabase (see tests/database/triggers/)
		}
	);

	it.todo(
		'should prevent double-use when student tries to use same VIP card twice simultaneously',
		async () => {
			// TODO: This test requires actual Supabase instance
			// Test scenario:
			// - Student has 1 VIP card with draw_cards action
			// - Makes 2 simultaneous API calls with same vipCardInstanceId
			// Expected outcome:
			// - One request succeeds, card is marked as used
			// - Other request fails with "VIP card already used"
			// - Card is only used once
		}
	);
});
