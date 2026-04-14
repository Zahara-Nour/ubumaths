/**
 * 2048 Reward Calculator
 * ======================
 * Calculates gidouilles rewards based on 2048 game scores
 * using linear interpolation between defined breakpoints.
 */

/** Minimum score required to earn any reward */
export const REWARD_2048_MIN_SCORE = 1000;

/** Maximum possible reward (for scores >= 50000) */
export const REWARD_2048_MAX = 8.0;

/**
 * Breakpoints for reward calculation.
 * Each entry is [score, reward_in_gidouilles].
 * Between breakpoints, linear interpolation is used.
 */
const BREAKPOINTS: readonly [number, number][] = [
	[1000, 0.5],
	[5000, 1.5],
	[10000, 3.0],
	[20000, 5.0],
	[50000, 8.0]
];

/**
 * Calculates the theoretical gidouilles reward for a 2048 game score.
 * Uses linear interpolation between breakpoints.
 *
 * @param score - The final game score
 * @returns Theoretical reward in gidouilles (0 if score < 1000)
 */
export function calculate2048TheoreticalReward(score: number): number {
	if (score < REWARD_2048_MIN_SCORE) {
		return 0;
	}

	// Score at or above the max breakpoint
	if (score >= BREAKPOINTS[BREAKPOINTS.length - 1][0]) {
		return REWARD_2048_MAX;
	}

	// Find the two breakpoints to interpolate between
	for (let i = 0; i < BREAKPOINTS.length - 1; i++) {
		const [scoreLow, rewardLow] = BREAKPOINTS[i];
		const [scoreHigh, rewardHigh] = BREAKPOINTS[i + 1];

		if (score >= scoreLow && score <= scoreHigh) {
			const ratio = (score - scoreLow) / (scoreHigh - scoreLow);
			const reward = rewardLow + ratio * (rewardHigh - rewardLow);
			return Math.round(reward * 100) / 100;
		}
	}

	// Should never reach here given the guards above
	return 0;
}
