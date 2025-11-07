/**
 * VIP Card Draw System - Race Condition Integration Tests
 *
 * Tests critical race condition scenarios using real Supabase instance.
 *
 * REQUIREMENTS:
 * - Supabase local running on port 54321 (pnpm db:start)
 * - Tests verify SELECT FOR UPDATE prevents double-spend and double-use
 *
 * Tests:
 * 1. Double-spend prevention: 2 simultaneous draws with insufficient balance
 * 2. Double-use prevention: 2 simultaneous uses of same VIP card
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData,
	closeConnections
} from '../database/helpers/trigger-test-helpers';
import { createAuthenticatedClient } from '../database/helpers/supabase-client';
import { TestData } from '../database/helpers/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('POST /api/rewards/draw-vip-cards - Race Condition Tests', () => {
	let serviceClient: SupabaseClient<Database>;

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	beforeEach(async () => {
		// Clean up test data before each test to ensure isolation
		console.log('[beforeEach] Starting cleanup...');
		await cleanupAllTestData();
		// Wait a bit to ensure cleanup completes
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify cleanup worked
		const { data: profiles } = await serviceClient
			.from('profiles')
			.select('id, email')
			.like('email', '%@test.com%');
		console.log('[beforeEach] Test profiles remaining after cleanup:', profiles?.length || 0);
		if (profiles && profiles.length > 0) {
			console.log(
				'[beforeEach] Remaining profiles:',
				profiles.map((p) => `${p.email} (${p.id})`)
			);
		}
	});

	describe('Gidouilles Double-Spend Prevention', () => {
		it('should prevent double-spend when student makes 2 simultaneous draws with insufficient balance', async () => {
			// ========================================
			// ARRANGE: Setup test data
			// ========================================

			// Create test student with exactly 10 gidouilles
			console.log('[test] Creating student profile...');
			const student = await TestData.profile().withRole('student').withGidouilles(10).create();
			console.log('[test] Created student:', student.id, student.email);

			// Create authenticated client as the student
			const studentClient = await createAuthenticatedClient(student.email);

			// Verify initial balance
			const { data: initialProfile } = await serviceClient
				.from('profiles')
				.select('gidouilles')
				.eq('id', student.id)
				.single();

			expect(initialProfile?.gidouilles).toBe(10);

			// ========================================
			// ACT: Make 2 simultaneous RPC calls
			// Each trying to spend 10 gidouilles
			// ========================================

			const drawRequest = {
				p_student_id: student.id,
				p_count: 1,
				p_payment_method: 'gidouilles' as const,
				p_gidouilles_cost: 10,
				p_vip_card_instance_id: undefined
			};

			// Execute both calls simultaneously using Promise.allSettled
			// (We expect one to succeed and one to fail)
			console.log('[test] Starting simultaneous RPC calls...');
			const startTime = Date.now();
			const [result1, result2] = await Promise.allSettled([
				studentClient.rpc('draw_multiple_vip_cards', drawRequest),
				studentClient.rpc('draw_multiple_vip_cards', drawRequest)
			]);
			const duration = Date.now() - startTime;
			console.log('[test] Both calls completed in', duration, 'ms');
			console.log(
				'[test] Result 1:',
				result1.status,
				result1.status === 'fulfilled'
					? JSON.stringify((result1 as PromiseFulfilledResult<unknown>).value)
					: (result1 as PromiseRejectedResult).reason?.message
			);
			console.log(
				'[test] Result 2:',
				result2.status,
				result2.status === 'fulfilled'
					? JSON.stringify((result2 as PromiseFulfilledResult<unknown>).value)
					: (result2 as PromiseRejectedResult).reason?.message
			);

			// ========================================
			// ASSERT: Verify race condition protection
			// ========================================

			// Both promises should fulfill (Supabase RPC doesn't reject)
			// But one should have data, one should have error
			expect(result1.status).toBe('fulfilled');
			expect(result2.status).toBe('fulfilled');

			if (result1.status === 'fulfilled' && result2.status === 'fulfilled') {
				const responses = [result1.value, result2.value];
				const succeeded = responses.filter((r) => r.data !== null && r.error === null);
				const failed = responses.filter((r) => r.error !== null);

				console.log('[test] Succeeded:', succeeded.length, 'Failed:', failed.length);

				// Exactly one should succeed, one should fail
				expect(succeeded).toHaveLength(1);
				expect(failed).toHaveLength(1);

				// The failed response should have "Insufficient gidouilles" error
				const failedResponse = failed[0];
				expect(failedResponse.error).toBeDefined();
				const errorMessage = failedResponse.error?.message || '';
				console.log('[test] Failed with error:', errorMessage);
				expect(errorMessage).toMatch(/Insufficient gidouilles/i);

				// The succeeded response should return valid cards
				const successResponse = succeeded[0];
				expect(successResponse.data).toBeDefined();
				const cards = (successResponse.data as { cards?: unknown[] })?.cards;
				console.log('[test] Success returned', cards?.length, 'cards');
				expect(cards).toBeDefined();
				expect(Array.isArray(cards)).toBe(true);
				expect(cards).toHaveLength(1);
			}

			// ========================================
			// ASSERT: Verify final state
			// ========================================

			// Wait for transaction to complete
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Final balance should be exactly 0 (not -10)
			const { data: finalProfile } = await serviceClient
				.from('profiles')
				.select('gidouilles, vip_cards')
				.eq('id', student.id)
				.single();

			console.log('[test] Final gidouilles balance:', finalProfile?.gidouilles);
			console.log('[test] Expected: 0, Got:', finalProfile?.gidouilles);

			// If both succeeded, balance would be -10 (race condition!)
			// If one succeeded, balance would be 0 (correct behavior)
			// If both failed, balance would be 10 (shouldn't happen)
			expect(finalProfile?.gidouilles).toBe(0);

			// Student should have exactly 1 VIP card
			const vipCards = finalProfile?.vip_cards as Record<string, unknown> | null;
			expect(vipCards).toBeDefined();
			const cardCount = vipCards ? Object.keys(vipCards).length : 0;
			expect(cardCount).toBe(1);
		});

		it('should handle 3 simultaneous draws with balance for only 2', async () => {
			// ========================================
			// ARRANGE: Setup test data
			// ========================================

			// Create test student with 20 gidouilles (enough for 2 draws of 10)
			const student = await TestData.profile().withRole('student').withGidouilles(20).create();

			// Create authenticated client as the student
			const studentClient = await createAuthenticatedClient(student.email);

			// ========================================
			// ACT: Make 3 simultaneous RPC calls
			// Each trying to spend 10 gidouilles
			// ========================================

			const drawRequest = {
				p_student_id: student.id,
				p_count: 1,
				p_payment_method: 'gidouilles' as const,
				p_gidouilles_cost: 10,
				p_vip_card_instance_id: undefined
			};

			const [result1, result2, result3] = await Promise.allSettled([
				studentClient.rpc('draw_multiple_vip_cards', drawRequest),
				studentClient.rpc('draw_multiple_vip_cards', drawRequest),
				studentClient.rpc('draw_multiple_vip_cards', drawRequest)
			]);

			// ========================================
			// ASSERT: Verify race condition protection
			// ========================================

			// All promises should fulfill
			expect(result1.status).toBe('fulfilled');
			expect(result2.status).toBe('fulfilled');
			expect(result3.status).toBe('fulfilled');

			if (
				result1.status === 'fulfilled' &&
				result2.status === 'fulfilled' &&
				result3.status === 'fulfilled'
			) {
				const responses = [result1.value, result2.value, result3.value];
				const succeeded = responses.filter((r) => r.data !== null && r.error === null);
				const failed = responses.filter((r) => r.error !== null);

				// Exactly 2 should succeed (balance allows 20 / 10 = 2 draws)
				expect(succeeded).toHaveLength(2);
				expect(failed).toHaveLength(1);
			}

			// Wait for transaction to complete
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Final balance should be exactly 0
			const { data: finalProfile } = await serviceClient
				.from('profiles')
				.select('gidouilles, vip_cards')
				.eq('id', student.id)
				.single();

			expect(finalProfile?.gidouilles).toBe(0);

			// Student should have exactly 2 VIP cards
			const vipCards = finalProfile?.vip_cards as Record<string, unknown> | null;
			const cardCount = vipCards ? Object.keys(vipCards).length : 0;
			expect(cardCount).toBe(2);
		});
	});

	describe('VIP Card Double-Use Prevention', () => {
		it('should prevent double-use when student tries to use same VIP card twice simultaneously', async () => {
			// ========================================
			// ARRANGE: Setup test data
			// ========================================

			// Create test student
			const student = await TestData.profile()
				.withRole('student')
				.withGidouilles(0) // No gidouilles needed for VIP card payment
				.create();

			// Create authenticated client as the student
			const studentClient = await createAuthenticatedClient(student.email);

			// Create a VIP card with draw_cards action
			const vipCardInstanceId = crypto.randomUUID();
			const vipCards = {
				[vipCardInstanceId]: {
					cardId: 'fortune', // Fortune card has draw_cards action
					earnedAt: new Date().toISOString(),
					usedAt: null // Not yet used
				}
			};

			// Update student profile with VIP card
			await serviceClient.from('profiles').update({ vip_cards: vipCards }).eq('id', student.id);

			// Verify card exists and is unused
			const { data: initialProfile } = await serviceClient
				.from('profiles')
				.select('vip_cards')
				.eq('id', student.id)
				.single();

			const initialCards = initialProfile?.vip_cards as Record<string, { usedAt: string | null }>;
			expect(initialCards[vipCardInstanceId]).toBeDefined();
			expect(initialCards[vipCardInstanceId].usedAt).toBeNull();

			// ========================================
			// ACT: Make 2 simultaneous RPC calls
			// Both trying to use the same VIP card
			// ========================================

			const drawRequest = {
				p_student_id: student.id,
				p_count: 1,
				p_payment_method: 'vip_card' as const,
				p_gidouilles_cost: undefined,
				p_vip_card_instance_id: vipCardInstanceId
			};

			// Execute both calls simultaneously
			const [result1, result2] = await Promise.allSettled([
				studentClient.rpc('draw_multiple_vip_cards', drawRequest),
				studentClient.rpc('draw_multiple_vip_cards', drawRequest)
			]);

			// ========================================
			// ASSERT: Verify race condition protection
			// ========================================

			// Both promises should fulfill
			expect(result1.status).toBe('fulfilled');
			expect(result2.status).toBe('fulfilled');

			if (result1.status === 'fulfilled' && result2.status === 'fulfilled') {
				const responses = [result1.value, result2.value];
				const succeeded = responses.filter((r) => r.data !== null && r.error === null);
				const failed = responses.filter((r) => r.error !== null);

				// Exactly one should succeed
				expect(succeeded).toHaveLength(1);
				expect(failed).toHaveLength(1);

				// The failed response should have "VIP card already used" error
				const failedResponse = failed[0];
				expect(failedResponse.error).toBeDefined();
				const errorMessage = failedResponse.error?.message || '';
				expect(errorMessage).toMatch(/VIP card already used/i);

				// The succeeded response should return valid cards
				const successResponse = succeeded[0];
				expect(successResponse.data).toBeDefined();
				const cards = (successResponse.data as { cards?: unknown[] })?.cards;
				expect(cards).toBeDefined();
				expect(Array.isArray(cards)).toBe(true);
				expect(cards).toHaveLength(1);
			}

			// ========================================
			// ASSERT: Verify final state
			// ========================================

			// Wait for transaction to complete
			await new Promise((resolve) => setTimeout(resolve, 200));

			// VIP card should be marked as used exactly once
			const { data: finalProfile } = await serviceClient
				.from('profiles')
				.select('vip_cards')
				.eq('id', student.id)
				.single();

			const finalCards = finalProfile?.vip_cards as Record<
				string,
				{ usedAt: string | null; cardId: string }
			>;
			expect(finalCards[vipCardInstanceId]).toBeDefined();
			expect(finalCards[vipCardInstanceId].usedAt).not.toBeNull();

			// Student should have exactly 2 VIP cards total:
			// - 1 original (now used)
			// - 1 newly drawn
			const totalCards = Object.keys(finalCards).length;
			expect(totalCards).toBe(2);

			// Count used vs unused cards
			const usedCards = Object.values(finalCards).filter((card) => card.usedAt !== null);
			const unusedCards = Object.values(finalCards).filter((card) => card.usedAt === null);

			expect(usedCards).toHaveLength(1); // Original card marked as used
			expect(unusedCards).toHaveLength(1); // New card drawn
		});

		it('should prevent triple-use when 3 requests try to use same card simultaneously', async () => {
			// ========================================
			// ARRANGE: Setup test data
			// ========================================

			const student = await TestData.profile().withRole('student').withGidouilles(0).create();

			// Create authenticated client as the student
			const studentClient = await createAuthenticatedClient(student.email);

			// Create a VIP card
			const vipCardInstanceId = crypto.randomUUID();
			const vipCards = {
				[vipCardInstanceId]: {
					cardId: 'fortune',
					earnedAt: new Date().toISOString(),
					usedAt: null
				}
			};

			await serviceClient.from('profiles').update({ vip_cards: vipCards }).eq('id', student.id);

			// ========================================
			// ACT: Make 3 simultaneous RPC calls
			// ========================================

			const drawRequest = {
				p_student_id: student.id,
				p_count: 1,
				p_payment_method: 'vip_card' as const,
				p_gidouilles_cost: undefined,
				p_vip_card_instance_id: vipCardInstanceId
			};

			const [result1, result2, result3] = await Promise.allSettled([
				studentClient.rpc('draw_multiple_vip_cards', drawRequest),
				studentClient.rpc('draw_multiple_vip_cards', drawRequest),
				studentClient.rpc('draw_multiple_vip_cards', drawRequest)
			]);

			// ========================================
			// ASSERT: Verify protection
			// ========================================

			// All promises should fulfill
			expect(result1.status).toBe('fulfilled');
			expect(result2.status).toBe('fulfilled');
			expect(result3.status).toBe('fulfilled');

			if (
				result1.status === 'fulfilled' &&
				result2.status === 'fulfilled' &&
				result3.status === 'fulfilled'
			) {
				const responses = [result1.value, result2.value, result3.value];
				const succeeded = responses.filter((r) => r.data !== null && r.error === null);
				const failed = responses.filter((r) => r.error !== null);

				// Exactly 1 should succeed
				expect(succeeded).toHaveLength(1);
				expect(failed).toHaveLength(2);

				// Both failed responses should have "already used" error
				for (const failedResponse of failed) {
					expect(failedResponse.error).toBeDefined();
					const errorMessage = failedResponse.error?.message || '';
					expect(errorMessage).toMatch(/VIP card already used|VIP card not found/i);
				}
			}

			// Wait for transaction
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Final state: 1 used card + 1 new card = 2 total
			const { data: finalProfile } = await serviceClient
				.from('profiles')
				.select('vip_cards')
				.eq('id', student.id)
				.single();

			const finalCards = finalProfile?.vip_cards as Record<string, { usedAt: string | null }>;
			expect(Object.keys(finalCards).length).toBe(2);

			const usedCards = Object.values(finalCards).filter((card) => card.usedAt !== null);
			expect(usedCards).toHaveLength(1);
		});
	});

	describe('Mixed Race Conditions', () => {
		it('should handle simultaneous gidouilles and VIP card payments without interference', async () => {
			// ========================================
			// ARRANGE: Setup test data
			// ========================================

			const student = await TestData.profile().withRole('student').withGidouilles(10).create();

			// Create authenticated client as the student
			const studentClient = await createAuthenticatedClient(student.email);

			// Create a VIP card
			const vipCardInstanceId = crypto.randomUUID();
			const vipCards = {
				[vipCardInstanceId]: {
					cardId: 'fortune',
					earnedAt: new Date().toISOString(),
					usedAt: null
				}
			};

			await serviceClient.from('profiles').update({ vip_cards: vipCards }).eq('id', student.id);

			// ========================================
			// ACT: Make simultaneous gidouilles + VIP card payments
			// ========================================

			const gidouillesRequest = {
				p_student_id: student.id,
				p_count: 1,
				p_payment_method: 'gidouilles' as const,
				p_gidouilles_cost: 10,
				p_vip_card_instance_id: undefined
			};

			const vipCardRequest = {
				p_student_id: student.id,
				p_count: 1,
				p_payment_method: 'vip_card' as const,
				p_gidouilles_cost: undefined,
				p_vip_card_instance_id: vipCardInstanceId
			};

			// Both should succeed (different payment methods, no conflict)
			const [result1, result2] = await Promise.allSettled([
				studentClient.rpc('draw_multiple_vip_cards', gidouillesRequest),
				studentClient.rpc('draw_multiple_vip_cards', vipCardRequest)
			]);

			// ========================================
			// ASSERT: Both should succeed
			// ========================================

			expect(result1.status).toBe('fulfilled');
			expect(result2.status).toBe('fulfilled');

			// Wait for transactions
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Final state check
			const { data: finalProfile } = await serviceClient
				.from('profiles')
				.select('gidouilles, vip_cards')
				.eq('id', student.id)
				.single();

			// Gidouilles should be depleted
			expect(finalProfile?.gidouilles).toBe(0);

			// Should have 3 VIP cards total:
			// - 1 original (now used)
			// - 1 from gidouilles payment
			// - 1 from VIP card payment
			const finalCards = finalProfile?.vip_cards as Record<string, unknown>;
			expect(Object.keys(finalCards).length).toBe(3);
		});
	});
});
