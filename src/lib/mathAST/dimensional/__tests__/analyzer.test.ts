/**
 * Dimensional Analyzer - Comprehensive Unit Tests
 *
 * Tests for validating unit compatibility in mathematical expressions
 * and computing resulting units from operations.
 *
 * @module mathAST/dimensional/analyzer.test
 */

import { describe, it, expect } from 'vitest';
import {
	analyzeDimensions,
	isDimensionallyValid,
	getResultingUnit,
	isDimensionless,
	isAngleUnit,
	formatUnit,
	createDimensionlessUnit,
	createAngleUnit,
	extractNumericValue
} from '../analyzer';
import type { DimensionalContext } from '../types';
import {
	number,
	variable,
	greek,
	symbol,
	add,
	subtract,
	multiply as astMultiply,
	implicitMultiply,
	divide,
	fraction,
	opposite,
	positive,
	func,
	sin,
	cos,
	sqrt,
	abs,
	parentheses,
	power,
	subscript,
	equals,
	lessThan,
	greaterThan,
	quantity,
	quantityVar,
	withUnit
} from '$lib/mathAST';
import { unit, unitWithPower, dimensionless, fromComponents } from '$lib/mathAST/units/factory';
import type { Unit } from '$lib/mathAST/units/types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a Unit for meters
 */
function meter(): Unit {
	return unit('m')!;
}

/**
 * Create a Unit for seconds
 */
function second(): Unit {
	return unit('s')!;
}

/**
 * Create a Unit for velocity (m/s)
 */
function velocity(): Unit {
	return fromComponents(
		new Map([
			['m', 1],
			['s', -1]
		]),
		1
	);
}

/**
 * Create a Unit for acceleration (m/s^2)
 */
function acceleration(): Unit {
	return fromComponents(
		new Map([
			['m', 1],
			['s', -2]
		]),
		1
	);
}

/**
 * Create an angle unit (radians)
 */
function radians(): Unit {
	return unit('rad')!;
}

/**
 * Create a simple context with variable units
 */
function createContext(
	variables?: Record<string, Unit>,
	options?: DimensionalContext['options']
): DimensionalContext {
	return {
		variables: variables ? new Map(Object.entries(variables)) : undefined,
		options
	};
}

// =============================================================================
// Basic Analysis Tests
// =============================================================================

describe('Dimensional Analyzer', () => {
	describe('Basic Analysis - Literals', () => {
		it('should return valid with null unit for plain numbers', () => {
			const result = analyzeDimensions(number('5'));

			expect(result.valid).toBe(true);
			expect(result.resultUnit).toBe(null);
			expect(result.errors).toHaveLength(0);
		});

		it('should return valid with null unit for various number formats', () => {
			const integers = analyzeDimensions(number('42'));
			const decimals = analyzeDimensions(number('3.14'));
			const scientific = analyzeDimensions(number('1e-10'));

			expect(integers.valid).toBe(true);
			expect(decimals.valid).toBe(true);
			expect(scientific.valid).toBe(true);

			expect(integers.resultUnit).toBe(null);
			expect(decimals.resultUnit).toBe(null);
			expect(scientific.resultUnit).toBe(null);
		});

		it('should return valid with correct unit for quantity nodes', () => {
			const expr = quantity('5', 'm');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit).not.toBe(null);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should return valid with null unit for Greek letters', () => {
			const result = analyzeDimensions(greek('pi'));

			expect(result.valid).toBe(true);
			expect(result.resultUnit).toBe(null);
		});

		it('should return valid with null unit for mathematical symbols', () => {
			const result = analyzeDimensions(symbol('infinity'));

			expect(result.valid).toBe(true);
			expect(result.resultUnit).toBe(null);
		});
	});

	describe('Basic Analysis - Variables', () => {
		it('should return correct unit for variable with context', () => {
			const context = createContext({ v: velocity() });
			const result = analyzeDimensions(variable('v'), context);

			expect(result.valid).toBe(true);
			expect(result.resultUnit).not.toBe(null);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(-1);
		});

		it('should return error for undefined variable in strict mode', () => {
			const context = createContext({}, { strictMode: true });
			const result = analyzeDimensions(variable('x'), context);

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].code).toBe('UNDEFINED_VARIABLE');
			expect(result.errors[0].details?.variableName).toBe('x');
		});

		it('should return warning for undefined variable in non-strict mode', () => {
			const context = createContext({}, { strictMode: false });
			const result = analyzeDimensions(variable('x'), context);

			expect(result.valid).toBe(true);
			expect(result.resultUnit).toBe(null);
			expect(result.warnings).toBeDefined();
			expect(result.warnings!.length).toBeGreaterThan(0);
			expect(result.warnings![0].code).toBe('IMPLICIT_UNIT_ASSUMPTION');
		});

		it('should default to strict mode when no options provided', () => {
			const result = analyzeDimensions(variable('x'), {});

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('UNDEFINED_VARIABLE');
		});
	});

	// =============================================================================
	// Binary Operations Tests
	// =============================================================================

	describe('Binary Operations - Addition', () => {
		it('should allow adding compatible units (m + m)', () => {
			const expr = add(quantity('5', 'm'), quantity('3', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit).not.toBe(null);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should allow adding compatible units with different prefixes (m + km)', () => {
			const expr = add(quantity('5', 'm'), quantity('3', 'km'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit).not.toBe(null);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should reject adding incompatible units (m + s)', () => {
			const expr = add(quantity('5', 'm'), quantity('3', 's'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].code).toBe('INCOMPATIBLE_UNITS');
		});

		it('should allow adding two dimensionless values', () => {
			const expr = add(number('5'), number('3'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit).toBe(null);
		});

		it('should reject adding dimensionless and unit without allowDimensionlessMix', () => {
			const expr = add(number('5'), quantity('3', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INCOMPATIBLE_UNITS');
		});

		it('should warn when adding dimensionless and unit with allowDimensionlessMix', () => {
			const expr = add(number('5'), quantity('3', 'm'));
			const context = createContext({}, { allowDimensionlessMix: true });
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(true);
			expect(result.warnings).toBeDefined();
			expect(result.warnings![0].code).toBe('DIMENSIONLESS_MIXED');
		});
	});

	describe('Binary Operations - Subtraction', () => {
		it('should allow subtracting compatible units (m - m)', () => {
			const expr = subtract(quantity('5', 'm'), quantity('3', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should reject subtracting incompatible units (m - s)', () => {
			const expr = subtract(quantity('5', 'm'), quantity('3', 's'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INCOMPATIBLE_UNITS');
		});
	});

	describe('Binary Operations - Multiplication', () => {
		it('should multiply units correctly (m * m = m^2)', () => {
			const expr = astMultiply(quantity('5', 'm'), quantity('3', 'm'), 'dot');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(2);
		});

		it('should multiply different units correctly (m * s = m.s)', () => {
			const expr = astMultiply(quantity('5', 'm'), quantity('3', 's'), 'dot');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(1);
		});

		it('should handle implicit multiplication', () => {
			const expr = implicitMultiply(quantity('5', 'm'), quantity('3', 's'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(1);
		});

		it('should handle dimensionless multiplied by unit', () => {
			const expr = astMultiply(number('5'), quantity('3', 'm'), 'dot');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should handle unit multiplied by dimensionless', () => {
			const expr = astMultiply(quantity('5', 'm'), number('3'), 'dot');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});
	});

	describe('Binary Operations - Division', () => {
		it('should divide units correctly (m / s = m/s)', () => {
			const expr = divide(quantity('10', 'm'), quantity('2', 's'), 'fraction');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(-1);
		});

		it('should divide same units to get dimensionless (m / m)', () => {
			const expr = divide(quantity('10', 'm'), quantity('2', 'm'), 'fraction');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.size).toBe(0);
		});

		it('should handle fraction display style', () => {
			const expr = fraction(quantity('10', 'm'), quantity('2', 's'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(-1);
		});

		it('should handle dimensionless divided by unit (1/s)', () => {
			const expr = divide(number('1'), quantity('2', 's'), 'fraction');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('s')).toBe(-1);
		});

		it('should handle unit divided by dimensionless', () => {
			const expr = divide(quantity('10', 'm'), number('2'), 'fraction');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});
	});

	describe('Binary Operations - Mixed Operations', () => {
		it('should handle complex expression: (m + m) * s', () => {
			const sum = add(quantity('5', 'm'), quantity('3', 'm'));
			const expr = astMultiply(sum, quantity('2', 's'), 'dot');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(1);
		});

		it('should handle complex expression: m / s + m / s', () => {
			const v1 = divide(quantity('10', 'm'), quantity('2', 's'), 'fraction');
			const v2 = divide(quantity('5', 'm'), quantity('1', 's'), 'fraction');
			const expr = add(v1, v2);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(-1);
		});

		it('should reject incompatible mixed expression: m + m*s', () => {
			const product = astMultiply(quantity('5', 'm'), quantity('2', 's'), 'dot');
			const expr = add(quantity('3', 'm'), product);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INCOMPATIBLE_UNITS');
		});
	});

	// =============================================================================
	// Unary Operations Tests
	// =============================================================================

	describe('Unary Operations', () => {
		it('should preserve unit for opposite (-5 m)', () => {
			const expr = opposite(quantity('5', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should preserve unit for positive (+5 m)', () => {
			const expr = positive(quantity('5', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should return null for opposite of dimensionless', () => {
			const expr = opposite(number('5'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit).toBe(null);
		});

		it('should handle nested unary operations', () => {
			const expr = opposite(positive(quantity('5', 'm')));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});
	});

	// =============================================================================
	// Power/Superscript Tests
	// =============================================================================

	describe('Power/Superscript Operations', () => {
		it('should compute power correctly (m^2)', () => {
			const expr = power(quantity('5', 'm'), number('2'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(2);
		});

		it('should compute negative power correctly (m^-1)', () => {
			const expr = power(quantity('5', 'm'), opposite(number('1')));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(-1);
		});

		it('should compute power of composite unit ((m/s)^2)', () => {
			const velocityExpr = divide(quantity('10', 'm'), quantity('2', 's'), 'fraction');
			const expr = power(velocityExpr, number('2'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(2);
			expect(result.resultUnit!.components.get('s')).toBe(-2);
		});

		it('should reject unit in exponent', () => {
			const expr = power(number('2'), quantity('3', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INVALID_FUNCTION_INPUT');
		});

		it('should handle dimensionless exponent correctly', () => {
			const expr = power(quantity('5', 'm'), number('3'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(3);
		});

		it('should handle zero exponent', () => {
			const expr = power(quantity('5', 'm'), number('0'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.size).toBe(0);
		});

		it('should allow fractional exponents by default', () => {
			const expr = power(quantity('4', 'm'), divide(number('1'), number('2'), 'fraction'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(0.5);
		});

		it('should reject fractional exponents when not allowed', () => {
			const expr = power(quantity('4', 'm'), divide(number('1'), number('2'), 'fraction'));
			const context = createContext({}, { allowFractionalExponents: false });
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('NON_INTEGER_EXPONENT');
		});

		it('should warn for large exponents', () => {
			const expr = power(quantity('2', 'm'), number('15'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.warnings).toBeDefined();
			expect(result.warnings![0].code).toBe('LARGE_EXPONENT');
		});
	});

	// =============================================================================
	// Function Tests
	// =============================================================================

	describe('Functions - Trigonometric', () => {
		it('should accept dimensionless input for sin', () => {
			const expr = sin(number('0.5'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.size).toBe(0);
		});

		it('should accept angle input for sin', () => {
			const expr = sin(quantity('1', 'rad'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.size).toBe(0);
		});

		it('should reject non-angle unit for sin (5 m)', () => {
			const expr = sin(quantity('5', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INVALID_FUNCTION_INPUT');
			expect(result.errors[0].details?.functionName).toBe('sin');
		});

		it('should accept dimensionless input for cos', () => {
			const expr = cos(number('0'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
		});

		it('should reject non-angle unit for cos', () => {
			const expr = cos(quantity('5', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INVALID_FUNCTION_INPUT');
		});
	});

	describe('Functions - Square Root', () => {
		it('should compute sqrt of m^2 = m', () => {
			const m2 = withUnit(number('4'), unitWithPower('m', 2)!);
			const expr = sqrt(m2);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should compute sqrt of dimensionless', () => {
			const expr = sqrt(number('4'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit).toBe(null);
		});

		it('should compute sqrt of composite unit (m^2/s^2 = m/s)', () => {
			const m2s2 = withUnit(
				number('100'),
				fromComponents(
					new Map([
						['m', 2],
						['s', -2]
					]),
					1
				)
			);
			const expr = sqrt(m2s2);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(-1);
		});

		it('should handle sqrt of m producing fractional exponent (allowed by default)', () => {
			const expr = sqrt(quantity('4', 'm'));
			const result = analyzeDimensions(expr);

			// By default, fractional exponents are allowed - no error
			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(0.5);
			expect(result.errors.length).toBe(0);
		});

		it('should error for sqrt of m when fractional exponents disabled', () => {
			const expr = sqrt(quantity('4', 'm'));
			const result = analyzeDimensions(expr, {
				options: { allowFractionalExponents: false }
			});

			// With fractional exponents disabled, this produces an error
			expect(result.valid).toBe(false);
			expect(result.resultUnit).toBe(null);
			expect(result.errors.some((e) => e.code === 'NON_INTEGER_EXPONENT')).toBe(true);
		});
	});

	describe('Functions - Cube Root', () => {
		it('should compute cbrt of m^3 correctly', () => {
			// Create m^3 using unit with exponent 3
			const m3 = withUnit(number('8'), {
				components: new Map([['m', 3]]),
				coefficient: 1
			});
			const expr = func('cbrt', [m3]);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should handle cbrt of m producing fractional exponent (allowed by default)', () => {
			const expr = func('cbrt', [quantity('8', 'm')]);
			const result = analyzeDimensions(expr);

			// By default, fractional exponents are allowed - no error
			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBeCloseTo(1 / 3, 10);
			expect(result.errors.length).toBe(0);
		});

		it('should error for cbrt of m when fractional exponents disabled', () => {
			const expr = func('cbrt', [quantity('8', 'm')]);
			const result = analyzeDimensions(expr, {
				options: { allowFractionalExponents: false }
			});

			// With fractional exponents disabled, this produces an error
			expect(result.valid).toBe(false);
			expect(result.resultUnit).toBe(null);
			expect(result.errors.some((e) => e.code === 'NON_INTEGER_EXPONENT')).toBe(true);
		});

		it('should compute cbrt of m^6 correctly', () => {
			// Create m^6 using unit with exponent 6
			const m6 = withUnit(number('64'), {
				components: new Map([['m', 6]]),
				coefficient: 1
			});
			const expr = func('cbrt', [m6]);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(2);
		});
	});

	describe('Functions - Absolute Value', () => {
		it('should preserve unit for abs(5 m)', () => {
			const expr = abs(quantity('5', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should preserve composite unit for abs(velocity)', () => {
			const velocityExpr = divide(quantity('10', 'm'), quantity('2', 's'), 'fraction');
			const expr = abs(velocityExpr);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(-1);
		});

		it('should return null for abs(dimensionless)', () => {
			const expr = abs(number('5'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit).toBe(null);
		});
	});

	describe('Functions - Min/Max', () => {
		it('should accept same units for min', () => {
			const expr = func('min', [quantity('5', 'm'), quantity('3', 'm')]);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should accept same units for max', () => {
			const expr = func('max', [quantity('10', 'm'), quantity('3', 'm')]);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should reject different units for min', () => {
			const expr = func('min', [quantity('5', 'm'), quantity('3', 's')]);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INCONSISTENT_FUNCTION_ARGS');
		});

		it('should reject different units for max', () => {
			const expr = func('max', [quantity('10', 'm'), quantity('3', 's')]);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INCONSISTENT_FUNCTION_ARGS');
		});

		it('should handle multiple arguments with same units', () => {
			const expr = func('min', [quantity('5', 'm'), quantity('3', 'm'), quantity('7', 'm')]);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});
	});

	describe('Functions - Unknown Functions', () => {
		it('should reject unknown function in strict mode', () => {
			const expr = func('unknownFunc', [number('5')]);
			const context = createContext({}, { strictMode: true });
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INVALID_FUNCTION_INPUT');
		});

		it('should warn for unknown function in non-strict mode', () => {
			const expr = func('unknownFunc', [quantity('5', 'm')]);
			const context = createContext({}, { strictMode: false });
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(true);
			expect(result.warnings).toBeDefined();
			expect(result.warnings![0].code).toBe('UNKNOWN_FUNCTION');
			// Returns first argument's unit
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});
	});

	// =============================================================================
	// UnitNode Tests
	// =============================================================================

	describe('UnitNode', () => {
		it('should handle basic unit wrapping', () => {
			const expr = quantity('5', 'm');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should reject nested units ({5m} km)', () => {
			// Create nested unit: {5 m} with additional km unit
			const innerExpr = quantity('5', 'm');
			const expr = withUnit(innerExpr, unit('km')!);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('NESTED_UNITS');
		});

		it('should handle variable with unit', () => {
			const expr = quantityVar('v', 'm/s');
			const context = createContext({}, { strictMode: false });
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(-1);
		});
	});

	// =============================================================================
	// Relations Tests
	// =============================================================================

	describe('Relations', () => {
		it('should accept equal relation with compatible units', () => {
			const expr = equals(quantity('5', 'm'), quantity('500', 'cm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.size).toBe(0); // Relations are dimensionless
		});

		it('should reject equal relation with incompatible units', () => {
			const expr = equals(quantity('5', 'm'), quantity('3', 's'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INVALID_RELATION');
		});

		it('should accept less-than relation with compatible units', () => {
			const expr = lessThan(quantity('5', 'm'), quantity('10', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
		});

		it('should reject greater-than relation with incompatible units', () => {
			const expr = greaterThan(quantity('10', 'm'), quantity('5', 's'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INVALID_RELATION');
		});

		it('should accept dimensionless comparison', () => {
			const expr = lessThan(number('3'), number('5'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
		});

		it('should reject comparing unit with dimensionless without mix option', () => {
			const expr = equals(quantity('5', 'm'), number('5'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INVALID_RELATION');
		});
	});

	// =============================================================================
	// Delimiter Tests
	// =============================================================================

	describe('Delimiters', () => {
		it('should pass through parentheses content', () => {
			const expr = parentheses(quantity('5', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should handle abs function (absolute value)', () => {
			const expr = abs(quantity('5', 'm'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should handle nested delimiters', () => {
			const expr = parentheses(parentheses(quantity('5', 'm')));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});
	});

	// =============================================================================
	// Subscript Tests
	// =============================================================================

	describe('Subscripts', () => {
		it('should preserve base unit for subscript', () => {
			const context = createContext({ v: velocity() });
			const expr = subscript(variable('v'), number('1'));
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(-1);
		});

		it('should handle subscript with unit in base', () => {
			const expr = subscript(quantity('5', 'm'), number('0'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});
	});

	// =============================================================================
	// Convenience Functions Tests
	// =============================================================================

	describe('Convenience Functions', () => {
		describe('isDimensionallyValid', () => {
			it('should return true for valid expression', () => {
				const expr = add(quantity('5', 'm'), quantity('3', 'm'));
				expect(isDimensionallyValid(expr)).toBe(true);
			});

			it('should return false for invalid expression', () => {
				const expr = add(quantity('5', 'm'), quantity('3', 's'));
				expect(isDimensionallyValid(expr)).toBe(false);
			});

			it('should accept context parameter', () => {
				const context = createContext({ x: meter() });
				const expr = variable('x');
				expect(isDimensionallyValid(expr, context)).toBe(true);
			});
		});

		describe('getResultingUnit', () => {
			it('should return unit for valid expression', () => {
				const expr = quantity('5', 'm');
				const result = getResultingUnit(expr);

				expect(result).not.toBe(null);
				expect(result!.components.get('m')).toBe(1);
			});

			it('should return null for invalid expression', () => {
				const expr = add(quantity('5', 'm'), quantity('3', 's'));
				const result = getResultingUnit(expr);

				expect(result).toBe(null);
			});

			it('should return null for dimensionless expression', () => {
				const result = getResultingUnit(number('5'));
				expect(result).toBe(null);
			});

			it('should accept context parameter', () => {
				const context = createContext({ v: velocity() });
				const result = getResultingUnit(variable('v'), context);

				expect(result).not.toBe(null);
				expect(result!.components.get('m')).toBe(1);
				expect(result!.components.get('s')).toBe(-1);
			});
		});
	});

	// =============================================================================
	// Helper Function Tests
	// =============================================================================

	describe('Helper Functions', () => {
		describe('isDimensionless', () => {
			it('should return true for null', () => {
				expect(isDimensionless(null)).toBe(true);
			});

			it('should return true for empty components', () => {
				expect(isDimensionless(dimensionless())).toBe(true);
			});

			it('should return false for unit with components', () => {
				expect(isDimensionless(meter())).toBe(false);
			});
		});

		describe('isAngleUnit', () => {
			it('should return true for radians', () => {
				expect(isAngleUnit(radians())).toBe(true);
			});

			it('should return false for null', () => {
				expect(isAngleUnit(null)).toBe(false);
			});

			it('should return false for non-angle unit', () => {
				expect(isAngleUnit(meter())).toBe(false);
			});
		});

		describe('formatUnit', () => {
			it('should format null as dimensionless', () => {
				expect(formatUnit(null)).toBe('dimensionless');
			});

			it('should format dimensionless unit', () => {
				expect(formatUnit(dimensionless())).toBe('dimensionless');
			});

			it('should use original field if available', () => {
				const u = { ...meter(), original: 'meters' };
				expect(formatUnit(u)).toBe('meters');
			});

			it('should format unit components', () => {
				const result = formatUnit(meter());
				expect(result).toContain('m');
			});
		});

		describe('createDimensionlessUnit', () => {
			it('should create unit with empty components', () => {
				const result = createDimensionlessUnit();
				expect(result.components.size).toBe(0);
				expect(result.coefficient).toBe(1);
			});
		});

		describe('createAngleUnit', () => {
			it('should create radians unit', () => {
				const result = createAngleUnit();
				expect(result.components.get('rad')).toBe(1);
			});
		});

		describe('extractNumericValue', () => {
			it('should extract value from number node', () => {
				expect(extractNumericValue(number('5'))).toBe(5);
			});

			it('should extract negative value from opposite node', () => {
				expect(extractNumericValue(opposite(number('5')))).toBe(-5);
			});

			it('should extract value from positive node', () => {
				expect(extractNumericValue(positive(number('5')))).toBe(5);
			});

			it('should extract value from delimiter node', () => {
				expect(extractNumericValue(parentheses(number('5')))).toBe(5);
			});

			it('should extract value from fraction node', () => {
				expect(extractNumericValue(fraction(number('1'), number('2')))).toBe(0.5);
			});

			it('should return null for variable node', () => {
				expect(extractNumericValue(variable('x'))).toBe(null);
			});

			it('should return null for complex expression', () => {
				expect(extractNumericValue(add(number('1'), number('2')))).toBe(null);
			});
		});
	});

	// =============================================================================
	// Complex Expression Tests
	// =============================================================================

	describe('Complex Expressions', () => {
		it('should handle physics formula: v = d/t', () => {
			const context = createContext({
				d: meter(),
				t: second()
			});
			const expr = divide(variable('d'), variable('t'), 'fraction');
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(-1);
		});

		it('should handle physics formula: E = mc^2', () => {
			const context = createContext({
				m: unit('kg')!,
				c: velocity()
			});
			const cSquared = power(variable('c'), number('2'));
			const expr = astMultiply(variable('m'), cSquared, 'implicit');
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('g')).toBe(1); // kg base is g
			expect(result.resultUnit!.components.get('m')).toBe(2);
			expect(result.resultUnit!.components.get('s')).toBe(-2);
		});

		it('should handle physics formula: F = ma', () => {
			const context = createContext({
				m: unit('kg')!,
				a: acceleration()
			});
			const expr = astMultiply(variable('m'), variable('a'), 'implicit');
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('g')).toBe(1);
			expect(result.resultUnit!.components.get('m')).toBe(1);
			expect(result.resultUnit!.components.get('s')).toBe(-2);
		});

		it('should reject invalid physics formula: v = d + t', () => {
			const context = createContext({
				d: meter(),
				t: second()
			});
			const expr = add(variable('d'), variable('t'));
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe('INCOMPATIBLE_UNITS');
		});

		it('should handle kinematic equation: x = v*t + 0.5*a*t^2', () => {
			const context = createContext({
				v: velocity(),
				a: acceleration(),
				t: second()
			});

			// v*t has units m/s * s = m
			const vt = astMultiply(variable('v'), variable('t'), 'implicit');

			// t^2 has units s^2
			const tSquared = power(variable('t'), number('2'));

			// a*t^2 has units m/s^2 * s^2 = m
			const atSquared = astMultiply(variable('a'), tSquared, 'implicit');

			// 0.5*a*t^2
			const halfAtSquared = astMultiply(number('0.5'), atSquared, 'implicit');

			// x = v*t + 0.5*a*t^2
			const expr = add(vt, halfAtSquared);
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});
	});

	// =============================================================================
	// Edge Cases Tests
	// =============================================================================

	describe('Edge Cases', () => {
		it('should handle deeply nested expressions', () => {
			// (((5 m + 3 m) * 2) / 4)
			const sum = add(quantity('5', 'm'), quantity('3', 'm'));
			const product = astMultiply(sum, number('2'), 'dot');
			const expr = divide(product, number('4'), 'fraction');
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit!.components.get('m')).toBe(1);
		});

		it('should collect multiple errors in complex expressions', () => {
			const context = createContext({}, { strictMode: true });
			// x + y where both are undefined
			const expr = add(variable('x'), variable('y'));
			const result = analyzeDimensions(expr, context);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(2);
		});

		it('should handle expression with only dimensionless operations', () => {
			const expr = astMultiply(
				add(number('1'), number('2')),
				subtract(number('5'), number('3')),
				'dot'
			);
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit).toBe(null);
		});

		it('should handle single number in function', () => {
			const expr = abs(number('5'));
			const result = analyzeDimensions(expr);

			expect(result.valid).toBe(true);
			expect(result.resultUnit).toBe(null);
		});
	});

	// =============================================================================
	// Additional Coverage Tests
	// =============================================================================

	describe('Additional Coverage', () => {
		describe('Custom Function Rules', () => {
			it('should use custom function rules when provided', () => {
				const customRule = {
					name: 'customFunc',
					inputRequirement: 'any' as const,
					outputUnit: 'preserve' as const,
					description: 'Custom function that preserves units'
				};
				const context: DimensionalContext = {
					functionRules: new Map([['customFunc', customRule]]),
					options: { strictMode: true }
				};
				const expr = func('customFunc', [quantity('5', 'm')]);
				const result = analyzeDimensions(expr, context);

				expect(result.valid).toBe(true);
				expect(result.resultUnit!.components.get('m')).toBe(1);
			});

			it('should override default rules with custom rules', () => {
				// Override sin to accept any unit (unusual but tests override)
				const customSinRule = {
					name: 'sin',
					inputRequirement: 'any' as const,
					outputUnit: 'preserve' as const,
					description: 'Overridden sin function'
				};
				const context: DimensionalContext = {
					functionRules: new Map([['sin', customSinRule]]),
					options: { strictMode: true }
				};
				const expr = sin(quantity('5', 'm'));
				const result = analyzeDimensions(expr, context);

				// Should now be valid because we overrode the rule
				expect(result.valid).toBe(true);
			});
		});

		describe('Inverse Trigonometric Functions', () => {
			it('should accept dimensionless for asin and return angle', () => {
				const expr = func('asin', [number('0.5')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(true);
				expect(result.resultUnit!.components.get('rad')).toBe(1);
			});

			it('should reject unit input for asin', () => {
				const expr = func('asin', [quantity('0.5', 'm')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(false);
				expect(result.errors[0].code).toBe('INVALID_FUNCTION_INPUT');
			});

			it('should handle atan2 with same units', () => {
				const expr = func('atan2', [quantity('3', 'm'), quantity('4', 'm')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(true);
				expect(result.resultUnit!.components.get('rad')).toBe(1);
			});

			it('should reject atan2 with different units', () => {
				const expr = func('atan2', [quantity('3', 'm'), quantity('4', 's')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(false);
				expect(result.errors[0].code).toBe('INCONSISTENT_FUNCTION_ARGS');
			});
		});

		describe('Hyperbolic Functions', () => {
			it('should accept dimensionless for sinh', () => {
				const expr = func('sinh', [number('1')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(true);
				expect(result.resultUnit!.components.size).toBe(0);
			});

			it('should reject unit input for cosh', () => {
				const expr = func('cosh', [quantity('1', 'm')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(false);
			});
		});

		describe('Logarithmic Functions', () => {
			it('should accept dimensionless for ln', () => {
				const expr = func('ln', [number('2.718')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(true);
				expect(result.resultUnit!.components.size).toBe(0);
			});

			it('should reject unit input for log', () => {
				const expr = func('log', [quantity('10', 'm')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(false);
			});

			it('should accept dimensionless for exp', () => {
				const expr = func('exp', [number('1')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(true);
				expect(result.resultUnit!.components.size).toBe(0);
			});
		});

		describe('Rounding Functions', () => {
			it('should preserve unit for floor', () => {
				const expr = func('floor', [quantity('5.7', 'm')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(true);
				expect(result.resultUnit!.components.get('m')).toBe(1);
			});

			it('should preserve unit for ceil', () => {
				const expr = func('ceil', [quantity('5.3', 'm')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(true);
				expect(result.resultUnit!.components.get('m')).toBe(1);
			});

			it('should preserve unit for round', () => {
				const expr = func('round', [quantity('5.5', 'm')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(true);
				expect(result.resultUnit!.components.get('m')).toBe(1);
			});

			it('should return dimensionless for sign function', () => {
				const expr = func('sign', [quantity('5', 'm')]);
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(true);
				expect(result.resultUnit!.components.size).toBe(0);
			});
		});

		describe('Empty Context', () => {
			it('should handle empty context object', () => {
				const result = analyzeDimensions(number('5'), {});

				expect(result.valid).toBe(true);
				expect(result.resultUnit).toBe(null);
			});

			it('should handle undefined context', () => {
				const result = analyzeDimensions(number('5'));

				expect(result.valid).toBe(true);
				expect(result.resultUnit).toBe(null);
			});
		});

		describe('Dimensionless Unit Object vs Null', () => {
			it('should distinguish between dimensionless Unit and null', () => {
				// Number alone returns null (no unit info)
				const numResult = analyzeDimensions(number('5'));
				expect(numResult.resultUnit).toBe(null);

				// sin returns dimensionless Unit object
				const sinResult = analyzeDimensions(sin(number('0')));
				expect(sinResult.resultUnit).not.toBe(null);
				expect(sinResult.resultUnit!.components.size).toBe(0);
			});
		});

		describe('Addition Order Independence', () => {
			it('should handle left null, right unit case', () => {
				const expr = add(number('5'), quantity('3', 'm'));
				const result = analyzeDimensions(expr);

				// Without allowDimensionlessMix, this should fail
				expect(result.valid).toBe(false);
			});

			it('should handle left unit, right null case', () => {
				const expr = add(quantity('5', 'm'), number('3'));
				const result = analyzeDimensions(expr);

				// Without allowDimensionlessMix, this should fail
				expect(result.valid).toBe(false);
			});

			it('should handle both with allowDimensionlessMix', () => {
				const context = createContext({}, { allowDimensionlessMix: true });

				const expr1 = add(number('5'), quantity('3', 'm'));
				const result1 = analyzeDimensions(expr1, context);
				expect(result1.valid).toBe(true);
				expect(result1.resultUnit!.components.get('m')).toBe(1);

				const expr2 = add(quantity('5', 'm'), number('3'));
				const result2 = analyzeDimensions(expr2, context);
				expect(result2.valid).toBe(true);
				expect(result2.resultUnit!.components.get('m')).toBe(1);
			});
		});

		describe('Division Edge Cases', () => {
			it('should handle dimensionless / dimensionless', () => {
				const expr = divide(number('10'), number('2'), 'fraction');
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(true);
				expect(result.resultUnit).toBe(null);
			});
		});

		describe('Error Details', () => {
			it('should include expected and actual in incompatible units error', () => {
				const expr = add(quantity('5', 'm'), quantity('3', 's'));
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(false);
				expect(result.errors[0].details).toBeDefined();
				expect(result.errors[0].details!.expected).toBeDefined();
				expect(result.errors[0].details!.actual).toBeDefined();
			});

			it('should include function name in function errors', () => {
				const expr = sin(quantity('5', 'm'));
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(false);
				expect(result.errors[0].details?.functionName).toBe('sin');
			});

			it('should include node reference in all errors', () => {
				const expr = add(quantity('5', 'm'), quantity('3', 's'));
				const result = analyzeDimensions(expr);

				expect(result.valid).toBe(false);
				expect(result.errors[0].node).toBeDefined();
				expect(result.errors[0].node.type).toBe('addition');
			});
		});

		describe('Non-numeric Exponents', () => {
			it('should handle variable exponent with dimensionless base', () => {
				const context = createContext({ n: null! }); // n is dimensionless (null)
				const expr = power(number('2'), variable('n'));
				const result = analyzeDimensions(expr, context);

				// Should succeed since base is dimensionless
				expect(result.valid).toBe(true);
			});

			it('should warn for non-numeric exponent with unit base', () => {
				const context = createContext({ n: null! }, { strictMode: false });
				const expr = power(quantity('5', 'm'), variable('n'));
				const result = analyzeDimensions(expr, context);

				// Should have a warning about undetermined unit
				expect(result.warnings).toBeDefined();
			});
		});

		describe('formatUnit Edge Cases', () => {
			it('should format composite unit with exponents', () => {
				const u = fromComponents(
					new Map([
						['m', 2],
						['s', -1]
					]),
					1
				);
				const formatted = formatUnit(u);

				// Should contain both components
				expect(formatted).toContain('m');
				expect(formatted).toContain('s');
			});
		});

		describe('extractNumericValue Edge Cases', () => {
			it('should handle division by zero', () => {
				const expr = fraction(number('1'), number('0'));
				const result = extractNumericValue(expr);
				// Division by zero returns null
				expect(result).toBe(null);
			});

			it('should handle nested positive/negative', () => {
				const expr = opposite(opposite(number('5')));
				const result = extractNumericValue(expr);
				expect(result).toBe(5);
			});
		});
	});
});
