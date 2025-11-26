/**
 * Unit System
 * ===========
 *
 * A comprehensive unit system for handling physical units in mathematical questions.
 *
 * Features:
 * - Simple units: m, kg, s, L
 * - Composite units: m^2, m/s, kg.m.s^-2
 * - SI prefixes: km, mm, μg
 * - Unit arithmetic: multiply, divide, power
 * - Dimensional analysis
 * - Unit conversion
 *
 * @example Create and manipulate units
 * ```typescript
 * import { createUnit, multiplyUnits, divideUnits, formatUnit } from '$lib/questions/units';
 *
 * const m = createUnit('m');
 * const s = createUnit('s');
 * const velocity = divideUnits(m, s);
 *
 * console.log(formatUnit(velocity)); // 'm/s'
 * ```
 *
 * @example Check unit compatibility
 * ```typescript
 * import { createUnit, unitsAreCompatible, getConversionFactor } from '$lib/questions/units';
 *
 * const km = createUnit('km');
 * const m = createUnit('m');
 * const s = createUnit('s');
 *
 * unitsAreCompatible(km, m); // true
 * unitsAreCompatible(km, s); // false
 * getConversionFactor(km, m); // 1000
 * ```
 *
 * @module questions/units
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
	Unit,
	Dimension,
	DimensionMap,
	BaseUnitDef,
	Quantity,
	HMSValue,
	ParseResult,
	QuantityValidationResult,
	DimensionalCheckResult,
	SIPrefix,
	SIPrefixDef,
	ConversionResult
} from './types';

// ============================================================================
// DEFINITIONS
// ============================================================================

export {
	resolveUnit,
	isValidUnit,
	generateUnitWhitelist,
	getBaseSymbol,
	BASE_SYMBOL_BY_DIMENSION,
	BASE_UNIT_DEFS,
	SPECIAL_UNITS,
	SI_PREFIXES,
	UNIT_ALIASES,
	UNIT_WHITELIST
} from './definitions';

// ============================================================================
// OPERATIONS
// ============================================================================

export {
	// Unit creation
	createUnit,
	dimensionlessUnit,
	createUnitFromComponents,

	// Unit arithmetic
	multiplyUnits,
	divideUnits,
	powerUnit,
	invertUnit,

	// Unit comparison
	unitsAreEqual,
	unitsAreCompatible,
	getConversionFactor,

	// Normalization
	normalizeUnit,
	getDimensionalSignature,

	// Dimensional analysis
	getDimension,
	isLength,
	isMass,
	isDuration,
	isVolume,
	isSpeed,
	isArea,
	isDimensionless,

	// Formatting
	formatUnit,
	formatUnitUnicode,

	// Parsing
	parseSimpleUnit,

	// Types
	type UnitFormatStyle
} from './operations';
