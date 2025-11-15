/**
 * Marketplace Listings API Tests
 * ===============================
 *
 * Comprehensive tests for the marketplace listings endpoints.
 * Tests authorization, validation, race conditions, and edge cases.
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET, POST } from '../../../routes/api/marketplace/listings/+server';
import {
	createMockSupabase,
	createTestUser,
	createTestClass,
	createTestListing,
	mockRPCFunctions
} from '$lib/test-utils/marketplace';

// Type definitions for test request/response handling
interface ListingsQueryLocals {
	supabase: ReturnType<typeof createMockSupabase>;
	user: { id: string } | null;
}

interface ListingsRequestEvent {
	url: URL;
	locals: ListingsQueryLocals;
	request?: { json: () => Promise<unknown> };
	params?: Record<string, string>;
}

interface RecordViewParams {
	p_listing_id: string;
	p_user_id: string;
}

// ============================================================================
// TEST SETUP
// ============================================================================

describe('/api/marketplace/listings', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;
	let mockUser: ReturnType<typeof createTestUser>;
	let _mockClass: ReturnType<typeof createTestClass>;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Create test data
		mockSupabase = createMockSupabase();
		mockUser = createTestUser('student');
		_mockClass = createTestClass('teacher-1', 'school-1');

		// Setup RPC mocks
		mockRPCFunctions(mockSupabase);

		// Mock helper functions by mocking the modules
		vi.mock('$lib/server/marketplace/helpers', () => ({
			validateCardOwnership: vi.fn().mockResolvedValue(true),
			checkCardsUnused: vi.fn().mockResolvedValue(true),
			lockCardsForEntity: vi.fn().mockResolvedValue({ success: true }),
			checkActiveListingsLimit: vi.fn().mockResolvedValue(true),
			isMarketplaceEnabled: vi.fn().mockResolvedValue(true),
			getStudentSchoolId: vi.fn().mockResolvedValue('school-1')
		}));
	});

	afterEach(() => {
		vi.resetModules();
	});

	// ============================================================================
	// GET ENDPOINT TESTS
	// ============================================================================

	describe('GET /api/marketplace/listings', () => {
		test('returns listings for authenticated user', async () => {
			// Setup mock data
			const listing1 = createTestListing(mockUser.id, 'school-1');
			const listing2 = createTestListing('user-2', 'school-1');

			mockSupabase._mockChain.select.mockImplementation(() => {
				mockSupabase._mockChain.range.mockImplementation(() => {
					mockSupabase._mockChain.then = vi.fn((callback) =>
						callback({
							data: [listing1, listing2],
							error: null,
							count: 2
						})
					);
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			const mockUrl = new URL('http://localhost/api/marketplace/listings');

			const response = await GET({
				url: mockUrl,
				locals: mockLocals
			} as any);

			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.listings).toHaveLength(2);
			expect(data.pagination).toEqual({
				page: 1,
				limit: 20,
				total: 2,
				totalPages: 1
			});
		});

		test('rejects unauthenticated requests', async () => {
			const mockLocals = {
				supabase: mockSupabase,
				user: null
			};

			const mockUrl = new URL('http://localhost/api/marketplace/listings');

			await expect(
				GET({
					url: mockUrl,
					locals: mockLocals
				} as any)
			).rejects.toThrow('Non authentifié');
		});

		test('validates query parameters', async () => {
			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			// Invalid page number
			const mockUrl = new URL('http://localhost/api/marketplace/listings?page=0');

			await expect(
				GET({
					url: mockUrl,
					locals: mockLocals
				} as any)
			).rejects.toThrow('Le numéro de page doit être au moins 1');
		});

		test('filters by listing type', async () => {
			mockSupabase._mockChain.select.mockImplementation(() => {
				mockSupabase._mockChain.eq.mockImplementation((column, value) => {
					// Verify correct filter is applied
					if (column === 'listing_type' && value === 'sell') {
						mockSupabase._mockChain.range.mockImplementation(() => {
							mockSupabase._mockChain.then = vi.fn((callback) =>
								callback({
									data: [createTestListing(mockUser.id, 'school-1', { listing_type: 'sell' })],
									error: null,
									count: 1
								})
							);
							return mockSupabase._mockChain;
						});
					}
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			const mockUrl = new URL('http://localhost/api/marketplace/listings?type=sell');

			const response = await GET({
				url: mockUrl,
				locals: mockLocals
			} as any);

			const data = await response.json();
			expect(data.listings[0].listing_type).toBe('sell');
		});

		test('handles pagination correctly', async () => {
			// Create 25 mock listings
			const listings = Array.from({ length: 25 }, (_, i) =>
				createTestListing(`user-${i}`, 'school-1')
			);

			mockSupabase._mockChain.select.mockImplementation(() => {
				mockSupabase._mockChain.range.mockImplementation((start, end) => {
					// Return the correct slice based on pagination
					mockSupabase._mockChain.then = vi.fn((callback) =>
						callback({
							data: listings.slice(start, Math.min(end + 1, listings.length)),
							error: null,
							count: listings.length
						})
					);
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			// Request page 2 with limit 10
			const mockUrl = new URL('http://localhost/api/marketplace/listings?page=2&limit=10');

			const response = await GET({
				url: mockUrl,
				locals: mockLocals
			} as any);

			const data = await response.json();
			expect(data.listings).toHaveLength(10);
			expect(data.pagination).toEqual({
				page: 2,
				limit: 10,
				total: 25,
				totalPages: 3
			});
		});

		test('records unique views for other users listings', async () => {
			const otherUserListing = createTestListing('user-2', 'school-1');
			const ownListing = createTestListing(mockUser.id, 'school-1');

			mockSupabase._mockChain.select.mockImplementation(() => {
				mockSupabase._mockChain.range.mockImplementation(() => {
					mockSupabase._mockChain.then = vi.fn((callback) =>
						callback({
							data: [otherUserListing, ownListing],
							error: null,
							count: 2
						})
					);
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			const mockUrl = new URL('http://localhost/api/marketplace/listings');

			await GET({
				url: mockUrl,
				locals: mockLocals
			} as any);

			// Verify RPC was called only for other user's listing
			expect(mockSupabase.rpc).toHaveBeenCalledWith('record_listing_view', {
				p_listing_id: otherUserListing.id,
				p_user_id: mockUser.id
			});

			// Should not record view for own listing
			expect(mockSupabase.rpc).not.toHaveBeenCalledWith('record_listing_view', {
				p_listing_id: ownListing.id,
				p_user_id: mockUser.id
			});
		});

		test('handles marketplace disabled gracefully', async () => {
			const { isMarketplaceEnabled } = await import('$lib/server/marketplace/helpers');
			(isMarketplaceEnabled as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			const mockUrl = new URL('http://localhost/api/marketplace/listings');

			await expect(
				GET({
					url: mockUrl,
					locals: mockLocals
				} as any)
			).rejects.toThrow("Le marketplace n'est pas activé pour votre classe");
		});

		test('handles school not found error', async () => {
			const { getStudentSchoolId } = await import('$lib/server/marketplace/helpers');
			(getStudentSchoolId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			const mockUrl = new URL('http://localhost/api/marketplace/listings');

			await expect(
				GET({
					url: mockUrl,
					locals: mockLocals
				} as any)
			).rejects.toThrow('École non trouvée');
		});
	});

	// ============================================================================
	// POST ENDPOINT TESTS
	// ============================================================================

	describe('POST /api/marketplace/listings', () => {
		test('creates valid sell listing with cards', async () => {
			const cardId = 'card-1';
			const listingData = {
				listing_type: 'sell',
				offered_card_ids: [cardId],
				offered_gidouilles: 0,
				wanted_card_template_ids: [],
				wanted_gidouilles: 100,
				title: 'Selling rare card',
				description: 'Great deal!'
			};

			mockSupabase._mockChain.insert.mockImplementation((data) => {
				mockSupabase._mockChain.select.mockImplementation(() => {
					mockSupabase._mockChain.single.mockImplementation(() => {
						return Promise.resolve({
							data: { id: 'new-listing-id', ...data[0] },
							error: null
						});
					});
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue(listingData)
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			const response = await POST({
				request: mockRequest,
				locals: mockLocals
			} as any);

			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.listing_type).toBe('sell');
			expect(data.title).toBe('Selling rare card');
		});

		test('creates valid buy listing', async () => {
			const listingData = {
				listing_type: 'buy',
				offered_card_ids: [],
				offered_gidouilles: 0,
				wanted_card_template_ids: ['template-1'],
				wanted_gidouilles: 0,
				title: 'Looking for specific card'
			};

			mockSupabase._mockChain.insert.mockImplementation((data) => {
				mockSupabase._mockChain.select.mockImplementation(() => {
					mockSupabase._mockChain.single.mockImplementation(() => {
						return Promise.resolve({
							data: { id: 'new-listing-id', ...data[0] },
							error: null
						});
					});
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue(listingData)
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			const response = await POST({
				request: mockRequest,
				locals: mockLocals
			} as any);

			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.listing_type).toBe('buy');
		});

		test('rejects unauthenticated requests', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({})
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: null
			};

			await expect(
				POST({
					request: mockRequest,
					locals: mockLocals
				} as any)
			).rejects.toThrow('Non authentifié');
		});

		test('validates request body with Zod schema', async () => {
			const invalidData = {
				listing_type: 'invalid', // Invalid enum value
				title: 'AB', // Too short
				offered_gidouilles: -1 // Negative value
			};

			const mockRequest = {
				json: vi.fn().mockResolvedValue(invalidData)
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			await expect(
				POST({
					request: mockRequest,
					locals: mockLocals
				} as any)
			).rejects.toThrow();
		});

		test('checks marketplace is enabled', async () => {
			const { isMarketplaceEnabled } = await import('$lib/server/marketplace/helpers');
			(isMarketplaceEnabled as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_type: 'sell',
					offered_card_ids: ['card-1'],
					title: 'Test'
				})
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			await expect(
				POST({
					request: mockRequest,
					locals: mockLocals
				} as any)
			).rejects.toThrow("Le marketplace n'est pas activé pour votre classe");
		});

		test('enforces active listings limit', async () => {
			const { checkActiveListingsLimit } = await import('$lib/server/marketplace/helpers');
			(checkActiveListingsLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_type: 'sell',
					offered_card_ids: ['card-1'],
					title: 'Test'
				})
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			await expect(
				POST({
					request: mockRequest,
					locals: mockLocals
				} as any)
			).rejects.toThrow("Vous avez atteint le nombre maximum d'annonces actives");
		});

		test('validates card ownership for sell listings', async () => {
			const { validateCardOwnership } = await import('$lib/server/marketplace/helpers');
			(validateCardOwnership as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_type: 'sell',
					offered_card_ids: ['card-1'],
					title: 'Test'
				})
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			await expect(
				POST({
					request: mockRequest,
					locals: mockLocals
				} as any)
			).rejects.toThrow('Vous ne possédez pas toutes les cartes spécifiées');
		});

		test('checks cards are unused', async () => {
			const { checkCardsUnused } = await import('$lib/server/marketplace/helpers');
			(checkCardsUnused as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_type: 'sell',
					offered_card_ids: ['card-1'],
					title: 'Test'
				})
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			await expect(
				POST({
					request: mockRequest,
					locals: mockLocals
				} as any)
			).rejects.toThrow('Certaines cartes ont déjà été utilisées');
		});

		test('handles card locking failure with rollback', async () => {
			const { lockCardsForEntity } = await import('$lib/server/marketplace/helpers');
			(lockCardsForEntity as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: false,
				error: 'Failed to lock cards'
			});

			// Mock successful listing creation
			mockSupabase._mockChain.insert.mockImplementation(() => {
				mockSupabase._mockChain.select.mockImplementation(() => {
					mockSupabase._mockChain.single.mockImplementation(() => {
						return Promise.resolve({
							data: { id: 'new-listing-id' },
							error: null
						});
					});
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			// Mock the delete for rollback
			let deleteWasCalled = false;
			mockSupabase._mockChain.delete.mockImplementation(() => {
				deleteWasCalled = true;
				mockSupabase._mockChain.eq.mockImplementation(() => {
					mockSupabase._mockChain.then = vi.fn((callback) => callback({ error: null }));
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_type: 'sell',
					offered_card_ids: ['card-1'],
					title: 'Test'
				})
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			await expect(
				POST({
					request: mockRequest,
					locals: mockLocals
				} as any)
			).rejects.toThrow('Failed to lock cards');

			// Verify rollback was performed
			expect(deleteWasCalled).toBe(true);
		});

		test('sets correct expiration date (7 days)', async () => {
			let capturedData: unknown = null;

			mockSupabase._mockChain.insert.mockImplementation((data) => {
				capturedData = data[0];
				mockSupabase._mockChain.select.mockImplementation(() => {
					mockSupabase._mockChain.single.mockImplementation(() => {
						return Promise.resolve({
							data: { id: 'new-listing-id', ...data[0] },
							error: null
						});
					});
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_type: 'buy',
					wanted_card_template_ids: ['template-1'],
					title: 'Test'
				})
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			await POST({
				request: mockRequest,
				locals: mockLocals
			} as any);

			expect(capturedData).toBeTruthy();
			const expiresAt = new Date((capturedData as { expires_at: string }).expires_at);
			const now = new Date();
			const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
			expect(diffDays).toBeCloseTo(7, 0);
		});

		test('handles database insertion errors', async () => {
			mockSupabase._mockChain.insert.mockImplementation(() => {
				mockSupabase._mockChain.select.mockImplementation(() => {
					mockSupabase._mockChain.single.mockImplementation(() => {
						return Promise.resolve({
							data: null,
							error: { message: 'Database error' }
						});
					});
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_type: 'buy',
					wanted_card_template_ids: ['template-1'],
					title: 'Test'
				})
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			await expect(
				POST({
					request: mockRequest,
					locals: mockLocals
				} as any)
			).rejects.toThrow("Erreur lors de la création de l'annonce");
		});

		test('handles malformed JSON gracefully', async () => {
			const mockRequest = {
				json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			await expect(
				POST({
					request: mockRequest,
					locals: mockLocals
				} as any)
			).rejects.toThrow();
		});
	});

	// ============================================================================
	// SECURITY & RACE CONDITION TESTS
	// ============================================================================

	describe('Security and race condition tests', () => {
		test('prevents view count inflation through rapid requests', async () => {
			const listing = createTestListing('user-2', 'school-1');
			const viewResults: boolean[] = [];

			// Mock the RPC to track unique views
			const viewedSet = new Set<string>();
			mockSupabase._rpcMocks.set('record_listing_view', (params: unknown) => {
				const p = params as RecordViewParams;
				const viewKey = `${p.p_listing_id}-${p.p_user_id}`;
				if (viewedSet.has(viewKey)) {
					viewResults.push(false);
					return { is_new_view: false };
				}
				viewedSet.add(viewKey);
				viewResults.push(true);
				return { is_new_view: true };
			});

			mockSupabase._mockChain.select.mockImplementation(() => {
				mockSupabase._mockChain.range.mockImplementation(() => {
					mockSupabase._mockChain.then = vi.fn((callback) =>
						callback({
							data: [listing],
							error: null,
							count: 1
						})
					);
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			const mockUrl = new URL('http://localhost/api/marketplace/listings');

			// Simulate 5 rapid requests from same user
			for (let i = 0; i < 5; i++) {
				await GET({
					url: mockUrl,
					locals: mockLocals
				} as any);
			}

			// Only first view should be recorded as new
			expect(viewResults.filter((v) => v === true)).toHaveLength(1);
			expect(viewResults.filter((v) => v === false)).toHaveLength(4);
		});

		test('validates all UUIDs to prevent injection', async () => {
			const invalidUUIDs = [
				'../../etc/passwd',
				'<script>alert(1)</script>',
				"'; DROP TABLE users; --",
				'${process.env.SECRET}',
				'%00',
				'null',
				'undefined'
			];

			for (const invalidId of invalidUUIDs) {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						listing_type: 'sell',
						offered_card_ids: [invalidId],
						title: 'Test'
					})
				};

				const mockLocals = {
					supabase: mockSupabase,
					user: { id: mockUser.id }
				};

				await expect(
					POST({
						request: mockRequest,
						locals: mockLocals
					} as any)
				).rejects.toThrow();
			}
		});

		test('sanitizes user input in title and description', async () => {
			const xssPayloads = [
				'<script>alert(document.cookie)</script>',
				'javascript:alert(1)',
				'<img src=x onerror=alert(1)>',
				'<svg onload=alert(1)>'
			];

			// These should be accepted as plain text (no XSS execution)
			for (const payload of xssPayloads) {
				let _capturedData: unknown = null;

				mockSupabase._mockChain.insert.mockImplementation((data) => {
					_capturedData = data[0];
					mockSupabase._mockChain.select.mockImplementation(() => {
						mockSupabase._mockChain.single.mockImplementation(() => {
							return Promise.resolve({
								data: { id: 'new-listing-id', ...data[0] },
								error: null
							});
						});
						return mockSupabase._mockChain;
					});
					return mockSupabase._mockChain;
				});

				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						listing_type: 'buy',
						wanted_card_template_ids: ['550e8400-e29b-41d4-a716-446655440000'],
						title: payload.substring(0, 100), // Ensure it fits title length limit
						description: payload
					})
				};

				const mockLocals = {
					supabase: mockSupabase,
					user: { id: mockUser.id }
				};

				const response = await POST({
					request: mockRequest,
					locals: mockLocals
				} as any);

				const data = await response.json();

				// The data should be stored as-is (sanitization happens on display)
				expect(data.title).toBe(payload.substring(0, 100));
				expect(data.description).toBe(payload);
			}
		});

		test('handles concurrent listing creation attempts', async () => {
			const { checkActiveListingsLimit } = await import('$lib/server/marketplace/helpers');
			let callCount = 0;

			// Simulate limit reached after first call
			(checkActiveListingsLimit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
				callCount++;
				return callCount === 1;
			});

			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					listing_type: 'buy',
					wanted_card_template_ids: ['template-1'],
					title: 'Test'
				})
			};

			const mockLocals = {
				supabase: mockSupabase,
				user: { id: mockUser.id }
			};

			// First request should succeed
			mockSupabase._mockChain.insert.mockImplementation((data) => {
				mockSupabase._mockChain.select.mockImplementation(() => {
					mockSupabase._mockChain.single.mockImplementation(() => {
						return Promise.resolve({
							data: { id: 'listing-1', ...data[0] },
							error: null
						});
					});
					return mockSupabase._mockChain;
				});
				return mockSupabase._mockChain;
			});

			const response1 = await POST({
				request: mockRequest,
				locals: mockLocals
			} as any);
			expect(response1.status).toBe(201);

			// Second request should fail due to limit
			await expect(
				POST({
					request: mockRequest,
					locals: mockLocals
				} as any)
			).rejects.toThrow("Vous avez atteint le nombre maximum d'annonces actives");
		});
	});
});
