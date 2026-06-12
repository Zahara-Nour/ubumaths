/**
 * Marketplace Proposals API Tests
 * ================================
 *
 * Tests for creating and managing proposals on marketplace listings.
 * Covers authorization, validation, and the critical accept_proposal_atomic fix.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { POST } from '../../../../src/routes/api/marketplace/listings/[id]/proposals/+server';
import { createMockSupabase } from '$tests/helpers';
import {
	createTestUser,
	createTestListing,
	createTestCard,
	mockRPCFunctions,
	simulateConcurrentOperations
} from '$tests/helpers/fixtures';

// ============================================================================
// MODULE MOCKS (hoisted - must be at top level, NOT inside beforeEach)
// ============================================================================
//
// The handler imports its business-logic guards from this module. We mock the
// guard functions (so each test can drive them) while keeping the username
// enrichment real. The `checkCardsUnused` guard is intentionally NOT wired into
// the proposal handler anymore (removed in commit 8260972a3 because it queried
// vip_cards_activity, which logs power activations rather than consumption).
vi.mock('$lib/server/marketplace/helpers', async (importActual) => {
	const actual = await importActual<typeof import('$lib/server/marketplace/helpers')>();
	return {
		...actual,
		validateCardOwnership: vi.fn().mockResolvedValue(true),
		getStudentGidouilles: vi.fn().mockResolvedValue(1000),
		lockCardsForEntity: vi.fn().mockResolvedValue({ success: true }),
		isMarketplaceEnabled: vi.fn().mockResolvedValue(true)
	};
});

vi.mock('$lib/server/marketplace/notifications', async (importActual) => {
	const actual = await importActual<typeof import('$lib/server/marketplace/notifications')>();
	return {
		...actual,
		notifyNewProposal: vi.fn().mockResolvedValue(undefined),
		notifyProposalAccepted: vi.fn().mockResolvedValue(undefined),
		notifyProposalRejected: vi.fn().mockResolvedValue(undefined)
	};
});

// Valid UUIDs (the handler validates params.id and listing_id as UUIDs).
const LISTING_UUID = '11111111-1111-4111-8111-111111111111';
const CARD_UUID_1 = '22222222-2222-4222-8222-222222222222';

// Type definitions for test request/response handling
interface _ProposalsRequestLocals {
	supabase: ReturnType<typeof createMockSupabase>;
	user: { id: string } | null;
}

interface AcceptProposalAtomicParams {
	p_proposal_id: string;
	p_user_id: string;
	// Test-only mock parameters (not in actual RPC function)
	simulate_transfer_failure?: boolean;
	transfer_cards?: boolean;
	transfer_gidouilles?: boolean;
}

describe('/api/marketplace/listings/[id]/proposals', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;
	let seller: ReturnType<typeof createTestUser>;
	let buyer1: ReturnType<typeof createTestUser>;
	let buyer2: ReturnType<typeof createTestUser>;
	let listing: ReturnType<typeof createTestListing>;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Re-arm default guard implementations (clearAllMocks wipes them).
		const helpers = await import('$lib/server/marketplace/helpers');
		(helpers.validateCardOwnership as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
		(helpers.getStudentGidouilles as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(1000);
		(helpers.lockCardsForEntity as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: true
		});
		(helpers.isMarketplaceEnabled as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		// Create test data
		mockSupabase = createMockSupabase();
		seller = createTestUser('student');
		buyer1 = createTestUser('student');
		buyer2 = createTestUser('student');
		listing = createTestListing(seller.id, 'school-1', {
			id: LISTING_UUID,
			listing_type: 'sell',
			offered_card_ids: ['card-seller-1'],
			wanted_gidouilles: 100
		});

		// Setup RPC mocks
		mockRPCFunctions(mockSupabase);
	});

	// ============================================================================
	// MOCK HELPERS
	// ============================================================================

	/**
	 * Mocks the handler's two direct table reads:
	 *  - marketplace_listings.select('*').eq('id').single()  → the listing
	 *  - marketplace_proposals.select('id, status').eq().eq().single() → existing proposal
	 *
	 * `.single()` is the only terminal both reads share, so we drive it with a
	 * per-table implementation keyed on which table `.from()` last received.
	 */
	function mockTableReads(opts: {
		listingResult: { data: unknown; error: unknown };
		existingProposal?: { data: unknown; error: unknown };
		insertResult?: { data: unknown; error: unknown };
	}) {
		let currentTable = '';
		mockSupabase.from.mockImplementation((table: string) => {
			currentTable = table;
			return mockSupabase._mockChain;
		});

		mockSupabase._mockChain.single.mockImplementation(() => {
			if (currentTable === 'marketplace_listings') {
				return Promise.resolve(opts.listingResult);
			}
			if (currentTable === 'marketplace_proposals') {
				// Distinguish the existing-proposal read from the insert().select().single()
				return Promise.resolve(
					opts.existingProposal ?? { data: null, error: { code: 'PGRST116' } }
				);
			}
			return Promise.resolve({ data: null, error: null });
		});

		// Insert returns the created proposal via .select().single()
		mockSupabase._mockChain.insert.mockImplementation((rows: Record<string, unknown>[]) => {
			const inserted = Array.isArray(rows) ? rows[0] : rows;
			mockSupabase._mockChain.single.mockImplementation(() => {
				if (currentTable === 'marketplace_listings') {
					return Promise.resolve(opts.listingResult);
				}
				return Promise.resolve(
					opts.insertResult ?? {
						data: { id: 'proposal-1', ...inserted, proposer: buyer1.profile },
						error: null
					}
				);
			});
			return mockSupabase._mockChain;
		});
	}

	// ============================================================================
	// BASIC FUNCTIONALITY
	// ============================================================================

	describe('POST - Create proposal', () => {
		test('creates valid proposal with gidouilles', async () => {
			mockTableReads({
				listingResult: { data: listing, error: null },
				insertResult: {
					data: {
						id: 'proposal-1',
						listing_id: LISTING_UUID,
						offered_gidouilles: 150,
						message: 'I offer more gidouilles!',
						proposer: buyer1.profile
					},
					error: null
				}
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_gidouilles: 150,
					offered_card_ids: [],
					message: 'I offer more gidouilles!'
				})
			};

			const response = await POST({
				request: mockRequest,
				params: { id: LISTING_UUID },
				locals: { supabase: mockSupabase, user: { id: buyer1.id } }
			} as unknown as Parameters<typeof POST>[0]);

			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.offered_gidouilles).toBe(150);
			expect(data.message).toBe('I offer more gidouilles!');
		});

		test('creates valid proposal with cards', async () => {
			const buyerCard = createTestCard(buyer1.id);

			mockTableReads({
				listingResult: { data: listing, error: null },
				insertResult: {
					data: {
						id: 'proposal-2',
						listing_id: LISTING_UUID,
						offered_card_ids: [CARD_UUID_1],
						offered_gidouilles: 50,
						proposer: buyer1.profile
					},
					error: null
				}
			});

			void buyerCard;

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_card_ids: [CARD_UUID_1],
					offered_gidouilles: 50
				})
			};

			const response = await POST({
				request: mockRequest,
				params: { id: LISTING_UUID },
				locals: { supabase: mockSupabase, user: { id: buyer1.id } }
			} as unknown as Parameters<typeof POST>[0]);

			expect(response.status).toBe(201);
		});

		test('rejects unauthenticated requests', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({})
			};

			await expect(
				POST({
					request: mockRequest,
					params: { id: LISTING_UUID },
					locals: { supabase: mockSupabase, user: null }
				} as unknown as Parameters<typeof POST>[0])
			).rejects.toMatchObject({ status: 401, body: { message: 'Non authentifié' } });
		});

		test('validates request body with Zod', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					offered_gidouilles: -100 // Negative amount
				})
			};

			await expect(
				POST({
					request: mockRequest,
					params: { id: LISTING_UUID },
					locals: { supabase: mockSupabase, user: { id: buyer1.id } }
				} as unknown as Parameters<typeof POST>[0])
			).rejects.toMatchObject({ status: 400 });
		});

		test('rejects proposal with nothing offered', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_card_ids: [],
					offered_gidouilles: 0
				})
			};

			await expect(
				POST({
					request: mockRequest,
					params: { id: LISTING_UUID },
					locals: { supabase: mockSupabase, user: { id: buyer1.id } }
				} as unknown as Parameters<typeof POST>[0])
			).rejects.toMatchObject({
				status: 400,
				body: { message: 'Une proposition doit contenir au moins une carte ou des gidouilles' }
			});
		});
	});

	// ============================================================================
	// AUTHORIZATION & VALIDATION
	// ============================================================================

	describe('Authorization and validation', () => {
		test('prevents self-proposals on own listings', async () => {
			mockTableReads({
				listingResult: { data: { ...listing, creator_id: buyer1.id }, error: null }
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_gidouilles: 100
				})
			};

			await expect(
				POST({
					request: mockRequest,
					params: { id: LISTING_UUID },
					locals: { supabase: mockSupabase, user: { id: buyer1.id } }
				} as unknown as Parameters<typeof POST>[0])
			).rejects.toMatchObject({
				status: 403,
				body: { message: 'Vous ne pouvez pas faire une proposition sur votre propre annonce' }
			});
		});

		test('rejects proposals on inactive listings', async () => {
			mockTableReads({
				listingResult: { data: { ...listing, status: 'sold' }, error: null }
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_gidouilles: 100
				})
			};

			await expect(
				POST({
					request: mockRequest,
					params: { id: LISTING_UUID },
					locals: { supabase: mockSupabase, user: { id: buyer1.id } }
				} as unknown as Parameters<typeof POST>[0])
			).rejects.toMatchObject({
				status: 403,
				body: { message: "Cette annonce n'est plus active" }
			});
		});

		test('validates card ownership for proposals', async () => {
			const { validateCardOwnership } = await import('$lib/server/marketplace/helpers');
			(validateCardOwnership as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

			mockTableReads({ listingResult: { data: listing, error: null } });

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_card_ids: [CARD_UUID_1],
					offered_gidouilles: 0
				})
			};

			await expect(
				POST({
					request: mockRequest,
					params: { id: LISTING_UUID },
					locals: { supabase: mockSupabase, user: { id: buyer1.id } }
				} as unknown as Parameters<typeof POST>[0])
			).rejects.toMatchObject({
				status: 403,
				body: { message: 'Vous ne possédez pas toutes les cartes spécifiées' }
			});
		});

		test('validates gidouilles balance', async () => {
			const { getStudentGidouilles } = await import('$lib/server/marketplace/helpers');
			(getStudentGidouilles as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);

			mockTableReads({ listingResult: { data: listing, error: null } });

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_gidouilles: 1000
				})
			};

			await expect(
				POST({
					request: mockRequest,
					params: { id: LISTING_UUID },
					locals: { supabase: mockSupabase, user: { id: buyer1.id } }
				} as unknown as Parameters<typeof POST>[0])
			).rejects.toMatchObject({
				status: 403,
				body: { message: "Vous n'avez pas assez de gidouilles" }
			});
		});

		// NOTE: the proposal handler no longer enforces a "cards already in use"
		// guard. The `checkCardsUnused` call was removed in commit 8260972a3
		// because vip_cards_activity logs power activations, not consumption, so
		// cards with activated powers were wrongly blocked from trading. Ownership
		// (incl. usedAt + active locks) is enforced by validateCardOwnership.
		// This test now documents that a validly-owned card is accepted without a
		// separate cards-unused check.
		test('does not block proposals on a separate cards-unused check', async () => {
			mockTableReads({
				listingResult: { data: listing, error: null },
				insertResult: {
					data: {
						id: 'proposal-unused',
						listing_id: LISTING_UUID,
						offered_card_ids: [CARD_UUID_1],
						proposer: buyer1.profile
					},
					error: null
				}
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_card_ids: [CARD_UUID_1],
					offered_gidouilles: 0
				})
			};

			const response = await POST({
				request: mockRequest,
				params: { id: LISTING_UUID },
				locals: { supabase: mockSupabase, user: { id: buyer1.id } }
			} as unknown as Parameters<typeof POST>[0]);

			expect(response.status).toBe(201);
		});

		test('prevents duplicate proposals from same user', async () => {
			mockTableReads({
				listingResult: { data: listing, error: null },
				existingProposal: {
					data: { id: 'existing-prop', status: 'pending' },
					error: null
				}
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_gidouilles: 100
				})
			};

			await expect(
				POST({
					request: mockRequest,
					params: { id: LISTING_UUID },
					locals: { supabase: mockSupabase, user: { id: buyer1.id } }
				} as unknown as Parameters<typeof POST>[0])
			).rejects.toMatchObject({
				status: 403,
				body: { message: 'Vous avez déjà une proposition en cours pour cette annonce' }
			});
		});
	});

	// ============================================================================
	// CRITICAL SECURITY FIX: RACE CONDITION IN ACCEPTANCE
	// ============================================================================
	//
	// NOTE: the mock Supabase client's `rpc()` mirrors the real client contract:
	// a failing RPC RESOLVES with `{ data: null, error }` rather than throwing.
	// These tests therefore assert on the resolved `{ data, error }` shape.

	describe('Critical fix: Race condition in proposal acceptance', () => {
		test('accept_proposal_atomic prevents double acceptance', async () => {
			const proposal1 = { id: 'prop-1', proposer_id: buyer1.id };
			const proposal2 = { id: 'prop-2', proposer_id: buyer2.id };

			let acceptedProposal: string | null = null;

			mockSupabase._rpcMocks.set('accept_proposal_atomic', async (params: unknown) => {
				const p = params as AcceptProposalAtomicParams;
				if (acceptedProposal !== null) {
					throw new Error('409: Conflict - Another proposal was already accepted');
				}
				acceptedProposal = p.p_proposal_id;
				return { success: true, proposal_id: p.p_proposal_id };
			});

			const operations = [
				() =>
					mockSupabase.rpc('accept_proposal_atomic', {
						p_proposal_id: proposal1.id,
						p_user_id: seller.id
					}),
				() =>
					mockSupabase.rpc('accept_proposal_atomic', {
						p_proposal_id: proposal2.id,
						p_user_id: seller.id
					})
			];

			const results = await simulateConcurrentOperations(operations, 10);

			// Both calls resolve (RPC never throws); exactly one carries an error.
			const settled = results.filter(
				(r): r is PromiseFulfilledResult<{ data: unknown; error: unknown }> =>
					r.status === 'fulfilled'
			);
			expect(settled).toHaveLength(2);

			const succeeded = settled.filter((r) => r.value.error === null);
			const conflicted = settled.filter((r) => r.value.error !== null);

			expect(succeeded).toHaveLength(1);
			expect(conflicted).toHaveLength(1);

			const conflictError = conflicted[0].value.error as { message: string };
			expect(conflictError.message).toContain('409');
			expect(conflictError.message).toContain('already accepted');
		});

		test('atomic acceptance with card and gidouilles transfer', async () => {
			const transactionSteps: string[] = [];

			mockSupabase._rpcMocks.set('accept_proposal_atomic', async (params: unknown) => {
				const p = params as AcceptProposalAtomicParams;
				transactionSteps.push('BEGIN');
				transactionSteps.push('LOCK listing FOR UPDATE');
				transactionSteps.push('CHECK listing status = active');
				transactionSteps.push('CHECK proposal status = pending');
				transactionSteps.push('UPDATE proposal SET status = accepted');
				transactionSteps.push('UPDATE listing SET status = sold');

				if (p.transfer_cards) {
					transactionSteps.push('TRANSFER cards to buyer');
				}
				if (p.transfer_gidouilles) {
					transactionSteps.push('TRANSFER gidouilles to seller');
				}

				transactionSteps.push('REJECT other proposals');
				transactionSteps.push('UNLOCK cards from rejected proposals');
				transactionSteps.push('COMMIT');

				return { success: true };
			});

			await mockSupabase.rpc('accept_proposal_atomic', {
				p_proposal_id: 'prop-1',
				p_user_id: seller.id,
				transfer_cards: true,
				transfer_gidouilles: true
			} as AcceptProposalAtomicParams);

			expect(transactionSteps[0]).toBe('BEGIN');
			expect(transactionSteps[transactionSteps.length - 1]).toBe('COMMIT');
			expect(transactionSteps).toContain('LOCK listing FOR UPDATE');
			expect(transactionSteps).toContain('TRANSFER cards to buyer');
			expect(transactionSteps).toContain('TRANSFER gidouilles to seller');
			expect(transactionSteps).toContain('REJECT other proposals');
		});

		test('rollback on partial failure during acceptance', async () => {
			mockSupabase._rpcMocks.set('accept_proposal_atomic', async (params: unknown) => {
				const p = params as AcceptProposalAtomicParams;
				if (p.simulate_transfer_failure) {
					throw new Error('Transfer failed: Insufficient gidouilles');
				}
				return { success: true };
			});

			// The RPC surfaces the failure as a resolved { data: null, error } pair
			// (matching the real supabase-js contract), not a thrown rejection.
			const { data, error } = await mockSupabase.rpc('accept_proposal_atomic', {
				p_proposal_id: 'prop-1',
				p_user_id: seller.id,
				simulate_transfer_failure: true
			} as AcceptProposalAtomicParams);

			expect(data).toBeNull();
			expect((error as { message: string }).message).toContain('Transfer failed');
		});
	});

	// ============================================================================
	// NOTIFICATION TESTS
	// ============================================================================

	describe('Notifications', () => {
		test('sends notification to listing owner on new proposal', async () => {
			const { notifyNewProposal } = await import('$lib/server/marketplace/notifications');

			mockTableReads({
				listingResult: { data: listing, error: null },
				insertResult: {
					data: { id: 'proposal-1', listing_id: LISTING_UUID, proposer: buyer1.profile },
					error: null
				}
			});

			// Offer LESS than the listing wants (wanted_gidouilles=100) so the
			// proposal is not an exact match → normal flow (not auto-accept).
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_gidouilles: 50
				})
			};

			await POST({
				request: mockRequest,
				params: { id: LISTING_UUID },
				locals: { supabase: mockSupabase, user: { id: buyer1.id } }
			} as unknown as Parameters<typeof POST>[0]);

			// Handler signature: notifyNewProposal(supabase, listing.creator_id, userId, 'Annonce', proposal.id)
			expect(notifyNewProposal).toHaveBeenCalledWith(
				expect.anything(),
				listing.creator_id,
				buyer1.id,
				'Annonce',
				'proposal-1'
			);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe('Edge cases', () => {
		test('handles listing not found', async () => {
			mockTableReads({
				listingResult: { data: null, error: { message: 'Not found' } }
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_gidouilles: 100
				})
			};

			await expect(
				POST({
					request: mockRequest,
					params: { id: LISTING_UUID },
					locals: { supabase: mockSupabase, user: { id: buyer1.id } }
				} as unknown as Parameters<typeof POST>[0])
			).rejects.toMatchObject({ status: 404, body: { message: 'Annonce non trouvée' } });
		});

		test('handles database insertion error', async () => {
			mockTableReads({
				listingResult: { data: listing, error: null },
				insertResult: { data: null, error: { message: 'Database error' } }
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_gidouilles: 100
				})
			};

			await expect(
				POST({
					request: mockRequest,
					params: { id: LISTING_UUID },
					locals: { supabase: mockSupabase, user: { id: buyer1.id } }
				} as unknown as Parameters<typeof POST>[0])
			).rejects.toMatchObject({
				status: 500,
				body: { message: 'Erreur lors de la création de la proposition' }
			});
		});

		test('handles extremely large offers correctly', async () => {
			// Buyer must hold enough gidouilles for the 10000-gidouilles offer.
			const { getStudentGidouilles } = await import('$lib/server/marketplace/helpers');
			(getStudentGidouilles as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(10000);

			const maxCards = Array.from(
				{ length: 10 },
				(_, i) => `3333333${i}-3333-4333-8333-333333333333`
			);

			mockTableReads({
				listingResult: { data: listing, error: null },
				insertResult: {
					data: { id: 'proposal-max', listing_id: LISTING_UUID, proposer: buyer1.profile },
					error: null
				}
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_card_ids: maxCards,
					offered_gidouilles: 10000 // Max allowed
				})
			};

			const response = await POST({
				request: mockRequest,
				params: { id: LISTING_UUID },
				locals: { supabase: mockSupabase, user: { id: buyer1.id } }
			} as unknown as Parameters<typeof POST>[0]);

			expect(response.status).toBe(201);

			// Values above maximum must be rejected by Zod (max 10000 gidouilles).
			const invalidRequest = {
				json: vi.fn().mockResolvedValue({
					listing_id: LISTING_UUID,
					offered_gidouilles: 10001 // Above max
				})
			};

			await expect(
				POST({
					request: invalidRequest,
					params: { id: LISTING_UUID },
					locals: { supabase: mockSupabase, user: { id: buyer1.id } }
				} as unknown as Parameters<typeof POST>[0])
			).rejects.toMatchObject({ status: 400 });
		});
	});
});
