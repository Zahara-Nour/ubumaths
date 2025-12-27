/**
 * Grid Generator for Guess Who Math Game
 *
 * @module utils/guess-who/grid-generator
 */

import { GAME_PACKS, type GamePackId } from '$lib/types/guess-who';

/**
 * Generate a grid of 24 unique random numbers between 2 and 99
 * @deprecated Use generateGridForPack instead
 */
export function generateGrid(): number[] {
	const numbers = new Set<number>();

	while (numbers.size < 24) {
		// Generate random number between 2 and 99 (inclusive)
		const randomNum = Math.floor(Math.random() * 98) + 2;
		numbers.add(randomNum);
	}

	return Array.from(numbers);
}

/**
 * Generate a grid using the specified game pack
 * @param packId - The pack identifier to use for generation
 * @returns Array of numbers for the grid
 */
export function generateGridForPack(packId: GamePackId): number[] {
	const pack = GAME_PACKS[packId];
	if (!pack) {
		throw new Error(`Unknown pack: ${packId}`);
	}
	return pack.generateNumbers();
}

/**
 * Pick two different random numbers from the grid as secret numbers
 * @returns Tuple of [secret1, secret2]
 */
export function assignSecretNumbers(grid: number[]): [number, number] {
	if (grid.length < 2) {
		throw new Error('Grid must contain at least 2 numbers');
	}

	// Pick first secret number
	const index1 = Math.floor(Math.random() * grid.length);
	const secret1 = grid[index1];

	// Pick second secret number (different from first)
	let index2 = Math.floor(Math.random() * grid.length);
	while (index2 === index1) {
		index2 = Math.floor(Math.random() * grid.length);
	}
	const secret2 = grid[index2];

	return [secret1, secret2];
}
