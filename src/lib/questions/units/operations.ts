/**
 * Unit System - Algebraic Operations
 * ===================================
 *
 * This file implements algebraic operations on physical units for composite unit support.
 *
 * Key Features:
 * - Simple units: m, kg, s
 * - Composite units: m^2, m/s, kg.m.s^-2
 * - Unit multiplication, division, and powers
 * - Conversion factors between compatible units
 * - Dimensional analysis helpers
 *
 * Inspired by TinyCAS unit handling patterns.
 *
 * @module questions/units/operations
 */

import type { Unit, Dimension, DimensionMap } from './types';
import { resolveUnit, BASE_SYMBOL_BY_DIMENSION, BASE_UNIT_DEFS } from './definitions';

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
 *
 * @example Volume unit
 * createUnit('L') // { components: Map{'L' => 1}, coefficient: 1 }
 */
export function createUnit(symbol: string): Unit {
	const def = resolveUnit(symbol);

	if (!def) {
		throw new Error(`Unknown unit symbol: ${symbol}`);
	}

	return {
		components: new Map([[def.baseSymbol, 1]]),
		coefficient: def.coefficient
	};
}

/**
 * Create a dimensionless unit (for pure numbers)
 *
 * A dimensionless unit has no components and coefficient of 1.
 * Used for pure numbers in calculations.
 *
 * @returns Dimensionless unit
 *
 * @example
 * dimensionlessUnit() // { components: Map{}, coefficient: 1 }
 */
export function dimensionlessUnit(): Unit {
	return {
		components: new Map(),
		coefficient: 1
	};
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
 *
 * @example
 * createUnitFromComponents(new Map([['m', 2], ['s', -1]]), 1)
 * // { components: Map{'m' => 2, 's' => -1}, coefficient: 1 }
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

	return {
		components: cleanedComponents,
		coefficient
	};
}

// ============================================================================
// UNIT OPERATIONS
// ============================================================================

/**
 * Multiply two units
 *
 * Combines units by adding their exponents and multiplying coefficients.
 *
 * @param a - First unit
 * @param b - Second unit
 * @returns Product of the two units
 *
 * @example Same base
 * multiplyUnits(m, m) // m^2
 *
 * @example Different bases
 * multiplyUnits(kg, m/s^2) // kg.m.s^-2
 *
 * @example With coefficients
 * multiplyUnits(km, h^-1) // km/h (coefficient accounts for conversion)
 */
export function multiplyUnits(a: Unit, b: Unit): Unit {
	const resultComponents = new Map(a.components);

	for (const [symbol, exponent] of b.components) {
		const currentExponent = resultComponents.get(symbol) ?? 0;
		const newExponent = currentExponent + exponent;

		if (newExponent === 0) {
			resultComponents.delete(symbol);
		} else {
			resultComponents.set(symbol, newExponent);
		}
	}

	return {
		components: resultComponents,
		coefficient: a.coefficient * b.coefficient
	};
}

/**
 * Divide two units
 *
 * Combines units by subtracting exponents and dividing coefficients.
 *
 * @param a - Numerator unit
 * @param b - Denominator unit
 * @returns Quotient of the two units
 *
 * @example Simple division
 * divideUnits(m, s) // m.s^-1
 *
 * @example Cancellation
 * divideUnits(m^2, m) // m
 */
export function divideUnits(a: Unit, b: Unit): Unit {
	const resultComponents = new Map(a.components);

	for (const [symbol, exponent] of b.components) {
		const currentExponent = resultComponents.get(symbol) ?? 0;
		const newExponent = currentExponent - exponent;

		if (newExponent === 0) {
			resultComponents.delete(symbol);
		} else {
			resultComponents.set(symbol, newExponent);
		}
	}

	return {
		components: resultComponents,
		coefficient: a.coefficient / b.coefficient
	};
}

/**
 * Raise unit to a power
 *
 * Multiplies all exponents by the power and raises coefficient to the power.
 *
 * @param u - Unit to raise
 * @param exponent - Power (can be negative or fractional)
 * @returns Unit raised to the power
 *
 * @example Square
 * powerUnit(m, 2) // m^2
 *
 * @example Inverse
 * powerUnit(m, -1) // m^-1
 *
 * @example Square root (fractional)
 * powerUnit(m^2, 0.5) // m
 */
export function powerUnit(u: Unit, exponent: number): Unit {
	// Special case: power of 0 gives dimensionless unit
	if (exponent === 0) {
		return dimensionlessUnit();
	}

	const resultComponents = new Map<string, number>();

	for (const [symbol, exp] of u.components) {
		const newExponent = exp * exponent;
		if (newExponent !== 0) {
			resultComponents.set(symbol, newExponent);
		}
	}

	return {
		components: resultComponents,
		coefficient: Math.pow(u.coefficient, exponent)
	};
}

/**
 * Invert a unit (u^-1)
 *
 * Equivalent to powerUnit(u, -1).
 *
 * @param u - Unit to invert
 * @returns Inverted unit
 *
 * @example
 * invertUnit(m/s) // s/m
 */
export function invertUnit(u: Unit): Unit {
	return powerUnit(u, -1);
}

// ============================================================================
// UNIT COMPARISON
// ============================================================================

/**
 * Check if two units are exactly equal
 *
 * Units are equal if they have the same components with same exponents
 * and the same coefficient.
 *
 * @param a - First unit
 * @param b - Second unit
 * @returns True if units are exactly equal
 *
 * @example
 * unitsAreEqual(m, m) // true
 * unitsAreEqual(km, m) // false (different coefficient)
 * unitsAreEqual(m, s) // false (different components)
 */
export function unitsAreEqual(a: Unit, b: Unit): boolean {
	// Check coefficient (with floating point tolerance)
	if (Math.abs(a.coefficient - b.coefficient) > 1e-10) {
		return false;
	}

	// Check components
	if (a.components.size !== b.components.size) {
		return false;
	}

	for (const [symbol, exponent] of a.components) {
		const bExponent = b.components.get(symbol);
		if (bExponent === undefined || Math.abs(exponent - bExponent) > 1e-10) {
			return false;
		}
	}

	return true;
}

/**
 * Check if two units are compatible (same dimension, can be converted)
 *
 * Compatible units have the same dimensional signature.
 * km and m are compatible (both length).
 * km/h and m/s are compatible (both speed).
 * km and kg are NOT compatible (length vs mass).
 *
 * Special handling for volume: m^3 and L are considered compatible.
 *
 * @param a - First unit
 * @param b - Second unit
 * @returns True if units can be converted to each other
 *
 * @example Same dimension
 * unitsAreCompatible(km, m) // true
 *
 * @example Composite units
 * unitsAreCompatible(km/h, m/s) // true
 *
 * @example Incompatible
 * unitsAreCompatible(km, kg) // false
 *
 * @example Volume special case
 * unitsAreCompatible(L, m^3) // true
 */
export function unitsAreCompatible(a: Unit, b: Unit): boolean {
	const sigA = getDimensionalSignature(a);
	const sigB = getDimensionalSignature(b);

	// Get all dimensions from both signatures
	const allDimensions = new Set([...Object.keys(sigA), ...Object.keys(sigB)]) as Set<Dimension>;

	for (const dim of allDimensions) {
		const expA = sigA[dim] ?? 0;
		const expB = sigB[dim] ?? 0;
		if (Math.abs(expA - expB) > 1e-10) {
			return false;
		}
	}

	return true;
}

/**
 * Get conversion factor from unit A to unit B
 *
 * Returns the factor to multiply values in unit A to get values in unit B.
 * Returns null if units are incompatible.
 *
 * @param from - Source unit
 * @param to - Target unit
 * @returns Conversion factor or null if incompatible
 *
 * @example Length
 * getConversionFactor(km, m) // 1000 (1 km = 1000 m)
 *
 * @example Time
 * getConversionFactor(h, min) // 60 (1 h = 60 min)
 *
 * @example Speed
 * getConversionFactor(km/h, m/s) // 1/3.6 (approx 0.2778)
 *
 * @example Incompatible
 * getConversionFactor(km, kg) // null
 */
export function getConversionFactor(from: Unit, to: Unit): number | null {
	if (!unitsAreCompatible(from, to)) {
		return null;
	}

	// Factor = from.coefficient / to.coefficient
	// Example: km to m: 1000 / 1 = 1000
	// Example: m to km: 1 / 1000 = 0.001
	return from.coefficient / to.coefficient;
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
 *
 * @example
 * normalizeUnit(km) // { components: Map{'m' => 1}, coefficient: 1000 }
 */
export function normalizeUnit(u: Unit): Unit {
	// The unit is already in base form with coefficient
	// Just return a copy
	return {
		components: new Map(u.components),
		coefficient: u.coefficient
	};
}

/**
 * Get the dimensional signature of a unit
 *
 * Maps each base physical dimension to its exponent.
 * Used for compatibility checking.
 *
 * @param u - Unit to analyze
 * @returns Object mapping dimensions to exponents
 *
 * @example Simple
 * getDimensionalSignature(m) // { length: 1 }
 *
 * @example Composite
 * getDimensionalSignature(m/s) // { length: 1, time: -1 }
 *
 * @example Area
 * getDimensionalSignature(m^2) // { length: 2 }
 */
export function getDimensionalSignature(u: Unit): DimensionMap {
	const signature: DimensionMap = {};

	for (const [symbol, exponent] of u.components) {
		// Look up the dimension for this base symbol
		const dimension = getDimensionForSymbol(symbol);
		if (dimension && dimension !== 'dimensionless') {
			const currentExp = signature[dimension] ?? 0;
			const newExp = currentExp + exponent;
			if (newExp === 0) {
				delete signature[dimension];
			} else {
				signature[dimension] = newExp;
			}
		}
	}

	return signature;
}

/**
 * Get the dimension for a base unit symbol
 *
 * @param symbol - Base unit symbol
 * @returns Dimension or null if unknown
 */
function getDimensionForSymbol(symbol: string): Dimension | null {
	// Check the reverse mapping from BASE_SYMBOL_BY_DIMENSION
	for (const [dim, baseSymbol] of BASE_SYMBOL_BY_DIMENSION) {
		if (baseSymbol === symbol) {
			return dim;
		}
	}

	// Fallback: check BASE_UNIT_DEFS (Record)
	if (symbol in BASE_UNIT_DEFS) {
		return BASE_UNIT_DEFS[symbol].dimension;
	}

	// Try resolving the unit
	const def = resolveUnit(symbol);
	return def?.dimension ?? null;
}

// ============================================================================
// DIMENSIONAL ANALYSIS
// ============================================================================

/**
 * Get the primary dimension of a unit
 *
 * For simple units, returns the single dimension.
 * For composite units (multiple dimensions), returns 'composite'.
 *
 * @param u - Unit to analyze
 * @returns Primary dimension or 'composite'
 *
 * @example Simple
 * getDimension(m) // 'length'
 * getDimension(kg) // 'mass'
 *
 * @example Composite
 * getDimension(m/s) // 'composite'
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
 *
 * @param u - Unit to check
 * @returns True if unit is a length (dimension: length, exponent: 1)
 *
 * @example
 * isLength(m) // true
 * isLength(km) // true
 * isLength(m^2) // false (area)
 * isLength(kg) // false (mass)
 */
export function isLength(u: Unit): boolean {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];
	return dimensions.length === 1 && sig.length === 1;
}

/**
 * Check if unit represents a mass
 *
 * @param u - Unit to check
 * @returns True if unit is a mass
 *
 * @example
 * isMass(kg) // true
 * isMass(g) // true
 * isMass(m) // false
 */
export function isMass(u: Unit): boolean {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];
	return dimensions.length === 1 && sig.mass === 1;
}

/**
 * Check if unit represents a duration/time
 *
 * @param u - Unit to check
 * @returns True if unit is a time
 *
 * @example
 * isDuration(s) // true
 * isDuration(h) // true
 * isDuration(m) // false (length)
 */
export function isDuration(u: Unit): boolean {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];
	return dimensions.length === 1 && sig.time === 1;
}

/**
 * Check if unit represents a volume (L or m^3)
 *
 * Volume can be expressed as:
 * - Litre-based units (L, mL, etc.) with dimension 'volume'
 * - Cubic length units (m^3, cm^3) with dimension length^3
 *
 * @param u - Unit to check
 * @returns True if unit represents volume
 *
 * @example
 * isVolume(L) // true
 * isVolume(mL) // true
 * isVolume(m^3) // true
 * isVolume(cm^3) // true
 * isVolume(m^2) // false (area)
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
 *
 * @param u - Unit to check
 * @returns True if unit represents speed
 *
 * @example
 * isSpeed(m/s) // true
 * isSpeed(km/h) // true
 * isSpeed(m) // false (just length)
 */
export function isSpeed(u: Unit): boolean {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];
	return dimensions.length === 2 && sig.length === 1 && sig.time === -1;
}

/**
 * Check if unit represents an area (length^2)
 *
 * @param u - Unit to check
 * @returns True if unit represents area
 *
 * @example
 * isArea(m^2) // true
 * isArea(km^2) // true
 * isArea(m^3) // false (volume)
 */
export function isArea(u: Unit): boolean {
	const sig = getDimensionalSignature(u);
	const dimensions = Object.keys(sig) as Dimension[];
	return dimensions.length === 1 && sig.length === 2;
}

/**
 * Check if unit is dimensionless
 *
 * @param u - Unit to check
 * @returns True if unit has no physical dimension
 *
 * @example
 * isDimensionless(dimensionlessUnit()) // true
 * isDimensionless(m) // false
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
 *
 * @example Fraction style (default)
 * formatUnit(m/s) // 'm/s'
 * formatUnit(m^2/s) // 'm^2/s'
 *
 * @example Powers style
 * formatUnit(m/s, 'powers') // 'm.s^-1'
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
 *
 * Uses Unicode superscript characters for exponents.
 *
 * @param u - Unit to format
 * @param style - Formatting style
 * @returns Formatted string with Unicode superscripts
 *
 * @example
 * formatUnitUnicode(m^2) // 'm²'
 * formatUnitUnicode(m/s^2) // 'm/s²'
 * formatUnitUnicode(m.s^-1, 'powers') // 'm·s⁻¹'
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
 * For more complex expressions, use a full parser.
 *
 * @param str - Unit string to parse
 * @returns Parsed unit
 * @throws Error if string cannot be parsed
 *
 * @example
 * parseSimpleUnit('m') // { components: Map{'m' => 1}, coefficient: 1 }
 * parseSimpleUnit('m^2') // { components: Map{'m' => 2}, coefficient: 1 }
 * parseSimpleUnit('m/s') // { components: Map{'m' => 1, 's' => -1}, coefficient: ... }
 */
export function parseSimpleUnit(str: string): Unit {
	// Remove whitespace
	str = str.trim();

	// Handle fraction: a/b
	if (str.includes('/')) {
		const [numPart, denPart] = str.split('/');
		const numerator = parseUnitProduct(numPart.trim());
		const denominator = parseUnitProduct(denPart.trim().replace(/^\(|\)$/g, ''));
		return divideUnits(numerator, denominator);
	}

	// Handle product: a.b or a*b
	return parseUnitProduct(str);
}

/**
 * Parse a product of units (e.g., 'm.s' or 'kg.m')
 */
function parseUnitProduct(str: string): Unit {
	if (!str || str === '1') {
		return dimensionlessUnit();
	}

	// Split on . or * (multiplication)
	const parts = str.split(/[.*·]/);

	let result = dimensionlessUnit();

	for (const part of parts) {
		const unit = parseUnitWithExponent(part.trim());
		result = multiplyUnits(result, unit);
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
	const match = str.match(/^([a-zA-Z]+)(?:\^(-?\d+(?:\.\d+)?))?$/);

	if (!match) {
		throw new Error(`Cannot parse unit: ${str}`);
	}

	const [, symbol, expStr] = match;
	const exponent = expStr ? parseFloat(expStr) : 1;

	const baseUnit = createUnit(symbol);
	return powerUnit(baseUnit, exponent);
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
