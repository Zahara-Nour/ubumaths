/**
 * Riddle Badges System Tests
 * Tests achievement/badge calculation with 4 types × 4 tiers = 16 badges
 */

import { describe, it, expect } from 'vitest';
import { calculateBadges, getTierColorClass, type BadgeProgress } from './riddle-badges';

describe('calculateBadges', () => {
	describe('Perfectionist Badges (First Attempt)', () => {
		it('should not award bronze badge with 4 first attempts', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 4,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const perfectionist = badges.find((b) => b.id.startsWith('perfectionist'));

			expect(perfectionist?.earned).toBe(false);
			expect(perfectionist?.progress).toBe(4);
			expect(perfectionist?.target).toBe(5);
		});

		it('should award bronze badge with 5 first attempts', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 5,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const perfectionist = badges.find((b) => b.id.startsWith('perfectionist'));

			expect(perfectionist?.earned).toBe(true);
			expect(perfectionist?.tier).toBe('bronze');
			expect(perfectionist?.id).toBe('perfectionist-bronze');
			expect(perfectionist?.name).toContain('🥉');
			expect(perfectionist?.progress).toBe(5);
			expect(perfectionist?.target).toBe(15); // Next tier
		});

		it('should award silver badge with 15 first attempts', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 15,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const perfectionist = badges.find((b) => b.id.startsWith('perfectionist'));

			expect(perfectionist?.earned).toBe(true);
			expect(perfectionist?.tier).toBe('silver');
			expect(perfectionist?.id).toBe('perfectionist-silver');
			expect(perfectionist?.name).toContain('🥈');
			expect(perfectionist?.target).toBe(30); // Next tier
		});

		it('should award gold badge with 30 first attempts', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 30,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const perfectionist = badges.find((b) => b.id.startsWith('perfectionist'));

			expect(perfectionist?.earned).toBe(true);
			expect(perfectionist?.tier).toBe('gold');
			expect(perfectionist?.id).toBe('perfectionist-gold');
			expect(perfectionist?.name).toContain('🥇');
			expect(perfectionist?.target).toBe(50); // Next tier
		});

		it('should award platinum badge with 50 first attempts', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 50,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const perfectionist = badges.find((b) => b.id.startsWith('perfectionist'));

			expect(perfectionist?.earned).toBe(true);
			expect(perfectionist?.tier).toBe('platinum');
			expect(perfectionist?.id).toBe('perfectionist-platinum');
			expect(perfectionist?.name).toContain('💎');
			expect(perfectionist?.target).toBeUndefined(); // Max tier reached
		});

		it('should stay at platinum with more than 50 first attempts', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 100,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const perfectionist = badges.find((b) => b.id.startsWith('perfectionist'));

			expect(perfectionist?.earned).toBe(true);
			expect(perfectionist?.tier).toBe('platinum');
			expect(perfectionist?.progress).toBe(100);
			expect(perfectionist?.target).toBeUndefined();
		});
	});

	describe('Persistent Badges (Multiple Attempts)', () => {
		it('should award bronze badge with 5 multiple-attempt completions', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 5,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const persistent = badges.find((b) => b.id.startsWith('persistent'));

			expect(persistent?.earned).toBe(true);
			expect(persistent?.tier).toBe('bronze');
			expect(persistent?.name).toContain('Persévérant');
			expect(persistent?.icon).toBe('💪');
		});

		it('should award silver badge with 15 multiple-attempt completions', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 15,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const persistent = badges.find((b) => b.id.startsWith('persistent'));

			expect(persistent?.earned).toBe(true);
			expect(persistent?.tier).toBe('silver');
		});

		it('should award gold badge with 30 multiple-attempt completions', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 30,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const persistent = badges.find((b) => b.id.startsWith('persistent'));

			expect(persistent?.earned).toBe(true);
			expect(persistent?.tier).toBe('gold');
		});

		it('should award platinum badge with 50 multiple-attempt completions', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 50,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const persistent = badges.find((b) => b.id.startsWith('persistent'));

			expect(persistent?.earned).toBe(true);
			expect(persistent?.tier).toBe('platinum');
		});
	});

	describe('Streak Badges (Consecutive Days)', () => {
		it('should not award bronze with 2-day streak', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 2
			};

			const badges = calculateBadges(progress);
			const streak = badges.find((b) => b.id.startsWith('streak'));

			expect(streak?.earned).toBe(false);
			expect(streak?.progress).toBe(2);
			expect(streak?.target).toBe(3);
		});

		it('should award bronze badge with 3-day streak', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 3
			};

			const badges = calculateBadges(progress);
			const streak = badges.find((b) => b.id.startsWith('streak'));

			expect(streak?.earned).toBe(true);
			expect(streak?.tier).toBe('bronze');
			expect(streak?.name).toContain('Assidu');
			expect(streak?.icon).toBe('🔥');
		});

		it('should award silver badge with 7-day streak', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 7
			};

			const badges = calculateBadges(progress);
			const streak = badges.find((b) => b.id.startsWith('streak'));

			expect(streak?.earned).toBe(true);
			expect(streak?.tier).toBe('silver');
		});

		it('should award gold badge with 14-day streak', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 14
			};

			const badges = calculateBadges(progress);
			const streak = badges.find((b) => b.id.startsWith('streak'));

			expect(streak?.earned).toBe(true);
			expect(streak?.tier).toBe('gold');
		});

		it('should award platinum badge with 30-day streak', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 30
			};

			const badges = calculateBadges(progress);
			const streak = badges.find((b) => b.id.startsWith('streak'));

			expect(streak?.earned).toBe(true);
			expect(streak?.tier).toBe('platinum');
		});
	});

	describe('Genre Expert Badges', () => {
		it('should not create badge with less than 5 riddles of a genre', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {
					Algèbre: 4,
					Géométrie: 3
				},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const expertBadges = badges.filter((b) => b.id.startsWith('expert-'));

			expect(expertBadges.length).toBe(0);
		});

		it('should award bronze expert badge with 5 riddles of a genre', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {
					Algèbre: 5
				},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const algebraExpert = badges.find((b) => b.id === 'expert-Algèbre-bronze');

			expect(algebraExpert).toBeDefined();
			expect(algebraExpert?.earned).toBe(true);
			expect(algebraExpert?.tier).toBe('bronze');
			expect(algebraExpert?.name).toContain('Expert Algèbre');
			expect(algebraExpert?.icon).toBe('🎓');
		});

		it('should award silver expert badge with 10 riddles', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {
					Géométrie: 10
				},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const geometryExpert = badges.find((b) => b.id === 'expert-Géométrie-silver');

			expect(geometryExpert?.earned).toBe(true);
			expect(geometryExpert?.tier).toBe('silver');
		});

		it('should award gold expert badge with 20 riddles', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {
					Probabilités: 20
				},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const probExpert = badges.find((b) => b.id === 'expert-Probabilités-gold');

			expect(probExpert?.earned).toBe(true);
			expect(probExpert?.tier).toBe('gold');
		});

		it('should award platinum expert badge with 50 riddles', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {
					Logique: 50
				},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const logicExpert = badges.find((b) => b.id === 'expert-Logique-platinum');

			expect(logicExpert?.earned).toBe(true);
			expect(logicExpert?.tier).toBe('platinum');
		});

		it('should create multiple expert badges for different genres', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {
					Algèbre: 15,
					Géométrie: 8,
					Logique: 25,
					Arithmétique: 6
				},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const expertBadges = badges.filter((b) => b.id.startsWith('expert-'));

			expect(expertBadges.length).toBe(4);

			const algebraBadge = expertBadges.find((b) => b.id.includes('Algèbre'));
			expect(algebraBadge?.tier).toBe('silver');

			const geometryBadge = expertBadges.find((b) => b.id.includes('Géométrie'));
			expect(geometryBadge?.tier).toBe('bronze');

			const logicBadge = expertBadges.find((b) => b.id.includes('Logique'));
			expect(logicBadge?.tier).toBe('gold');

			const arithmeticBadge = expertBadges.find((b) => b.id.includes('Arithmétique'));
			expect(arithmeticBadge?.tier).toBe('bronze');
		});
	});

	describe('Multiple Badge Types Combined', () => {
		it('should calculate all 4 badge types simultaneously', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 20,
				multipleAttemptCount: 12,
				genreCounts: {
					Algèbre: 8,
					Géométrie: 15
				},
				consecutiveDaysStreak: 10
			};

			const badges = calculateBadges(progress);

			// Should have: perfectionist, persistent, streak, + 2 expert badges
			expect(badges.length).toBe(5);

			// Check each type
			const perfectionist = badges.find((b) => b.id.startsWith('perfectionist'));
			expect(perfectionist?.tier).toBe('silver'); // 15-29 range

			const persistent = badges.find((b) => b.id.startsWith('persistent'));
			expect(persistent?.tier).toBe('bronze'); // 5-14 range

			const streak = badges.find((b) => b.id.startsWith('streak'));
			expect(streak?.tier).toBe('silver'); // 7-13 range

			const expertBadges = badges.filter((b) => b.id.startsWith('expert-'));
			expect(expertBadges.length).toBe(2);
		});

		it('should return all badges even with zero progress', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);

			// Should have 3 base badges (no expert badges with 0 count)
			expect(badges.length).toBe(3);

			badges.forEach((badge) => {
				expect(badge.earned).toBe(false);
				expect(badge.progress).toBe(0);
			});
		});
	});

	describe('Badge Properties', () => {
		it('should include correct properties for earned badges', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 10,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const perfectionist = badges.find((b) => b.id.startsWith('perfectionist'));

			expect(perfectionist).toMatchObject({
				id: 'perfectionist-bronze',
				name: expect.stringContaining('Perfectionniste'),
				description: expect.any(String),
				icon: '🎯',
				earned: true,
				progress: 10,
				target: 15,
				tier: 'bronze'
			});
		});

		it('should include correct properties for unearned badges', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 2,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const perfectionist = badges.find((b) => b.id.startsWith('perfectionist'));

			expect(perfectionist).toMatchObject({
				id: 'perfectionist',
				name: 'Perfectionniste',
				description: expect.not.stringContaining('Niveau'),
				icon: '🎯',
				earned: false,
				progress: 2,
				target: 5,
				tier: undefined
			});
		});

		it('should append tier emoji to badge name when earned', () => {
			const bronzeProgress: BadgeProgress = {
				firstAttemptCount: 5,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(bronzeProgress);
			const bronze = badges.find((b) => b.tier === 'bronze');
			expect(bronze?.name).toContain('🥉');

			const silverProgress: BadgeProgress = {
				firstAttemptCount: 15,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const silverBadges = calculateBadges(silverProgress);
			const silver = silverBadges.find((b) => b.tier === 'silver');
			expect(silver?.name).toContain('🥈');
		});

		it('should append tier label to description when earned', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 30,
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const gold = badges.find((b) => b.tier === 'gold');
			expect(gold?.description).toContain('Niveau Or');
		});
	});

	describe('Edge Cases', () => {
		it('should handle exact tier thresholds', () => {
			// Test all thresholds for perfectionist
			const thresholds = [
				{ count: 5, tier: 'bronze' },
				{ count: 15, tier: 'silver' },
				{ count: 30, tier: 'gold' },
				{ count: 50, tier: 'platinum' }
			];

			thresholds.forEach(({ count, tier }) => {
				const progress: BadgeProgress = {
					firstAttemptCount: count,
					multipleAttemptCount: 0,
					genreCounts: {},
					consecutiveDaysStreak: 0
				};

				const badges = calculateBadges(progress);
				const badge = badges.find((b) => b.id.startsWith('perfectionist'));

				expect(badge?.earned).toBe(true);
				expect(badge?.tier).toBe(tier);
			});
		});

		it('should handle one below tier threshold', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 14, // One below silver (15)
				multipleAttemptCount: 0,
				genreCounts: {},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const badge = badges.find((b) => b.id.startsWith('perfectionist'));

			expect(badge?.tier).toBe('bronze');
			expect(badge?.target).toBe(15);
		});

		it('should handle genre names with special characters', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {
					'Algèbre & Calcul': 10,
					'Géométrie/Espace': 5
				},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const expertBadges = badges.filter((b) => b.id.startsWith('expert-'));

			expect(expertBadges.length).toBe(2);
			expect(expertBadges.some((b) => b.name.includes('Algèbre & Calcul'))).toBe(true);
			expect(expertBadges.some((b) => b.name.includes('Géométrie/Espace'))).toBe(true);
		});

		it('should handle empty genre name', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 0,
				multipleAttemptCount: 0,
				genreCounts: {
					'': 10
				},
				consecutiveDaysStreak: 0
			};

			const badges = calculateBadges(progress);
			const expertBadges = badges.filter((b) => b.id.startsWith('expert-'));

			expect(expertBadges.length).toBe(1);
			expect(expertBadges[0].name).toContain('Expert ');
		});

		it('should handle very large numbers', () => {
			const progress: BadgeProgress = {
				firstAttemptCount: 1000,
				multipleAttemptCount: 999,
				genreCounts: {
					Algèbre: 500
				},
				consecutiveDaysStreak: 365
			};

			const badges = calculateBadges(progress);

			badges.forEach((badge) => {
				expect(badge.earned).toBe(true);
				expect(badge.tier).toBe('platinum');
				expect(badge.target).toBeUndefined();
			});
		});
	});
});

describe('getTierColorClass', () => {
	it('should return correct color classes for each tier', () => {
		expect(getTierColorClass('bronze')).toBe('border-amber-700 bg-amber-50 dark:bg-amber-950');
		expect(getTierColorClass('silver')).toBe('border-gray-400 bg-gray-50 dark:bg-gray-900');
		expect(getTierColorClass('gold')).toBe('border-yellow-500 bg-yellow-50 dark:bg-yellow-950');
		expect(getTierColorClass('platinum')).toBe('border-purple-500 bg-purple-50 dark:bg-purple-950');
	});
});
