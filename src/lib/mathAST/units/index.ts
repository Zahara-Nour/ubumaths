/**
 * Unit AST - Public API
 *
 * Core exports for the Unit AST system.
 * Provides type definitions and utilities for working with physical units.
 *
 * @module mathAST/units
 */

// Type exports
export type { Unit, BaseUnitDef, Dimension } from './types';

// Function and constant exports
export { resolveUnit, SI_PREFIXES, BASE_UNITS, SPECIAL_UNITS, UNIT_ALIASES } from './definitions';

// Factory function exports
export { unit, unitWithPower, dimensionless, fromComponents, UnitAST } from './factory';

// Operation function exports
export {
	multiply,
	divide,
	power,
	invert,
	simplify,
	unitsEqual,
	unitsEquivalent,
	UnitOps
} from './operations';

// Parser function exports
export { parse, parseOrThrow, UnitParser } from './parser';

// Formatter function exports
export { format, formatCoefficient, UnitFormatter, type FormatStyle } from './formatter';

// Conversion function exports
export {
	unitsAreCompatible,
	getConversionFactor,
	getDimensionalSignature,
	normalizeToBase,
	UnitConversion
} from './conversion';
