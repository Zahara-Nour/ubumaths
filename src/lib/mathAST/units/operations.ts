/**
 * Unit AST - Unit Operations
 *
 * Mathematical operations on units: multiplication, division, powers, and comparisons.
 * All operations preserve immutability and normalize components automatically.
 *
 * @module mathAST/units/operations
 */

import type { Unit } from './types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Floating point epsilon for coefficient and exponent comparisons
 * Used to handle floating-point arithmetic imprecision in unit operations
 */
const EPSILON = 1e-9;

// =============================================================================
// Affine Composition Guard
// =============================================================================

/**
 * Error thrown when an affine unit (°C, °F) is composed with another unit.
 *
 * Affine units have an offset (e.g., 273.15 for °C → K) which makes
 * multiplication/division mathematically meaningless: `5°C × 2` could mean
 * `10°C` or `546.3 K`, depending on whether °C is treated as absolute
 * temperature or as a delta. To avoid ambiguity, all such compositions are
 * forbidden — convert to Kelvin first if a delta interpretation is intended.
 */
export class AffineCompositionError extends Error {
	readonly code = 'AFFINE_COMPOSITION_FORBIDDEN' as const;
	constructor(operation: string) {
		super(
			`AFFINE_COMPOSITION_FORBIDDEN: cannot ${operation} with an affine unit (°C, °F). Convert to a non-affine temperature unit (K) first.`
		);
		this.name = 'AffineCompositionError';
	}
}

/**
 * Local helper to detect affine units inside operations.ts.
 * Duplicates {@link conversion.isAffine} to avoid a circular import
 * (conversion.ts already imports from operations.ts).
 *
 * **Keep in sync with `isAffine()` in `conversion.ts`** — both encode the same
 * invariant (single-component unit with a non-zero offset).
 */
function hasAffineOffset(u: Unit): boolean {
	return u.offset !== undefined && u.offset !== 0 && u.components.size === 1;
}

// =============================================================================
// Core Arithmetic Operations
// =============================================================================

/**
 * Multiply two units
 *
 * Combines components by adding exponents for matching base units, and multiplies
 * coefficients. Components with resulting exponent 0 are removed (simplification).
 *
 * The original field is NOT preserved in the result (it's a calculated unit).
 *
 * @param a - First unit
 * @param b - Second unit
 * @returns Product of the two units
 *
 * @example
 * multiply(unit('m'), unit('m'))      // m²
 * multiply(unit('m'), unit('s'))      // m.s
 * multiply(unit('km'), unit('s', -1)) // m.s^-1 with coefficient 1000
 * multiply(dimensionless(), unit('m')) // m
 */
export function multiply(a: Unit, b: Unit): Unit {
	if (hasAffineOffset(a) || hasAffineOffset(b)) {
		throw new AffineCompositionError('multiply');
	}

	// Start with a copy of a's components
	const resultComponents = new Map(a.components);

	// Add b's components
	for (const [baseSymbol, exponent] of b.components) {
		const currentExponent = resultComponents.get(baseSymbol) ?? 0;
		const newExponent = currentExponent + exponent;

		if (Math.abs(newExponent) < EPSILON) {
			// Cancel out: remove component (using epsilon for floating-point safety)
			resultComponents.delete(baseSymbol);
		} else {
			// Update exponent
			resultComponents.set(baseSymbol, newExponent);
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
 * Divides unit a by unit b, equivalent to a × b^-1.
 *
 * @param a - Numerator unit
 * @param b - Denominator unit
 * @returns Quotient of the two units
 *
 * @example
 * divide(unit('m'), unit('s'))  // m.s^-1
 * divide(unit('m'), unit('m'))  // dimensionless (empty components)
 * divide(unit('km'), unit('h')) // m.s^-1 with coefficient 1000/3600
 */
export function divide(a: Unit, b: Unit): Unit {
	return multiply(a, invert(b));
}

/**
 * Raise unit to a power
 *
 * Multiplies all exponents by the given power and raises coefficient to that power.
 * Components with resulting exponent 0 are removed.
 *
 * @param u - Unit to raise to power
 * @param exponent - Power to raise to (can be negative, fractional)
 * @returns Unit raised to the specified power
 *
 * @example
 * power(unit('m'), 2)    // m²
 * power(unit('m'), 2)^3) // m⁶
 * power(unit('km'), 2)   // m² with coefficient 1e6
 * power(unit('m'), 0)    // dimensionless
 */
export function power(u: Unit, exponent: number): Unit {
	// Affine units cannot be raised to any power other than 1: °C^2 has no
	// physical meaning, and °C^-1 (used by divide) would silently strip the
	// offset and let composition slip through.
	if (hasAffineOffset(u) && Math.abs(exponent - 1) >= EPSILON) {
		throw new AffineCompositionError('raise to power');
	}

	// Create new components with multiplied exponents
	const resultComponents = new Map<string, number>();

	for (const [baseSymbol, baseExponent] of u.components) {
		const newExponent = baseExponent * exponent;

		// Only keep non-zero exponents (using epsilon for floating-point safety)
		if (Math.abs(newExponent) >= EPSILON) {
			resultComponents.set(baseSymbol, newExponent);
		}
	}

	return {
		components: resultComponents,
		coefficient: Math.pow(u.coefficient, exponent)
	};
}

/**
 * Invert a unit
 *
 * Inverts a unit by raising it to the power of -1.
 * Equivalent to power(u, -1).
 *
 * @param u - Unit to invert
 * @returns Inverted unit (u^-1)
 *
 * @example
 * invert(unit('s'))       // s^-1
 * invert(unit('s', -1))   // s
 * invert(unit('m/s'))     // s/m
 */
export function invert(u: Unit): Unit {
	return power(u, -1);
}

/**
 * Simplify a unit by removing components with exponent 0
 *
 * Typically called automatically by other operations, but can be used explicitly
 * if needed. Returns the same reference if no simplification is needed.
 *
 * @param u - Unit to simplify
 * @returns Simplified unit (or same reference if already simplified)
 *
 * @example
 * simplify({ components: Map([['m', 1], ['s', 0]]), coefficient: 1 })
 * // { components: Map([['m', 1]]), coefficient: 1 }
 */
export function simplify(u: Unit): Unit {
	// Check if simplification is needed (using epsilon for floating-point safety)
	let needsSimplification = false;
	for (const [, exponent] of u.components) {
		if (Math.abs(exponent) < EPSILON) {
			needsSimplification = true;
			break;
		}
	}

	if (!needsSimplification) {
		return u; // Return same reference
	}

	// Create new components without zero exponents (using epsilon for floating-point safety)
	const resultComponents = new Map<string, number>();
	for (const [baseSymbol, exponent] of u.components) {
		if (Math.abs(exponent) >= EPSILON) {
			resultComponents.set(baseSymbol, exponent);
		}
	}

	return {
		components: resultComponents,
		coefficient: u.coefficient,
		...(u.original && { original: u.original })
	};
}

// =============================================================================
// Comparison Operations
// =============================================================================

/**
 * Check if two units are equal
 *
 * Units are equal if they have:
 * - Same components (same base symbols and exponents)
 * - Same coefficient (within epsilon tolerance for floating-point precision)
 *
 * Order of components in the map doesn't matter.
 *
 * @param a - First unit
 * @param b - Second unit
 * @returns True if units are equal, false otherwise
 *
 * @example
 * unitsEqual(unit('m'), unit('m'))     // true
 * unitsEqual(unit('km'), unit('m'))    // false (different coefficients)
 * unitsEqual(unit('m'), unit('s'))     // false (different dimensions)
 * unitsEqual(unit('m.s'), unit('s.m')) // true (order doesn't matter)
 */
export function unitsEqual(a: Unit, b: Unit): boolean {
	// Check coefficient equality (with epsilon tolerance)
	if (Math.abs(a.coefficient - b.coefficient) > EPSILON) {
		return false;
	}

	// Check components map size
	if (a.components.size !== b.components.size) {
		return false;
	}

	// Check all components match
	for (const [baseSymbol, exponent] of a.components) {
		const bExponent = b.components.get(baseSymbol);
		if (bExponent === undefined || Math.abs(exponent - bExponent) > EPSILON) {
			return false;
		}
	}

	return true;
}

/**
 * Check if two units are dimensionally equivalent
 *
 * Units are dimensionally equivalent if they have the same components
 * (same base symbols and exponents), regardless of their coefficients.
 *
 * This checks if units measure the same physical quantity (both are length,
 * both are velocity, etc.) but may have different scales (km vs m).
 *
 * @param a - First unit
 * @param b - Second unit
 * @returns True if units are dimensionally equivalent, false otherwise
 *
 * @example
 * unitsEquivalent(unit('km'), unit('m'))     // true (both length)
 * unitsEquivalent(unit('km'), unit('cm'))    // true (both length)
 * unitsEquivalent(unit('m'), unit('s'))      // false (different dimensions)
 * unitsEquivalent(unit('m/s'), unit('km/h')) // true (both velocity)
 */
export function unitsEquivalent(a: Unit, b: Unit): boolean {
	// Check components map size
	if (a.components.size !== b.components.size) {
		return false;
	}

	// Check all components match (ignore coefficients)
	for (const [baseSymbol, exponent] of a.components) {
		const bExponent = b.components.get(baseSymbol);
		if (bExponent === undefined || Math.abs(exponent - bExponent) > EPSILON) {
			return false;
		}
	}

	return true;
}

// =============================================================================
// UnitOps Namespace
// =============================================================================

/**
 * Namespace containing all Unit operation functions
 *
 * Usage:
 * - UnitOps.multiply(a, b) to multiply units
 * - UnitOps.divide(a, b) to divide units
 * - UnitOps.power(u, n) to raise to power
 * - UnitOps.invert(u) to invert
 * - UnitOps.simplify(u) to simplify
 * - UnitOps.unitsEqual(a, b) to check equality
 * - UnitOps.unitsEquivalent(a, b) to check dimensional equivalence
 */
export const UnitOps = {
	multiply,
	divide,
	power,
	invert,
	simplify,
	unitsEqual,
	unitsEquivalent
} as const;
