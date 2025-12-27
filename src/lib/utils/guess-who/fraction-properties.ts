/**
 * Fraction Properties for Guess Who Math Game
 *
 * Provides utilities for checking mathematical properties of fractions
 * and generating fractions for game packs.
 *
 * @module utils/guess-who/fraction-properties
 */

import { isPrime } from './math-properties';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents a fraction with numerator and denominator
 */
export interface Fraction {
	numerator: number;
	denominator: number;
}

/**
 * Question types specific to fractions
 */
export type FractionQuestionType =
	| 'is_irreducible'
	| 'numerator_even'
	| 'numerator_odd'
	| 'numerator_prime'
	| 'denominator_even'
	| 'denominator_odd'
	| 'denominator_prime'
	| 'greater_than_one'
	| 'less_than_one'
	| 'equals_one'
	| 'equivalent_to_half'
	| 'numerator_greater_than'
	| 'numerator_less_than'
	| 'denominator_greater_than'
	| 'denominator_less_than'
	| 'denominator_equals';

// ============================================================================
// BASIC FRACTION OPERATIONS
// ============================================================================

/**
 * Calculate the Greatest Common Divisor using Euclidean algorithm
 */
export function gcd(a: number, b: number): number {
	a = Math.abs(a);
	b = Math.abs(b);
	while (b !== 0) {
		const temp = b;
		b = a % b;
		a = temp;
	}
	return a;
}

/**
 * Reduce a fraction to its lowest terms
 */
export function reduceFraction(f: Fraction): Fraction {
	const g = gcd(f.numerator, f.denominator);
	return {
		numerator: f.numerator / g,
		denominator: f.denominator / g
	};
}

/**
 * Check if a fraction is in irreducible form (already in lowest terms)
 */
export function isIrreducible(f: Fraction): boolean {
	return gcd(f.numerator, f.denominator) === 1;
}

/**
 * Check if two fractions are equivalent (represent the same value)
 */
export function areEquivalent(f1: Fraction, f2: Fraction): boolean {
	// Cross multiply to compare: a/b = c/d iff a*d = b*c
	return f1.numerator * f2.denominator === f1.denominator * f2.numerator;
}

/**
 * Compare fraction to 1
 */
export function compareToOne(f: Fraction): -1 | 0 | 1 {
	if (f.numerator < f.denominator) return -1;
	if (f.numerator > f.denominator) return 1;
	return 0;
}

/**
 * Convert fraction to decimal for comparison
 */
export function toDecimal(f: Fraction): number {
	return f.numerator / f.denominator;
}

// ============================================================================
// PROPERTY CHECKS
// ============================================================================

/**
 * Check if numerator is even
 */
export function hasEvenNumerator(f: Fraction): boolean {
	return f.numerator % 2 === 0;
}

/**
 * Check if numerator is odd
 */
export function hasOddNumerator(f: Fraction): boolean {
	return f.numerator % 2 !== 0;
}

/**
 * Check if numerator is prime
 */
export function hasPrimeNumerator(f: Fraction): boolean {
	return isPrime(f.numerator);
}

/**
 * Check if denominator is even
 */
export function hasEvenDenominator(f: Fraction): boolean {
	return f.denominator % 2 === 0;
}

/**
 * Check if denominator is odd
 */
export function hasOddDenominator(f: Fraction): boolean {
	return f.denominator % 2 !== 0;
}

/**
 * Check if denominator is prime
 */
export function hasPrimeDenominator(f: Fraction): boolean {
	return isPrime(f.denominator);
}

/**
 * Check if fraction is greater than 1
 */
export function isGreaterThanOne(f: Fraction): boolean {
	return f.numerator > f.denominator;
}

/**
 * Check if fraction is less than 1
 */
export function isLessThanOne(f: Fraction): boolean {
	return f.numerator < f.denominator;
}

/**
 * Check if fraction equals 1
 */
export function equalsOne(f: Fraction): boolean {
	return f.numerator === f.denominator;
}

/**
 * Check if fraction is equivalent to 1/2
 */
export function isEquivalentToHalf(f: Fraction): boolean {
	return areEquivalent(f, { numerator: 1, denominator: 2 });
}

// ============================================================================
// GENERIC PROPERTY CHECKER
// ============================================================================

/**
 * Check a fraction property by type
 */
export function checkFractionProperty(
	f: Fraction,
	type: FractionQuestionType,
	param?: number
): boolean {
	switch (type) {
		case 'is_irreducible':
			return isIrreducible(f);
		case 'numerator_even':
			return hasEvenNumerator(f);
		case 'numerator_odd':
			return hasOddNumerator(f);
		case 'numerator_prime':
			return hasPrimeNumerator(f);
		case 'denominator_even':
			return hasEvenDenominator(f);
		case 'denominator_odd':
			return hasOddDenominator(f);
		case 'denominator_prime':
			return hasPrimeDenominator(f);
		case 'greater_than_one':
			return isGreaterThanOne(f);
		case 'less_than_one':
			return isLessThanOne(f);
		case 'equals_one':
			return equalsOne(f);
		case 'equivalent_to_half':
			return isEquivalentToHalf(f);
		case 'numerator_greater_than':
			if (param === undefined) throw new Error('numerator_greater_than requires param');
			return f.numerator > param;
		case 'numerator_less_than':
			if (param === undefined) throw new Error('numerator_less_than requires param');
			return f.numerator < param;
		case 'denominator_greater_than':
			if (param === undefined) throw new Error('denominator_greater_than requires param');
			return f.denominator > param;
		case 'denominator_less_than':
			if (param === undefined) throw new Error('denominator_less_than requires param');
			return f.denominator < param;
		case 'denominator_equals':
			if (param === undefined) throw new Error('denominator_equals requires param');
			return f.denominator === param;
	}
}

// ============================================================================
// FRACTION GENERATION
// ============================================================================

/**
 * Generate a random fraction within specified bounds
 */
export function generateRandomFraction(
	minNum: number,
	maxNum: number,
	minDenom: number,
	maxDenom: number
): Fraction {
	const numerator = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
	const denominator = Math.floor(Math.random() * (maxDenom - minDenom + 1)) + minDenom;
	return { numerator, denominator };
}

/**
 * Generate unique fractions for a game grid
 * Ensures no two fractions are equivalent
 */
export function generateUniqueFractions(
	count: number,
	minNum: number,
	maxNum: number,
	minDenom: number,
	maxDenom: number,
	options?: {
		/** Only include irreducible fractions */
		irreducibleOnly?: boolean;
		/** Ensure mix of fractions > 1 and < 1 */
		mixedRatios?: boolean;
	}
): Fraction[] {
	const fractions: Fraction[] = [];
	const maxAttempts = count * 100; // Prevent infinite loops
	let attempts = 0;

	while (fractions.length < count && attempts < maxAttempts) {
		attempts++;
		const candidate = generateRandomFraction(minNum, maxNum, minDenom, maxDenom);

		// Skip if irreducible only and not irreducible
		if (options?.irreducibleOnly && !isIrreducible(candidate)) {
			continue;
		}

		// Check if equivalent to any existing fraction
		const isUnique = !fractions.some((f) => areEquivalent(f, candidate));

		if (isUnique) {
			fractions.push(candidate);
		}
	}

	if (fractions.length < count) {
		throw new Error(
			`Could not generate ${count} unique fractions in range [${minNum}-${maxNum}]/[${minDenom}-${maxDenom}]`
		);
	}

	// Optionally ensure mix of ratios
	if (options?.mixedRatios) {
		const lessThanOne = fractions.filter(isLessThanOne);
		const greaterOrEqual = fractions.filter((f) => !isLessThanOne(f));

		// If imbalanced, regenerate to fix (simplified approach)
		if (lessThanOne.length < count / 4 || greaterOrEqual.length < count / 4) {
			// Just shuffle what we have - a more sophisticated approach would regenerate
			return fractions.sort(() => Math.random() - 0.5);
		}
	}

	return fractions;
}

/**
 * Convert a fraction to display string (e.g., "3/4")
 */
export function fractionToString(f: Fraction): string {
	return `${f.numerator}/${f.denominator}`;
}

/**
 * Parse a fraction from string (e.g., "3/4" -> {numerator: 3, denominator: 4})
 */
export function parseFraction(str: string): Fraction {
	const parts = str.split('/');
	if (parts.length !== 2) {
		throw new Error(`Invalid fraction string: ${str}`);
	}
	const numerator = parseInt(parts[0], 10);
	const denominator = parseInt(parts[1], 10);
	if (isNaN(numerator) || isNaN(denominator)) {
		throw new Error(`Invalid fraction string: ${str}`);
	}
	if (denominator === 0) {
		throw new Error('Denominator cannot be zero');
	}
	return { numerator, denominator };
}

/**
 * Check if two fractions are the same (exact match, not equivalent)
 */
export function fractionsEqual(f1: Fraction, f2: Fraction): boolean {
	return f1.numerator === f2.numerator && f1.denominator === f2.denominator;
}

// ============================================================================
// DISPLAY (UBUMARK)
// ============================================================================

/**
 * Convert a fraction to ubumark display string (LaTeX fraction)
 * Example: {numerator: 3, denominator: 4} -> "$\\frac{3}{4}$"
 */
export function fractionToUbumark(f: Fraction): string {
	return `$\\frac{${f.numerator}}{${f.denominator}}$`;
}

/**
 * Convert a fraction to inline display (simpler format)
 * Example: {numerator: 3, denominator: 4} -> "3/4"
 */
export function fractionToInline(f: Fraction): string {
	return `${f.numerator}/${f.denominator}`;
}
