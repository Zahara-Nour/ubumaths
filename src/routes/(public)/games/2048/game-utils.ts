/**
 * Utility functions for 2048 game
 */

/**
 * Returns the exponent for a power of 2
 * @param value - Tile value (must be a power of 2)
 * @returns The exponent n where value = 2^n
 * @example
 * getTilePower(64) // Returns 6 (because 2^6 = 64)
 * getTilePower(2048) // Returns 11 (because 2^11 = 2048)
 */
export function getTilePower(value: number): number {
	if (value < 2 || !Number.isInteger(value) || (value & (value - 1)) !== 0) {
		return 0;
	}
	return Math.log2(value);
}

/**
 * Returns the power notation for a tile value
 * @param value - Tile value (must be a power of 2)
 * @returns Power notation string (e.g., "2⁶" for 64)
 * @example
 * getPowerNotation(64) // Returns "2⁶"
 * getPowerNotation(2048) // Returns "2¹¹"
 */
export function getPowerNotation(value: number): string {
	if (value < 2 || !Number.isInteger(value) || (value & (value - 1)) !== 0) {
		return value.toString();
	}

	const power = Math.log2(value);
	const superscripts = [
		'\u2070',
		'\u00B9',
		'\u00B2',
		'\u00B3',
		'\u2074',
		'\u2075',
		'\u2076',
		'\u2077',
		'\u2078',
		'\u2079'
	];

	const powerStr = power.toString();
	const superscript = powerStr
		.split('')
		.map((digit) => superscripts[parseInt(digit)])
		.join('');

	return `2${superscript}`;
}

/**
 * Generates a unique tile ID compatible with both browser and SSR
 * Uses timestamp + counter + random component for uniqueness
 */
let idCounter = 0;
export function generateTileId(): string {
	return `tile-${Date.now()}-${idCounter++}-${Math.random().toString(36).slice(2, 9)}`;
}
