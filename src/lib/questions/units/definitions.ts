/**
 * Unit System - Definitions
 * ==========================
 *
 * This file defines SI prefixes and base units for the physical unit system.
 * The system supports:
 * - Generic SI prefixes (pico to giga)
 * - Base units for common physical quantities
 * - Special units (time units like h/min, currencies, angles)
 * - Dynamic resolution of any prefixed unit
 *
 * Units are designed to work with TinyCAS-style conversion where each unit
 * is defined as [coefficient, baseSymbol].
 *
 * @module questions/units/definitions
 */

import type { Dimension, BaseUnitDef } from './types';

// ============================================================================
// SI PREFIXES
// ============================================================================

/**
 * SI Prefixes with their multipliers
 *
 * From giga (10⁹) to pico (10⁻¹²)
 *
 * @example Kilometer
 * 'k' prefix + 'm' base = 'km' with coefficient 1e3
 *
 * @example Microgram
 * 'μ' prefix + 'g' base = 'μg' with coefficient 1e-6
 */
export const SI_PREFIXES: Record<string, number> = {
	G: 1e9, // giga
	M: 1e6, // mega
	k: 1e3, // kilo
	h: 1e2, // hecto
	da: 1e1, // deca
	'': 1, // base (no prefix)
	d: 1e-1, // deci
	c: 1e-2, // centi
	m: 1e-3, // milli
	μ: 1e-6, // micro
	n: 1e-9, // nano
	p: 1e-12 // pico
};

// ============================================================================
// BASE UNITS (without prefixes)
// ============================================================================

/**
 * Base units that can be combined with SI_PREFIXES
 *
 * These units represent the fundamental physical quantities.
 * Each can be prefixed (except where it would create ambiguity).
 *
 * Note: 'g' is the base for mass (not 'kg'), following SI convention
 * where prefixes apply to 'gram', making 'kg' = 1000g.
 */
export const BASE_UNIT_DEFS: Record<string, { dimension: Dimension; name: string }> = {
	m: { dimension: 'length', name: 'metre' },
	g: { dimension: 'mass', name: 'gramme' },
	s: { dimension: 'time', name: 'seconde' },
	L: { dimension: 'volume', name: 'litre' },
	A: { dimension: 'electric_current', name: 'ampère' },
	K: { dimension: 'temperature', name: 'kelvin' },
	mol: { dimension: 'amount', name: 'mole' },
	cd: { dimension: 'luminous_intensity', name: 'candela' }
};

// ============================================================================
// SPECIAL UNITS (no standard SI prefixes)
// ============================================================================

/**
 * Special units that don't use standard SI prefixes
 *
 * These include:
 * - Time units in hours/minutes/days (base: s for SI consistency)
 * - Currencies (€, $)
 * - Angles (°, rad)
 * - Special mass units (tonne, quintal)
 *
 * For time units, we use 's' (second) as the base unit.
 */
export const SPECIAL_UNITS: Record<string, BaseUnitDef> = {
	// ---- Time (special units that don't follow SI prefix pattern) ----

	/** Millisecond (already defined via SI prefix m + s, but kept for clarity) */
	ms: {
		symbol: 'ms',
		name: 'milliseconde',
		baseSymbol: 's',
		coefficient: 0.001,
		dimension: 'time'
	},

	/** Minute (60 seconds) */
	min: {
		symbol: 'min',
		name: 'minute',
		baseSymbol: 's',
		coefficient: 60,
		dimension: 'time'
	},

	/** Hour (3,600 seconds) */
	h: {
		symbol: 'h',
		name: 'heure',
		baseSymbol: 's',
		coefficient: 3600,
		dimension: 'time'
	},

	/** Day (86,400 seconds) */
	j: {
		symbol: 'j',
		name: 'jour',
		baseSymbol: 's',
		coefficient: 86400,
		dimension: 'time'
	},

	/** Week (604,800 seconds) */
	semaine: {
		symbol: 'semaine',
		name: 'semaine',
		baseSymbol: 's',
		coefficient: 604800,
		dimension: 'time'
	},

	/** Month (30 days = 2,592,000 seconds) */
	mois: {
		symbol: 'mois',
		name: 'mois',
		baseSymbol: 's',
		coefficient: 2592000,
		dimension: 'time'
	},

	/** Year (365 days = 31,536,000 seconds) */
	an: {
		symbol: 'an',
		name: 'année',
		baseSymbol: 's',
		coefficient: 31536000,
		dimension: 'time'
	},

	// ---- Angle ----

	/** Radian (base unit for angle) */
	rad: {
		symbol: 'rad',
		name: 'radian',
		baseSymbol: 'rad',
		coefficient: 1,
		dimension: 'angle'
	},

	/** Degree (π/180 radians) */
	'°': {
		symbol: '°',
		name: 'degré',
		baseSymbol: 'rad',
		coefficient: Math.PI / 180,
		dimension: 'angle'
	},

	deg: {
		symbol: 'deg',
		name: 'degré',
		baseSymbol: 'rad',
		coefficient: Math.PI / 180,
		dimension: 'angle'
	},

	// ---- Special Mass Units ----

	/** Metric ton (1,000,000 grams) */
	t: {
		symbol: 't',
		name: 'tonne',
		baseSymbol: 'g',
		coefficient: 1000000,
		dimension: 'mass'
	},

	/** Quintal (100,000 grams) */
	q: {
		symbol: 'q',
		name: 'quintal',
		baseSymbol: 'g',
		coefficient: 100000,
		dimension: 'mass'
	},

	// ---- Currency ----

	/** Euro */
	'€': {
		symbol: '€',
		name: 'euro',
		baseSymbol: '€',
		coefficient: 1,
		dimension: 'currency'
	},

	/** Dollar */
	$: {
		symbol: '$',
		name: 'dollar',
		baseSymbol: '$',
		coefficient: 1,
		dimension: 'currency'
	}
};

// ============================================================================
// UNIT ALIASES
// ============================================================================

/**
 * Unit aliases for parsing flexibility
 *
 * Maps alternative spellings and common variants to canonical symbols.
 * This allows users to write "euros", "litre", or "mins" instead of
 * the canonical form.
 */
export const UNIT_ALIASES: Record<string, string> = {
	// Currency
	euro: '€',
	euros: '€',
	EUR: '€',

	// Volume
	litre: 'L',
	litres: 'L',
	l: 'L', // lowercase L (often confused)

	// Micro (ASCII alternative)
	u: 'μ', // 'u' is often used when μ is not available

	// Time (plural forms and alternatives)
	ans: 'an',
	jour: 'j',
	jours: 'j',
	semaines: 'semaine',
	mins: 'min',
	heures: 'h',

	// Angle
	degre: '°',
	degres: '°',
	degree: '°',
	degrees: '°'
};

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
// UNIT RESOLUTION
// ============================================================================

/**
 * Resolve a unit symbol to its base definition
 *
 * This function handles three types of units:
 * 1. Special units (h, min, €, °, etc.)
 * 2. Prefixed SI units (km, μg, etc.)
 * 3. Base units without prefix (m, g, s, etc.)
 *
 * Resolution order:
 * 1. Check special units first (including special cases like 'ms', 'min')
 * 2. Check for aliases
 * 3. Try to split into prefix + base unit
 * 4. Return null if not recognized
 *
 * @param symbol - Unit symbol (e.g., 'km', 'μg', 'h', '€')
 * @returns Base unit definition or null if not recognized
 *
 * @example Simple base unit
 * ```typescript
 * resolveUnit('m')
 * // Returns: { symbol: 'm', baseSymbol: 'm', coefficient: 1, dimension: 'length', name: 'metre' }
 * ```
 *
 * @example Prefixed unit
 * ```typescript
 * resolveUnit('km')
 * // Returns: { symbol: 'km', baseSymbol: 'm', coefficient: 1000, dimension: 'length', name: 'kilometre' }
 * ```
 *
 * @example Special time unit
 * ```typescript
 * resolveUnit('h')
 * // Returns: { symbol: 'h', baseSymbol: 's', coefficient: 3600, dimension: 'time', name: 'heure' }
 * ```
 *
 * @example Micro unit (with μ)
 * ```typescript
 * resolveUnit('μg')
 * // Returns: { symbol: 'μg', baseSymbol: 'g', coefficient: 1e-6, dimension: 'mass', name: 'microgramme' }
 * ```
 *
 * @example Special case (millisecond, not meter × second)
 * ```typescript
 * resolveUnit('ms')
 * // Returns: { symbol: 'ms', baseSymbol: 's', coefficient: 0.001, dimension: 'time', name: 'milliseconde' }
 * ```
 */
export function resolveUnit(symbol: string): BaseUnitDef | null {
	// 1. Check special units first (including 'ms', 'min', etc.)
	if (symbol in SPECIAL_UNITS) {
		return SPECIAL_UNITS[symbol];
	}

	// 2. Check aliases
	if (symbol in UNIT_ALIASES) {
		const canonicalSymbol = UNIT_ALIASES[symbol];
		return resolveUnit(canonicalSymbol); // Recursive call with canonical form
	}

	// 3. Try to parse as prefix + base
	// Skip if this is a special case that shouldn't be split
	if (!SPECIAL_CASE_UNITS.has(symbol)) {
		// Try all prefixes from longest to shortest (to handle 'da' before 'd')
		const prefixes = Object.keys(SI_PREFIXES).sort((a, b) => b.length - a.length);

		for (const prefix of prefixes) {
			if (prefix === '') continue; // Skip empty prefix for now

			if (symbol.startsWith(prefix)) {
				const baseSymbol = symbol.slice(prefix.length);

				// Check if the remainder is a valid base unit
				if (baseSymbol in BASE_UNIT_DEFS) {
					const baseDef = BASE_UNIT_DEFS[baseSymbol];
					const prefixValue = SI_PREFIXES[prefix];

					// Generate name: prefix name + base name
					const prefixNames: Record<string, string> = {
						G: 'giga',
						M: 'méga',
						k: 'kilo',
						h: 'hecto',
						da: 'déca',
						d: 'déci',
						c: 'centi',
						m: 'milli',
						μ: 'micro',
						n: 'nano',
						p: 'pico'
					};

					const prefixName = prefixNames[prefix] || prefix;
					const name = prefixName + baseDef.name;

					return {
						symbol,
						name,
						baseSymbol,
						coefficient: prefixValue,
						dimension: baseDef.dimension
					};
				}
			}
		}
	}

	// 4. Check if it's a base unit without prefix
	if (symbol in BASE_UNIT_DEFS) {
		const baseDef = BASE_UNIT_DEFS[symbol];
		return {
			symbol,
			name: baseDef.name,
			baseSymbol: symbol,
			coefficient: 1,
			dimension: baseDef.dimension
		};
	}

	// Not recognized
	return null;
}

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
