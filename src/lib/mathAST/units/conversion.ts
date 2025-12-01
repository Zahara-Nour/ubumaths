/**
 * Unit AST - Unit Conversions
 *
 * Functions for checking unit compatibility and converting between units.
 * Supports dimensional analysis and conversion factor calculation.
 *
 * @module mathAST/units/conversion
 */

import type { Unit, Dimension } from './types';
import { resolveUnit } from './definitions';
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
// Conversion Namespace
// =============================================================================

/**
 * Namespace containing all Unit conversion functions
 *
 * Usage:
 * - UnitConversion.unitsAreCompatible(a, b) to check compatibility
 * - UnitConversion.getConversionFactor(from, to) to get conversion factor
 * - UnitConversion.getDimensionalSignature(u) to get dimension info
 * - UnitConversion.normalizeToBase(u) to normalize to SI base units
 */
export const UnitConversion = {
	unitsAreCompatible,
	getConversionFactor,
	getDimensionalSignature,
	normalizeToBase
} as const;
