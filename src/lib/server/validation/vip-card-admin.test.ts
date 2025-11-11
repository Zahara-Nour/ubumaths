/**
 * Tests for VIP Card Admin Validation Schemas
 * ============================================
 *
 * Comprehensive tests for VIP card action validation using discriminated union pattern.
 * Tests all 5 action types with their specific parameters, constraints, and edge cases.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { createTemplateSchema, updateTemplateSchema } from './vip-card-admin';

// Import internal actionSchema for testing (not exported, but we'll test via createTemplateSchema)
// We test action validation through the template schemas that use it

describe('VIP Card Action Validation', () => {
	// ============================================================================
	// DRAW_CARDS ACTION
	// ============================================================================

	describe('draw_cards action', () => {
		describe('valid cases', () => {
			it('should accept minimal draw_cards (required fields only)', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'common',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 1
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.action?.type).toBe('draw_cards');
					if (result.data.action?.type === 'draw_cards') {
						expect(result.data.action.count).toBe(1);
					}
				}
			});

			it('should accept draw_cards with max count', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'epic',
					category: 'power',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 10
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success && result.data.action?.type === 'draw_cards') {
					expect(result.data.action.count).toBe(10);
				}
			});

			it('should accept draw_cards with forceRarity filter', () => {
				const rarities = ['common', 'rare', 'epic', 'legendary'] as const;
				rarities.forEach((rarity) => {
					const result = createTemplateSchema.safeParse({
						id: 'test-card',
						name: 'Test Card',
						description: 'Test description',
						rarity: 'epic',
						category: 'bonus',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'draw_cards',
							count: 5,
							filters: {
								forceRarity: rarity
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(true);
					if (result.success && result.data.action?.type === 'draw_cards') {
						expect(result.data.action.filters?.forceRarity).toBe(rarity);
					}
				});
			});

			it('should accept draw_cards with minRarity filter', () => {
				const rarities = ['common', 'rare', 'epic', 'legendary'] as const;
				rarities.forEach((rarity) => {
					const result = createTemplateSchema.safeParse({
						id: 'test-card',
						name: 'Test Card',
						description: 'Test description',
						rarity: 'epic',
						category: 'bonus',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'draw_cards',
							count: 5,
							filters: {
								minRarity: rarity
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(true);
					if (result.success && result.data.action?.type === 'draw_cards') {
						expect(result.data.action.filters?.minRarity).toBe(rarity);
					}
				});
			});

			it('should accept draw_cards with excludeCardIds filter', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'rare',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 5,
						filters: {
							excludeCardIds: ['bonus', 'super-bonus']
						}
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success && result.data.action?.type === 'draw_cards') {
					expect(result.data.action.filters?.excludeCardIds).toEqual(['bonus', 'super-bonus']);
				}
			});

			it('should accept draw_cards with onlyCardsWithActions filter', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'rare',
					category: 'power',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 3,
						filters: {
							onlyCardsWithActions: true
						}
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success && result.data.action?.type === 'draw_cards') {
					expect(result.data.action.filters?.onlyCardsWithActions).toBe(true);
				}
			});

			it('should accept draw_cards with multiple compatible filters', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'legendary',
					category: 'power',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 5,
						filters: {
							minRarity: 'rare',
							excludeCardIds: ['bonus', 'warning-remover'],
							onlyCardsWithActions: true
						}
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success && result.data.action?.type === 'draw_cards') {
					expect(result.data.action.filters?.minRarity).toBe('rare');
					expect(result.data.action.filters?.excludeCardIds).toEqual(['bonus', 'warning-remover']);
					expect(result.data.action.filters?.onlyCardsWithActions).toBe(true);
				}
			});

			it('should accept draw_cards with max excludeCardIds (50 items)', () => {
				const cardIds = Array.from({ length: 50 }, (_, i) => `card-${i}`);
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'epic',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 5,
						filters: {
							excludeCardIds: cardIds
						}
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect((result.data.action as any).filters?.excludeCardIds?.length).toBe(50);
				}
			});
		});

		describe('invalid cases', () => {
			it('should reject draw_cards with both forceRarity and minRarity', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'epic',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 5,
						filters: {
							forceRarity: 'rare',
							minRarity: 'epic'
						}
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('both forceRarity and minRarity');
				}
			});

			it('should reject draw_cards with count = 0', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'common',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 0
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('at least 1');
				}
			});

			it('should reject draw_cards with negative count', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'common',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: -5
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});

			it('should reject draw_cards with count > 10', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'common',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 11
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('cannot exceed 10');
				}
			});

			it('should reject draw_cards with decimal count', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'common',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 5.5
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('integer');
				}
			});

			it('should reject draw_cards with count as string', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'common',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: '5'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});

			it('should reject draw_cards with invalid rarity', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'epic',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 5,
						filters: {
							forceRarity: 'ultra'
						}
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});

			it('should reject draw_cards with too many excludeCardIds (>50)', () => {
				const cardIds = Array.from({ length: 51 }, (_, i) => `card-${i}`);
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'epic',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 5,
						filters: {
							excludeCardIds: cardIds
						}
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('more than 50');
				}
			});

			it('should reject draw_cards with empty string in excludeCardIds', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'epic',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: 5,
						filters: {
							excludeCardIds: ['bonus', '', 'super-bonus']
						}
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('cannot be empty');
				}
			});

			it('should reject draw_cards with Infinity count', () => {
				const result = createTemplateSchema.safeParse({
					id: 'test-card',
					name: 'Test Card',
					description: 'Test description',
					rarity: 'common',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'draw_cards',
						count: Infinity
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				// Note: Zod detects Infinity as invalid number type at parse level
			});
		});
	});

	// ============================================================================
	// REMOVE_WARNINGS ACTION
	// ============================================================================

	describe('remove_warnings action', () => {
		describe('valid cases', () => {
			it('should accept minimal remove_warnings (required fields only)', () => {
				const result = createTemplateSchema.safeParse({
					id: 'warning-remover',
					name: 'Warning Remover',
					description: 'Remove warnings',
					rarity: 'rare',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'remove_warnings',
						count: 1
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.action?.type).toBe('remove_warnings');
					expect((result.data.action as any).count).toBe(1);
				}
			});

			it('should accept remove_warnings with max count', () => {
				const result = createTemplateSchema.safeParse({
					id: 'warning-remover',
					name: 'Warning Remover',
					description: 'Remove warnings',
					rarity: 'legendary',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'remove_warnings',
						count: 5
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect((result.data.action as any).count).toBe(5);
				}
			});

			it('should accept remove_warnings with warningType', () => {
				const warningTypes = ['C', 'M', 'R', 'T'] as const;
				warningTypes.forEach((type) => {
					const result = createTemplateSchema.safeParse({
						id: 'warning-remover',
						name: 'Warning Remover',
						description: 'Remove warnings',
						rarity: 'epic',
						category: 'privilege',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'remove_warnings',
							count: 2,
							warningType: type
						},
						sortOrder: 0
					});
					expect(result.success).toBe(true);
					if (result.success && result.data.action?.type === 'remove_warnings') {
						expect(result.data.action.warningType).toBe(type);
					}
				});
			});
		});

		describe('invalid cases', () => {
			it('should reject remove_warnings with count = 0', () => {
				const result = createTemplateSchema.safeParse({
					id: 'warning-remover',
					name: 'Warning Remover',
					description: 'Remove warnings',
					rarity: 'rare',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'remove_warnings',
						count: 0
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('at least 1');
				}
			});

			it('should reject remove_warnings with negative count', () => {
				const result = createTemplateSchema.safeParse({
					id: 'warning-remover',
					name: 'Warning Remover',
					description: 'Remove warnings',
					rarity: 'rare',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'remove_warnings',
						count: -1
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});

			it('should reject remove_warnings with count > 5', () => {
				const result = createTemplateSchema.safeParse({
					id: 'warning-remover',
					name: 'Warning Remover',
					description: 'Remove warnings',
					rarity: 'rare',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'remove_warnings',
						count: 6
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('cannot exceed 5');
				}
			});

			it('should reject remove_warnings with decimal count', () => {
				const result = createTemplateSchema.safeParse({
					id: 'warning-remover',
					name: 'Warning Remover',
					description: 'Remove warnings',
					rarity: 'rare',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'remove_warnings',
						count: 2.5
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('integer');
				}
			});

			it('should reject remove_warnings with count as string', () => {
				const result = createTemplateSchema.safeParse({
					id: 'warning-remover',
					name: 'Warning Remover',
					description: 'Remove warnings',
					rarity: 'rare',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'remove_warnings',
						count: '2'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});

			it('should reject remove_warnings with invalid warningType', () => {
				const result = createTemplateSchema.safeParse({
					id: 'warning-remover',
					name: 'Warning Remover',
					description: 'Remove warnings',
					rarity: 'rare',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'remove_warnings',
						count: 2,
						warningType: 'X'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});

			it('should reject remove_warnings with Infinity count', () => {
				const result = createTemplateSchema.safeParse({
					id: 'warning-remover',
					name: 'Warning Remover',
					description: 'Remove warnings',
					rarity: 'rare',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'remove_warnings',
						count: Infinity
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				// Note: Zod detects Infinity as invalid number type at parse level
			});
		});
	});

	// ============================================================================
	// EXCHANGE_CARDS ACTION
	// ============================================================================

	describe('exchange_cards action', () => {
		describe('replace_random mode', () => {
			describe('valid cases', () => {
				it('should accept replace_random with min count', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'replace_random',
								count: 1
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(true);
					if (result.success) {
						expect(result.data.action?.type).toBe('exchange_cards');
						expect((result.data.action as any).exchange.mode).toBe('replace_random');
						expect((result.data.action as any).exchange.count).toBe(1);
					}
				});

				it('should accept replace_random with max count', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'legendary',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'replace_random',
								count: 10
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(true);
					if (result.success) {
						expect((result.data.action as any).exchange.count).toBe(10);
					}
				});
			});

			describe('invalid cases', () => {
				it('should reject replace_random with count = 0', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'replace_random',
								count: 0
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
					if (!result.success) {
						expect(result.error.issues[0].message).toContain('at least 1');
					}
				});

				it('should reject replace_random with count > 10', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'replace_random',
								count: 11
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
					if (!result.success) {
						expect(result.error.issues[0].message).toContain('cannot exceed 10');
					}
				});

				it('should reject replace_random with missing count', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'replace_random'
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
				});

				it('should reject replace_random with decimal count', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'replace_random',
								count: 3.5
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
					if (!result.success) {
						expect(result.error.issues[0].message).toContain('integer');
					}
				});
			});
		});

		describe('rarity_points mode', () => {
			describe('valid cases', () => {
				it('should accept rarity_points with all rarities', () => {
					const rarities = ['common', 'rare', 'epic', 'legendary'] as const;
					rarities.forEach((rarity) => {
						const result = createTemplateSchema.safeParse({
							id: 'exchange-card',
							name: 'Exchange Card',
							description: 'Exchange cards',
							rarity: 'epic',
							category: 'power',
							isEnabled: true,
							imagePath: '/test.webp',
							action: {
								type: 'exchange_cards',
								exchange: {
									mode: 'rarity_points',
									targetRarity: rarity,
									pointsRequired: 27
								}
							},
							sortOrder: 0
						});
						expect(result.success).toBe(true);
						if (result.success) {
							expect((result.data.action as any).exchange.mode).toBe('rarity_points');
							expect((result.data.action as any).exchange.targetRarity).toBe(rarity);
						}
					});
				});

				it('should accept rarity_points with min points', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'rarity_points',
								targetRarity: 'common',
								pointsRequired: 1
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(true);
					if (result.success) {
						expect((result.data.action as any).exchange.pointsRequired).toBe(1);
					}
				});

				it('should accept rarity_points with max points (no upper limit except type bounds)', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'rarity_points',
								targetRarity: 'legendary',
								pointsRequired: 999999
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(true);
				});
			});

			describe('invalid cases', () => {
				it('should reject rarity_points with points = 0', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'rarity_points',
								targetRarity: 'rare',
								pointsRequired: 0
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
					if (!result.success) {
						expect(result.error.issues[0].message).toContain('positive');
					}
				});

				it('should reject rarity_points with negative points', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'rarity_points',
								targetRarity: 'rare',
								pointsRequired: -10
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
				});

				it('should reject rarity_points with missing targetRarity', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'rarity_points',
								pointsRequired: 27
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
				});

				it('should reject rarity_points with invalid targetRarity', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'rarity_points',
								targetRarity: 'ultra',
								pointsRequired: 27
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
				});

				it('should reject rarity_points with decimal points', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'epic',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'rarity_points',
								targetRarity: 'epic',
								pointsRequired: 27.5
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
					if (!result.success) {
						expect(result.error.issues[0].message).toContain('integer');
					}
				});
			});
		});

		describe('discard_for_specific mode', () => {
			describe('valid cases', () => {
				it('should accept discard_for_specific with min discard count', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'legendary',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'discard_for_specific',
								discardCount: 1,
								targetCardId: 'bonus'
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(true);
					if (result.success) {
						expect((result.data.action as any).exchange.mode).toBe('discard_for_specific');
						expect((result.data.action as any).exchange.discardCount).toBe(1);
						expect((result.data.action as any).exchange.targetCardId).toBe('bonus');
					}
				});

				it('should accept discard_for_specific with max discard count', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'legendary',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'discard_for_specific',
								discardCount: 10,
								targetCardId: 'super-bonus'
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(true);
					if (result.success) {
						expect((result.data.action as any).exchange.discardCount).toBe(10);
					}
				});
			});

			describe('invalid cases', () => {
				it('should reject discard_for_specific with discardCount = 0', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'legendary',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'discard_for_specific',
								discardCount: 0,
								targetCardId: 'bonus'
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
					if (!result.success) {
						expect(result.error.issues[0].message).toContain('at least 1');
					}
				});

				it('should reject discard_for_specific with discardCount > 10', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'legendary',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'discard_for_specific',
								discardCount: 11,
								targetCardId: 'bonus'
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
					if (!result.success) {
						expect(result.error.issues[0].message).toContain('cannot exceed 10');
					}
				});

				it('should reject discard_for_specific with missing targetCardId', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'legendary',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'discard_for_specific',
								discardCount: 3
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
				});

				it('should reject discard_for_specific with empty targetCardId', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'legendary',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'discard_for_specific',
								discardCount: 3,
								targetCardId: ''
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
					if (!result.success) {
						expect(result.error.issues[0].message).toContain('required');
					}
				});

				it('should reject discard_for_specific with decimal discardCount', () => {
					const result = createTemplateSchema.safeParse({
						id: 'exchange-card',
						name: 'Exchange Card',
						description: 'Exchange cards',
						rarity: 'legendary',
						category: 'power',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'exchange_cards',
							exchange: {
								mode: 'discard_for_specific',
								discardCount: 3.5,
								targetCardId: 'bonus'
							}
						},
						sortOrder: 0
					});
					expect(result.success).toBe(false);
					if (!result.success) {
						expect(result.error.issues[0].message).toContain('integer');
					}
				});
			});
		});

		describe('invalid exchange modes', () => {
			it('should reject exchange_cards without exchange object', () => {
				const result = createTemplateSchema.safeParse({
					id: 'exchange-card',
					name: 'Exchange Card',
					description: 'Exchange cards',
					rarity: 'epic',
					category: 'power',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'exchange_cards'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});

			it('should reject exchange_cards with invalid mode', () => {
				const result = createTemplateSchema.safeParse({
					id: 'exchange-card',
					name: 'Exchange Card',
					description: 'Exchange cards',
					rarity: 'epic',
					category: 'power',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'exchange_cards',
						exchange: {
							mode: 'invalid_mode',
							count: 5
						}
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});
		});
	});

	// ============================================================================
	// ADD_GIDOUILLES ACTION
	// ============================================================================

	describe('add_gidouilles action', () => {
		describe('valid cases', () => {
			it('should accept add_gidouilles with min amount', () => {
				const result = createTemplateSchema.safeParse({
					id: 'bonus-card',
					name: 'Bonus Card',
					description: 'Add gidouilles',
					rarity: 'common',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'add_gidouilles',
						amount: 1
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.action?.type).toBe('add_gidouilles');
					expect((result.data.action as any).amount).toBe(1);
				}
			});

			it('should accept add_gidouilles with max amount', () => {
				const result = createTemplateSchema.safeParse({
					id: 'bonus-card',
					name: 'Bonus Card',
					description: 'Add gidouilles',
					rarity: 'legendary',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'add_gidouilles',
						amount: 1000
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect((result.data.action as any).amount).toBe(1000);
				}
			});

			it('should accept add_gidouilles with typical amount', () => {
				const result = createTemplateSchema.safeParse({
					id: 'bonus-card',
					name: 'Bonus Card',
					description: 'Add gidouilles',
					rarity: 'rare',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'add_gidouilles',
						amount: 50
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect((result.data.action as any).amount).toBe(50);
				}
			});
		});

		describe('invalid cases', () => {
			it('should reject add_gidouilles with amount = 0', () => {
				const result = createTemplateSchema.safeParse({
					id: 'bonus-card',
					name: 'Bonus Card',
					description: 'Add gidouilles',
					rarity: 'common',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'add_gidouilles',
						amount: 0
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('at least 1');
				}
			});

			it('should reject add_gidouilles with negative amount', () => {
				const result = createTemplateSchema.safeParse({
					id: 'bonus-card',
					name: 'Bonus Card',
					description: 'Add gidouilles',
					rarity: 'common',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'add_gidouilles',
						amount: -50
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});

			it('should reject add_gidouilles with amount > 1000', () => {
				const result = createTemplateSchema.safeParse({
					id: 'bonus-card',
					name: 'Bonus Card',
					description: 'Add gidouilles',
					rarity: 'legendary',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'add_gidouilles',
						amount: 1001
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('cannot exceed 1000');
				}
			});

			it('should reject add_gidouilles with decimal amount', () => {
				const result = createTemplateSchema.safeParse({
					id: 'bonus-card',
					name: 'Bonus Card',
					description: 'Add gidouilles',
					rarity: 'rare',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'add_gidouilles',
						amount: 50.5
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('integer');
				}
			});

			it('should reject add_gidouilles with amount as string', () => {
				const result = createTemplateSchema.safeParse({
					id: 'bonus-card',
					name: 'Bonus Card',
					description: 'Add gidouilles',
					rarity: 'rare',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'add_gidouilles',
						amount: '50'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});

			it('should reject add_gidouilles with Infinity amount', () => {
				const result = createTemplateSchema.safeParse({
					id: 'bonus-card',
					name: 'Bonus Card',
					description: 'Add gidouilles',
					rarity: 'rare',
					category: 'bonus',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'add_gidouilles',
						amount: Infinity
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				// Note: Zod detects Infinity as invalid number type at parse level
			});
		});
	});

	// ============================================================================
	// CHOOSE_CARD ACTION
	// ============================================================================

	describe('choose_card action', () => {
		describe('valid cases - filter: all', () => {
			it('should accept choose_card with filter: all', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 2,
						filter: 'all'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.action?.type).toBe('choose_card');
					expect((result.data.action as any).count).toBe(2);
					expect((result.data.action as any).filter).toBe('all');
				}
			});

			it('should accept choose_card with min count and filter: all', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'rare',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 1,
						filter: 'all'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
			});

			it('should accept choose_card with max count and filter: all', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'legendary',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 10,
						filter: 'all'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
			});
		});

		describe('valid cases - maxRarity', () => {
			it('should accept choose_card with maxRarity filter', () => {
				const rarities = ['common', 'rare', 'epic', 'legendary'] as const;
				rarities.forEach((rarity) => {
					const result = createTemplateSchema.safeParse({
						id: 'choose-card',
						name: 'Choose Card',
						description: 'Choose a VIP card',
						rarity: 'epic',
						category: 'privilege',
						isEnabled: true,
						imagePath: '/test.webp',
						action: {
							type: 'choose_card',
							count: 2,
							maxRarity: rarity
						},
						sortOrder: 0
					});
					expect(result.success).toBe(true);
					if (result.success) {
						expect((result.data.action as any).maxRarity).toBe(rarity);
					}
				});
			});
		});

		describe('valid cases - possibleCardIds', () => {
			it('should accept choose_card with possibleCardIds (single card)', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'legendary',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 1,
						possibleCardIds: ['bonus']
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect((result.data.action as any).possibleCardIds).toEqual(['bonus']);
				}
			});

			it('should accept choose_card with possibleCardIds (multiple cards)', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'legendary',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 1,
						possibleCardIds: ['bonus', 'super-bonus', 'mega-bonus']
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect((result.data.action as any).possibleCardIds).toEqual([
						'bonus',
						'super-bonus',
						'mega-bonus'
					]);
				}
			});

			it('should accept choose_card with possibleCardIds (max 20 cards)', () => {
				const cardIds = Array.from({ length: 20 }, (_, i) => `card-${i}`);
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'legendary',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 5,
						possibleCardIds: cardIds
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect((result.data.action as any).possibleCardIds?.length).toBe(20);
				}
			});
		});

		describe('valid cases - no filter (defaults to all)', () => {
			it('should accept choose_card without any filter mode', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 3
					},
					sortOrder: 0
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.action?.type).toBe('choose_card');
					expect((result.data.action as any).count).toBe(3);
					// No filter specified means default to 'all'
					expect((result.data.action as any).filter).toBeUndefined();
					expect((result.data.action as any).maxRarity).toBeUndefined();
					expect((result.data.action as any).possibleCardIds).toBeUndefined();
				}
			});
		});

		describe('invalid cases - count validation', () => {
			it('should reject choose_card with count = 0', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 0,
						filter: 'all'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('at least 1');
				}
			});

			it('should reject choose_card with negative count', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: -1,
						filter: 'all'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});

			it('should reject choose_card with count > 10', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 11,
						filter: 'all'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('cannot exceed 10');
				}
			});

			it('should reject choose_card with decimal count', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 2.5,
						filter: 'all'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('integer');
				}
			});

			it('should reject choose_card with count as string', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: '2',
						filter: 'all'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});
		});

		describe('invalid cases - mutually exclusive filters', () => {
			it('should reject choose_card with both filter and maxRarity', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 2,
						filter: 'all',
						maxRarity: 'rare'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('one filter mode');
				}
			});

			it('should reject choose_card with both filter and possibleCardIds', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 2,
						filter: 'all',
						possibleCardIds: ['bonus', 'super-bonus']
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('one filter mode');
				}
			});

			it('should reject choose_card with both maxRarity and possibleCardIds', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 2,
						maxRarity: 'rare',
						possibleCardIds: ['bonus', 'super-bonus']
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('one filter mode');
				}
			});

			it('should reject choose_card with all three filter modes', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 2,
						filter: 'all',
						maxRarity: 'rare',
						possibleCardIds: ['bonus']
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('one filter mode');
				}
			});
		});

		describe('invalid cases - possibleCardIds validation', () => {
			it('should reject choose_card with empty possibleCardIds array', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 2,
						possibleCardIds: []
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('At least one card ID');
				}
			});

			it('should reject choose_card with too many possibleCardIds (>20)', () => {
				const cardIds = Array.from({ length: 21 }, (_, i) => `card-${i}`);
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 2,
						possibleCardIds: cardIds
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('more than 20');
				}
			});

			it('should reject choose_card with empty string in possibleCardIds', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 2,
						possibleCardIds: ['bonus', '', 'super-bonus']
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('cannot be empty');
				}
			});
		});

		describe('invalid cases - maxRarity validation', () => {
			it('should reject choose_card with invalid maxRarity', () => {
				const result = createTemplateSchema.safeParse({
					id: 'choose-card',
					name: 'Choose Card',
					description: 'Choose a VIP card',
					rarity: 'epic',
					category: 'privilege',
					isEnabled: true,
					imagePath: '/test.webp',
					action: {
						type: 'choose_card',
						count: 2,
						maxRarity: 'ultra'
					},
					sortOrder: 0
				});
				expect(result.success).toBe(false);
			});
		});
	});

	// ============================================================================
	// GENERAL ACTION VALIDATION
	// ============================================================================

	describe('general action validation', () => {
		it('should reject invalid action type', () => {
			const result = createTemplateSchema.safeParse({
				id: 'test-card',
				name: 'Test Card',
				description: 'Test description',
				rarity: 'common',
				category: 'bonus',
				isEnabled: true,
				imagePath: '/test.webp',
				action: {
					type: 'invalid_action'
				},
				sortOrder: 0
			});
			expect(result.success).toBe(false);
		});

		it('should reject action without type field', () => {
			const result = createTemplateSchema.safeParse({
				id: 'test-card',
				name: 'Test Card',
				description: 'Test description',
				rarity: 'common',
				category: 'bonus',
				isEnabled: true,
				imagePath: '/test.webp',
				action: {
					count: 5
				},
				sortOrder: 0
			});
			expect(result.success).toBe(false);
		});

		it('should accept template without action (optional)', () => {
			const result = createTemplateSchema.safeParse({
				id: 'no-action-card',
				name: 'No Action Card',
				description: 'Just a card with no action',
				rarity: 'common',
				category: 'social',
				isEnabled: true,
				imagePath: '/test.webp',
				sortOrder: 0
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.action).toBeUndefined();
			}
		});

		it('should accept null action in updateTemplateSchema', () => {
			const result = updateTemplateSchema.safeParse({
				action: null
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.action).toBeNull();
			}
		});
	});

	// ============================================================================
	// REAL-WORLD EXAMPLE TESTS
	// ============================================================================

	describe('real-world VIP card examples', () => {
		it('should accept tirage-epique card (draw_cards with forceRarity)', () => {
			const result = createTemplateSchema.safeParse({
				id: 'tirage-epique',
				name: 'Tirage Épique',
				description: 'Tire 5 cartes épiques garanties',
				rarity: 'epic',
				category: 'power',
				isEnabled: true,
				imagePath: '/images/vip-cards/tirage-epique@0.5x.webp',
				action: {
					type: 'draw_cards',
					count: 5,
					filters: {
						forceRarity: 'epic'
					}
				},
				sortOrder: 10
			});
			expect(result.success).toBe(true);
		});

		it('should accept choix-vip card (choose_card with filter: all)', () => {
			const result = createTemplateSchema.safeParse({
				id: 'choix-vip',
				name: 'Choix VIP',
				description: 'Choisis 3 cartes parmi toutes les cartes disponibles',
				rarity: 'legendary',
				category: 'privilege',
				isEnabled: true,
				imagePath: '/images/vip-cards/choix-vip@0.5x.webp',
				action: {
					type: 'choose_card',
					count: 3,
					filter: 'all'
				},
				sortOrder: 20
			});
			expect(result.success).toBe(true);
		});

		it('should accept bonus-50 card (add_gidouilles)', () => {
			const result = createTemplateSchema.safeParse({
				id: 'bonus-50',
				name: 'Bonus +50',
				description: 'Gagne 50 gidouilles instantanément',
				rarity: 'rare',
				category: 'bonus',
				isEnabled: true,
				imagePath: '/images/vip-cards/bonus-50@0.5x.webp',
				action: {
					type: 'add_gidouilles',
					amount: 50
				},
				sortOrder: 5
			});
			expect(result.success).toBe(true);
		});

		it('should accept warning-eraser card (remove_warnings with type)', () => {
			const result = createTemplateSchema.safeParse({
				id: 'warning-eraser',
				name: "Effaceur d'Avertissements",
				description: 'Efface 2 avertissements de conduite',
				rarity: 'epic',
				category: 'privilege',
				isEnabled: true,
				imagePath: '/images/vip-cards/warning-eraser@0.5x.webp',
				action: {
					type: 'remove_warnings',
					count: 2,
					warningType: 'C'
				},
				sortOrder: 15
			});
			expect(result.success).toBe(true);
		});

		it('should accept exchange-master card (exchange_cards with rarity_points)', () => {
			const result = createTemplateSchema.safeParse({
				id: 'exchange-master',
				name: 'Maître des Échanges',
				description: 'Échange des cartes pour obtenir une carte légendaire',
				rarity: 'legendary',
				category: 'power',
				isEnabled: true,
				imagePath: '/images/vip-cards/exchange-master@0.5x.webp',
				action: {
					type: 'exchange_cards',
					exchange: {
						mode: 'rarity_points',
						targetRarity: 'legendary',
						pointsRequired: 100
					}
				},
				sortOrder: 25
			});
			expect(result.success).toBe(true);
		});

		it('should accept social card with no action', () => {
			const result = createTemplateSchema.safeParse({
				id: 'vip-status',
				name: 'Statut VIP',
				description: 'Carte de prestige sans action spéciale',
				rarity: 'rare',
				category: 'social',
				isEnabled: true,
				imagePath: '/images/vip-cards/vip-status@0.5x.webp',
				sortOrder: 30
			});
			expect(result.success).toBe(true);
		});
	});
});
