/**
 * Unit AST - Unit Definitions and Resolution
 *
 * Central definitions for all supported units and SI prefixes.
 * Provides the resolveUnit function for unit lookup and parsing.
 *
 * Unit categories:
 * - SI_PREFIXES: Standard metric prefixes (nano to giga)
 * - BASE_UNITS: SI base units and dimensionless
 * - SPECIAL_UNITS: Non-SI units and units with special conversions
 * - UNIT_ALIASES: Alternative symbols for units
 *
 * @module mathAST/units/definitions
 */

import type { BaseUnitDef, Dimension } from './types';

// =============================================================================
// SI PREFIXES
// =============================================================================

/**
 * SI metric prefixes mapping
 *
 * Standard metric prefixes from nano (10^-9) to giga (10^9).
 * Covers the most common range used in educational contexts.
 *
 * Key: prefix symbol or empty string for no prefix
 * Value: multiplication factor (power of 10)
 *
 * Order in Map: longest prefixes first (important for parsing)
 * This ensures 'μ' is matched before 'm' (which is meter, not milli).
 *
 * @example
 * SI_PREFIXES.get('k')  // 1000 (kilo)
 * SI_PREFIXES.get('m')  // 0.001 (milli)
 * SI_PREFIXES.get('')   // 1 (no prefix)
 * SI_PREFIXES.get('μ')  // 1e-6 (micro)
 */
export const SI_PREFIXES: ReadonlyMap<string, number> = new Map([
	['G', 1e9], // Giga
	['M', 1e6], // Mega
	['k', 1e3], // Kilo
	['h', 1e2], // Hecto
	['da', 1e1], // Deca
	['', 1], // No prefix (unity)
	['d', 1e-1], // Deci
	['c', 1e-2], // Centi
	['m', 1e-3], // Milli
	['μ', 1e-6], // Micro (Greek letter mu)
	['n', 1e-9], // Nano
	['p', 1e-12] // Pico
]);

// =============================================================================
// BASE UNITS (SI)
// =============================================================================

/**
 * SI base units and their reference dimensions
 *
 * These are the fundamental units of the SI system.
 * All other units are derived from combinations of these.
 *
 * For each base unit:
 * - symbol: The standard SI symbol (typically 1-2 characters)
 * - dimension: The physical dimension it measures
 * - name: Full name in French (for user-facing display)
 *
 * Example: meter (m) is the base unit for length dimension
 *
 * @example
 * BASE_UNITS.get('m')   // { dimension: 'length', name: 'mètre' }
 * BASE_UNITS.get('kg')  // { dimension: 'mass', name: 'kilogramme' }
 * BASE_UNITS.get('s')   // { dimension: 'time', name: 'seconde' }
 */
export const BASE_UNITS: ReadonlyMap<string, { dimension: Dimension; name: string }> = new Map([
	['m', { dimension: 'length', name: 'mètre' }],
	['g', { dimension: 'mass', name: 'gramme' }],
	['s', { dimension: 'time', name: 'seconde' }],
	['A', { dimension: 'electric_current', name: 'ampère' }],
	['K', { dimension: 'temperature', name: 'kelvin' }],
	['mol', { dimension: 'amount', name: 'mole' }],
	['cd', { dimension: 'luminous_intensity', name: 'candela' }],
	['L', { dimension: 'volume', name: 'litre' }],
	['rad', { dimension: 'angle', name: 'radian' }],
	['1', { dimension: 'dimensionless', name: 'dimensionless' }]
]);

// =============================================================================
// SPECIAL UNITS (Non-SI and derived units)
// =============================================================================

/**
 * Special units with custom conversion factors
 *
 * These are units that either:
 * - Don't follow SI prefix convention (e.g., hour, minute)
 * - Have non-decimal conversion factors (e.g., degree = π/180 radians)
 * - Are used frequently in educational contexts (e.g., liter)
 *
 * Each entry fully specifies the unit's properties including conversion.
 *
 * Time units:
 * - ms (millisecond): 0.001 seconds
 * - min (minute): 60 seconds
 * - h (hour): 3600 seconds
 * - j (jour/day): 86400 seconds
 *
 * Mass units:
 * - t (tonne): 1,000,000 grams (metric ton)
 * - q (quintal): 100,000 grams (100 kg)
 *
 * Angle units:
 * - ° (degree): π/180 radians
 * - deg (alias for degree): π/180 radians
 *
 * Currency:
 * - € (euro): base unit = 1
 * - $ (dollar): base unit = 1
 *
 * @example Time conversions
 * SPECIAL_UNITS.get('h')   // hour -> 3600 seconds
 * SPECIAL_UNITS.get('min') // minute -> 60 seconds
 * SPECIAL_UNITS.get('ms')  // millisecond -> 0.001 seconds
 *
 * @example Angle conversions
 * SPECIAL_UNITS.get('°')   // degree -> Math.PI/180 radians
 * SPECIAL_UNITS.get('deg') // degree (alias) -> Math.PI/180 radians
 */
export const SPECIAL_UNITS: ReadonlyMap<string, BaseUnitDef> = new Map([
	// =========== TIME UNITS ===========
	[
		'ms',
		{
			symbol: 'ms',
			baseSymbol: 's',
			coefficient: 0.001,
			dimension: 'time',
			name: 'milliseconde'
		}
	],
	[
		'min',
		{
			symbol: 'min',
			baseSymbol: 's',
			coefficient: 60,
			dimension: 'time',
			name: 'minute'
		}
	],
	[
		'h',
		{
			symbol: 'h',
			baseSymbol: 's',
			coefficient: 3600,
			dimension: 'time',
			name: 'heure'
		}
	],
	[
		'j',
		{
			symbol: 'j',
			baseSymbol: 's',
			coefficient: 86400,
			dimension: 'time',
			name: 'jour'
		}
	],
	[
		'semaine',
		{
			symbol: 'semaine',
			baseSymbol: 's',
			coefficient: 604800,
			dimension: 'time',
			name: 'semaine'
		}
	],
	[
		'mois',
		{
			symbol: 'mois',
			baseSymbol: 's',
			coefficient: 2592000,
			dimension: 'time',
			name: 'mois'
		}
	],
	[
		'an',
		{
			symbol: 'an',
			baseSymbol: 's',
			coefficient: 31536000,
			dimension: 'time',
			name: 'année'
		}
	],

	// =========== MASS UNITS ===========
	[
		't',
		{
			symbol: 't',
			baseSymbol: 'g',
			coefficient: 1e6,
			dimension: 'mass',
			name: 'tonne'
		}
	],
	[
		'q',
		{
			symbol: 'q',
			baseSymbol: 'g',
			coefficient: 1e5,
			dimension: 'mass',
			name: 'quintal'
		}
	],

	// =========== ANGLE UNITS ===========
	[
		'°',
		{
			symbol: '°',
			baseSymbol: 'rad',
			coefficient: Math.PI / 180,
			dimension: 'angle',
			name: 'degré'
		}
	],
	[
		'deg',
		{
			symbol: 'deg',
			baseSymbol: 'rad',
			coefficient: Math.PI / 180,
			dimension: 'angle',
			name: 'degré'
		}
	],

	// =========== CURRENCY UNITS ===========
	[
		'€',
		{
			symbol: '€',
			baseSymbol: '€',
			coefficient: 1,
			dimension: 'currency',
			name: 'euro'
		}
	],
	[
		'$',
		{
			symbol: '$',
			baseSymbol: '$',
			coefficient: 1,
			dimension: 'currency',
			name: 'dollar'
		}
	]
]);

// =============================================================================
// UNIT ALIASES
// =============================================================================

/**
 * Alternative symbols and names for units
 *
 * Maps commonly used alternative notations to their canonical symbols.
 * This allows flexible user input while normalizing internally.
 *
 * Examples:
 * - 'euro' -> '€' (full name to symbol)
 * - 'l' -> 'L' (lowercase to uppercase liter)
 * - 'minute' -> 'min' (full name)
 * - 'metre' -> 'm' (French full name to symbol)
 *
 * Order in Map: longer aliases first to prevent partial matches
 * This ensures 'minute' is matched before 'min'.
 *
 * @example
 * UNIT_ALIASES.get('euro')   // '€'
 * UNIT_ALIASES.get('l')      // 'L'
 * UNIT_ALIASES.get('minute') // 'min'
 */
export const UNIT_ALIASES: ReadonlyMap<string, string> = new Map([
	// Currency
	['euro', '€'],
	['euros', '€'],
	['EUR', '€'],
	['dollar', '$'],

	// Volume
	['litre', 'L'],
	['litres', 'L'],
	['l', 'L'],

	// Time (full names and plurals)
	['minute', 'min'],
	['mins', 'min'],
	['heure', 'h'],
	['heures', 'h'],
	['jour', 'j'],
	['jours', 'j'],
	['semaines', 'semaine'],
	['ans', 'an'],

	// Base units (French names)
	['metre', 'm'],
	['gramme', 'g'],
	['seconde', 's'],

	// Angle
	['degré', 'deg'],
	['degres', '°'],
	['degree', 'deg'],
	['degrees', '°'],

	// Micro (ASCII alternative)
	['u', 'μ'],

	// Other
	['ohm', 'Ω']
]);

// =============================================================================
// UNIT RESOLUTION
// =============================================================================

/**
 * Resolve a unit symbol to its full definition
 *
 * Attempts to recognize a unit symbol by checking in the following order:
 * 1. SPECIAL_UNITS (non-SI units, priority handling)
 * 2. UNIT_ALIASES (alternative spellings and full names)
 * 3. SI prefix combinations (longest prefix first to avoid ambiguity)
 *    - Checks SI_PREFIXES × BASE_UNITS combinations
 * 4. BASE_UNITS (without prefix)
 *
 * The function uses longest-prefix matching for prefixed units to handle
 * ambiguous cases (e.g., 'μm' should be micro-meter, not mu-meter-meter).
 *
 * @param symbol - The unit symbol to resolve
 * @returns The full BaseUnitDef if recognized, null if unknown
 *
 * @example Recognizing base units
 * resolveUnit('m')  // { symbol: 'm', baseSymbol: 'm', coefficient: 1, ... }
 * resolveUnit('s')  // { symbol: 's', baseSymbol: 's', coefficient: 1, ... }
 *
 * @example Recognizing prefixed units
 * resolveUnit('km')  // { symbol: 'km', baseSymbol: 'm', coefficient: 1000, ... }
 * resolveUnit('mg')  // { symbol: 'mg', baseSymbol: 'g', coefficient: 0.001, ... }
 * resolveUnit('μm')  // { symbol: 'μm', baseSymbol: 'm', coefficient: 1e-6, ... }
 *
 * @example Recognizing special units
 * resolveUnit('h')   // { symbol: 'h', baseSymbol: 's', coefficient: 3600, ... }
 * resolveUnit('min') // { symbol: 'min', baseSymbol: 's', coefficient: 60, ... }
 *
 * @example Recognizing aliases
 * resolveUnit('l')     // Resolves 'L' -> { symbol: 'L', baseSymbol: 'm', ... }
 * resolveUnit('euro')  // Resolves '€' -> { symbol: '€', baseSymbol: '€', ... }
 *
 * @example Unknown units
 * resolveUnit('xyz')  // null
 * resolveUnit('foo')  // null
 */
export function resolveUnit(symbol: string): BaseUnitDef | null {
	// Step 1: Check SPECIAL_UNITS (priority)
	if (SPECIAL_UNITS.has(symbol)) {
		return SPECIAL_UNITS.get(symbol)!;
	}

	// Step 2: Resolve UNIT_ALIASES (iterative with cycle detection)
	let normalizedSymbol = symbol;
	const visited = new Set<string>();

	while (UNIT_ALIASES.has(normalizedSymbol)) {
		if (visited.has(normalizedSymbol)) {
			// Circular alias detected - return null to prevent infinite loop
			return null;
		}
		visited.add(normalizedSymbol);
		normalizedSymbol = UNIT_ALIASES.get(normalizedSymbol)!;
	}

	// After alias resolution, check SPECIAL_UNITS again (alias might resolve to special unit)
	if (visited.size > 0 && SPECIAL_UNITS.has(normalizedSymbol)) {
		return SPECIAL_UNITS.get(normalizedSymbol)!;
	}

	// Step 3: Try SI prefix combinations (longest prefix first)
	// SI_PREFIXES is already ordered with longest prefixes first
	const prefixEntries = Array.from(SI_PREFIXES.entries());
	for (let i = 0; i < prefixEntries.length; i++) {
		const [prefix, factor] = prefixEntries[i];
		// Skip empty prefix for now (handle at the end)
		if (prefix === '') continue;

		// Try to match: prefix + base unit
		if (normalizedSymbol.startsWith(prefix)) {
			const baseSymbol = normalizedSymbol.slice(prefix.length);

			// Check if the remainder is a base unit
			const baseUnit = BASE_UNITS.get(baseSymbol);
			if (baseUnit) {
				return {
					symbol: normalizedSymbol,
					baseSymbol,
					coefficient: factor,
					dimension: baseUnit.dimension,
					name: `${prefix}${baseUnit.name}`
				};
			}
		}
	}

	// Step 4: Check BASE_UNITS (without prefix)
	if (BASE_UNITS.has(normalizedSymbol)) {
		const baseUnit = BASE_UNITS.get(normalizedSymbol)!;
		return {
			symbol: normalizedSymbol,
			baseSymbol: normalizedSymbol,
			coefficient: 1,
			dimension: baseUnit.dimension,
			name: baseUnit.name
		};
	}

	// Not recognized
	return null;
}
