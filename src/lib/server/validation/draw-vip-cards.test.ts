/**
 * Unit tests for draw VIP cards validation schemas
 */

import { describe, it, expect } from 'vitest';
import { drawVipCardsSchema, drawCardsFiltersSchema } from './draw-vip-cards';

describe('drawCardsFiltersSchema', () => {
	describe('valid inputs', () => {
		it('accepts empty object', () => {
			const result = drawCardsFiltersSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('accepts forceRarity alone', () => {
			const result = drawCardsFiltersSchema.safeParse({ forceRarity: 'legendary' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.forceRarity).toBe('legendary');
			}
		});

		it('accepts minRarity alone', () => {
			const result = drawCardsFiltersSchema.safeParse({ minRarity: 'rare' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.minRarity).toBe('rare');
			}
		});

		it('accepts excludeCardIds array', () => {
			const result = drawCardsFiltersSchema.safeParse({
				excludeCardIds: ['card1', 'card2', 'card3']
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.excludeCardIds).toEqual(['card1', 'card2', 'card3']);
			}
		});

		it('accepts onlyCardsWithActions boolean', () => {
			const result = drawCardsFiltersSchema.safeParse({ onlyCardsWithActions: true });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.onlyCardsWithActions).toBe(true);
			}
		});

		it('accepts all valid rarities for forceRarity', () => {
			const rarities = ['common', 'rare', 'epic', 'legendary'] as const;
			for (const rarity of rarities) {
				const result = drawCardsFiltersSchema.safeParse({ forceRarity: rarity });
				expect(result.success).toBe(true);
			}
		});

		it('accepts all valid rarities for minRarity', () => {
			const rarities = ['common', 'rare', 'epic', 'legendary'] as const;
			for (const rarity of rarities) {
				const result = drawCardsFiltersSchema.safeParse({ minRarity: rarity });
				expect(result.success).toBe(true);
			}
		});

		it('accepts multiple filters together (without both forceRarity and minRarity)', () => {
			const result = drawCardsFiltersSchema.safeParse({
				minRarity: 'epic',
				excludeCardIds: ['card1'],
				onlyCardsWithActions: true
			});
			expect(result.success).toBe(true);
		});
	});

	describe('invalid inputs', () => {
		it('rejects forceRarity and minRarity together', () => {
			const result = drawCardsFiltersSchema.safeParse({
				forceRarity: 'legendary',
				minRarity: 'rare'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe(
					'Cannot use both forceRarity and minRarity filters together'
				);
			}
		});

		it('rejects invalid rarity for forceRarity', () => {
			const result = drawCardsFiltersSchema.safeParse({ forceRarity: 'mythic' });
			expect(result.success).toBe(false);
		});

		it('rejects invalid rarity for minRarity', () => {
			const result = drawCardsFiltersSchema.safeParse({ minRarity: 'super-rare' });
			expect(result.success).toBe(false);
		});

		it('rejects empty strings in excludeCardIds', () => {
			const result = drawCardsFiltersSchema.safeParse({
				excludeCardIds: ['card1', '', 'card2']
			});
			expect(result.success).toBe(false);
		});

		it('rejects excludeCardIds with more than 50 items', () => {
			const result = drawCardsFiltersSchema.safeParse({
				excludeCardIds: Array.from({ length: 51 }, (_, i) => `card${i}`)
			});
			expect(result.success).toBe(false);
		});

		it('rejects unknown properties (strict mode)', () => {
			const result = drawCardsFiltersSchema.safeParse({
				forceRarity: 'legendary',
				unknownField: 'value'
			});
			expect(result.success).toBe(false);
		});
	});
});

describe('drawVipCardsSchema', () => {
	const validStudentId = '550e8400-e29b-41d4-a716-446655440000';
	const validInstanceId = '660e8400-e29b-41d4-a716-446655440001';

	describe('gidouilles payment', () => {
		it('accepts valid gidouilles payment', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 3,
				paymentMethod: 'gidouilles',
				gidouillesCost: 15
			});
			expect(result.success).toBe(true);
		});

		it('accepts gidouilles payment with filters', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 5,
				paymentMethod: 'gidouilles',
				gidouillesCost: 25,
				filters: {
					forceRarity: 'epic',
					excludeCardIds: ['card1', 'card2'],
					onlyCardsWithActions: true
				}
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.filters?.forceRarity).toBe('epic');
				expect(result.data.filters?.excludeCardIds).toEqual(['card1', 'card2']);
				expect(result.data.filters?.onlyCardsWithActions).toBe(true);
			}
		});

		it('rejects gidouilles payment with invalid filters', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 3,
				paymentMethod: 'gidouilles',
				gidouillesCost: 15,
				filters: {
					forceRarity: 'legendary',
					minRarity: 'rare' // Mutually exclusive with forceRarity
				}
			});
			expect(result.success).toBe(false);
		});

		it('rejects count less than 1', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 0,
				paymentMethod: 'gidouilles',
				gidouillesCost: 0
			});
			expect(result.success).toBe(false);
		});

		it('rejects count greater than 10', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 11,
				paymentMethod: 'gidouilles',
				gidouillesCost: 50
			});
			expect(result.success).toBe(false);
		});

		it('rejects negative gidouillesCost', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: -5
			});
			expect(result.success).toBe(false);
		});

		it('rejects gidouillesCost greater than 100', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 10,
				paymentMethod: 'gidouilles',
				gidouillesCost: 101
			});
			expect(result.success).toBe(false);
		});
	});

	describe('vip_card payment', () => {
		it('accepts valid vip_card payment', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 2,
				paymentMethod: 'vip_card',
				vipCardInstanceId: validInstanceId
			});
			expect(result.success).toBe(true);
		});

		it('accepts vip_card payment with filters', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 3,
				paymentMethod: 'vip_card',
				vipCardInstanceId: validInstanceId,
				filters: {
					minRarity: 'rare',
					onlyCardsWithActions: false
				}
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.filters?.minRarity).toBe('rare');
				expect(result.data.filters?.onlyCardsWithActions).toBe(false);
			}
		});

		it('rejects invalid vipCardInstanceId', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 1,
				paymentMethod: 'vip_card',
				vipCardInstanceId: 'not-a-uuid'
			});
			expect(result.success).toBe(false);
		});

		it('rejects vip_card payment with gidouillesCost', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 1,
				paymentMethod: 'vip_card',
				vipCardInstanceId: validInstanceId,
				gidouillesCost: 10 // Should not be present for vip_card payment
			});
			expect(result.success).toBe(false);
		});
	});

	describe('common validations', () => {
		it('rejects invalid studentId', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: 'not-a-uuid',
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 5
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid paymentMethod', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 1,
				paymentMethod: 'bitcoin', // Invalid
				gidouillesCost: 5
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-integer count', () => {
			const result = drawVipCardsSchema.safeParse({
				studentId: validStudentId,
				count: 2.5,
				paymentMethod: 'gidouilles',
				gidouillesCost: 10
			});
			expect(result.success).toBe(false);
		});
	});
});
