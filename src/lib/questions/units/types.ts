/**
 * Unit System - Type Definitions
 * ==============================
 *
 * Core type system for physical units with support for:
 * - SI prefixes (nano to giga)
 * - Composite units with arbitrary powers (m^3 s^-2 kg)
 * - HMS (Hours-Minutes-Seconds) time format
 * - Dimensional analysis
 *
 * MIGRATION NOTE: Base types (Unit, Dimension, BaseUnitDef) are now imported
 * from mathAST/units which is the source of truth. This module re-exports them
 * and adds question-specific types (Quantity, HMS, validation results, etc.)
 *
 * @module questions/units/types
 */

// ============================================================================
// RE-EXPORTS FROM MATHAST (source of truth)
// ============================================================================

// Re-export base types from mathAST/units
export type { Unit, Dimension, BaseUnitDef } from '$lib/mathAST/units/types';

// Import Unit type for use in this module's type definitions
import type { Unit } from '$lib/mathAST/units/types';

// ============================================================================
// MUTABLE UNIT (for internal operations that need mutability)
// ============================================================================

/**
 * Mutable version of Unit for internal operations
 *
 * Some parsing and manipulation operations need to build units incrementally.
 * This type allows mutation during construction, before converting to immutable Unit.
 *
 * @internal
 */
export interface MutableUnit {
	components: Map<string, number>;
	coefficient: number;
}

/**
 * Convert a MutableUnit to an immutable Unit
 *
 * @param mutable - The mutable unit to convert
 * @returns An immutable Unit
 */
export function toImmutableUnit(mutable: MutableUnit): Unit {
	return {
		components: mutable.components,
		coefficient: mutable.coefficient
	};
}

/**
 * Convert an immutable Unit to a MutableUnit
 *
 * @param unit - The immutable unit to convert
 * @returns A mutable copy
 */
export function toMutableUnit(unit: Unit): MutableUnit {
	return {
		components: new Map(unit.components),
		coefficient: unit.coefficient
	};
}

// ============================================================================
// QUANTITY
// ============================================================================

/**
 * Quantity = numeric value + unit
 *
 * Represents a physical quantity with its magnitude and unit.
 * The value can be:
 * - A number (for computed/resolved quantities)
 * - A string (for unevaluated LaTeX expressions from user input)
 *
 * @example Simple quantity
 * const distance: Quantity = {
 *   value: 150,
 *   unit: { components: new Map([['m', 1]]), coefficient: 1000 }  // 150 km
 * };
 *
 * @example Quantity with LaTeX expression (user input)
 * const userInput: Quantity = {
 *   value: '\\frac{3}{2}',
 *   unit: { components: new Map([['m', 1]]), coefficient: 1 }
 * };
 *
 * @example Velocity quantity
 * const speed: Quantity = {
 *   value: 90,
 *   unit: {
 *     components: new Map([['m', 1], ['s', -1]]),
 *     coefficient: 1000 / 3600  // km/h
 *   }
 * };
 */
export interface Quantity {
	/**
	 * Numeric magnitude of the quantity
	 *
	 * - number: Resolved numeric value
	 * - string: Unevaluated LaTeX expression (e.g., '\\frac{3}{2}', '2\\sqrt{3}')
	 */
	value: number | string;

	/**
	 * Unit of the quantity (includes components and conversion coefficient)
	 */
	unit: Unit;
}

// ============================================================================
// HMS (HOURS-MINUTES-SECONDS)
// ============================================================================

/**
 * HMS (Hours-Minutes-Seconds) value
 *
 * Used for time representation in the familiar h/min/s format.
 * Commonly used in physics problems involving duration, speed-distance-time.
 *
 * @example 3h30min45s
 * const duration: HMSValue = {
 *   hours: 3,
 *   minutes: 30,
 *   seconds: 45
 * };
 *
 * @example 2h15min (no seconds)
 * const shortDuration: HMSValue = {
 *   hours: 2,
 *   minutes: 15
 * };
 *
 * @example 45min30s (no hours)
 * const minutesOnly: HMSValue = {
 *   hours: 0,
 *   minutes: 45,
 *   seconds: 30
 * };
 *
 * @example Precise timing with milliseconds
 * const preciseTime: HMSValue = {
 *   hours: 1,
 *   minutes: 23,
 *   seconds: 45,
 *   milliseconds: 678
 * };
 */
export interface HMSValue {
	/**
	 * Hours component (non-negative integer or decimal)
	 */
	hours: number;

	/**
	 * Minutes component (0-59 for normalized values)
	 */
	minutes: number;

	/**
	 * Seconds component (0-59 for normalized values)
	 * Optional - defaults to 0 if not specified
	 */
	seconds?: number;

	/**
	 * Milliseconds component (0-999 for normalized values)
	 * Optional - defaults to 0 if not specified
	 */
	milliseconds?: number;
}

// ============================================================================
// PARSE RESULT
// ============================================================================

/**
 * Result of parsing a quantity from LaTeX input
 *
 * Discriminated union that represents either:
 * - Successful parse of a quantity (value + unit)
 * - Successful parse of an HMS time value
 * - Parse failure with error message
 *
 * @example Successful quantity parse
 * const result: ParseResult = {
 *   success: true,
 *   quantity: {
 *     value: 150,
 *     unit: { components: new Map([['m', 1]]), coefficient: 1000 }
 *   }
 * };
 *
 * @example Successful HMS parse
 * const hmsResult: ParseResult = {
 *   success: true,
 *   hms: { hours: 2, minutes: 30, seconds: 0 }
 * };
 *
 * @example Parse failure
 * const errorResult: ParseResult = {
 *   success: false,
 *   error: 'Unknown unit symbol: xyz'
 * };
 */
export type ParseResult =
	| { success: true; quantity: Quantity }
	| { success: true; hms: HMSValue }
	| { success: false; error: string };

// ============================================================================
// VALIDATION RESULT
// ============================================================================

/**
 * Result of validating a quantity answer against expected value
 *
 * Provides detailed feedback about what aspect of the answer was wrong.
 *
 * Status meanings:
 * - 'correct': Value and unit are both correct
 * - 'wrong_value': Unit is correct but numeric value is wrong
 * - 'wrong_unit': Value is correct but unit is wrong (or missing conversion)
 * - 'incompatible_units': Units have different dimensions (e.g., meters vs seconds)
 * - 'parse_error': Could not parse the student's answer
 *
 * @example Correct answer
 * const correct: QuantityValidationResult = {
 *   status: 'correct',
 *   message: 'Correct!'
 * };
 *
 * @example Wrong value
 * const wrongValue: QuantityValidationResult = {
 *   status: 'wrong_value',
 *   message: 'Incorrect value',
 *   feedback: 'Expected 150 km, got 160 km'
 * };
 *
 * @example Unit mismatch
 * const wrongUnit: QuantityValidationResult = {
 *   status: 'wrong_unit',
 *   message: 'Incorrect unit',
 *   feedback: 'Expected answer in meters, got kilometers'
 * };
 *
 * @example Incompatible dimensions
 * const incompatible: QuantityValidationResult = {
 *   status: 'incompatible_units',
 *   message: 'Cannot compare quantities',
 *   feedback: 'Cannot compare length (meters) with time (seconds)'
 * };
 */
export interface QuantityValidationResult {
	/**
	 * Validation status indicating the type of result
	 */
	status: 'correct' | 'wrong_value' | 'wrong_unit' | 'incompatible_units' | 'parse_error';

	/**
	 * Short message describing the result
	 * Suitable for display to students
	 */
	message?: string;

	/**
	 * Detailed feedback explaining what was wrong
	 * Provides more context for learning
	 */
	feedback?: string;
}

// ============================================================================
// DIMENSIONAL ANALYSIS
// ============================================================================

/**
 * Result of a dimensional analysis check
 *
 * Used to verify that operations on quantities are dimensionally valid.
 * For example, you cannot add meters and seconds, but you can multiply them.
 *
 * @example Valid operation
 * const valid: DimensionalCheckResult = {
 *   valid: true
 * };
 *
 * @example Invalid addition
 * const invalid: DimensionalCheckResult = {
 *   valid: false,
 *   error: 'Cannot add length (m) and mass (kg)'
 * };
 *
 * @example Invalid comparison
 * const invalidCompare: DimensionalCheckResult = {
 *   valid: false,
 *   error: 'Cannot compare time (s) with temperature (K)'
 * };
 */
export interface DimensionalCheckResult {
	/**
	 * Whether the dimensional check passed
	 */
	valid: boolean;

	/**
	 * Error message if the check failed
	 * Explains which dimensions are incompatible and why
	 */
	error?: string;
}

// ============================================================================
// SI PREFIX
// ============================================================================

/**
 * SI prefix identifiers
 *
 * Standard prefixes from nano (10^-9) to giga (10^9).
 * Covers the most common range used in educational contexts.
 *
 * @example
 * const prefix: SIPrefix = 'kilo';  // k, 10^3
 */
export type SIPrefix =
	| 'nano' // n, 10^-9
	| 'micro' // mu, 10^-6
	| 'milli' // m, 10^-3
	| 'centi' // c, 10^-2
	| 'deci' // d, 10^-1
	| 'none' // (no prefix), 10^0
	| 'deca' // da, 10^1
	| 'hecto' // h, 10^2
	| 'kilo' // k, 10^3
	| 'mega' // M, 10^6
	| 'giga'; // G, 10^9

/**
 * SI prefix definition with symbol and factor
 *
 * @example Kilo prefix
 * const kilo: SIPrefixDef = {
 *   prefix: 'kilo',
 *   symbol: 'k',
 *   factor: 1000
 * };
 */
export interface SIPrefixDef {
	/**
	 * Prefix identifier
	 */
	prefix: SIPrefix;

	/**
	 * Symbol used in unit notation
	 * Examples: 'n', 'mu', 'm', 'c', 'd', '', 'da', 'h', 'k', 'M', 'G'
	 */
	symbol: string;

	/**
	 * Multiplication factor
	 * Examples: 0.001 for milli, 1000 for kilo, 1000000 for mega
	 */
	factor: number;
}

// ============================================================================
// UNIT CONVERSION
// ============================================================================

/**
 * Result of a unit conversion operation
 *
 * @example Successful conversion
 * const success: ConversionResult = {
 *   success: true,
 *   value: 1500,
 *   unit: { components: new Map([['m', 1]]), coefficient: 1 }
 * };
 *
 * @example Failed conversion (incompatible dimensions)
 * const failure: ConversionResult = {
 *   success: false,
 *   error: 'Cannot convert meters to seconds: incompatible dimensions'
 * };
 */
export type ConversionResult =
	| { success: true; value: number; unit: Unit }
	| { success: false; error: string };

// ============================================================================
// DIMENSION MAP
// ============================================================================

// Import Dimension type for DimensionMap
import type { Dimension } from '$lib/mathAST/units/types';

/**
 * Dimensional signature of a unit
 *
 * Maps each physical dimension to its exponent in the unit.
 * Used for dimensional analysis to check compatibility.
 *
 * @example Velocity (length / time)
 * const velocityDimensions: DimensionMap = {
 *   length: 1,
 *   time: -1
 * };
 *
 * @example Energy (mass * length^2 / time^2)
 * const energyDimensions: DimensionMap = {
 *   mass: 1,
 *   length: 2,
 *   time: -2
 * };
 */
export type DimensionMap = Partial<Record<Dimension, number>>;

/**
 * Dimensional signature using Map for unit compatibility checking
 *
 * This is the runtime representation used by unit operations.
 * Maps each dimension to its exponent in the unit.
 *
 * @example Velocity (m/s)
 * const velocitySig: DimensionalSignature = new Map([
 *   ['length', 1],
 *   ['time', -1]
 * ]);
 *
 * @example Energy (kg*m^2/s^2)
 * const energySig: DimensionalSignature = new Map([
 *   ['mass', 1],
 *   ['length', 2],
 *   ['time', -2]
 * ]);
 */
export type DimensionalSignature = Map<Dimension, number>;

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Unit formatting style
 *
 * Controls how composite units are displayed:
 * - 'fraction': Uses division notation (m/s, kg/m^3)
 * - 'powers': Uses negative exponents (m.s^-1, kg.m^-3)
 *
 * @example
 * // For unit m/s^2:
 * // 'fraction' -> 'm/s^2'
 * // 'powers' -> 'm.s^-2'
 */
export type UnitFormatStyle = 'fraction' | 'powers';
