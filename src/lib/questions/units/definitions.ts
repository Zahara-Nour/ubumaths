/**
 * Unit System - Definitions
 * ==========================
 *
 * This file defines SI prefixes and base units for the physical unit system.
 *
 * MIGRATION NOTE: Core definitions (SI_PREFIXES, BASE_UNITS, SPECIAL_UNITS,
 * UNIT_ALIASES, resolveUnit) are now imported from mathAST/units which is
 * the source of truth. This module re-exports them and adds question-specific
 * helpers (UNIT_WHITELIST, BASE_SYMBOL_BY_DIMENSION, etc.)
 *
 * @module questions/units/definitions
 */

import type { Dimension, BaseUnitDef } from './types';

// ============================================================================
// RE-EXPORTS FROM MATHAST (source of truth)
// ============================================================================

// Re-export core definitions from mathAST/units
// Note: mathAST uses ReadonlyMap, we re-export as-is
import {
	SI_PREFIXES as MATHAST_SI_PREFIXES,
	BASE_UNITS as MATHAST_BASE_UNITS,
	SPECIAL_UNITS as MATHAST_SPECIAL_UNITS,
	UNIT_ALIASES as MATHAST_UNIT_ALIASES,
	resolveUnit
} from '$lib/mathAST/units/definitions';

export { resolveUnit };

// ============================================================================
// COMPATIBILITY LAYER: Convert ReadonlyMap to Record for backward compatibility
// ============================================================================

/**
 * SI Prefixes with their multipliers
 *
 * From giga (10^9) to pico (10^-12)
 *
 * @example Kilometer
 * 'k' prefix + 'm' base = 'km' with coefficient 1e3
 *
 * @example Microgram
 * 'μ' prefix + 'g' base = 'μg' with coefficient 1e-6
 */
export const SI_PREFIXES: Record<string, number> = Object.fromEntries(MATHAST_SI_PREFIXES);

/**
 * Base units that can be combined with SI_PREFIXES
 *
 * These units represent the fundamental physical quantities.
 * Each can be prefixed (except where it would create ambiguity).
 *
 * Note: 'g' is the base for mass (not 'kg'), following SI convention
 * where prefixes apply to 'gram', making 'kg' = 1000g.
 */
export const BASE_UNIT_DEFS: Record<string, { dimension: Dimension; name: string }> =
	Object.fromEntries(MATHAST_BASE_UNITS);

/**
 * Special units that don't use standard SI prefixes
 *
 * These include:
 * - Time units in hours/minutes/days (base: s for SI consistency)
 * - Currencies (€, $)
 * - Angles (°, rad)
 * - Special mass units (tonne, quintal)
 */
export const SPECIAL_UNITS: Record<string, BaseUnitDef> = Object.fromEntries(MATHAST_SPECIAL_UNITS);

/**
 * Unit aliases for parsing flexibility
 *
 * Maps alternative spellings and common variants to canonical symbols.
 */
export const UNIT_ALIASES: Record<string, string> = Object.fromEntries(MATHAST_UNIT_ALIASES);

// ============================================================================
// SPECIAL CASES (units that should NOT be parsed as prefix + base)
// ============================================================================

/**
 * Special cases to handle prefix ambiguity
 *
 * Some unit combinations look like prefix + base but are actually
 * distinct units:
 * - 'ms' = millisecond (NOT meter × second)
 * - 'min' = minute (NOT milli + in)
 * - 'cd' = candela (NOT centi + d)
 * - 'mol' = mole (NOT milli + ol)
 * - 'mois' = month (NOT milli + ois)
 */
const SPECIAL_CASE_UNITS = new Set(['ms', 'min', 'cd', 'mol', 'mois']);

// ============================================================================
// WHITELIST GENERATION
// ============================================================================

/**
 * Generate the complete whitelist of valid unit symbols
 *
 * This is used by the tokenizer to distinguish unit symbols from
 * variable multiplication. For example, 'km' is a unit (kilometer),
 * not 'k * m' (variable k times m).
 *
 * The whitelist includes:
 * 1. All special units (h, min, €, °, t, q, ms, etc.)
 * 2. All SI prefix + base combinations (km, μg, cL, etc.)
 * 3. All aliases (euro, litre, mins, etc.)
 *
 * @returns Set of all valid unit symbols
 *
 * @example
 * ```typescript
 * const whitelist = generateUnitWhitelist();
 * whitelist.has('km')    // true
 * whitelist.has('μg')    // true
 * whitelist.has('euro')  // true
 * whitelist.has('xyz')   // false
 * ```
 */
export function generateUnitWhitelist(): Set<string> {
	const whitelist = new Set<string>();

	// 1. Add all special units
	for (const symbol of Object.keys(SPECIAL_UNITS)) {
		whitelist.add(symbol);
	}

	// 2. Add all aliases
	for (const alias of Object.keys(UNIT_ALIASES)) {
		whitelist.add(alias);
	}

	// 3. Generate all SI prefix + base combinations
	const prefixes = Object.keys(SI_PREFIXES);
	const baseUnits = Object.keys(BASE_UNIT_DEFS);

	for (const prefix of prefixes) {
		for (const base of baseUnits) {
			const symbol = prefix + base;

			// Skip if this creates a special case conflict
			// (e.g., don't add 'ms' here because it's already in SPECIAL_UNITS)
			if (!SPECIAL_CASE_UNITS.has(symbol) || symbol === base) {
				whitelist.add(symbol);
			}
		}
	}

	// 4. Add base units themselves (no prefix)
	for (const base of baseUnits) {
		whitelist.add(base);
	}

	return whitelist;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a symbol is a valid unit
 *
 * This is a convenience wrapper around resolveUnit().
 *
 * @param symbol - Unit symbol to check
 * @returns True if the symbol represents a valid unit
 *
 * @example
 * ```typescript
 * isValidUnit('km')   // true
 * isValidUnit('xyz')  // false
 * isValidUnit('€')    // true
 * ```
 */
export function isValidUnit(symbol: string): boolean {
	return resolveUnit(symbol) !== null;
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Pre-generated whitelist for performance
 *
 * This is generated once at module load time and can be used
 * by the tokenizer for fast lookup.
 */
export const UNIT_WHITELIST = generateUnitWhitelist();

// ============================================================================
// COMPATIBILITY EXPORTS (for existing code)
// ============================================================================

/**
 * Map of dimensions to their base unit symbols
 */
export const BASE_SYMBOL_BY_DIMENSION: Map<Dimension, string> = new Map([
	['length', 'm'],
	['mass', 'g'],
	['time', 's'],
	['volume', 'L'],
	['currency', '€'],
	['temperature', 'K'],
	['electric_current', 'A'],
	['amount', 'mol'],
	['luminous_intensity', 'cd'],
	['angle', 'rad']
]);

/**
 * Get the base unit symbol for a dimension
 *
 * @param dimension - Physical dimension
 * @returns Base unit symbol or null if dimension unknown
 *
 * @example
 * getBaseSymbol('length') // 'm'
 * getBaseSymbol('mass') // 'g'
 */
export function getBaseSymbol(dimension: Dimension): string | null {
	return BASE_SYMBOL_BY_DIMENSION.get(dimension) ?? null;
}
