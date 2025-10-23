/**
 * Riddle Badges System
 * =====================
 * Calculate achievements/badges based on riddle progress
 */

export interface Badge {
	id: string;
	name: string;
	description: string;
	icon: string;
	earned: boolean;
	progress?: number;
	target?: number;
	tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface BadgeProgress {
	firstAttemptCount: number;
	multipleAttemptCount: number;
	genreCounts: Record<string, number>;
	consecutiveDaysStreak: number;
}

/**
 * Calculate all badges for a student
 */
export function calculateBadges(progress: BadgeProgress): Badge[] {
	const badges: Badge[] = [];

	// First Attempt Badges (Perfectionniste)
	badges.push(
		createTieredBadge(
			'perfectionist',
			'Perfectionniste',
			'Résoudre des énigmes du premier coup',
			'🎯',
			progress.firstAttemptCount,
			[
				{ tier: 'bronze', target: 5 },
				{ tier: 'silver', target: 15 },
				{ tier: 'gold', target: 30 },
				{ tier: 'platinum', target: 50 }
			]
		)
	);

	// Multiple Attempt Badges (Persévérant)
	badges.push(
		createTieredBadge(
			'persistent',
			'Persévérant',
			'Résoudre des énigmes après plusieurs tentatives',
			'💪',
			progress.multipleAttemptCount,
			[
				{ tier: 'bronze', target: 5 },
				{ tier: 'silver', target: 15 },
				{ tier: 'gold', target: 30 },
				{ tier: 'platinum', target: 50 }
			]
		)
	);

	// Streak Badges (Assidu)
	badges.push(
		createTieredBadge(
			'streak',
			'Assidu',
			"Jours consécutifs d'énigmes du jour",
			'🔥',
			progress.consecutiveDaysStreak,
			[
				{ tier: 'bronze', target: 3 },
				{ tier: 'silver', target: 7 },
				{ tier: 'gold', target: 14 },
				{ tier: 'platinum', target: 30 }
			]
		)
	);

	// Genre Expert Badges
	Object.entries(progress.genreCounts).forEach(([genre, count]) => {
		if (count >= 5) {
			// Only show if at least bronze
			badges.push(
				createTieredBadge(
					`expert-${genre}`,
					`Expert ${genre}`,
					`Maîtriser les énigmes de type ${genre}`,
					'🎓',
					count,
					[
						{ tier: 'bronze', target: 5 },
						{ tier: 'silver', target: 10 },
						{ tier: 'gold', target: 20 },
						{ tier: 'platinum', target: 50 }
					]
				)
			);
		}
	});

	return badges;
}

/**
 * Create a tiered badge with multiple achievement levels
 */
function createTieredBadge(
	id: string,
	name: string,
	description: string,
	icon: string,
	current: number,
	tiers: Array<{ tier: 'bronze' | 'silver' | 'gold' | 'platinum'; target: number }>
): Badge {
	// Find highest earned tier
	let earnedTier: 'bronze' | 'silver' | 'gold' | 'platinum' | null = null;
	let nextTier: { tier: 'bronze' | 'silver' | 'gold' | 'platinum'; target: number } | null = null;

	for (const tier of tiers) {
		if (current >= tier.target) {
			earnedTier = tier.tier;
		} else if (!nextTier) {
			nextTier = tier;
		}
	}

	const earned = earnedTier !== null;
	const target = nextTier?.target;

	return {
		id: earnedTier ? `${id}-${earnedTier}` : id,
		name: earnedTier ? `${name} ${getTierEmoji(earnedTier)}` : name,
		description: earnedTier
			? `${description} - Niveau ${getTierLabel(earnedTier)}`
			: description,
		icon,
		earned,
		progress: current,
		target,
		tier: earnedTier || undefined
	};
}

/**
 * Get tier emoji
 */
function getTierEmoji(tier: 'bronze' | 'silver' | 'gold' | 'platinum'): string {
	switch (tier) {
		case 'bronze':
			return '🥉';
		case 'silver':
			return '🥈';
		case 'gold':
			return '🥇';
		case 'platinum':
			return '💎';
	}
}

/**
 * Get tier label
 */
function getTierLabel(tier: 'bronze' | 'silver' | 'gold' | 'platinum'): string {
	switch (tier) {
		case 'bronze':
			return 'Bronze';
		case 'silver':
			return 'Argent';
		case 'gold':
			return 'Or';
		case 'platinum':
			return 'Platine';
	}
}

/**
 * Get tier color class
 */
export function getTierColorClass(tier: 'bronze' | 'silver' | 'gold' | 'platinum'): string {
	switch (tier) {
		case 'bronze':
			return 'border-amber-700 bg-amber-50 dark:bg-amber-950';
		case 'silver':
			return 'border-gray-400 bg-gray-50 dark:bg-gray-900';
		case 'gold':
			return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
		case 'platinum':
			return 'border-purple-500 bg-purple-50 dark:bg-purple-950';
	}
}
