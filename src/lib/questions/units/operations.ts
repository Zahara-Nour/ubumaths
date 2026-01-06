/**
 * Unit System - Algebraic Operations
 * ===================================
 *
 * This file implements algebraic operations on physical units for composite unit support.
 *
 * MIGRATION NOTE: Core operations (multiply, divide, power, invert) and conversions
 * (unitsAreCompatible, getConversionFactor, getDimensionalSignature) are now imported
 * from mathAST/units which is the source of truth. This module re-exports them with
 * backward-compatible aliases and adds question-specific helpers (formatUnit, isLength, etc.)
 *
 * @module questions/units/operations
 */

import type { Unit, Dimension } from './types';

// ============================================================================
// RE-EXPORTS FROM MATHAST (source of truth)
// ============================================================================

// Import core operations from mathAST/units
import {
	multiply,
	divide,
	power,
	invert,
	unitsEqual as mathASTUnitsEqual,
	unitsEquivalent
} from '$lib/mathAST/units/operations';

// Import unit factory functions
import { unit, dimensionless, fromComponents } from '$lib/mathAST/units/factory';

// Import conversion functions
import {
	unitsAreCompatible as mathASTUnitsAreCompatible,
	getConversionFactor as mathASTGetConversionFactor,
	getDimensionalSignature as mathASTGetDimensionalSignature
} from '$lib/mathAST/units/conversion';

// ============================================================================
// BACKWARD-COMPATIBLE ALIASES
// ============================================================================

// These aliases maintain backward compatibility with existing code that uses
// the old naming convention (multiplyUnits vs multiply)

export const multiplyUnits = multiply;
export const divideUnits = divide;
export const powerUnit = power;
export const invertUnit = invert;
export const unitsAreEqual = mathASTUnitsEqual;
export const unitsAreCompatible = mathASTUnitsAreCompatible;
export const getConversionFactor = mathASTGetConversionFactor;
export const getDimensionalSignature = mathASTGetDimensionalSignature;

// Also export the original names
export { multiply, divide, power, invert, unitsEquivalent };

// ============================================================================
// FORMAT STYLE TYPE
// ============================================================================

/**
 * Formatting style for units
 *
 * - 'fraction': Use fraction notation (m/s)
 * - 'powers': Use negative exponents (m.s^-1)
 */
export type UnitFormatStyle = 'fraction' | 'powers';

// ============================================================================
// UNIT CREATION
// ============================================================================

/**
 * Create a unit from a symbol
 *
 * Parses a unit symbol and returns a Unit object with components and coefficient.
 * Handles both simple units (m, kg) and prefixed units (km, mm).
 *
 * @param symbol - Unit symbol (e.g., 'km', 'm', 's', 'L')
 * @returns Unit object with components and coefficient
 * @throws Error if symbol is not recognized
 *
 * @example Simple unit
 * createUnit('m') // { components: Map{'m' => 1}, coefficient: 1 }
 *
 * @example Prefixed unit
 * createUnit('km') // { components: Map{'m' => 1}, coefficient: 1000 }
 */
export function createUnit(symbol: string): Unit {
	const result = unit(symbol);

	if (!result) {
		throw new Error(`Unknown unit symbol: ${symbol}`);
	}

	return result;
}

/**
 * Create a dimensionless unit (for pure numbers)
 *
 * A dimensionless unit has no components and coefficient of 1.
 * Used for pure numbers in calculations.
 *
 * @returns Dimensionless unit
 */
export function dimensionlessUnit(): Unit {
	return dimensionless();
}

/**
 * Create a unit from raw components and coefficient
 *
 * Low-level function for creating units directly.
 * Zero exponents are automatically removed from components.
 *
 * @param components - Map of base symbols to exponents
 * @param coefficient - Conversion coefficient (default: 1)
 * @returns Unit object with cleaned components
 */
export function createUnitFromComponents(
	components: Map<string, number>,
	coefficient: number = 1
): Unit {
	// Clean up zero exponents
	const cleanedComponents = new Map<string, number>();
	for (const [symbol, exponent] of components) {
		if (exponent !== 0) {
			cleanedComponents.set(symbol, exponent);
		}
	}

	return fromComponents(cleanedComponents, coefficient);
}

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Normalize a unit to base units with coefficient 1
 *
 * Returns a new unit where the coefficient captures all the conversion
 * factors and the components are in base units.
 *
 * @param u - Unit to normalize
 * @returns Normalized unit
 */
export function normalizeUnit(u: Unit): Unit {
	// The unit is already in base form with coefficient
	// Just return a copy
	return fromComponents(new Map(u.components), u.coefficient);
}

// ============================================================================
// DIMENSIONAL ANALYSIS HELPERS
// ============================================================================

/**
 * Get the primary dimension of a unit
 *
 * For simple units, returns the single dimension.
 * For composite units (multiple dimensions), returns 'composite'.
 *
 * @param u - Unit to analyze
 * @returns Primary dimension or 'composite'
 */
export function getDimension(u: Unit): Dimension | 'composite' {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];

	if (dimensions.length === 0) {
		return 'dimensionless';
	}

	if (dimensions.length === 1) {
		const dim = dimensions[0];
		const exp = sig[dim];
		// Only return dimension if exponent is 1
		if (exp === 1) {
			return dim;
		}
	}

	return 'composite';
}

/**
 * Check if unit represents a length
 */
export function isLength(u: Unit): boolean {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];
	return dimensions.length === 1 && sig.length === 1;
}

/**
 * Check if unit represents a mass
 */
export function isMass(u: Unit): boolean {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];
	return dimensions.length === 1 && sig.mass === 1;
}

/**
 * Check if unit represents a duration/time
 */
export function isDuration(u: Unit): boolean {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];
	return dimensions.length === 1 && sig.time === 1;
}

/**
 * Check if unit represents a volume (L or m^3)
 */
export function isVolume(u: Unit): boolean {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];

	// Check for volume dimension (L-based)
	if (dimensions.length === 1 && sig.volume === 1) {
		return true;
	}

	// Check for length^3 (m^3-based)
	if (dimensions.length === 1 && sig.length === 3) {
		return true;
	}

	return false;
}

/**
 * Check if unit represents a speed (length/time)
 */
export function isSpeed(u: Unit): boolean {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];
	return dimensions.length === 2 && sig.length === 1 && sig.time === -1;
}

/**
 * Check if unit represents an area (length^2)
 */
export function isArea(u: Unit): boolean {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];
	return dimensions.length === 1 && sig.length === 2;
}

/**
 * Check if unit is dimensionless
 */
export function isDimensionless(u: Unit): boolean {
	return u.components.size === 0;
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format a unit as a string
 *
 * Supports two styles:
 * - 'fraction': m/s, kg/m^3
 * - 'powers': m.s^-1, kg.m^-3
 *
 * @param u - Unit to format
 * @param style - Formatting style (default: 'fraction')
 * @returns Formatted string
 */
export function formatUnit(u: Unit, style: UnitFormatStyle = 'fraction'): string {
	if (u.components.size === 0) {
		return '1'; // Dimensionless
	}

	if (style === 'powers') {
		return formatUnitPowers(u);
	} else {
		return formatUnitFraction(u);
	}
}

/**
 * Format unit using power notation (m.s^-1)
 */
function formatUnitPowers(u: Unit): string {
	const parts: string[] = [];

	// Sort components alphabetically for consistent output
	const sortedComponents = [...u.components.entries()].sort(([a], [b]) => a.localeCompare(b));

	for (const [symbol, exponent] of sortedComponents) {
		if (exponent === 1) {
			parts.push(symbol);
		} else {
			parts.push(`${symbol}^${exponent}`);
		}
	}

	return parts.join('.') || '1';
}

/**
 * Format unit using fraction notation (m/s)
 */
function formatUnitFraction(u: Unit): string {
	const numerator: string[] = [];
	const denominator: string[] = [];

	// Sort components alphabetically
	const sortedComponents = [...u.components.entries()].sort(([a], [b]) => a.localeCompare(b));

	for (const [symbol, exponent] of sortedComponents) {
		if (exponent > 0) {
			if (exponent === 1) {
				numerator.push(symbol);
			} else {
				numerator.push(`${symbol}^${exponent}`);
			}
		} else {
			if (exponent === -1) {
				denominator.push(symbol);
			} else {
				denominator.push(`${symbol}^${-exponent}`);
			}
		}
	}

	const numStr = numerator.join('.') || '1';
	const denStr = denominator.join('.');

	if (denominator.length === 0) {
		return numStr;
	}

	if (denominator.length === 1 && !denominator[0].includes('^')) {
		return `${numStr}/${denStr}`;
	}

	return `${numStr}/(${denStr})`;
}

/**
 * Format unit using Unicode superscript notation
 */
export function formatUnitUnicode(u: Unit, style: UnitFormatStyle = 'fraction'): string {
	const formatted = formatUnit(u, style);
	return toUnicodeSuperscript(formatted);
}

/**
 * Convert ASCII exponents to Unicode superscripts
 */
function toUnicodeSuperscript(str: string): string {
	const superscripts: Record<string, string> = {
		'0': '\u2070',
		'1': '\u00B9',
		'2': '\u00B2',
		'3': '\u00B3',
		'4': '\u2074',
		'5': '\u2075',
		'6': '\u2076',
		'7': '\u2077',
		'8': '\u2078',
		'9': '\u2079',
		'-': '\u207B'
	};

	return str
		.replace(/\./g, '\u00B7') // Middle dot for multiplication
		.replace(/\^(-?\d+)/g, (_match, exp: string) => {
			return [...exp].map((c) => superscripts[c] ?? c).join('');
		});
}

// ============================================================================
// PARSING (Basic)
// ============================================================================

/**
 * Parse a simple unit string
 *
 * Handles basic unit expressions like 'm', 'm^2', 'm/s'.
 */
export function parseSimpleUnit(str: string): Unit {
	// Remove whitespace
	str = str.trim();

	// Handle fraction: a/b
	if (str.includes('/')) {
		const [numPart, denPart] = str.split('/');
		const numerator = parseUnitProduct(numPart.trim());
		const denominator = parseUnitProduct(denPart.trim().replace(/^\(|\)$/g, ''));
		return divide(numerator, denominator);
	}

	// Handle product: a.b or a*b
	return parseUnitProduct(str);
}

/**
 * Parse a product of units (e.g., 'm.s' or 'kg.m')
 */
function parseUnitProduct(str: string): Unit {
	if (!str || str === '1') {
		return dimensionless();
	}

	// Split on . or * (multiplication)
	const parts = str.split(/[.*·]/);

	let result = dimensionless();

	for (const part of parts) {
		const unitPart = parseUnitWithExponent(part.trim());
		result = multiply(result, unitPart);
	}

	return result;
}

/**
 * Parse a single unit with optional exponent (e.g., 'm^2', 's^-1')
 */
function parseUnitWithExponent(str: string): Unit {
	// Handle Unicode superscripts
	str = fromUnicodeSuperscript(str);

	// Match pattern: symbol^exponent or just symbol
	const match = str.match(/^([a-zA-Z€$°μΩ]+)(?:\^(-?\d+(?:\.\d+)?))?$/);

	if (!match) {
		throw new Error(`Cannot parse unit: ${str}`);
	}

	const [, symbol, expStr] = match;
	const exponent = expStr ? parseFloat(expStr) : 1;

	const baseUnit = createUnit(symbol);
	return power(baseUnit, exponent);
}

/**
 * Convert Unicode superscripts back to ASCII exponents
 */
function fromUnicodeSuperscript(str: string): string {
	const fromSuper: Record<string, string> = {
		'\u2070': '0',
		'\u00B9': '1',
		'\u00B2': '2',
		'\u00B3': '3',
		'\u2074': '4',
		'\u2075': '5',
		'\u2076': '6',
		'\u2077': '7',
		'\u2078': '8',
		'\u2079': '9',
		'\u207B': '-'
	};

	let result = str.replace(/\u00B7/g, '.'); // Middle dot to .

	// Replace superscript sequences with ^number
	const superscriptRegex = /([\u2070\u00B9\u00B2\u00B3\u2074-\u2079\u207B]+)/g;

	result = result.replace(superscriptRegex, (match) => {
		const digits = [...match].map((c) => fromSuper[c] ?? c).join('');
		return `^${digits}`;
	});

	return result;
}
