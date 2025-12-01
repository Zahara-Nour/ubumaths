/**
 * Unit AST - Factory Functions
 *
 * Factory functions for creating immutable Unit nodes in the MathAST.
 * Provides ergonomic APIs for constructing units with proper type safety
 * and automatic coefficient calculation for SI prefixes.
 *
 * All units are immutable and follow the same patterns as other MathAST factories.
 *
 * @module mathAST/units/factory
 */

import type { Unit } from './types';
import { resolveUnit } from './definitions';

// =============================================================================
// Core Factory Functions
// =============================================================================

/**
 * Create a Unit from a single unit symbol (with optional SI prefix)
 *
 * Uses resolveUnit() to normalize the symbol and extract the base unit and
 * coefficient. The resulting Unit stores the baseSymbol in components, not
 * the input symbol.
 *
 * @param symbol - The unit symbol to resolve (e.g., 'm', 'km', 'mg', 'h')
 * @returns Unit object with normalized components, or null if unrecognized
 *
 * @example
 * unit('m')   // { components: Map([['m', 1]]), coefficient: 1 }
 * unit('km')  // { components: Map([['m', 1]]), coefficient: 1000 }
 * unit('mg')  // { components: Map([['g', 1]]), coefficient: 0.001 }
 * unit('h')   // { components: Map([['s', 1]]), coefficient: 3600 }
 * unit('°')   // { components: Map([['rad', 1]]), coefficient: Math.PI/180 }
 * unit('xyz') // null (unrecognized)
 */
function unit(symbol: string): Unit | null {
	const resolved = resolveUnit(symbol);
	if (!resolved) {
		return null;
	}

	return {
		components: new Map([[resolved.baseSymbol, 1]]),
		coefficient: resolved.coefficient,
		original: symbol
	};
}

/**
 * Create a Unit with a specific power/exponent
 *
 * Creates a unit with an arbitrary exponent. The coefficient is raised to the
 * power of the exponent: final_coefficient = (prefix_factor)^exponent
 *
 * @param symbol - The unit symbol to resolve
 * @param exponent - The power to raise the unit to (can be negative, fractional)
 * @returns Unit with specified exponent, or null if unrecognized symbol
 *
 * @example
 * unitWithPower('m', 2)   // { components: Map([['m', 2]]), coefficient: 1 }
 * unitWithPower('s', -1)  // { components: Map([['s', -1]]), coefficient: 1 }
 * unitWithPower('km', 2)  // { components: Map([['m', 2]]), coefficient: 1e6 }
 * unitWithPower('mg', -1) // { components: Map([['g', -1]]), coefficient: 1000 }
 * unitWithPower('h', 0)   // Degenerate: dimensionless unit
 */
function unitWithPower(symbol: string, exponent: number): Unit | null {
	const resolved = resolveUnit(symbol);
	if (!resolved) {
		return null;
	}

	// Calculate coefficient as (prefix_factor)^exponent
	const coefficient = Math.pow(resolved.coefficient, exponent);

	return {
		components: new Map([[resolved.baseSymbol, exponent]]),
		coefficient,
		original: symbol
	};
}

/**
 * Create a dimensionless unit
 *
 * A dimensionless unit has an empty components map and coefficient of 1.
 * Useful as a neutral element or identity for unit operations.
 *
 * @returns A dimensionless unit
 *
 * @example
 * dimensionless()
 * // { components: Map([]), coefficient: 1 }
 */
function dimensionless(): Unit {
	return {
		components: new Map(),
		coefficient: 1
	};
}

/**
 * Create a Unit directly from components (for internal/advanced use)
 *
 * This is the most direct way to create a Unit, useful for building composite
 * units or when components are already known. Primarily for internal use; most
 * user code should use unit() or unitWithPower().
 *
 * @param components - Map of baseSymbol -> exponent
 * @param coefficient - Conversion coefficient (default 1)
 * @param original - Optional original string for display
 * @returns A Unit with the specified properties
 *
 * @example
 * // Create m/s manually
 * fromComponents(new Map([['m', 1], ['s', -1]]), 1, 'm/s')
 *
 * // Create km² manually
 * fromComponents(new Map([['m', 2]]), 1e6, 'km²')
 */
function fromComponents(
	components: ReadonlyMap<string, number>,
	coefficient: number = 1,
	original?: string
): Unit {
	return {
		components,
		coefficient,
		...(original && { original })
	};
}

// =============================================================================
// UnitAST Namespace
// =============================================================================

/**
 * Namespace containing all Unit factory functions
 *
 * Usage:
 * - UnitAST.unit('km') to create a kilometer
 * - UnitAST.unitWithPower('m', 2) to create square meters
 * - UnitAST.dimensionless() for dimensionless units
 * - UnitAST.fromComponents(...) for direct creation
 */
export const UnitAST = {
	unit,
	unitWithPower,
	dimensionless,
	fromComponents
} as const;

// =============================================================================
// Direct Function Exports
// =============================================================================

export { unit, unitWithPower, dimensionless, fromComponents };
