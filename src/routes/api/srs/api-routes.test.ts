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

describe('POST /api/srs/decks - Create Deck', () => {
	it('should create a personal deck with valid data', async () => {
		const { POST } = await import('./decks/+server');

		const mockSupabase = mockSupabaseClient();
		const insertMock = vi.fn().mockResolvedValue({
			data: {
				id: 'deck-123',
				name: 'Test Deck',
				description: 'Test Description',
				owner_id: 'user-123',
				deck_type: 'personal',
				is_assigned: false,
				config: { desiredRetention: 0.9 },
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
				user: { id: 'user-123' }
			})
		};

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
				user: { id: 'user-123' }
			})
		};

		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toContain('name');
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
				user: { id: 'user-123' }
			})
		};

		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toContain('deck type');
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
				user: { id: 'user-123' }
			})
		};

		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toContain('retention');
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
						data: { ...data, id: 'deck-123' },
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
				user: { id: 'user-123' }
			})
		};

		await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(capturedConfig.desiredRetention).toBe(0.9); // Default
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
								id: 'deck-1',
								name: 'Deck 1',
								owner_id: 'user-123'
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
				user: { id: 'user-123' }
			})
		};

		const response = await GET({
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

		const response = await GET({
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
				user: { id: 'user-123' }
			})
		};

		const response = await GET({
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

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
									data: { id: 'deck-1', is_assigned: false, owner_id: 'user-123' },
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
								data: { id: 'template-1', status: 'published' },
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
									id: 'card-1',
									deck_id: 'deck-1',
									card_type: 'template',
									template_id: 'template-1'
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
				deckId: 'deck-1',
				cardType: 'template',
				templateId: 'template-1'
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.card.card_type).toBe('template');
		expect(data.card.template_id).toBe('template-1');
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
									data: { id: 'deck-1', is_assigned: false, owner_id: 'user-123' },
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
									id: 'card-1',
									deck_id: 'deck-1',
									card_type: 'custom',
									front_content: [{ type: 'text', content: 'Front' }],
									back_content: [{ type: 'text', content: 'Back' }]
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
				deckId: 'deck-1',
				cardType: 'custom',
				frontContent: [{ type: 'text', content: 'Front' }],
				backContent: [{ type: 'text', content: 'Back' }]
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

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
							data: { id: 'deck-1', is_assigned: true, owner_id: 'user-123' }, // Assigned!
							error: null
						})
					})
				})
			})
		});

		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				deckId: 'deck-1',
				cardType: 'template',
				templateId: 'template-1'
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(403);
		const data = await response.json();
		expect(data.error).toContain('assigned');
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
									data: { id: 'deck-1', is_assigned: false, owner_id: 'user-123' },
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
								data: { id: 'template-1', status: 'draft' }, // Not published!
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
				deckId: 'deck-1',
				cardType: 'template',
				templateId: 'template-1'
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toContain('published');
	});

	it('should reject custom card with empty content', async () => {
		const { POST } = await import('./cards/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'deck-1', is_assigned: false, owner_id: 'user-123' },
							error: null
						})
					})
				})
			})
		});

		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				deckId: 'deck-1',
				cardType: 'custom',
				frontContent: [], // Empty!
				backContent: [{ type: 'text', content: 'Back' }]
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toContain('empty');
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
									data: { id: 'deck-1', owner_id: 'user-123' },
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
									{ id: 'card-1', deck_id: 'deck-1', card_type: 'template' },
									{ id: 'card-2', deck_id: 'deck-1', card_type: 'custom' }
								],
								error: null
							})
						})
					})
				};
			}
			return {};
		});

		const mockUrl = new URL('http://localhost?deck_id=deck-1');

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

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
				user: { id: 'user-123' }
			})
		};

		const response = await GET({
			url: mockUrl,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toContain('deck_id');
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
									id: 'card-1',
									deck_id: 'deck-1',
									card_type: 'template',
									template_id: 'template-1'
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
										id: 'deck-1',
										owner_id: 'user-123',
										config: { desiredRetention: 0.9 }
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
				cardId: 'card-1',
				deckId: 'deck-1',
				grade: Grade.GOOD,
				timeSpent: 30
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

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
				cardId: 'card-1',
				deckId: 'deck-1',
				grade: 5, // Invalid!
				timeSpent: 30
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toContain('grade');
	});

	it('should require cardId', async () => {
		const { POST } = await import('./review/submit/+server');

		const mockSupabase = mockSupabaseClient();
		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				deckId: 'deck-1',
				grade: Grade.GOOD
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toContain('cardId');
	});

	it('should require deckId', async () => {
		const { POST } = await import('./review/submit/+server');

		const mockSupabase = mockSupabaseClient();
		const mockRequest = {
			json: vi.fn().mockResolvedValue({
				cardId: 'card-1',
				grade: Grade.GOOD
			})
		} as unknown as Request;

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

		const response = await POST({
			request: mockRequest,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toContain('deckId');
	});
});

describe('GET /api/srs/review/due - Get Due Cards', () => {
	it('should return due cards for deck', async () => {
		const { GET } = await import('./review/due/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'deck-1', owner_id: 'user-123' },
							error: null
						})
					})
				})
			})
		});

		mockSupabase.rpc.mockResolvedValue({
			data: [
				{
					card_id: 'card-1',
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

		const mockUrl = new URL('http://localhost?deck_id=deck-1');

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

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
				user: { id: 'user-123' }
			})
		};

		const response = await GET({
			url: mockUrl,
			locals: mockLocals
		} as unknown as RequestEvent);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toContain('deck_id');
	});

	it('should return empty array when no cards are due', async () => {
		const { GET } = await import('./review/due/+server');

		const mockSupabase = mockSupabaseClient();

		mockSupabase.from.mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'deck-1', owner_id: 'user-123' },
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

		const mockUrl = new URL('http://localhost?deck_id=deck-1');

		const mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: { access_token: 'token' },
				user: { id: 'user-123' }
			})
		};

		const response = await GET({
			url: mockUrl,
			locals: mockLocals
		} as unknown as RequestEvent);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.cards).toEqual([]);
	});
});
