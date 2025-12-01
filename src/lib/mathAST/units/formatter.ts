/**
 * Unit AST - Unit Formatter
 *
 * Formats Unit objects to string representations in various styles.
 * Supports original (preserving user input), dot (normalized), and fraction
 * (numerator/denominator) notation.
 *
 * @module mathAST/units/formatter
 */

import type { Unit } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Format style for unit output
 *
 * - 'original': Use u.original if available, otherwise fallback to 'dot'
 * - 'dot': Normalized dot notation (m.s^-1)
 * - 'fraction': Slash notation with positive numerator, negative denominator (m/s)
 */
export type FormatStyle = 'dot' | 'fraction' | 'original';

// =============================================================================
// Coefficient Formatting
// =============================================================================

/**
 * Format coefficient with appropriate precision
 *
 * Handles both integer and decimal coefficients, removing unnecessary
 * trailing zeros and decimal points.
 *
 * @param coefficient - The coefficient to format
 * @returns Formatted coefficient string
 *
 * @example
 * formatCoefficient(1)        // '1'
 * formatCoefficient(1000)     // '1000'
 * formatCoefficient(0.277777) // '0.277777' (no rounding)
 * formatCoefficient(1e-3)     // '0.001'
 */
export function formatCoefficient(coefficient: number): string {
	// For very small numbers or numbers with fractional parts,
	// use toString() which provides reasonable precision
	const str = coefficient.toString();

	// Remove unnecessary trailing zeros after decimal point
	if (str.includes('.')) {
		return str.replace(/\.?0+$/, '');
	}

	return str;
}

// =============================================================================
// Core Formatting Functions
// =============================================================================

/**
 * Format a Unit to a dot-notation string (normalized)
 *
 * Components are sorted alphabetically by base symbol and formatted as:
 * - symbol^exponent (with ^1 omitted)
 * - joined with . (dot)
 * - dimensionless units return '1'
 *
 * @param u - Unit to format
 * @returns Formatted string in dot notation
 *
 * @example
 * formatDot(parse('m')!)      // 'm'
 * formatDot(parse('m^2')!)    // 'm^2'
 * formatDot(parse('m.s^-1')!) // 'm.s^-1'
 * formatDot(dimensionless())  // '1'
 */
function formatDot(u: Unit): string {
	// Empty components = dimensionless
	if (u.components.size === 0) {
		return '1';
	}

	// Sort components alphabetically and format each one
	const sorted = Array.from(u.components.entries()).sort((a, b) => a[0].localeCompare(b[0]));

	const parts = sorted.map(([symbol, exponent]) => {
		// Omit ^1 for clarity
		if (exponent === 1) {
			return symbol;
		}
		return `${symbol}^${exponent}`;
	});

	return parts.join('.');
}

/**
 * Format a Unit to fraction notation
 *
 * Separates positive and negative exponents into numerator and denominator.
 * - Positive exponents: numerator (positive values, with .^exp format)
 * - Negative exponents: denominator (absolute values, with .^exp format)
 * - If no denominator, returns just the numerator
 * - Dimensionless returns '1'
 *
 * @param u - Unit to format
 * @returns Formatted string in fraction notation
 *
 * @example
 * formatFraction(parse('m')!)           // 'm'
 * formatFraction(parse('m/s')!)         // 'm/s'
 * formatFraction(parse('m^2/s^2')!)     // 'm^2/s^2'
 * formatFraction(parse('s^-1')!)        // '1/s'
 * formatFraction(dimensionless())       // '1'
 */
function formatFraction(u: Unit): string {
	// Empty components = dimensionless
	if (u.components.size === 0) {
		return '1';
	}

	const numerator: Array<[string, number]> = [];
	const denominator: Array<[string, number]> = [];

	// Separate positive and negative exponents
	for (const [symbol, exponent] of u.components) {
		if (exponent > 0) {
			numerator.push([symbol, exponent]);
		} else if (exponent < 0) {
			// Store as absolute value for denominator
			denominator.push([symbol, -exponent]);
		}
	}

	// Sort both arrays alphabetically
	numerator.sort((a, b) => a[0].localeCompare(b[0]));
	denominator.sort((a, b) => a[0].localeCompare(b[0]));

	// Format numerator
	const numeratorStr =
		numerator.length === 0
			? '1'
			: numerator
					.map(([symbol, exponent]) => (exponent === 1 ? symbol : `${symbol}^${exponent}`))
					.join('.');

	// Format denominator
	const denominatorStr = denominator
		.map(([symbol, exponent]) => (exponent === 1 ? symbol : `${symbol}^${exponent}`))
		.join('.');

	// Combine
	if (denominator.length === 0) {
		return numeratorStr;
	}

	return `${numeratorStr}/${denominatorStr}`;
}

// =============================================================================
// Main Formatter
// =============================================================================

/**
 * Format a Unit to a string representation
 *
 * @param u - Unit to format
 * @param style - Format style (default: 'dot')
 *   - 'original': Use u.original if available, otherwise fallback to 'dot'
 *   - 'dot': Normalized dot notation (m.s^-1)
 *   - 'fraction': Slash notation (m/s)
 * @returns Formatted unit string
 *
 * @example
 * format(parse('km/h')!, 'original')  // 'km/h' (preserves original)
 * format(parse('km/h')!, 'dot')       // 'm.s^-1' (normalized)
 * format(parse('km/h')!, 'fraction')  // 'm/s' (fraction notation)
 * format(multiply(m, s_inv))          // 'm.s^-1' (no original, uses dot)
 * format(dimensionless())             // '1'
 */
export function format(u: Unit, style: FormatStyle = 'dot'): string {
	// Handle 'original' style: use original if available, fallback to 'dot'
	if (style === 'original') {
		if (u.original !== undefined) {
			return u.original;
		}
		// Fallback to dot style
		return formatDot(u);
	}

	// Handle 'dot' style
	if (style === 'dot') {
		return formatDot(u);
	}

	// Handle 'fraction' style
	if (style === 'fraction') {
		return formatFraction(u);
	}

	// This should never happen with proper TypeScript checking, but be safe
	return formatDot(u);
}

// =============================================================================
// UnitFormatter Namespace
// =============================================================================

/**
 * Namespace containing all formatter functions
 *
 * Usage:
 * - UnitFormatter.format(unit, 'dot') to format with dot notation
 * - UnitFormatter.format(unit, 'fraction') for fraction notation
 * - UnitFormatter.format(unit, 'original') to preserve original if available
 */
export const UnitFormatter = {
	format,
	formatCoefficient
} as const;
