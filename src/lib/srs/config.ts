/**
 * FSRS Configuration
 * ===================
 *
 * Default FSRS-6 parameters and configuration for spaced repetition.
 *
 * These parameters are based on analysis of hundreds of millions of reviews
 * from ~10,000 users and work excellently for 95% of use cases.
 *
 * References:
 * - FSRS_GUIDE.md
 * - https://github.com/open-spaced-repetition/fsrs4anki
 */

/**
 * Default FSRS-6 parameters (21 values)
 *
 * DO NOT modify these unless you have extensive review data (2000+ reviews)
 * and understand the FSRS algorithm deeply.
 *
 * These parameters are scientifically validated and work excellently.
 */
export const DEFAULT_FSRS_PARAMS = [
	0.212, // w[0]  - Initial stability factor 1
	1.2931, // w[1]  - Initial stability factor 2
	2.3065, // w[2]  - Initial stability factor 3
	8.2956, // w[3]  - Initial stability factor 4
	6.4133, // w[4]  - Initial difficulty factor 1
	0.8334, // w[5]  - Initial difficulty factor 2
	3.0194, // w[6]  - Difficulty update rate
	0.001, // w[7]  - Minimum stability
	1.8722, // w[8]  - Stability increase rate
	0.1666, // w[9]  - Stability decay power
	0.796, // w[10] - Retrievability effect
	1.4835, // w[11] - Post-lapse stability base
	0.0614, // w[12] - Post-lapse difficulty factor
	0.2629, // w[13] - Post-lapse stability power
	1.6483, // w[14] - Post-lapse retrievability
	0.6014, // w[15] - Hard interval factor
	1.8729, // w[16] - Easy interval factor
	0.5425, // w[17] - Same-day review factor 1
	0.0912, // w[18] - Same-day review factor 2
	0.0658, // w[19] - Same-day review power
	0.1542 // w[20] - Additional factor
];

/**
 * Retention profiles for different learning goals
 *
 * Desired retention is the most important parameter to configure.
 * It represents the percentage of information you want to remember.
 *
 * Higher retention = more frequent reviews = more time investment
 * Lower retention = fewer reviews = less time but more forgotten
 */
export const RETENTION_PROFILES = {
	/**
	 * Relaxed (80%)
	 * - Fewer reviews required
	 * - Acceptable to forget ~20% of material
	 * - Good for: Casual learning, exploration, low-priority topics
	 */
	relaxed: 0.8,

	/**
	 * Balanced (90%) - RECOMMENDED
	 * - Good balance between reviews and retention
	 * - Forget ~10% of material
	 * - Good for: Most educational use cases, general study
	 */
	balanced: 0.9,

	/**
	 * Performance (95%)
	 * - High retention, more frequent reviews
	 * - Forget only ~5% of material
	 * - Good for: Important exams, critical knowledge
	 */
	high: 0.95,

	/**
	 * Expert (97%) - MAXIMUM
	 * - Very high retention, very frequent reviews
	 * - Near-perfect memory
	 * - Good for: Competitions, professional use, ultra-important topics
	 * - WARNING: Very time-intensive!
	 */
	expert: 0.97
} as const;

/**
 * Default desired retention
 * Recommended: 0.9 (90%) - balanced profile
 */
export const DEFAULT_DESIRED_RETENTION = RETENTION_PROFILES.balanced;

/**
 * Maximum interval between reviews (in days)
 * Default: 36500 days (100 years)
 *
 * This prevents intervals from growing infinitely.
 * In practice, intervals rarely exceed a few years.
 */
export const DEFAULT_MAXIMUM_INTERVAL = 36500;

/**
 * Decay parameter for forgetting curve
 * Default: -0.5 (scientifically validated)
 *
 * DO NOT modify unless you know what you're doing.
 */
export const DECAY_PARAMETER = -0.5;

/**
 * Learning steps (short intervals for new cards)
 * Format: milliseconds
 *
 * FSRS recommends keeping these short (<= 1 day)
 * Default: [10 minutes]
 */
export const DEFAULT_LEARNING_STEPS = [
	10 * 60 * 1000 // 10 minutes
];

/**
 * Relearning steps (after failing a card)
 * Format: milliseconds
 *
 * Default: [10 minutes]
 */
export const DEFAULT_RELEARNING_STEPS = [
	10 * 60 * 1000 // 10 minutes
];

/**
 * Grade labels and descriptions
 */
export const GRADE_LABELS = {
	1: {
		label: 'Échec',
		description: 'Oublié complètement',
		emoji: '❌',
		color: 'red'
	},
	2: {
		label: 'Difficile',
		description: 'Réussi avec beaucoup de difficulté',
		emoji: '😓',
		color: 'orange'
	},
	3: {
		label: 'Bien',
		description: 'Réussi après réflexion',
		emoji: '👍',
		color: 'green'
	},
	4: {
		label: 'Facile',
		description: 'Souvenu immédiatement',
		emoji: '✨',
		color: 'blue'
	}
} as const;

/**
 * Card state labels
 */
export const STATE_LABELS = {
	new: 'Nouveau',
	learning: 'Apprentissage',
	review: 'Révision',
	relearning: 'Ré-apprentissage'
} as const;

/**
 * Complete educational FSRS configuration
 */
export const EDUCATIONAL_CONFIG = {
	parameters: DEFAULT_FSRS_PARAMS,
	desiredRetention: DEFAULT_DESIRED_RETENTION,
	maximumInterval: DEFAULT_MAXIMUM_INTERVAL,
	decay: DECAY_PARAMETER,
	learningSteps: DEFAULT_LEARNING_STEPS,
	relearningSteps: DEFAULT_RELEARNING_STEPS
} as const;

/**
 * Validation helpers
 */

/**
 * Validate desired retention value
 * Must be between 0.7 and 0.97
 */
export function isValidRetention(retention: number): boolean {
	return retention >= 0.7 && retention <= 0.97;
}

/**
 * Validate FSRS parameters array
 * Must have exactly 21 values
 */
export function isValidParameters(params: number[]): boolean {
	return Array.isArray(params) && params.length === 21;
}

/**
 * Get retention profile name from value
 */
export function getRetentionProfileName(retention: number): string {
	if (retention <= RETENTION_PROFILES.relaxed) return 'Décontracté (80%)';
	if (retention <= RETENTION_PROFILES.balanced) return 'Équilibré (90%)';
	if (retention <= RETENTION_PROFILES.high) return 'Performance (95%)';
	return 'Expert (97%)';
}
