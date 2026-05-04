/**
 * Unit AST - Unit Conversions
 *
 * Functions for checking unit compatibility and converting between units.
 * Supports dimensional analysis and conversion factor calculation.
 *
 * @module mathAST/units/conversion
 */

import type { Unit, Dimension } from './types';
import { DERIVED_UNITS, resolveUnit } from './definitions';
import { unitsEquivalent } from './operations';

// =============================================================================
// Floating Point Tolerance
// =============================================================================

/**
 * Floating point epsilon for coefficient comparisons
 *
 * Used to handle floating-point precision issues when comparing coefficients.
 * Two coefficients are considered equal if their difference is less than this value.
 */
const EPSILON = 1e-9;

// =============================================================================
// Unit Compatibility and Conversion
// =============================================================================

/**
 * Check if two units are compatible for conversion
 *
 * Units are compatible if they have the same dimensional signature
 * (same base units with same exponents, coefficients may differ).
 * This means they measure the same physical quantity.
 *
 * @param a - First unit
 * @param b - Second unit
 * @returns True if units are compatible (can be converted), false otherwise
 *
 * @example
 * unitsAreCompatible(unit('km'), unit('m'))     // true - both are length
 * unitsAreCompatible(unit('km/h'), unit('m/s')) // true - both are velocity
 * unitsAreCompatible(unit('m'), unit('s'))      // false - different dimensions
 * unitsAreCompatible(unit('m²'), unit('m'))     // false - different powers
 */
export function unitsAreCompatible(a: Unit, b: Unit): boolean {
	return unitsEquivalent(a, b);
}

/**
 * Get the conversion factor from one unit to another
 *
 * Returns the multiplier needed to convert a value from the 'from' unit
 * to the 'to' unit.
 *
 * Formula: factor = from.coefficient / to.coefficient
 * Usage: value_in_to = value_in_from * factor
 *
 * Returns null if units are incompatible.
 *
 * @param from - Source unit
 * @param to - Target unit
 * @returns Conversion factor (to multiply a value in 'from' unit to get value in 'to' unit),
 *          or null if units are incompatible
 *
 * @example
 * getConversionFactor(unit('km'), unit('m'))     // 1000 (1 km = 1000 m)
 * getConversionFactor(unit('m'), unit('km'))     // 0.001 (1 m = 0.001 km)
 * getConversionFactor(unit('h'), unit('s'))      // 3600 (1 h = 3600 s)
 * getConversionFactor(unit('m'), unit('s'))      // null (incompatible)
 * getConversionFactor(unit('km/h'), unit('m/s')) // 1000/3600 ≈ 0.2778
 */
export function getConversionFactor(from: Unit, to: Unit): number | null {
	// Affine units (°C, °F) cannot be converted via a multiplicative factor.
	// Use convertAffine() instead.
	if (isAffine(from) || isAffine(to)) {
		return null;
	}

	// Check if units are compatible
	if (!unitsAreCompatible(from, to)) {
		return null;
	}

	// Units with zero coefficient would cause division by zero
	// This shouldn't happen in practice with valid units
	if (Math.abs(to.coefficient) < EPSILON) {
		return null;
	}

	// Calculate conversion factor
	return from.coefficient / to.coefficient;
}

// =============================================================================
// Affine Conversions (Temperature)
// =============================================================================

/**
 * Check whether a unit uses an affine (offset-based) conversion.
 *
 * Affine units cannot be combined multiplicatively with other units (no
 * `°C × m`, no `°C^2`). They are detected by the presence of a non-zero
 * `offset` field on a single-component unit.
 *
 * @param u - Unit to check
 * @returns True if the unit is affine, false otherwise
 *
 * @example
 * isAffine(unit('°C')) // true
 * isAffine(unit('°F')) // true
 * isAffine(unit('K'))  // false
 * isAffine(unit('m'))  // false
 */
export function isAffine(u: Unit): boolean {
	return u.offset !== undefined && u.offset !== 0 && u.components.size === 1;
}

/**
 * Convert a numeric value from one unit to another, supporting affine units.
 *
 * Unified conversion entry point that handles both:
 * - Multiplicative units (m → km, h → s, etc.)
 * - Affine units (°C → K, °F → °C, etc.)
 *
 * Formula for affine conversion:
 *   value_in_base = (value + from.offset) * from.coefficient
 *   value_in_to   = value_in_base / to.coefficient - to.offset
 *
 * The pure-multiplicative case is the same formula with `from.offset = 0` and
 * `to.offset = 0`, so K → °C and m → km go through the same code path:
 * non-affine units have `offset === undefined` which is treated as 0.
 *
 * @param value - Numeric value in the source unit
 * @param from - Source unit
 * @param to - Target unit
 * @returns Converted value, or null if units are incompatible
 *
 * @example
 * convertAffine(0, unit('°C'), unit('K'))   // 273.15
 * convertAffine(100, unit('°C'), unit('°F')) // 212
 * convertAffine(-40, unit('°C'), unit('°F')) // -40
 * convertAffine(1, unit('km'), unit('m'))    // 1000 (delegates to multiplicative)
 * convertAffine(1, unit('m'), unit('K'))     // null (incompatible)
 */
export function convertAffine(value: number, from: Unit, to: Unit): number | null {
	// Check dimensional compatibility
	if (!unitsAreCompatible(from, to)) {
		return null;
	}

	// Avoid division by zero
	if (Math.abs(to.coefficient) < EPSILON) {
		return null;
	}

	const fromOffset = from.offset ?? 0;
	const toOffset = to.offset ?? 0;

	// Affine formula: handles both pure multiplicative (offset = 0) and affine cases.
	// (value + fromOffset) * fromCoeff / toCoeff - toOffset
	return ((value + fromOffset) * from.coefficient) / to.coefficient - toOffset;
}

// =============================================================================
// Dimensional Analysis
// =============================================================================

/**
 * Get the dimensional signature of a unit
 *
 * Returns a record mapping each Dimension to its total exponent in the unit.
 * Dimensions with zero exponent are omitted from the result.
 *
 * For units with unknown base symbols, those symbols are skipped
 * (since we can't determine their dimension).
 *
 * @param u - Unit to analyze
 * @returns Record mapping dimensions to their exponents
 *
 * @example
 * getDimensionalSignature(unit('m'))        // { length: 1 }
 * getDimensionalSignature(unit('m/s'))      // { length: 1, time: -1 }
 * getDimensionalSignature(unit('kg.m/s²'))  // { mass: 1, length: 1, time: -2 }
 * getDimensionalSignature(dimensionless())  // {}
 */
export function getDimensionalSignature(u: Unit): Partial<Record<Dimension, number>> {
	const signature: Partial<Record<Dimension, number>> = {};

	// Iterate through each base symbol and its exponent
	for (const [baseSymbol, exponent] of u.components) {
		// Resolve the base symbol to get its dimension
		const unitDef = resolveUnit(baseSymbol);

		if (unitDef) {
			const dimension = unitDef.dimension;

			// Sum exponents by dimension
			const currentExponent = signature[dimension] ?? 0;
			signature[dimension] = currentExponent + exponent;

			// Remove zero exponents
			if (signature[dimension] === 0) {
				delete signature[dimension];
			}
		}
		// If unitDef is null, the base symbol is unknown
		// We skip it and don't add it to the signature
	}

	return signature;
}

// =============================================================================
// Unit Normalization
// =============================================================================

/**
 * Normalize a unit to its base SI representation
 *
 * Converts a unit to base units (e.g., km -> m, h -> s) and combines
 * the conversion factors into a single coefficient.
 *
 * For each component in the unit, resolves it to get its base symbol
 * and calculates the total conversion factor raised to the exponent power.
 *
 * @param u - Unit to normalize
 * @returns A new Unit with base symbols and combined conversion coefficient,
 *          or the original unit if all symbols are already base units
 *
 * @example
 * normalizeToBase(unit('km'))
 * // { components: Map([['m', 1]]), coefficient: 1000 }
 *
 * normalizeToBase(unit('km/h'))
 * // { components: Map([['m', 1], ['s', -1]]), coefficient: 1000/3600 ≈ 0.2778 }
 *
 * normalizeToBase(unit('m'))
 * // { components: Map([['m', 1]]), coefficient: 1 } (unchanged)
 */
export function normalizeToBase(u: Unit): Unit {
	let coefficient = 1;
	const normalizedComponents = new Map<string, number>();

	// Process each component in the unit
	for (const [symbol, exponent] of u.components) {
		// Resolve the symbol to get its base symbol and prefix factor
		const resolved = resolveUnit(symbol);

		if (resolved) {
			const baseSymbol = resolved.baseSymbol;
			const prefixFactor = resolved.coefficient;

			// Add the base symbol to normalized components
			const currentExponent = normalizedComponents.get(baseSymbol) ?? 0;
			const newExponent = currentExponent + exponent;

			if (newExponent === 0) {
				normalizedComponents.delete(baseSymbol);
			} else {
				normalizedComponents.set(baseSymbol, newExponent);
			}

			// Combine conversion factors: raise prefix factor to the exponent power
			coefficient *= Math.pow(prefixFactor, exponent);
		}
		// If resolved is null (unknown symbol), keep the symbol as-is
		else {
			const currentExponent = normalizedComponents.get(symbol) ?? 0;
			const newExponent = currentExponent + exponent;

			if (newExponent === 0) {
				normalizedComponents.delete(symbol);
			} else {
				normalizedComponents.set(symbol, newExponent);
			}
		}
	}

	// Combine with the original coefficient
	coefficient *= u.coefficient;

	return {
		components: normalizedComponents,
		coefficient,
		...(u.original && { original: u.original })
	};
}

// =============================================================================
// Named SI Derived Unit Recognition
// =============================================================================

/**
 * Check whether two component maps have the same keys with the same exponents.
 * Order-independent.
 *
 * **Note**: equivalent to the body of `unitsEquivalent()` in `operations.ts`.
 * Duplicated here to avoid the circular import (`conversion.ts → operations.ts`
 * already exists). Keep both in sync — same algorithm, same EPSILON.
 */
function componentsMatch(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): boolean {
	if (a.size !== b.size) return false;
	for (const [key, value] of a) {
		const bValue = b.get(key);
		if (bValue === undefined) return false;
		if (Math.abs(value - bValue) >= EPSILON) return false;
	}
	return true;
}

/**
 * Recognize a unit as a named SI derived unit (Newton, Joule, Watt, ...).
 *
 * Given a Unit whose components map matches the SI base signature of one of
 * the derived units in {@link DERIVED_UNITS}, returns the **canonical**
 * derived Unit (catalog components + catalog coefficient + `original` set to
 * the derived symbol). Otherwise returns null.
 *
 * The match is on **components only** — the input's coefficient is ignored
 * and the catalog coefficient is used in the output. The caller (typically
 * `maybeRecognizeDerived` in the eval pipeline) is responsible for rescaling
 * the associated numeric value: `newValue = oldValue × oldUnit.coefficient /
 * canonical.coefficient`.
 *
 * @example
 * recognizeDerivedUnit(parse('s^-1'))
 * // → { components: Map([['s', -1]]), coefficient: 1, original: 'Hz' }
 *
 * // Note: project base for mass is 'g', not 'kg'. The signature for Newton
 * // is `Map([['g',1],['m',1],['s',-2]])`.
 * recognizeDerivedUnit(fromComponents(new Map([['g',1],['m',1],['s',-2]]), 1))
 * // → { components: Map([['g',1],['m',1],['s',-2]]), coefficient: 1000, original: 'N' }
 *
 * recognizeDerivedUnit(unit('m'))      // null (not a named derived)
 * recognizeDerivedUnit(unit('kg'))     // null (base unit, not derived)
 *
 * @param u - Unit to recognize
 * @returns Canonical derived Unit, or null
 */
export function recognizeDerivedUnit(u: Unit): Unit | null {
	// Affine units (°C, °F) are never named derivatives; they have offsets.
	if (isAffine(u)) return null;

	// Empty (dimensionless) is not a derived unit.
	if (u.components.size === 0) return null;

	for (const [symbol, derived] of DERIVED_UNITS) {
		if (!derived.components) continue;
		if (!componentsMatch(u.components, derived.components)) continue;

		// Components match — return the **canonical** derived unit (the catalog
		// entry's components and coefficient). The caller rescales the value:
		//   newValue = oldValue × oldUnit.coefficient / canonical.coefficient
		// e.g., 15000 g·m·s⁻² (coef 1) → 15 N (coef 1000).
		return {
			components: new Map(derived.components),
			coefficient: derived.coefficient,
			original: symbol
		};
	}

	return null;
}

// =============================================================================
// Conversion Namespace
// =============================================================================

/**
 * Namespace containing all Unit conversion functions.
 */
export const UnitConversion = {
	unitsAreCompatible,
	getConversionFactor,
	getDimensionalSignature,
	normalizeToBase,
	isAffine,
	convertAffine,
	recognizeDerivedUnit
} as const;
