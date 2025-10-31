/**
 * Seeded Pseudo-Random Number Generator
 * ======================================
 *
 * Simple sine-based PRNG for reproducible random number generation.
 * Used for generating consistent question variations from the same seed.
 *
 * ⚠️ **NOT cryptographically secure** - use only for:
 * - Educational content generation
 * - Deterministic question variations
 * - Reproducible test scenarios
 *
 * ❌ **DO NOT use for**:
 * - Security tokens
 * - Password generation
 * - Cryptographic operations
 *
 * @module utils/random
 *
 * @example Basic usage
 * ```typescript
 * import { seededRandom } from '$lib/utils/random';
 *
 * const seed = 12345;
 * const random1 = seededRandom(seed);     // Always returns same value
 * const random2 = seededRandom(seed + 1); // Different but reproducible
 * ```
 *
 * @example Generate random integer
 * ```typescript
 * import { randomInt } from '$lib/utils/random';
 *
 * const dice = randomInt(1, 6, seed);           // Random dice roll (1-6)
 * const random = randomInt(1, 100);             // Non-seeded random (1-100)
 * ```
 */

/**
 * Seeded pseudo-random number generator
 *
 * Generates a reproducible pseudo-random number between 0 and 1 based on a seed.
 * Uses a simple sine-based algorithm for reproducibility across sessions.
 *
 * **Algorithm**: Based on sin(seed) to create pseudo-random distribution
 *
 * **Why this algorithm?**
 * - Simple and fast (single Math.sin call)
 * - Deterministic (same seed always produces same output)
 * - Good distribution for educational use cases
 * - No state management needed
 *
 * **Important**: This is NOT a cryptographically secure random number generator.
 * The sine function creates predictable patterns. This is intentional for
 * educational content where reproducibility is more important than unpredictability.
 *
 * @param seed - Integer seed value (any number, typically positive)
 * @returns Pseudo-random number between 0 (inclusive) and 1 (exclusive)
 *
 * @example
 * ```typescript
 * seededRandom(12345);  // Always returns ~0.929
 * seededRandom(12345);  // Always returns ~0.929 (reproducible)
 * seededRandom(12346);  // Returns different value
 * ```
 */
export function seededRandom(seed: number): number {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
}

/**
 * Generate random integer with optional seed
 *
 * Generates a random integer in the range [min, max] (inclusive).
 * If seed is provided, result is reproducible. Otherwise uses Math.random().
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param seed - Optional seed for reproducibility
 * @returns Random integer between min and max (inclusive)
 *
 * @example Seeded random
 * ```typescript
 * randomInt(1, 6, 12345);  // Reproducible dice roll
 * randomInt(1, 6, 12345);  // Same result as above
 * ```
 *
 * @example Non-seeded random
 * ```typescript
 * randomInt(1, 100);  // Random number 1-100 (different each call)
 * ```
 */
export function randomInt(min: number, max: number, seed?: number): number {
	const random = seed !== undefined ? seededRandom(seed) : Math.random();
	return Math.floor(random * (max - min + 1)) + min;
}

/**
 * Generate random float with optional seed
 *
 * Generates a random floating-point number in the range [min, max).
 * If seed is provided, result is reproducible. Otherwise uses Math.random().
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @param seed - Optional seed for reproducibility
 * @returns Random float between min and max
 *
 * @example
 * ```typescript
 * randomFloat(0, 1, 12345);  // Reproducible 0-1 float
 * randomFloat(5.0, 10.0);    // Random 5.0-10.0 (non-seeded)
 * ```
 */
export function randomFloat(min: number, max: number, seed?: number): number {
	const random = seed !== undefined ? seededRandom(seed) : Math.random();
	return random * (max - min) + min;
}
