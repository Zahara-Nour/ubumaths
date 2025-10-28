/**
 * Tests for SRS (Spaced Repetition System) validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
	createDeckSchema,
	createTemplateCardSchema,
	createCustomCardSchema,
	createCardSchema,
	submitReviewSchema,
	updateDeckSchema,
	listDecksQuerySchema,
	listCardsQuerySchema,
	updateCardSchema,
	assignDeckSchema,
	dueCardsQuerySchema,
	deckResponseSchema,
	deckWithStatsResponseSchema,
	cardResponseSchema,
	cardWithStateResponseSchema
} from './srs';

describe('SRS validation schemas', () => {
	// ============================================================================
	// DECK SCHEMAS
	// ============================================================================

	describe('createDeckSchema', () => {
		it('should accept valid deck data', () => {
			const data = {
				name: 'Mathematics Fundamentals',
				description: 'Basic math concepts for students',
				deckType: 'official',
				config: {
					desiredRetention: 0.9,
					maximumInterval: 365
				}
			};

			const result = createDeckSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept minimal deck data', () => {
			const data = {
				name: 'My Deck',
				deckType: 'personal'
			};

			const result = createDeckSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept both deck types', () => {
			['official', 'personal'].forEach((deckType) => {
				const data = {
					name: 'Test Deck',
					deckType
				};

				const result = createDeckSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should reject empty name', () => {
			const data = {
				name: '   ',
				deckType: 'personal'
			};

			const result = createDeckSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject name exceeding max length', () => {
			const data = {
				name: 'a'.repeat(101),
				deckType: 'personal'
			};

			const result = createDeckSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid deck type', () => {
			const data = {
				name: 'Test',
				deckType: 'invalid'
			};

			const result = createDeckSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject desiredRetention below minimum', () => {
			const data = {
				name: 'Test',
				deckType: 'personal',
				config: {
					desiredRetention: 0.6 // Below 0.7 minimum
				}
			};

			const result = createDeckSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject desiredRetention above maximum', () => {
			const data = {
				name: 'Test',
				deckType: 'personal',
				config: {
					desiredRetention: 0.98 // Above 0.97 maximum
				}
			};

			const result = createDeckSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject maximumInterval exceeding limit', () => {
			const data = {
				name: 'Test',
				deckType: 'personal',
				config: {
					maximumInterval: 36501 // Over 36500 (100 years)
				}
			};

			const result = createDeckSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// CARD SCHEMAS (Discriminated Union)
	// ============================================================================

	describe('createTemplateCardSchema', () => {
		it('should accept valid template card', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'template',
				templateId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = createTemplateCardSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid deckId', () => {
			const data = {
				deckId: 'not-a-uuid',
				cardType: 'template',
				templateId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = createTemplateCardSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid templateId', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'template',
				templateId: 'invalid'
			};

			const result = createTemplateCardSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('createCustomCardSchema', () => {
		it('should accept valid custom card', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'custom',
				frontContent: [
					{
						type: 'text',
						value: 'What is 2 + 2?'
					}
				],
				backContent: [
					{
						type: 'text',
						value: '4'
					}
				]
			};

			const result = createCustomCardSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept all content field types', () => {
			const types = ['text', 'latex', 'image', 'markdown'] as const;
			types.forEach((type) => {
				const data = {
					deckId: '550e8400-e29b-41d4-a716-446655440000',
					cardType: 'custom',
					frontContent: [{ type, value: 'Test content' }],
					backContent: [{ type, value: 'Answer' }]
				};

				const result = createCustomCardSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should accept multiple content fields', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'custom',
				frontContent: [
					{ type: 'text', value: 'Question' },
					{ type: 'latex', value: 'x^2 + 1' },
					{ type: 'image', value: 'https://example.com/img.png' }
				],
				backContent: [{ type: 'text', value: 'Answer' }]
			};

			const result = createCustomCardSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept metadata in content fields', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'custom',
				frontContent: [
					{
						type: 'image',
						value: 'img.png',
						metadata: { alt: 'Diagram', width: 300 }
					}
				],
				backContent: [{ type: 'text', value: 'Answer' }]
			};

			const result = createCustomCardSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject empty frontContent', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'custom',
				frontContent: [],
				backContent: [{ type: 'text', value: 'Answer' }]
			};

			const result = createCustomCardSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many content fields', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'custom',
				frontContent: Array.from({ length: 11 }, () => ({
					type: 'text',
					value: 'Content'
				})),
				backContent: [{ type: 'text', value: 'Answer' }]
			};

			const result = createCustomCardSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject value exceeding max length', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'custom',
				frontContent: [
					{
						type: 'text',
						value: 'a'.repeat(5001)
					}
				],
				backContent: [{ type: 'text', value: 'Answer' }]
			};

			const result = createCustomCardSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('createCardSchema (discriminated union)', () => {
		it('should accept template card', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'template',
				templateId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = createCardSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept custom card', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'custom',
				frontContent: [{ type: 'text', value: 'Q' }],
				backContent: [{ type: 'text', value: 'A' }]
			};

			const result = createCardSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid discriminator', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'invalid',
				templateId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = createCardSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept template card with extra fields (not strict mode)', () => {
			// Note: Schema doesn't use .strict() so extra fields are allowed
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'template',
				templateId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				frontContent: [{ type: 'text', value: 'Q' }] // Extra field, but allowed
			};

			const result = createCardSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				// Extra fields are stripped by Zod (not in output)
				expect(result.data).not.toHaveProperty('frontContent');
			}
		});

		it('should reject custom card without required fields', () => {
			const data = {
				deckId: '550e8400-e29b-41d4-a716-446655440000',
				cardType: 'custom',
				templateId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' // Invalid for custom
			};

			const result = createCardSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// REVIEW SCHEMA
	// ============================================================================

	describe('submitReviewSchema', () => {
		it('should accept valid review', () => {
			const data = {
				cardId: '550e8400-e29b-41d4-a716-446655440000',
				deckId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				grade: 3,
				timeSpent: 45
			};

			const result = submitReviewSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept all valid grades', () => {
			[1, 2, 3, 4].forEach((grade) => {
				const data = {
					cardId: '550e8400-e29b-41d4-a716-446655440000',
					deckId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
					grade
				};

				const result = submitReviewSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should reject invalid grades', () => {
			[0, 5, -1, 2.5].forEach((grade) => {
				const data = {
					cardId: '550e8400-e29b-41d4-a716-446655440000',
					deckId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
					grade
				};

				const result = submitReviewSchema.safeParse(data);
				expect(result.success).toBe(false);
			});
		});

		it('should reject timeSpent exceeding max', () => {
			const data = {
				cardId: '550e8400-e29b-41d4-a716-446655440000',
				deckId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				grade: 3,
				timeSpent: 3601 // Over 1 hour
			};

			const result = submitReviewSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject negative timeSpent', () => {
			const data = {
				cardId: '550e8400-e29b-41d4-a716-446655440000',
				deckId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				grade: 3,
				timeSpent: -10
			};

			const result = submitReviewSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// UPDATE & QUERY SCHEMAS
	// ============================================================================

	describe('updateDeckSchema', () => {
		it('should accept partial updates', () => {
			const updates = [
				{ name: 'Updated Name' },
				{ description: 'New description' },
				{ config: { desiredRetention: 0.85 } }
			];

			updates.forEach((update) => {
				const result = updateDeckSchema.safeParse(update);
				expect(result.success).toBe(true);
			});
		});

		it('should accept empty object', () => {
			const result = updateDeckSchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});

	describe('listDecksQuerySchema', () => {
		it('should accept valid query', () => {
			const data = {
				deckType: 'official',
				search: 'mathematics'
			};

			const result = listDecksQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept empty query', () => {
			const result = listDecksQuerySchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should reject search exceeding max length', () => {
			const data = {
				search: 'a'.repeat(101)
			};

			const result = listDecksQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('listCardsQuerySchema', () => {
		it('should accept valid deck_id', () => {
			const data = {
				deck_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = listCardsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid deck_id', () => {
			const data = {
				deck_id: 'not-a-uuid'
			};

			const result = listCardsQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('updateCardSchema', () => {
		it('should accept content updates', () => {
			const data = {
				frontContent: [{ type: 'text', value: 'Updated question' }],
				backContent: [{ type: 'text', value: 'Updated answer' }]
			};

			const result = updateCardSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept partial updates', () => {
			const updates = [
				{ frontContent: [{ type: 'text', value: 'New front' }] },
				{ backContent: [{ type: 'text', value: 'New back' }] }
			];

			updates.forEach((update) => {
				const result = updateCardSchema.safeParse(update);
				expect(result.success).toBe(true);
			});
		});
	});

	describe('assignDeckSchema', () => {
		it('should accept student assignment', () => {
			const data = {
				targetType: 'student',
				targetIds: ['550e8400-e29b-41d4-a716-446655440000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8']
			};

			const result = assignDeckSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept class assignment', () => {
			const data = {
				targetType: 'class',
				targetIds: ['550e8400-e29b-41d4-a716-446655440000']
			};

			const result = assignDeckSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject empty targetIds', () => {
			const data = {
				targetType: 'student',
				targetIds: []
			};

			const result = assignDeckSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many targets', () => {
			const data = {
				targetType: 'student',
				targetIds: Array.from(
					{ length: 101 },
					(_, i) => `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`
				)
			};

			const result = assignDeckSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('dueCardsQuerySchema', () => {
		it('should accept valid deck_id', () => {
			const data = {
				deck_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = dueCardsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	// ============================================================================
	// RESPONSE SCHEMAS
	// ============================================================================

	describe('deckResponseSchema', () => {
		it('should accept valid deck response', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Math Deck',
				description: 'Mathematics flashcards',
				owner_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				deck_type: 'official',
				is_assigned: true,
				config: {
					desiredRetention: 0.9,
					maximumInterval: 365
				},
				created_at: '2025-01-01T00:00:00.000Z',
				updated_at: '2025-01-02T00:00:00.000Z'
			};

			const result = deckResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept null description', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Deck',
				description: null,
				owner_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				deck_type: 'personal',
				is_assigned: false,
				config: {
					desiredRetention: 0.9,
					maximumInterval: 365
				},
				created_at: '2025-01-01T00:00:00.000Z',
				updated_at: '2025-01-02T00:00:00.000Z'
			};

			const result = deckResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe('deckWithStatsResponseSchema', () => {
		it('should accept deck with stats', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Deck',
				owner_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				deck_type: 'official',
				is_assigned: true,
				config: {
					desiredRetention: 0.9,
					maximumInterval: 365
				},
				created_at: '2025-01-01T00:00:00.000Z',
				updated_at: '2025-01-02T00:00:00.000Z',
				stats: {
					total_cards: 100,
					due_count: 10,
					new_count: 5,
					learning_count: 3,
					review_count: 82
				}
			};

			const result = deckWithStatsResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe('cardResponseSchema', () => {
		it('should accept template card response', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				deck_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				card_type: 'template',
				template_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
				created_at: '2025-01-01T00:00:00.000Z',
				updated_at: '2025-01-02T00:00:00.000Z'
			};

			const result = cardResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept custom card response', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				deck_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				card_type: 'custom',
				front_content: [{ type: 'text', value: 'Q' }],
				back_content: [{ type: 'text', value: 'A' }],
				created_at: '2025-01-01T00:00:00.000Z',
				updated_at: '2025-01-02T00:00:00.000Z'
			};

			const result = cardResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe('cardWithStateResponseSchema', () => {
		it('should accept card with state', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				deck_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				card_type: 'custom',
				front_content: [{ type: 'text', value: 'Q' }],
				back_content: [{ type: 'text', value: 'A' }],
				created_at: '2025-01-01T00:00:00.000Z',
				updated_at: '2025-01-02T00:00:00.000Z',
				state: {
					stability: 1.5,
					difficulty: 5.0,
					elapsed_days: 2,
					scheduled_days: 3,
					reps: 5,
					lapses: 1,
					state: 'Review',
					last_review: '2025-01-15T10:00:00.000Z'
				},
				due_date: '2025-01-18T10:00:00.000Z'
			};

			const result = cardWithStateResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept all valid states', () => {
			const states = ['New', 'Learning', 'Review', 'Relearning'] as const;
			states.forEach((state) => {
				const data = {
					id: '550e8400-e29b-41d4-a716-446655440000',
					deck_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
					card_type: 'template',
					created_at: '2025-01-01T00:00:00.000Z',
					updated_at: '2025-01-02T00:00:00.000Z',
					state: {
						stability: 1.5,
						difficulty: 5.0,
						elapsed_days: 0,
						scheduled_days: 1,
						reps: 0,
						lapses: 0,
						state,
						last_review: null
					},
					due_date: '2025-01-18T10:00:00.000Z'
				};

				const result = cardWithStateResponseSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});
	});
});
