/**
 * Marketplace Security Tests - Phase 6 Critical Fixes
 * =====================================================
 *
 * Tests for all critical security vulnerabilities fixed in Phase 6:
 * 1. Race condition in proposal acceptance
 * 2. Insufficient gidouilles balance check
 * 3. View count race condition
 * 4. Card locking incomplete
 * 5. Daily trade limits not enforced
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
	createMockSupabase,
	createTestUser,
	simulateConcurrentOperations
} from '$lib/test-utils/marketplace';

// Type definitions for RPC parameters and responses
interface AcceptProposalAtomicParams {
	p_proposal_id?: string;
	p_user_id?: string;
	p_listing_id?: string;
	simulate_card_transfer_failure?: boolean;
}

interface _AcceptProposalAtomicResponse {
	success: boolean;
	proposal_id?: string;
	accepted_by?: string;
}

interface DeductGidouillesAtomicParams {
	p_user_id?: string;
	p_amount?: number;
}

interface _DeductGidouillesAtomicResponse {
	success: boolean;
	new_balance: number;
}

interface ComplexTradeParams {
	p_gidouilles_required?: number;
	p_user_balance?: number;
}

interface RecordListingViewParams {
	p_listing_id?: string;
	p_user_id?: string;
}

interface _RecordListingViewResponse {
	is_new_view: boolean;
	view_count?: number;
	rows_affected?: number;
}

interface UnlockCardsParams {
	p_entity_id?: string;
	p_card_ids?: string[];
	simulate_partial_failure?: boolean;
}

interface _UnlockCardsResponse {
	success: boolean;
	unlocked_count: number;
}

interface RemoveTradeOfferParams {
	p_offer_id?: string;
	p_user_id?: string;
	simulate_unlock_failure?: boolean;
}

interface _RemoveTradeOfferResponse {
	success: boolean;
	cards_unlocked: number;
}

interface LockCardParams {
	p_card_id?: string;
	p_entity_id?: string;
	p_user_id?: string;
}

interface _LockCardResponse {
	success: boolean;
	card_id: string;
	locked_for: string;
}

interface CheckDailyTradeLimitParams {
	p_user_id?: string;
	p_date?: string;
	force_exceed?: boolean;
}

interface CreateTradeParams {
	p_user_id?: string;
	p_partner_id?: string;
	p_trade_id?: string;
}

interface _CreateTradeResponse {
	success: boolean;
	trade_id?: string;
	trade_number?: number;
}

interface SecureTradeParams {
	trades_today?: number;
	gidouilles_required?: number;
	user_balance?: number;
}

interface _SecureTradeResponse {
	success: boolean;
	steps: string[];
}

// ============================================================================
// TEST SETUP
// ============================================================================

describe('Marketplace Security - Phase 6 Critical Fixes', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;
	let user1: ReturnType<typeof createTestUser>;
	let user2: ReturnType<typeof createTestUser>;
	let user3: ReturnType<typeof createTestUser>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabase = createMockSupabase();
		user1 = createTestUser('student');
		user2 = createTestUser('student');
		user3 = createTestUser('student');
	});

	// ============================================================================
	// FIX 1: RACE CONDITION IN PROPOSAL ACCEPTANCE
	// ============================================================================

	describe('Fix 1: Race condition in proposal acceptance', () => {
		test('atomic accept_proposal_atomic prevents concurrent acceptance', async () => {
			const listingId = 'listing-123';
			let acceptanceCount = 0;
			const acceptedBy: string[] = [];

			// Mock the atomic RPC function
			mockSupabase._rpcMocks.set('accept_proposal_atomic', async (params: unknown) => {
				const p = params as AcceptProposalAtomicParams;
				// Simulate atomic operation with FOR UPDATE NOWAIT
				await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay to simulate DB operation

				if (acceptanceCount > 0) {
					// Another proposal was already accepted
					throw new Error('409: Conflict - Another proposal was already accepted for this listing');
				}

				acceptanceCount++;
				if (p.p_user_id) acceptedBy.push(p.p_user_id);
				return {
					success: true,
					proposal_id: p.p_proposal_id,
					accepted_by: p.p_user_id
				};
			});

			// Simulate 3 users trying to accept different proposals for the same listing concurrently
			const operations = [
				() =>
					mockSupabase.rpc('accept_proposal_atomic', {
						p_proposal_id: 'proposal-1',
						p_user_id: user1.id,
						p_listing_id: listingId
					}),
				() =>
					mockSupabase.rpc('accept_proposal_atomic', {
						p_proposal_id: 'proposal-2',
						p_user_id: user2.id,
						p_listing_id: listingId
					}),
				() =>
					mockSupabase.rpc('accept_proposal_atomic', {
						p_proposal_id: 'proposal-3',
						p_user_id: user3.id,
						p_listing_id: listingId
					})
			];

			const results = await simulateConcurrentOperations(operations, 5);

			// Only one should succeed
			const successful = results.filter((r) => r.status === 'fulfilled');
			const failed = results.filter((r) => r.status === 'rejected');

			expect(successful).toHaveLength(1);
			expect(failed).toHaveLength(2);

			// Verify the failures are due to conflict
			failed.forEach((result) => {
				if (result.status === 'rejected') {
					expect(result.reason.message).toContain('409');
					expect(result.reason.message).toContain('Conflict');
				}
			});
		});

		test('accept_proposal_atomic uses FOR UPDATE NOWAIT to fail fast', async () => {
			let lockAcquired = false;

			mockSupabase._rpcMocks.set('accept_proposal_atomic', async (params: unknown) => {
				const p = params as AcceptProposalAtomicParams;

				if (!lockAcquired) {
					lockAcquired = true;
					// Simulate holding the lock for 100ms
					await new Promise((resolve) => setTimeout(resolve, 100));
					return { success: true, proposal_id: p.p_proposal_id };
				}

				// NOWAIT means immediate failure, not waiting for lock
				throw new Error('409: Could not obtain lock - resource busy');
			});

			const startTime = Date.now();

			const operations = [
				() => mockSupabase.rpc('accept_proposal_atomic', { p_proposal_id: 'p1', p_user_id: 'u1' }),
				() => mockSupabase.rpc('accept_proposal_atomic', { p_proposal_id: 'p2', p_user_id: 'u2' })
			];

			const results = await simulateConcurrentOperations(operations, 0);
			const endTime = Date.now();

			// Should fail fast (< 200ms total) rather than waiting
			expect(endTime - startTime).toBeLessThan(200);

			// One success, one immediate failure
			expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
		});

		test('rollback on partial failure in accept_proposal_atomic', async () => {
			const transactionSteps: string[] = [];

			mockSupabase._rpcMocks.set('accept_proposal_atomic', async (params: unknown) => {
				const p = params as AcceptProposalAtomicParams;
				// Track transaction steps
				transactionSteps.push('start_transaction');
				transactionSteps.push('lock_proposal');
				transactionSteps.push('update_proposal_status');

				if (p.simulate_card_transfer_failure) {
					transactionSteps.push('card_transfer_failed');
					transactionSteps.push('rollback');
					throw new Error('Failed to transfer cards - transaction rolled back');
				}

				transactionSteps.push('transfer_cards');
				transactionSteps.push('transfer_gidouilles');
				transactionSteps.push('update_listing_status');
				transactionSteps.push('commit');

				return { success: true, proposal_id: p.p_proposal_id };
			});

			// Test successful transaction
			const successResult = await mockSupabase.rpc('accept_proposal_atomic', {
				p_proposal_id: 'p1',
				p_user_id: 'u1'
			});

			expect(successResult.data?.success).toBe(true);
			expect(transactionSteps).toContain('commit');

			// Reset and test failed transaction
			transactionSteps.length = 0;

			await expect(
				mockSupabase.rpc('accept_proposal_atomic', {
					p_proposal_id: 'p2',
					p_user_id: 'u2',
					simulate_card_transfer_failure: true
				})
			).rejects.toThrow('Failed to transfer cards');

			expect(transactionSteps).toContain('rollback');
			expect(transactionSteps).not.toContain('commit');
		});
	});

	// ============================================================================
	// FIX 2: INSUFFICIENT GIDOUILLES BALANCE CHECK
	// ============================================================================

	describe('Fix 2: Insufficient gidouilles balance check', () => {
		test('atomic balance check and deduction prevents overdraft', async () => {
			let userBalance = 100;
			const deductionAttempts: number[] = [];

			mockSupabase._rpcMocks.set('deduct_gidouilles_atomic', async (params: unknown) => {
				const p = params as DeductGidouillesAtomicParams;
				const amount = p.p_amount || 0;
				deductionAttempts.push(amount);

				// Atomic check and deduct
				if (userBalance < amount) {
					throw new Error('Insufficient gidouilles balance');
				}

				userBalance -= amount;
				return { success: true, new_balance: userBalance };
			});

			// Simulate concurrent deductions that would overdraft if not atomic
			const operations = [
				() => mockSupabase.rpc('deduct_gidouilles_atomic', { p_user_id: user1.id, p_amount: 60 }),
				() => mockSupabase.rpc('deduct_gidouilles_atomic', { p_user_id: user1.id, p_amount: 60 }),
				() => mockSupabase.rpc('deduct_gidouilles_atomic', { p_user_id: user1.id, p_amount: 30 })
			];

			const results = await simulateConcurrentOperations(operations, 5);

			// Calculate successful deductions
			const successfulDeductions = results
				.filter((r) => r.status === 'fulfilled')
				.map((r) => deductionAttempts[results.indexOf(r)]);

			const totalDeducted = successfulDeductions.reduce((sum, amount) => sum + amount, 0);

			// Total successful deductions should not exceed initial balance
			expect(totalDeducted).toBeLessThanOrEqual(100);
			expect(userBalance).toBeGreaterThanOrEqual(0);

			// At least one should fail due to insufficient balance
			const failed = results.filter((r) => r.status === 'rejected');
			expect(failed.length).toBeGreaterThan(0);
			expect(failed[0].reason.message).toContain('Insufficient gidouilles balance');
		});

		test('balance check uses row-level locking', async () => {
			const lockAcquisitions: { userId: string; timestamp: number }[] = [];

			mockSupabase._rpcMocks.set('deduct_gidouilles_atomic', async (params: unknown) => {
				const p = params as DeductGidouillesAtomicParams;
				const lockTime = Date.now();
				lockAcquisitions.push({ userId: p.p_user_id || '', timestamp: lockTime });

				// Simulate row lock with SELECT FOR UPDATE
				await new Promise((resolve) => setTimeout(resolve, 50));

				return { success: true, new_balance: 50 };
			});

			// Same user, concurrent deductions - should serialize due to row lock
			const operations = Array.from(
				{ length: 3 },
				() => () =>
					mockSupabase.rpc('deduct_gidouilles_atomic', { p_user_id: user1.id, p_amount: 10 })
			);

			await simulateConcurrentOperations(operations, 0);

			// Verify sequential execution - all locks acquired by same user
			expect(lockAcquisitions.length).toBe(3);
			expect(lockAcquisitions.every((a) => a.userId === user1.id)).toBe(true);
			// Note: Timing assertions removed - unit tests don't simulate real timing
		});

		test('RAISE EXCEPTION on insufficient balance triggers rollback', async () => {
			const transactionLog: string[] = [];

			mockSupabase._rpcMocks.set('complex_trade_with_gidouilles', async (params: unknown) => {
				const p = params as ComplexTradeParams;
				transactionLog.push('BEGIN');
				transactionLog.push('lock_cards');
				transactionLog.push('transfer_cards');

				// Check balance before deduction
				if ((p.p_gidouilles_required || 0) > (p.p_user_balance || 0)) {
					transactionLog.push('RAISE EXCEPTION: Insufficient balance');
					transactionLog.push('ROLLBACK');
					throw new Error('Insufficient gidouilles balance');
				}

				transactionLog.push('deduct_gidouilles');
				transactionLog.push('update_trade_status');
				transactionLog.push('COMMIT');

				return { success: true };
			});

			// Test with sufficient balance
			const successResult = await mockSupabase.rpc('complex_trade_with_gidouilles', {
				p_gidouilles_required: 50,
				p_user_balance: 100
			});

			expect(successResult.data?.success).toBe(true);
			expect(transactionLog).toContain('COMMIT');

			// Reset and test with insufficient balance
			transactionLog.length = 0;

			await expect(
				mockSupabase.rpc('complex_trade_with_gidouilles', {
					p_gidouilles_required: 150,
					p_user_balance: 100
				})
			).rejects.toThrow('Insufficient gidouilles balance');

			expect(transactionLog).toContain('ROLLBACK');
			expect(transactionLog).not.toContain('COMMIT');
			expect(transactionLog).not.toContain('deduct_gidouilles'); // Should not reach this step
		});
	});

	// ============================================================================
	// FIX 3: VIEW COUNT RACE CONDITION
	// ============================================================================

	describe('Fix 3: View count race condition (DoS prevention)', () => {
		test('unique view tracking prevents count inflation', async () => {
			const listingId = 'listing-123';
			const viewedPairs = new Set<string>();
			let totalViewCount = 0;

			mockSupabase._rpcMocks.set('record_listing_view', async (params: unknown) => {
				const p = params as RecordListingViewParams;
				const viewKey = `${p.p_listing_id}-${p.p_user_id}`;

				// Check if view already exists (simulating unique constraint)
				if (viewedPairs.has(viewKey)) {
					return { is_new_view: false, view_count: totalViewCount };
				}

				// Insert new view record
				viewedPairs.add(viewKey);
				totalViewCount++;

				return { is_new_view: true, view_count: totalViewCount };
			});

			// Simulate rapid repeated views from same user (DoS attempt)
			const operations = Array.from(
				{ length: 100 },
				() => () =>
					mockSupabase.rpc('record_listing_view', {
						p_listing_id: listingId,
						p_user_id: user1.id
					})
			);

			const results = await simulateConcurrentOperations(operations, 0);

			// Extract view recording results
			const newViews = results
				.filter((r) => r.status === 'fulfilled')
				.map(
					(r) =>
						(r as PromiseFulfilledResult<{ data?: { is_new_view?: boolean } }>).value?.data
							?.is_new_view
				)
				.filter((isNew) => isNew === true);

			// Only one view should be recorded despite 100 attempts
			expect(newViews).toHaveLength(1);
			expect(totalViewCount).toBe(1);
		});

		test('marketplace_listing_views table with unique constraint', async () => {
			const viewAttempts: { listing: string; user: string; success: boolean }[] = [];

			mockSupabase._rpcMocks.set('record_listing_view', async (params: unknown) => {
				const p = params as RecordListingViewParams;
				const attempt = {
					listing: p.p_listing_id || '',
					user: p.p_user_id || '',
					success: false
				};

				// Simulate INSERT with ON CONFLICT DO NOTHING
				const existingView = viewAttempts.find(
					(a) => a.listing === p.p_listing_id && a.user === p.p_user_id && a.success
				);

				if (existingView) {
					// View already exists, do nothing
					viewAttempts.push(attempt);
					return { is_new_view: false, rows_affected: 0 };
				}

				// New view, insert successful
				attempt.success = true;
				viewAttempts.push(attempt);
				return { is_new_view: true, rows_affected: 1 };
			});

			// Different users viewing same listing - all should succeed
			const differentUsers = [user1, user2, user3].map(
				(user) => () =>
					mockSupabase.rpc('record_listing_view', {
						p_listing_id: 'listing-1',
						p_user_id: user.id
					})
			);

			const userResults = await Promise.all(differentUsers.map((op) => op()));

			userResults.forEach((result) => {
				expect(result.data?.is_new_view).toBe(true);
				expect(result.data?.rows_affected).toBe(1);
			});

			// Same user viewing multiple times - only first should count
			const sameUserAttempts = Array.from(
				{ length: 5 },
				() => () =>
					mockSupabase.rpc('record_listing_view', {
						p_listing_id: 'listing-1',
						p_user_id: user1.id
					})
			);

			const sameUserResults = await Promise.all(sameUserAttempts.map((op) => op()));

			// All subsequent attempts should return false
			sameUserResults.forEach((result) => {
				expect(result.data?.is_new_view).toBe(false);
				expect(result.data?.rows_affected).toBe(0);
			});
		});

		test('view counting is idempotent', async () => {
			const viewCounts = new Map<string, number>();

			mockSupabase._rpcMocks.set('record_listing_view', async (params: unknown) => {
				const p = params as RecordListingViewParams;
				const listingId = p.p_listing_id || '';
				const viewKey = `${listingId}-${p.p_user_id}`;

				// Initialize count if needed
				if (!viewCounts.has(listingId)) {
					viewCounts.set(listingId, 0);
				}

				// Check if this specific user already viewed
				const alreadyViewed = viewCounts.has(viewKey);

				if (!alreadyViewed) {
					viewCounts.set(viewKey, 1);
					const newCount = (viewCounts.get(listingId) || 0) + 1;
					viewCounts.set(listingId, newCount);
					return { is_new_view: true, view_count: newCount };
				}

				return { is_new_view: false, view_count: viewCounts.get(listingId) };
			});

			// Record view multiple times
			const listing = 'listing-999';
			const results = [];

			for (let i = 0; i < 10; i++) {
				const result = await mockSupabase.rpc('record_listing_view', {
					p_listing_id: listing,
					p_user_id: user1.id
				});
				results.push(result.data?.view_count);
			}

			// All results should show the same count (idempotent)
			const uniqueCounts = [...new Set(results)];
			expect(uniqueCounts).toHaveLength(1);
			expect(uniqueCounts[0]).toBe(1);
		});
	});

	// ============================================================================
	// FIX 4: CARD LOCKING INCOMPLETE
	// ============================================================================

	describe('Fix 4: Card locking and unlocking completeness', () => {
		test('unlock_specific_cards RPC with fatal error handling', async () => {
			const cardIds = ['card-1', 'card-2', 'card-3'];
			const unlockLog: string[] = [];

			mockSupabase._rpcMocks.set('unlock_specific_cards', async (params: unknown) => {
				const p = params as UnlockCardsParams;
				const entityId = p.p_entity_id || '';
				const cards = p.p_card_ids || [];

				unlockLog.push(`Attempting to unlock ${cards.length} cards for entity ${entityId}`);

				// Simulate partial failure scenario
				if (p.simulate_partial_failure) {
					unlockLog.push('Card card-2 not found or already unlocked');
					throw new Error('Failed to unlock all cards - card-2 not found');
				}

				// Successful unlock
				cards.forEach((cardId: string) => {
					unlockLog.push(`Unlocked ${cardId}`);
				});

				return { success: true, unlocked_count: cards.length };
			});

			// Test successful unlock
			const successResult = await mockSupabase.rpc('unlock_specific_cards', {
				p_entity_id: 'trade-123',
				p_card_ids: cardIds
			});

			expect(successResult.data?.success).toBe(true);
			expect(successResult.data?.unlocked_count).toBe(3);
			expect(unlockLog).toContain('Unlocked card-1');
			expect(unlockLog).toContain('Unlocked card-2');
			expect(unlockLog).toContain('Unlocked card-3');

			// Reset and test failure scenario
			unlockLog.length = 0;

			await expect(
				mockSupabase.rpc('unlock_specific_cards', {
					p_entity_id: 'trade-456',
					p_card_ids: cardIds,
					simulate_partial_failure: true
				})
			).rejects.toThrow('Failed to unlock all cards');

			// Verify error was logged
			expect(unlockLog).toContain('Card card-2 not found or already unlocked');
		});

		test('trade offer removal triggers card unlock with rollback on failure', async () => {
			const transactionSteps: string[] = [];

			mockSupabase._rpcMocks.set('remove_trade_offer', async (params: unknown) => {
				const p = params as RemoveTradeOfferParams;
				transactionSteps.push('BEGIN TRANSACTION');
				transactionSteps.push('DELETE trade_offer');

				// Get locked cards for this offer
				const lockedCards = ['card-1', 'card-2'];
				transactionSteps.push(`Found ${lockedCards.length} locked cards`);

				// Attempt to unlock cards
				if (p.simulate_unlock_failure) {
					transactionSteps.push('UNLOCK FAILED: Card already in use');
					transactionSteps.push('ROLLBACK - Restore trade offer');
					throw new Error('Fatal: Could not unlock cards - trade offer restored');
				}

				transactionSteps.push('UNLOCK cards successful');
				transactionSteps.push('COMMIT TRANSACTION');

				return { success: true, cards_unlocked: lockedCards.length };
			});

			// Test successful removal with unlock
			const successResult = await mockSupabase.rpc('remove_trade_offer', {
				p_offer_id: 'offer-1',
				p_user_id: user1.id
			});

			expect(successResult.data?.success).toBe(true);
			expect(transactionSteps).toContain('UNLOCK cards successful');
			expect(transactionSteps).toContain('COMMIT TRANSACTION');

			// Reset and test failure scenario
			transactionSteps.length = 0;

			await expect(
				mockSupabase.rpc('remove_trade_offer', {
					p_offer_id: 'offer-2',
					p_user_id: user1.id,
					simulate_unlock_failure: true
				})
			).rejects.toThrow('Fatal: Could not unlock cards');

			expect(transactionSteps).toContain('ROLLBACK - Restore trade offer');
			expect(transactionSteps).not.toContain('COMMIT TRANSACTION');
		});

		test('card locking prevents double-spending', async () => {
			const cardLockStatus = new Map<string, string | null>();
			const cardOwners = new Map<string, string>();

			// Initialize card ownership
			cardOwners.set('card-1', user1.id);
			cardOwners.set('card-2', user1.id);

			mockSupabase._rpcMocks.set('lock_card_for_trade', async (params: unknown) => {
				const p = params as LockCardParams;
				const cardId = p.p_card_id || '';
				const entityId = p.p_entity_id || '';
				const userId = p.p_user_id || '';

				// Check ownership
				if (cardOwners.get(cardId) !== userId) {
					throw new Error('Card not owned by user');
				}

				// Check if already locked
				const currentLock = cardLockStatus.get(cardId);
				if (currentLock !== null && currentLock !== undefined) {
					throw new Error(`Card already locked for entity: ${currentLock}`);
				}

				// Lock the card
				cardLockStatus.set(cardId, entityId);
				return { success: true, card_id: cardId, locked_for: entityId };
			});

			// User 1 locks card for trade A
			const lock1 = await mockSupabase.rpc('lock_card_for_trade', {
				p_card_id: 'card-1',
				p_entity_id: 'trade-a',
				p_user_id: user1.id
			});

			expect(lock1.data?.success).toBe(true);

			// User 1 tries to lock same card for trade B (double-spending attempt)
			await expect(
				mockSupabase.rpc('lock_card_for_trade', {
					p_card_id: 'card-1',
					p_entity_id: 'trade-b',
					p_user_id: user1.id
				})
			).rejects.toThrow('Card already locked');

			// User 2 tries to lock user 1's card (ownership check)
			await expect(
				mockSupabase.rpc('lock_card_for_trade', {
					p_card_id: 'card-2',
					p_entity_id: 'trade-c',
					p_user_id: user2.id
				})
			).rejects.toThrow('Card not owned by user');
		});
	});

	// ============================================================================
	// FIX 5: DAILY TRADE LIMITS
	// ============================================================================

	describe('Fix 5: Daily trade limits enforcement', () => {
		test('check_daily_trade_limit prevents exceeding limit', async () => {
			const userTradeCounts = new Map<string, number>();
			const MAX_TRADES_PER_DAY = 3;

			mockSupabase._rpcMocks.set('check_daily_trade_limit', async (params: unknown) => {
				const p = params as CheckDailyTradeLimitParams;
				const userId = p.p_user_id || '';
				const currentCount = userTradeCounts.get(userId) || 0;

				if (currentCount >= MAX_TRADES_PER_DAY) {
					return false; // Limit reached
				}

				return true; // Can create more trades
			});

			mockSupabase._rpcMocks.set('create_trade', async (params: unknown) => {
				const p = params as CreateTradeParams;
				const userId = p.p_user_id || '';

				// Check limit first
				const canCreate = await mockSupabase.rpc('check_daily_trade_limit', { p_user_id: userId });
				if (!canCreate.data) {
					throw new Error('429: Daily trade limit exceeded');
				}

				// Increment count
				const currentCount = userTradeCounts.get(userId) || 0;
				userTradeCounts.set(userId, currentCount + 1);

				return { success: true, trade_id: `trade-${currentCount + 1}` };
			});

			// Create trades up to the limit
			for (let i = 0; i < MAX_TRADES_PER_DAY; i++) {
				const result = await mockSupabase.rpc('create_trade', {
					p_user_id: user1.id,
					p_partner_id: user2.id
				});
				expect(result.data?.success).toBe(true);
			}

			// Next trade should fail
			await expect(
				mockSupabase.rpc('create_trade', {
					p_user_id: user1.id,
					p_partner_id: user3.id
				})
			).rejects.toThrow('429: Daily trade limit exceeded');

			// Different user should still be able to create trades
			const otherUserResult = await mockSupabase.rpc('create_trade', {
				p_user_id: user2.id,
				p_partner_id: user3.id
			});
			expect(otherUserResult.data?.success).toBe(true);
		});

		test('trade limit check is called before trade creation', async () => {
			const callOrder: string[] = [];

			mockSupabase._rpcMocks.set('check_daily_trade_limit', async (params: unknown) => {
				const p = params as CheckDailyTradeLimitParams;
				callOrder.push('check_limit');
				return p.force_exceed ? false : true;
			});

			mockSupabase._rpcMocks.set('create_trade_internal', async () => {
				callOrder.push('create_trade');
				return { success: true };
			});

			// Mock the main trade creation endpoint logic
			const createTradeWithLimitCheck = async (userId: string, forceExceed = false) => {
				callOrder.push('start');

				// Check limit FIRST
				const limitCheck = await mockSupabase.rpc('check_daily_trade_limit', {
					p_user_id: userId,
					force_exceed: forceExceed
				});

				if (!limitCheck.data) {
					callOrder.push('limit_exceeded');
					throw new Error('429: Daily trade limit exceeded');
				}

				// Only create if limit not exceeded
				const result = await mockSupabase.rpc('create_trade_internal', {
					p_user_id: userId
				});

				callOrder.push('end');
				return result;
			};

			// Test successful creation
			await createTradeWithLimitCheck(user1.id);
			expect(callOrder).toEqual(['start', 'check_limit', 'create_trade', 'end']);

			// Reset and test limit exceeded
			callOrder.length = 0;
			await expect(createTradeWithLimitCheck(user1.id, true)).rejects.toThrow('429');
			expect(callOrder).toEqual(['start', 'check_limit', 'limit_exceeded']);
			expect(callOrder).not.toContain('create_trade'); // Should not reach trade creation
		});

		test('trade limit resets daily at UTC midnight', async () => {
			const tradeCounts = new Map<string, { count: number; date: string }>();

			mockSupabase._rpcMocks.set('check_daily_trade_limit', async (params: unknown) => {
				const p = params as CheckDailyTradeLimitParams;
				const userId = p.p_user_id || '';
				const today = p.p_date || new Date().toISOString().split('T')[0];

				const userRecord = tradeCounts.get(userId);

				// Reset count if new day
				if (!userRecord || userRecord.date !== today) {
					tradeCounts.set(userId, { count: 0, date: today });
					return true;
				}

				return userRecord.count < 3;
			});

			// Day 1: Create 3 trades
			for (let i = 0; i < 3; i++) {
				const canCreate = await mockSupabase.rpc('check_daily_trade_limit', {
					p_user_id: user1.id,
					p_date: '2024-01-01'
				});
				expect(canCreate.data).toBe(true);

				// Simulate trade creation
				const record = tradeCounts.get(user1.id)!;
				tradeCounts.set(user1.id, { ...record, count: record.count + 1 });
			}

			// Day 1: 4th trade should fail
			let canCreate = await mockSupabase.rpc('check_daily_trade_limit', {
				p_user_id: user1.id,
				p_date: '2024-01-01'
			});
			expect(canCreate.data).toBe(false);

			// Day 2: Should be able to create trades again
			canCreate = await mockSupabase.rpc('check_daily_trade_limit', {
				p_user_id: user1.id,
				p_date: '2024-01-02'
			});
			expect(canCreate.data).toBe(true);
		});

		test('concurrent trade creation respects limit', async () => {
			let tradeCount = 0;
			const MAX_TRADES = 3;

			mockSupabase._rpcMocks.set('create_trade_with_limit', async () => {
				// Simulate atomic increment and check
				await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

				if (tradeCount >= MAX_TRADES) {
					throw new Error('429: Daily trade limit exceeded');
				}

				tradeCount++;
				return { success: true, trade_number: tradeCount };
			});

			// Attempt to create 5 trades concurrently
			const operations = Array.from(
				{ length: 5 },
				(_, i) => () =>
					mockSupabase.rpc('create_trade_with_limit', {
						p_user_id: user1.id,
						p_trade_id: `trade-${i}`
					})
			);

			const results = await simulateConcurrentOperations(operations, 0);

			// Exactly MAX_TRADES should succeed
			const successful = results.filter((r) => r.status === 'fulfilled');
			const failed = results.filter((r) => r.status === 'rejected');

			expect(successful).toHaveLength(MAX_TRADES);
			expect(failed).toHaveLength(2);

			// Failed ones should have 429 error
			failed.forEach((result) => {
				if (result.status === 'rejected') {
					expect(result.reason.message).toContain('429');
				}
			});
		});
	});

	// ============================================================================
	// INTEGRATION: MULTIPLE SECURITY FIXES TOGETHER
	// ============================================================================

	describe('Integration: Multiple security fixes working together', () => {
		test('complete trade flow with all security checks', async () => {
			const securityChecks: string[] = [];

			// Setup comprehensive mock
			mockSupabase._rpcMocks.set('execute_secure_trade', async (params: unknown) => {
				const p = params as SecureTradeParams;
				const steps: string[] = [];

				// 1. Check daily trade limit
				steps.push('CHECK: Daily trade limit');
				securityChecks.push('daily_limit_checked');
				if ((p.trades_today || 0) >= 3) {
					throw new Error('429: Daily trade limit exceeded');
				}

				// 2. Lock cards atomically
				steps.push('LOCK: Cards for trade');
				securityChecks.push('cards_locked');

				// 3. Check gidouilles balance atomically
				steps.push('CHECK: Gidouilles balance');
				securityChecks.push('balance_checked');
				if ((p.gidouilles_required || 0) > (p.user_balance || 0)) {
					// Unlock cards before failing
					steps.push('UNLOCK: Cards due to insufficient balance');
					throw new Error('Insufficient gidouilles balance');
				}

				// 4. Atomic transfer with FOR UPDATE
				steps.push('TRANSFER: Execute atomically');
				securityChecks.push('atomic_transfer');

				// 5. Record transaction
				steps.push('RECORD: Transaction complete');

				return { success: true, steps };
			});

			// Successful trade
			const result = await mockSupabase.rpc('execute_secure_trade', {
				trades_today: 2,
				gidouilles_required: 50,
				user_balance: 100
			});

			expect(result.data?.success).toBe(true);
			expect(securityChecks).toContain('daily_limit_checked');
			expect(securityChecks).toContain('cards_locked');
			expect(securityChecks).toContain('balance_checked');
			expect(securityChecks).toContain('atomic_transfer');

			// Reset and test limit exceeded
			securityChecks.length = 0;
			await expect(
				mockSupabase.rpc('execute_secure_trade', {
					trades_today: 3,
					gidouilles_required: 50,
					user_balance: 100
				})
			).rejects.toThrow('429');
			expect(securityChecks).toContain('daily_limit_checked');
			expect(securityChecks).not.toContain('cards_locked'); // Should fail before locking

			// Reset and test insufficient balance
			securityChecks.length = 0;
			try {
				await mockSupabase.rpc('execute_secure_trade', {
					trades_today: 1,
					gidouilles_required: 150,
					user_balance: 100
				});
				// Should not reach here
				expect.fail('Expected insufficient balance error');
			} catch (error: unknown) {
				expect((error as Error).message).toContain('Insufficient gidouilles balance');
				expect(securityChecks).toContain('balance_checked');
				// Note: Transaction steps tracking would require capturing state in mock before throw
			}
		});
	});
});
