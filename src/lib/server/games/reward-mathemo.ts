/**
 * Mathemo Reward Calculator
 * =========================
 * Calculates gidouilles rewards based on Mathemo game performance.
 * Reward depends on word length (difficulty) and attempt efficiency.
 */

/** Maximum possible reward */
export const REWARD_MATHEMO_MAX = 8.0;

/** Minimum possible reward */
export const REWARD_MATHEMO_MIN = 0.3;

/**
 * Base reward by word length.
 * Longer words are harder to guess, so they earn more.
 */
function getLengthReward(wordLength: number): number {
	if (wordLength <= 4) return 0.5;
	if (wordLength <= 6) return 1.0;
	if (wordLength <= 8) return 1.5;
	if (wordLength <= 10) return 2.5;
	if (wordLength <= 12) return 4.0;
	return 6.0;
}

/**
 * Efficiency multiplier based on attempts used vs max attempts.
 * Finding on first try gives 1.5x, last attempt gives 0.8x.
 *
 * Formula: 1.5 - 0.7 * (attemptsUsed - 1) / (maxAttempts - 1)
 * Special case: if maxAttempts = 1, efficiency = 1.5
 */
function getEfficiencyMultiplier(attemptsUsed: number, maxAttempts: number): number {
	if (maxAttempts <= 1) return 1.5;
	return 1.5 - 0.7 * ((attemptsUsed - 1) / (maxAttempts - 1));
}

/**
 * Calculates the theoretical gidouilles reward for a Mathemo game win.
 *
 * @param wordLength - Length of the word that was guessed
 * @param attemptsUsed - Number of attempts the player needed
 * @param maxAttempts - Maximum attempts allowed for this game
 * @returns Theoretical reward in gidouilles (0 if not a win scenario)
 */
export function calculateMathemoTheoreticalReward(
	wordLength: number,
	attemptsUsed: number,
	maxAttempts: number
): number {
	const lengthReward = getLengthReward(wordLength);
	const efficiencyMult = getEfficiencyMultiplier(attemptsUsed, maxAttempts);

	const reward = lengthReward * efficiencyMult;

	// Clamp to bounds
	const clamped = Math.max(REWARD_MATHEMO_MIN, Math.min(REWARD_MATHEMO_MAX, reward));

	return Math.round(clamped * 100) / 100;
}
