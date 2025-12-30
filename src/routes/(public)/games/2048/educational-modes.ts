/**
 * Educational mode logic for 2048 game
 * Handles tile generation and display for multiplication, equations, and fractions modes
 */

import type { GameMode } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum factor value in multiplication tables (12×12 = 144)
 * Students typically learn multiplication tables up to 12
 */
const MAX_MULTIPLICATION_FACTOR = 12;

/**
 * Maximum value achievable with standard multiplication tables
 * 12 × 12 = 144
 */
const MAX_MULTIPLICATION_VALUE = MAX_MULTIPLICATION_FACTOR * MAX_MULTIPLICATION_FACTOR;

/**
 * Encoding multiplier for fractions mode
 * Fractions are encoded as: (numerator × 1000) + denominator
 * This ensures denominators < 1000 don't collide with numerators
 * Example: 1/2 = 1×1000 + 2 = 1002
 */
const FRACTION_ENCODING_BASE = 1000;

/**
 * Tile configuration for educational modes
 */
interface TileConfig {
	value: number;
	displayValue: string;
}

/**
 * Generates a tile configuration based on the game mode
 * @param mode - Current game mode
 * @param targetValue - Optional target value (for specific tile generation)
 * @returns Tile configuration with value and display string
 */
export function generateEducationalTile(mode: GameMode, targetValue?: number): TileConfig {
	switch (mode) {
		case 'classic':
			return generateClassicTile(targetValue);
		case 'multiplication':
			return generateMultiplicationTile(targetValue);
		case 'equations':
			return generateEquationTile(targetValue);
		case 'fractions':
			return generateFractionTile(targetValue);
		default:
			return generateClassicTile(targetValue);
	}
}

/**
 * Classic mode: Standard 2048 tiles (powers of 2)
 * 90% chance of 2, 10% chance of 4
 */
function generateClassicTile(targetValue?: number): TileConfig {
	const value = targetValue || (Math.random() < 0.9 ? 2 : 4);
	return {
		value,
		displayValue: value.toString()
	};
}

/**
 * Multiplication mode: Tiles show multiplication expressions
 * Examples: 2×1=2, 2×2=4, 3×2=6, 4×2=8
 * Uses multiplication tables up to 12×12
 */
function generateMultiplicationTile(targetValue?: number): TileConfig {
	// For initial tiles or random generation
	if (!targetValue) {
		// Start with small values: 2, 4, 6, 8
		const smallValues = [2, 4, 6, 8];
		const value = smallValues[Math.floor(Math.random() * smallValues.length)];
		return createMultiplicationDisplay(value);
	}

	return createMultiplicationDisplay(targetValue);
}

/**
 * Creates a multiplication display for a given value
 * Finds factors that make sense for learning (prefer smaller factors)
 */
function createMultiplicationDisplay(value: number): TileConfig {
	// Special case for 2
	if (value === 2) {
		const displays = ['2×1', '1×2'];
		return {
			value: 2,
			displayValue: displays[Math.floor(Math.random() * displays.length)]
		};
	}

	// Find all factor pairs for the value
	const factorPairs: [number, number][] = [];
	for (let i = 1; i <= Math.min(value, MAX_MULTIPLICATION_FACTOR); i++) {
		if (value % i === 0 && value / i <= MAX_MULTIPLICATION_FACTOR) {
			factorPairs.push([i, value / i]);
		}
	}

	// If no valid factor pairs (value > MAX_MULTIPLICATION_VALUE), show the number directly
	// Rationale: We only teach multiplication tables up to 12×12
	if (factorPairs.length === 0) {
		return {
			value,
			displayValue: value.toString()
		};
	}

	// Pick a random factor pair (prefer smaller factors)
	// Sort by product of factors to prefer balanced pairs
	factorPairs.sort((a, b) => Math.abs(a[0] - a[1]) - Math.abs(b[0] - b[1]));

	const selectedPair = factorPairs[Math.floor(Math.random() * Math.min(3, factorPairs.length))];

	return {
		value,
		displayValue: `${selectedPair[0]}×${selectedPair[1]}`
	};
}

/**
 * Equations mode: Tiles show simple algebraic equations
 * Examples: x+1=2, x+2=4, 2x=6, x-1=7
 */
function generateEquationTile(targetValue?: number): TileConfig {
	// For initial tiles or random generation
	if (!targetValue) {
		const smallValues = [2, 4, 6, 8];
		const value = smallValues[Math.floor(Math.random() * smallValues.length)];
		return createEquationDisplay(value);
	}

	return createEquationDisplay(targetValue);
}

/**
 * Creates an equation display for a given value
 * Uses simple equations: x+a, x-a, ax (where x is the solution)
 */
function createEquationDisplay(value: number): TileConfig {
	// Choose equation type randomly
	const types = ['addition', 'subtraction', 'multiplication'];
	const type = types[Math.floor(Math.random() * types.length)];

	let displayValue: string;

	switch (type) {
		case 'addition': {
			// x + a = value, so we show "x+a" where x = value - a
			const a = Math.floor(Math.random() * Math.min(value, 10)) + 1;
			if (a >= value) {
				// Fallback to simple display
				displayValue = `x=${value}`;
			} else {
				displayValue = `x+${a}`;
			}
			break;
		}
		case 'subtraction': {
			// x - a = value, so we show "x-a" where x = value + a
			const a = Math.floor(Math.random() * 10) + 1;
			displayValue = `x-${a}`;
			break;
		}
		case 'multiplication': {
			// ax = value, so we show "ax" where x = value/a
			// Only use if value is divisible
			const divisors = [];
			for (let i = 2; i <= Math.min(value, 10); i++) {
				if (value % i === 0) {
					divisors.push(i);
				}
			}
			if (divisors.length > 0) {
				const a = divisors[Math.floor(Math.random() * divisors.length)];
				displayValue = `${a}x`;
			} else {
				// Fallback to simple addition
				displayValue = `x+0`;
			}
			break;
		}
		default:
			displayValue = `x=${value}`;
	}

	return {
		value,
		displayValue
	};
}

/**
 * Fractions mode: Tiles show equivalent fractions
 * Examples: 1/2, 2/4, 3/6 (all equal to 0.5 but displayed differently)
 * Value is stored as (numerator × FRACTION_ENCODING_BASE) + denominator for uniqueness
 */
function generateFractionTile(targetValue?: number): TileConfig {
	// For initial tiles, start with simple fractions
	if (!targetValue) {
		const simpleFractions = [
			{ num: 1, den: 2 }, // 1/2
			{ num: 1, den: 4 }, // 1/4
			{ num: 1, den: 3 }, // 1/3
			{ num: 2, den: 3 }, // 2/3
			{ num: 3, den: 4 } // 3/4
		];
		const frac = simpleFractions[Math.floor(Math.random() * simpleFractions.length)];
		return {
			value: frac.num * FRACTION_ENCODING_BASE + frac.den,
			displayValue: `${frac.num}/${frac.den}`
		};
	}

	// For merged tiles, create equivalent fraction
	// Decode: value = (num × FRACTION_ENCODING_BASE) + den
	const num = Math.floor(targetValue / FRACTION_ENCODING_BASE);
	const den = targetValue % FRACTION_ENCODING_BASE;

	// Create equivalent fraction by multiplying both by same number
	const multiplier = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
	const newNum = num * multiplier;
	const newDen = den * multiplier;

	// Keep fractions reasonable (denominator < 100)
	if (newDen >= 100) {
		return {
			value: targetValue,
			displayValue: `${num}/${den}`
		};
	}

	return {
		value: targetValue,
		displayValue: `${newNum}/${newDen}`
	};
}

/**
 * Gets the display value for a merged tile in educational modes
 * @param value - The tile value
 * @param mode - Current game mode
 * @returns Display string for the tile
 */
export function getMergeDisplayValue(value: number, mode: GameMode): string {
	const config = generateEducationalTile(mode, value);
	return config.displayValue;
}

/**
 * Checks if two tiles can merge in the current mode
 * Classic: values must be equal
 * Educational modes: actual calculated values must be equal
 * @param tile1Value - First tile value
 * @param tile2Value - Second tile value
 * @param mode - Current game mode
 * @returns Whether tiles can merge
 */
export function canMerge(tile1Value: number, tile2Value: number, mode: GameMode): boolean {
	// In all modes, tiles merge if their encoded values are equal
	// Note: For future extension, mode could enable equivalent fraction merging
	// (e.g., 1/2 and 2/4) but current implementation uses value equality
	void mode; // Acknowledge parameter for future use
	return tile1Value === tile2Value;
}

/**
 * Gets the winning tile value for the current mode
 * @param mode - Current game mode
 * @returns Winning tile value
 */
export function getWinningValue(mode: GameMode): number {
	switch (mode) {
		case 'classic':
			return 2048;
		case 'multiplication':
			return MAX_MULTIPLICATION_VALUE; // 12×12 = 144
		case 'equations':
			return 100; // Round number for algebraic complexity
		case 'fractions':
			return FRACTION_ENCODING_BASE + 1; // 1001 (encodes 1/1, which equals 1)
		default:
			return 2048;
	}
}
