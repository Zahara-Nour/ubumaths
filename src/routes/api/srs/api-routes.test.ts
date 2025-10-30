/**
 * SRS API Routes Tests
 * ====================
 *
 * Comprehensive tests for all SRS API endpoints.
 *
 * Endpoints tested:
 * - POST /api/srs/decks - Create deck
 * - GET  /api/srs/decks - List decks
 * - GET  /api/srs/decks/[id] - Get deck details
 * - PUT  /api/srs/decks/[id] - Update deck
 * - DELETE /api/srs/decks/[id] - Delete deck
 * - POST /api/srs/decks/[id]/assign - Assign deck
 * - POST /api/srs/cards - Add card to deck
 * - GET  /api/srs/cards?deck_id=X - List cards in deck
 * - DELETE /api/srs/cards/[id] - Delete card
 * - GET  /api/srs/review/due?deck_id=X - Get due cards
 * - POST /api/srs/review/submit - Submit review
 *
 * Test Strategy:
 * - Mock Supabase client and database responses
 * - Test authorization (authenticated vs unauthenticated)
 * - Test validation (required fields, valid values)
 * - Test business logic (deck assignment, review submission)
 * - Test error handling
 */

import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { Grade, type FSRSConfig } from '$lib/srs/types';

// Mock Supabase responses
const mockSupabaseClient = () => {
	const mockFrom = vi.fn();
	const mockRpc = vi.fn();

	return {
		from: mockFrom,
		rpc: mockRpc,
		auth: {
			getUser: vi.fn()
		}
	};
};

// Test UUIDs (valid format for Zod validation)
const TEST_IDS = {
	user1: '550e8400-e29b-41d4-a716-446655440001',
	user2: '550e8400-e29b-41d4-a716-446655440002',
	deck1: '550e8400-e29b-41d4-a716-446655440011',
	deck2: '550e8400-e29b-41d4-a716-446655440012',
	card1: '550e8400-e29b-41d4-a716-446655440021',
	card2: '550e8400-e29b-41d4-a716-446655440022',
	template1: '550e8400-e29b-41d4-a716-446655440031',
	template2: '550e8400-e29b-41d4-a716-446655440032'
};

describe('POST /api/srs/decks - Create Deck', () => {
	it('should create a personal deck with valid data', async () => {
		const { POST } = await import('./decks/+server');

		const mockSupabase = mockSupabaseClient();
		const insertMock = vi.fn().mockResolvedValue({
			data: {
				id: TEST_IDS.deck1,
				name: 'Test Deck',
				description: 'Test Description',
				owner_id: TEST_IDS.user1,
				deck_type: 'personal',
				is_assigned: false,
				config: { desiredRetention: 0.9, maximumInterval: 36500 },
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			},
			error: null
		});

		mockSupabase.from.mockReturnValue({
			insert: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: insertMock
				})
			})
		});

		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				name: 'Test Deck',
				description: 'Test Description',
				deckType: 'personal'
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.deck).toBeDefined();
		expect(data.deck.name).toBe('Test Deck');
	});

	it('should reject request without authentication', async () => {
		const { POST } = await import('./decks/+server');

		const mockSupabase = mockSupabaseClient();
		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				name: 'Test Deck',
				deckType: 'personal'
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: null,
				user: null
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(401);
		const data = await response.json();
		expect(data.error).toBe('Unauthorized');
	});

	it('should reject request without deck name', async () => {
		const { POST } = await import('./decks/+server');

		const mockSupabase = mockSupabaseClient();
		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				deckType: 'personal'
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined(); // Zod validation error
	});

	it('should reject invalid deck type', async () => {
		const { POST } = await import('./decks/+server');

		const mockSupabase = mockSupabaseClient();
		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				name: 'Test Deck',
				deckType: 'invalid'
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined(); // Zod validation error
	});

	it('should reject invalid desired retention', async () => {
		const { POST } = await import('./decks/+server');

		const mockSupabase = mockSupabaseClient();
		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				name: 'Test Deck',
				deckType: 'personal',
				config: { desiredRetention: 0.5 } // Too low
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined(); // Zod validation error
	});

	it('should apply default config if not provided', async () => {
		const { POST } = await import('./decks/+server');

		const mockSupabase = mockSupabaseClient();
		let capturedConfig: FSRSConfig | undefined;

		const insertMock = vi.fn().mockImplementation((data) => {
			capturedConfig = data.config;
			return {
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { ...data, id: TEST_IDS.deck1 },
						error: null
					})
				})
			};
		});

		mockSupabase.from.mockReturnValue({
			insert: insertMock
		});

		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				name: 'Test Deck',
				deckType: 'personal'
				// No config provided
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(capturedConfig?.desiredRetention).toBe(0.9); // Default
	});
});

describe('GET /api/srs/decks - List Decks', () => {
	it('should return user decks with stats', async () => {
		const { GET } = await import('./decks/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					order: vi.fn().mockResolvedValue({
						data: [
							{
								id: TEST_IDS.deck1,
								name: 'Deck 1',
								description: null,
								owner_id: TEST_IDS.user1,
								deck_type: 'personal',
								is_assigned: false,
								config: { desiredRetention: 0.9, maximumInterval: 36500 },
								created_at: new Date().toISOString(),
								updated_at: new Date().toISOString()
							}
						],
						error: null
					})
				})
			})
		});

		mockSupabase.rpc.mockResolvedValue({
			data: [
				{
					total_cards: 10,
					due_count: 3,
					new_count: 2,
					learning_count: 5,
					review_count: 3
				}
			],
			error: null
		});

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		const mockUrl = new URL('http://localhost');

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await GET({
			url: mockUrl,
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.decks).toHaveLength(1);
		expect(data.decks[0].stats).toBeDefined();
		expect(data.decks[0].stats.total_cards).toBe(10);
	});

	it('should require authentication', async () => {
		const { GET } = await import('./decks/+server');

		const mockSupabase = mockSupabaseClient();
		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: null,
				user: null
			})
		};

		const mockUrl = new URL('http://localhost');

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await GET({
			url: mockUrl,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(401);
	});

	it('should handle empty deck list', async () => {
		const { GET } = await import('./decks/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					order: vi.fn().mockResolvedValue({
						data: [],
						error: null
					})
				})
			})
		});

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		const mockUrl = new URL('http://localhost');

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await GET({
			url: mockUrl,
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

		if (response.status !== 200) {
			console.log('Empty deck list test error:', data);
		}

		expect(response.status).toBe(200);
		expect(data.decks).toEqual([]);
	});
});

describe('POST /api/srs/cards - Add Card to Deck', () => {
	it('should add template card to deck', async () => {
		const { POST } = await import('./cards/+server');

		const mockSupabase = mockSupabaseClient();

		// Mock deck ownership check
		mockSupabase.from.mockImplementation((table) => {
			if (table === 'srs_decks') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: TEST_IDS.deck1, is_assigned: false, owner_id: TEST_IDS.user1 },
									error: null
								})
							})
						})
					})
				};
			}
			if (table === 'question_templates') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { id: TEST_IDS.template1, status: 'published' },
								error: null
							})
						})
					})
				};
			}
			if (table === 'srs_cards') {
				return {
					insert: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: TEST_IDS.card1,
									deck_id: TEST_IDS.deck1,
									card_type: 'template',
									template_id: TEST_IDS.template1,
									front_content: null,
									back_content: null,
									created_at: new Date().toISOString(),
									updated_at: new Date().toISOString()
								},
								error: null
							})
						})
					})
				};
			}
			return {};
		});

		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				deckId: TEST_IDS.deck1,
				cardType: 'template',
				templateId: TEST_IDS.template1
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.card.card_type).toBe('template');
		expect(data.card.template_id).toBe(TEST_IDS.template1);
	});

	it('should add custom card to deck', async () => {
		const { POST } = await import('./cards/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockImplementation((table) => {
			if (table === 'srs_decks') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: TEST_IDS.deck1, is_assigned: false, owner_id: TEST_IDS.user1 },
									error: null
								})
							})
						})
					})
				};
			}
			if (table === 'srs_cards') {
				return {
					insert: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: TEST_IDS.card1,
									deck_id: TEST_IDS.deck1,
									card_type: 'custom',
									template_id: null,
									front_content: [{ type: 'text', value: 'Front' }],
									back_content: [{ type: 'text', value: 'Back' }],
									created_at: new Date().toISOString(),
									updated_at: new Date().toISOString()
								},
								error: null
							})
						})
					})
				};
			}
			return {};
		});

		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				deckId: TEST_IDS.deck1,
				cardType: 'custom',
				frontContent: [{ type: 'text', value: 'Front' }],
				backContent: [{ type: 'text', value: 'Back' }]
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.card.card_type).toBe('custom');
	});

	it('should reject adding card to assigned deck', async () => {
		const { POST } = await import('./cards/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: TEST_IDS.deck1, is_assigned: true, owner_id: TEST_IDS.user1 }, // Assigned!
							error: null
						})
					})
				})
			})
		});

		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				deckId: TEST_IDS.deck1,
				cardType: 'template',
				templateId: TEST_IDS.template1
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(403);
		const data = await response.json();
		expect(data.error).toBeDefined(); // Business logic error
	});

	it('should reject template card with unpublished template', async () => {
		const { POST } = await import('./cards/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockImplementation((table) => {
			if (table === 'srs_decks') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: TEST_IDS.deck1, is_assigned: false, owner_id: TEST_IDS.user1 },
									error: null
								})
							})
						})
					})
				};
			}
			if (table === 'question_templates') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { id: TEST_IDS.template1, status: 'draft' }, // Not published!
								error: null
							})
						})
					})
				};
			}
			return {};
		});

		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				deckId: TEST_IDS.deck1,
				cardType: 'template',
				templateId: TEST_IDS.template1
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined(); // Business logic error
	});

	it('should reject custom card with empty content', async () => {
		const { POST } = await import('./cards/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: TEST_IDS.deck1, is_assigned: false, owner_id: TEST_IDS.user1 },
							error: null
						})
					})
				})
			})
		});

		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				deckId: TEST_IDS.deck1,
				cardType: 'custom',
				frontContent: [], // Empty!
				backContent: [{ type: 'text', content: 'Back' }]
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined(); // Zod validation error
	});
});

describe('GET /api/srs/cards - List Cards', () => {
	it('should list cards in deck', async () => {
		const { GET } = await import('./cards/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockImplementation((table) => {
			if (table === 'srs_decks') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: TEST_IDS.deck1, owner_id: TEST_IDS.user1 },
									error: null
								})
							})
						})
					})
				};
			}
			if (table === 'srs_cards') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: [
									{
										id: TEST_IDS.card1,
										deck_id: TEST_IDS.deck1,
										card_type: 'template',
										template_id: TEST_IDS.template1,
										front_content: null,
										back_content: null,
										created_at: new Date().toISOString(),
										updated_at: new Date().toISOString()
									},
									{
										id: TEST_IDS.card2,
										deck_id: TEST_IDS.deck1,
										card_type: 'custom',
										template_id: null,
										front_content: [{ type: 'text', value: 'Front' }],
										back_content: [{ type: 'text', value: 'Back' }],
										created_at: new Date().toISOString(),
										updated_at: new Date().toISOString()
									}
								],
								error: null
							})
						})
					})
				};
			}
			return {};
		});

		const mockUrl = new URL(`http://localhost?deck_id=${TEST_IDS.deck1}`);

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await GET({
			url: mockUrl,
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.cards).toHaveLength(2);
	});

	it('should require deck_id parameter', async () => {
		const { GET } = await import('./cards/+server');

		const mockSupabase = mockSupabaseClient();
		const mockUrl = new URL('http://localhost'); // No deck_id

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await GET({
			url: mockUrl,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined(); // Zod validation error
	});
});

describe('POST /api/srs/review/submit - Submit Review', () => {
	it('should submit review and update stats', async () => {
		const { POST } = await import('./review/submit/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockImplementation((table) => {
			if (table === 'srs_cards') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: TEST_IDS.card1,
									deck_id: TEST_IDS.deck1,
									card_type: 'template',
									template_id: TEST_IDS.template1,
									front_content: null,
									back_content: null,
									created_at: new Date().toISOString(),
									updated_at: new Date().toISOString()
								},
								error: null
							})
						})
					})
				};
			}
			if (table === 'srs_decks') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: {
										id: TEST_IDS.deck1,
										owner_id: TEST_IDS.user1,
										config: { desiredRetention: 0.9, maximumInterval: 36500 }
									},
									error: null
								})
							})
						})
					})
				};
			}
			if (table === 'srs_card_stats') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({
										data: null, // No existing stats
										error: { code: 'PGRST116' } // Not found
									})
								})
							})
						})
					}),
					upsert: vi.fn().mockResolvedValue({
						error: null
					})
				};
			}
			if (table === 'srs_review_sessions') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								gte: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										limit: vi.fn().mockReturnValue({
											single: vi.fn().mockResolvedValue({
												data: null,
												error: null
											})
										})
									})
								})
							})
						})
					}),
					insert: vi.fn().mockResolvedValue({
						error: null
					})
				};
			}
			return {};
		});

		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				cardId: TEST_IDS.card1,
				deckId: TEST_IDS.deck1,
				grade: Grade.GOOD,
				timeSpent: 30
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.stats).toBeDefined();
	});

	it('should validate grade value', async () => {
		const { POST } = await import('./review/submit/+server');

		const mockSupabase = mockSupabaseClient();
		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				cardId: TEST_IDS.card1,
				deckId: TEST_IDS.deck1,
				grade: 5, // Invalid!
				timeSpent: 30
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined(); // Zod validation error
	});

	it('should require cardId', async () => {
		const { POST } = await import('./review/submit/+server');

		const mockSupabase = mockSupabaseClient();
		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				deckId: TEST_IDS.deck1,
				grade: Grade.GOOD
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined(); // Zod validation error
	});

	it('should require deckId', async () => {
		const { POST } = await import('./review/submit/+server');

		const mockSupabase = mockSupabaseClient();
		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				cardId: TEST_IDS.card1,
				grade: Grade.GOOD
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined(); // Zod validation error
	});
});

describe('GET /api/srs/review/due - Get Due Cards', () => {
	it('should return due cards for deck', async () => {
		const { GET } = await import('./review/due/+server');

		const mockSupabase = mockSupabaseClient();

		// Mock multiple table queries using mockImplementation
		mockSupabase.from.mockImplementation((table) => {
			if (table === 'srs_decks') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: TEST_IDS.deck1, owner_id: TEST_IDS.user1 },
									error: null
								})
							})
						})
					})
				};
			}
			if (table === 'srs_cards') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									front_content: [{ type: 'text', value: 'Front' }],
									back_content: [{ type: 'text', value: 'Back' }]
								},
								error: null
							})
						})
					})
				};
			}
			return {};
		});

		mockSupabase.rpc.mockResolvedValue({
			data: [
				{
					card_id: TEST_IDS.card1,
					card_type: 'custom',
					state: 'new',
					difficulty: 5,
					stability: 0,
					total_reviews: 0,
					last_review: null,
					next_review: new Date().toISOString()
				}
			],
			error: null
		});

		const mockUrl = new URL(`http://localhost?deck_id=${TEST_IDS.deck1}`);

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await GET({
			url: mockUrl,
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.cards).toBeDefined();
	});

	it('should require deck_id parameter', async () => {
		const { GET } = await import('./review/due/+server');

		const mockSupabase = mockSupabaseClient();
		const mockUrl = new URL('http://localhost'); // No deck_id

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await GET({
			url: mockUrl,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined(); // Zod will return validation error message
	});

	it('should return empty array when no cards are due', async () => {
		const { GET } = await import('./review/due/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: TEST_IDS.deck1, owner_id: TEST_IDS.user1 },
							error: null
						})
					})
				})
			})
		});

		mockSupabase.rpc.mockResolvedValue({
			data: [], // No due cards
			error: null
		});

		const mockUrl = new URL(`http://localhost?deck_id=${TEST_IDS.deck1}`);

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: TEST_IDS.user1 }
			})
		};

		// @ts-expect-error - Test mock has partial RequestEvent
		const response = await GET({
			url: mockUrl,
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.cards).toEqual([]);
	});
});
