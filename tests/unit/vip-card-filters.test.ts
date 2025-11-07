/**
 * VIP Card Filters - Unit Tests
 *
 * Tests for the backend logic that handles VIP card filtering:
 * 1. executeDrawCardsAction function (filter detection and RPC selection)
 * 2. Zod validation schemas (drawCardsFiltersSchema)
 *
 * These are pure unit tests that mock Supabase calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeVipCardAction } from '$lib/server/vip-card-actions';
import { drawCardsFiltersSchema } from '$lib/server/validation/draw-vip-cards';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Creates a mock Supabase client with RPC method
 */
function createMockSupabaseClient() {
	const mockRpc = vi.fn();

	const mockClient = {
		rpc: mockRpc
	} as unknown as SupabaseClient<Database>;

	return { mockClient, mockRpc };
}

describe('VIP Card Filters - Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================================
	// EXECUTE DRAW CARDS ACTION TESTS
	// ============================================================================

	describe('executeDrawCardsAction - filter detection', () => {
		it('should use award_vip_cards_with_filters RPC when forceRarity filter is present', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					cards: [
						{
							cardId: 'bonus',
							instanceId: '123e4567-e89b-12d3-a456-426614174000',
							name: 'Bonus',
							rarity: 'rare',
							earnedAt: '2025-11-06T10:00:00.000Z'
						}
					]
				},
				error: null
			});

			// Act
			const result = await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 1,
					filters: {
						forceRarity: 'rare'
					}
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(result.success).toBe(true);
			expect(mockRpc).toHaveBeenCalledWith(
				'award_vip_cards_with_filters',
				expect.objectContaining({
					p_student_id: '123e4567-e89b-12d3-a456-426614174001',
					p_count: 1,
					p_filters: { forceRarity: 'rare' }
				})
			);
			expect(result.data).toMatchObject({
				cardsDrawn: [
					expect.objectContaining({
						cardId: 'bonus',
						instanceId: '123e4567-e89b-12d3-a456-426614174000',
						name: 'Bonus',
						rarity: 'rare'
					})
				]
			});
		});

		it('should use award_vip_cards_with_filters RPC when minRarity filter is present', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					cards: [
						{
							cardId: 'super-bonus',
							instanceId: '123e4567-e89b-12d3-a456-426614174003',
							name: 'Super Bonus',
							rarity: 'rare',
							earnedAt: '2025-11-06T10:00:00.000Z'
						}
					]
				},
				error: null
			});

			// Act
			await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 1,
					filters: {
						minRarity: 'rare'
					}
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(mockRpc).toHaveBeenCalledWith(
				'award_vip_cards_with_filters',
				expect.objectContaining({
					p_filters: { minRarity: 'rare' }
				})
			);
		});

		it('should use award_vip_cards_with_filters RPC when excludeCardIds filter is present', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					cards: [
						{
							cardId: 'choix',
							instanceId: '123e4567-e89b-12d3-a456-426614174004',
							name: 'Choix de Place',
							rarity: 'common',
							earnedAt: '2025-11-06T10:00:00.000Z'
						}
					]
				},
				error: null
			});

			// Act
			await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 1,
					filters: {
						excludeCardIds: ['bonus', 'super-bonus']
					}
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(mockRpc).toHaveBeenCalledWith(
				'award_vip_cards_with_filters',
				expect.objectContaining({
					p_filters: { excludeCardIds: ['bonus', 'super-bonus'] }
				})
			);
		});

		it('should use award_vip_cards_with_filters RPC when onlyCardsWithActions filter is present', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					cards: [
						{
							cardId: 'soldes',
							instanceId: '123e4567-e89b-12d3-a456-426614174005',
							name: 'Soldes',
							rarity: 'common',
							earnedAt: '2025-11-06T10:00:00.000Z'
						}
					]
				},
				error: null
			});

			// Act
			await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 1,
					filters: {
						onlyCardsWithActions: true
					}
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(mockRpc).toHaveBeenCalledWith(
				'award_vip_cards_with_filters',
				expect.objectContaining({
					p_filters: { onlyCardsWithActions: true }
				})
			);
		});

		it('should use legacy award_vip_card_no_cost RPC when no filters are present', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: 'bonus',
				error: null
			});

			// Act
			await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 1
					// No filters property
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(mockRpc).toHaveBeenCalledWith(
				'award_vip_card_no_cost',
				expect.objectContaining({
					p_student_id: '123e4567-e89b-12d3-a456-426614174001',
					p_card_id: null
				})
			);
		});

		it('should use legacy RPC when filters object is empty', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: 'bonus',
				error: null
			});

			// Act
			await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 1,
					filters: {} // Empty filters object
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(mockRpc).toHaveBeenCalledWith('award_vip_card_no_cost', expect.any(Object));
		});

		it('should use legacy RPC when excludeCardIds is empty array', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: 'bonus',
				error: null
			});

			// Act
			await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 1,
					filters: {
						excludeCardIds: [] // Empty array - no actual exclusions
					}
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(mockRpc).toHaveBeenCalledWith('award_vip_card_no_cost', expect.any(Object));
		});

		it('should handle multiple cards with filters correctly', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					cards: [
						{
							cardId: 'bonus',
							instanceId: '123e4567-e89b-12d3-a456-426614174006',
							name: 'Bonus',
							rarity: 'rare',
							earnedAt: '2025-11-06T10:00:00.000Z'
						},
						{
							cardId: 'super-bonus',
							instanceId: '123e4567-e89b-12d3-a456-426614174007',
							name: 'Super Bonus',
							rarity: 'rare',
							earnedAt: '2025-11-06T10:00:01.000Z'
						},
						{
							cardId: 'mega-bonus',
							instanceId: '123e4567-e89b-12d3-a456-426614174008',
							name: 'Méga Bonus',
							rarity: 'rare',
							earnedAt: '2025-11-06T10:00:02.000Z'
						}
					]
				},
				error: null
			});

			// Act
			const result = await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 3,
					filters: {
						forceRarity: 'rare'
					}
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.data).toMatchObject({
				cardsDrawn: expect.arrayContaining([
					expect.objectContaining({ cardId: 'bonus', rarity: 'rare' }),
					expect.objectContaining({ cardId: 'super-bonus', rarity: 'rare' }),
					expect.objectContaining({ cardId: 'mega-bonus', rarity: 'rare' })
				])
			});
		});
	});

	describe('executeDrawCardsAction - response transformation', () => {
		it('should transform new RPC response format correctly', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					cards: [
						{
							cardId: 'bonus',
							instanceId: '123e4567-e89b-12d3-a456-426614174009',
							name: 'Bonus',
							rarity: 'rare',
							earnedAt: '2025-11-06T10:00:00.000Z'
						}
					]
				},
				error: null
			});

			// Act
			const result = await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 1,
					filters: { forceRarity: 'rare' }
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toBe('Drew 1 VIP card');
			expect(result.data).toEqual({
				cardsDrawn: [
					{
						cardId: 'bonus',
						instanceId: '123e4567-e89b-12d3-a456-426614174009',
						name: 'Bonus',
						rarity: 'rare',
						earnedAt: '2025-11-06T10:00:00.000Z'
					}
				]
			});
		});

		it('should handle legacy RPC response format correctly', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			// Legacy RPC returns just cardId as string
			mockRpc.mockResolvedValue({
				data: 'bonus',
				error: null
			});

			// Act
			const result = await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 1
					// No filters - uses legacy path
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				cardsDrawn: [
					{
						cardId: 'bonus',
						name: 'Bonus'
					}
				]
			});
		});

		it('should pluralize message correctly for multiple cards', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					cards: [
						{
							cardId: 'bonus',
							instanceId: '123e4567-e89b-12d3-a456-426614174010',
							name: 'Bonus',
							rarity: 'rare',
							earnedAt: '2025-11-06T10:00:00.000Z'
						},
						{
							cardId: 'super-bonus',
							instanceId: '123e4567-e89b-12d3-a456-426614174011',
							name: 'Super Bonus',
							rarity: 'rare',
							earnedAt: '2025-11-06T10:00:01.000Z'
						}
					]
				},
				error: null
			});

			// Act
			const result = await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 2,
					filters: { forceRarity: 'rare' }
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toBe('Drew 2 VIP cards');
		});
	});

	describe('executeDrawCardsAction - error handling', () => {
		it('should handle RPC errors correctly', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: null,
				error: {
					message: 'No cards available matching filters'
				}
			});

			// Act
			const result = await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 1,
					filters: { forceRarity: 'legendary' }
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(result.success).toBe(false);
			expect(result.message).toContain('Failed to execute action');
		});

		it('should handle empty cards array correctly', async () => {
			// Arrange
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					cards: [] // Empty array
				},
				error: null
			});

			// Act
			const result = await executeVipCardAction({
				action: {
					type: 'draw_cards',
					count: 1,
					filters: { forceRarity: 'rare' }
				},
				studentId: '123e4567-e89b-12d3-a456-426614174001',
				supabase: mockClient,
				teacherId: '123e4567-e89b-12d3-a456-426614174002'
			});

			// Assert
			expect(result.success).toBe(false);
			// The error is caught in try-catch and wrapped, so just verify it failed
			expect(result.message).toContain('Failed to execute action');
		});
	});

	// ============================================================================
	// ZOD VALIDATION TESTS
	// ============================================================================

	describe('drawCardsFiltersSchema - validation', () => {
		it('should accept valid forceRarity filter', () => {
			const result = drawCardsFiltersSchema.safeParse({
				forceRarity: 'rare'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.forceRarity).toBe('rare');
			}
		});

		it('should accept valid minRarity filter', () => {
			const result = drawCardsFiltersSchema.safeParse({
				minRarity: 'epic'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.minRarity).toBe('epic');
			}
		});

		it('should accept valid excludeCardIds filter', () => {
			const result = drawCardsFiltersSchema.safeParse({
				excludeCardIds: ['bonus', 'super-bonus', 'mega-bonus']
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.excludeCardIds).toEqual(['bonus', 'super-bonus', 'mega-bonus']);
			}
		});

		it('should accept valid onlyCardsWithActions filter', () => {
			const result = drawCardsFiltersSchema.safeParse({
				onlyCardsWithActions: true
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.onlyCardsWithActions).toBe(true);
			}
		});

		it('should accept multiple compatible filters', () => {
			const result = drawCardsFiltersSchema.safeParse({
				minRarity: 'rare',
				excludeCardIds: ['bonus'],
				onlyCardsWithActions: true
			});

			expect(result.success).toBe(true);
		});

		it('should accept empty filters object', () => {
			const result = drawCardsFiltersSchema.safeParse({});

			expect(result.success).toBe(true);
		});

		it('should reject forceRarity + minRarity combination', () => {
			const result = drawCardsFiltersSchema.safeParse({
				forceRarity: 'rare',
				minRarity: 'epic'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain(
					'Cannot use both forceRarity and minRarity filters together'
				);
			}
		});

		it('should reject invalid rarity value for forceRarity', () => {
			const result = drawCardsFiltersSchema.safeParse({
				forceRarity: 'ultra-rare' // Invalid
			});

			expect(result.success).toBe(false);
		});

		it('should reject invalid rarity value for minRarity', () => {
			const result = drawCardsFiltersSchema.safeParse({
				minRarity: 'super-legendary' // Invalid
			});

			expect(result.success).toBe(false);
		});

		it('should reject excludeCardIds with empty strings', () => {
			const result = drawCardsFiltersSchema.safeParse({
				excludeCardIds: ['bonus', '', 'super-bonus'] // Empty string not allowed
			});

			expect(result.success).toBe(false);
		});

		it('should reject excludeCardIds exceeding max length (50)', () => {
			const tooManyCards = Array.from({ length: 51 }, (_, i) => `card-${i}`);

			const result = drawCardsFiltersSchema.safeParse({
				excludeCardIds: tooManyCards
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Cannot exclude more than 50 cards');
			}
		});

		it('should reject unknown filter properties (strict mode)', () => {
			const result = drawCardsFiltersSchema.safeParse({
				forceRarity: 'rare',
				unknownFilter: 'value' // Unknown property
			});

			expect(result.success).toBe(false);
		});

		it('should accept excludeCardIds as empty array', () => {
			const result = drawCardsFiltersSchema.safeParse({
				excludeCardIds: []
			});

			expect(result.success).toBe(true);
		});

		it('should accept onlyCardsWithActions as false', () => {
			const result = drawCardsFiltersSchema.safeParse({
				onlyCardsWithActions: false
			});

			expect(result.success).toBe(true);
		});

		it('should accept all valid rarity values', () => {
			const rarities = ['common', 'rare', 'epic', 'legendary'];

			for (const rarity of rarities) {
				const forceResult = drawCardsFiltersSchema.safeParse({
					forceRarity: rarity
				});
				expect(forceResult.success).toBe(true);

				const minResult = drawCardsFiltersSchema.safeParse({
					minRarity: rarity
				});
				expect(minResult.success).toBe(true);
			}
		});
	});
});
