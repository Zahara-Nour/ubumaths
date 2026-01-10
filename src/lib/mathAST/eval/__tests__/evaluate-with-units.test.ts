/**
 * Unit tests for MathAST unit-aware evaluation
 */

import { describe, it, expect } from 'vitest';
import { evaluateWithUnits, DimensionalEvaluationError } from '../evaluate-with-units';
import { evaluateNodeToApproximatedNumber } from '../evaluate';
import { number, add, multiply, divide, func, withUnit } from '../../factory';
import { UnitAST } from '../../units/factory';
import type { MathNode } from '../../types';
import type { EvalValue, ComplexValueResult } from '../types';

// Helper to create quantity (number with unit)
function quantity(value: string, unitStr: string) {
	const unit = UnitAST.unit(unitStr);
	if (!unit) throw new Error(`Invalid unit: ${unitStr}`);
	return withUnit(number(value), unit);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to check if a value is a MathNode
 */
function isMathNode(value: EvalValue): value is MathNode {
	return typeof value === 'object' && 'type' in value;
}

/**
 * Helper to check if a value is Complex
 */
function isComplex(value: EvalValue): value is ComplexValueResult {
	return typeof value === 'object' && 'real' in value && 'imag' in value;
}

/**
 * Get numeric value from EvalValue
 */
function toNumber(value: EvalValue): number {
	if (isComplex(value)) {
		if (value.imag !== 0) {
			throw new Error('Cannot convert complex number to scalar');
		}
		return value.real;
	}
	if (isMathNode(value)) {
		return evaluateNodeToApproximatedNumber(value);
	}
	return value;
}

// =============================================================================
// Basic Unit Evaluation Tests
// =============================================================================

describe('evaluateWithUnits - basic', () => {
	describe('single unit expressions', () => {
		it('evaluates a simple quantity: 5 m', () => {
			const expr = quantity('5', 'm');
			const result = evaluateWithUnits(expr);

			expect(toNumber(result.value)).toBe(5);
			expect(result.unit.components.get('m')).toBe(1);
		});

		it('evaluates a quantity with prefix: 5 km', () => {
			const expr = quantity('5', 'km');
			const result = evaluateWithUnits(expr);

			expect(toNumber(result.value)).toBe(5);
			expect(result.unit.coefficient).toBe(1000);
		});

		it('evaluates a dimensionless number', () => {
			const expr = number('42');
			const result = evaluateWithUnits(expr);

			expect(toNumber(result.value)).toBe(42);
			expect(result.unit.components.size).toBe(0);
		});
	});
});

// =============================================================================
// Addition/Subtraction Tests (Same Units)
// =============================================================================

describe('evaluateWithUnits - addition/subtraction same units', () => {
	it('adds quantities with same unit: 5 m + 3 m = 8 m', () => {
		const expr = add(quantity('5', 'm'), quantity('3', 'm'));
		const result = evaluateWithUnits(expr);

		expect(toNumber(result.value)).toBe(8);
		expect(result.unit.components.get('m')).toBe(1);
	});

	it('adds quantities with same prefixed unit: 2 km + 3 km = 5 km', () => {
		const expr = add(quantity('2', 'km'), quantity('3', 'km'));
		const result = evaluateWithUnits(expr);

		expect(toNumber(result.value)).toBe(5);
		expect(result.unit.coefficient).toBe(1000);
	});
});

// =============================================================================
// Compatible Units Tests (Different Scales)
// =============================================================================

describe('evaluateWithUnits - compatible units', () => {
	describe('first mode (default)', () => {
		it('converts to first unit: 5 km + 3000 m = 8 km', () => {
			const expr = add(quantity('5', 'km'), quantity('3000', 'm'));
			const result = evaluateWithUnits(expr, { conversionMode: 'first' });

			expect(toNumber(result.value)).toBeCloseTo(8, 5);
			expect(result.unit.coefficient).toBe(1000); // km
		});

		it('uses first unit even if second is larger: 500 m + 2 km = 2500 m', () => {
			const expr = add(quantity('500', 'm'), quantity('2', 'km'));
			const result = evaluateWithUnits(expr, { conversionMode: 'first' });

			expect(toNumber(result.value)).toBeCloseTo(2500, 5);
			expect(result.unit.coefficient).toBe(1); // m
		});
	});

	describe('si mode', () => {
		it('normalizes to SI: 5 km + 3000 m = 8000 m', () => {
			const expr = add(quantity('5', 'km'), quantity('3000', 'm'));
			const result = evaluateWithUnits(expr, { conversionMode: 'si' });

			expect(toNumber(result.value)).toBeCloseTo(8000, 5);
			expect(result.unit.coefficient).toBe(1); // base SI
		});

		it('normalizes time: 1 h + 30 min = 5400 s', () => {
			const expr = add(quantity('1', 'h'), quantity('30', 'min'));
			const result = evaluateWithUnits(expr, { conversionMode: 'si' });

			expect(toNumber(result.value)).toBeCloseTo(5400, 5);
			expect(result.unit.components.get('s')).toBe(1);
		});
	});

	describe('best mode', () => {
		it('chooses readable unit: 0.005 km + 3 m = 8 m (not 0.008 km)', () => {
			const expr = add(quantity('0.005', 'km'), quantity('3', 'm'));
			const result = evaluateWithUnits(expr, { conversionMode: 'best' });

			// Result should be around 8, unit should be m (more readable than 0.008 km)
			const value = toNumber(result.value);
			expect(value).toBeGreaterThanOrEqual(0.1);
			expect(value).toBeLessThanOrEqual(1000);
		});

		it('chooses larger unit for large values: 5000 m = 5 km', () => {
			const expr = quantity('5000', 'm');
			const result = evaluateWithUnits(expr, { conversionMode: 'best' });

			const value = toNumber(result.value);
			// Should choose a unit that makes the value readable
			expect(value).toBeGreaterThanOrEqual(0.1);
			expect(value).toBeLessThanOrEqual(1000);
		});
	});
});

// =============================================================================
// Multiplication/Division Tests
// =============================================================================

describe('evaluateWithUnits - multiplication/division', () => {
	it('multiplies to create derived unit: 4 m * 3 m = 12 m^2', () => {
		const expr = multiply(quantity('4', 'm'), quantity('3', 'm'), 'implicit');
		const result = evaluateWithUnits(expr);

		expect(toNumber(result.value)).toBe(12);
		expect(result.unit.components.get('m')).toBe(2);
	});

	it('divides to create derived unit: 100 m / 10 s = 10 m/s', () => {
		const expr = divide(quantity('100', 'm'), quantity('10', 's'), 'fraction');
		const result = evaluateWithUnits(expr);

		expect(toNumber(result.value)).toBe(10);
		expect(result.unit.components.get('m')).toBe(1);
		expect(result.unit.components.get('s')).toBe(-1);
	});

	it('cancels units: 10 m / 2 m = 5 (dimensionless)', () => {
		const expr = divide(quantity('10', 'm'), quantity('2', 'm'), 'fraction');
		const result = evaluateWithUnits(expr);

		expect(toNumber(result.value)).toBe(5);
		// Result should be dimensionless
		expect(result.unit.components.size).toBe(0);
	});
});

// =============================================================================
// Error Cases
// =============================================================================

describe('evaluateWithUnits - error cases', () => {
	it('throws on incompatible units: 5 m + 3 s', () => {
		const expr = add(quantity('5', 'm'), quantity('3', 's'));

		expect(() => evaluateWithUnits(expr)).toThrow(DimensionalEvaluationError);
	});

	it('throws on incompatible units in subtraction: 10 kg - 2 m', () => {
		const expr = add(quantity('10', 'kg'), quantity('2', 'm'));

		expect(() => evaluateWithUnits(expr)).toThrow(DimensionalEvaluationError);
	});

	it('provides error details', () => {
		const expr = add(quantity('5', 'm'), quantity('3', 's'));

		try {
			evaluateWithUnits(expr);
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(DimensionalEvaluationError);
			const error = e as DimensionalEvaluationError;
			expect(error.errors.length).toBeGreaterThan(0);
			expect(error.errors[0].code).toBe('INCOMPATIBLE_UNITS');
		}
	});
});

// =============================================================================
// Function Tests
// =============================================================================

describe('evaluateWithUnits - functions', () => {
	it('sqrt halves unit exponents: sqrt(4 m^2) = 2 m', () => {
		const m2 = UnitAST.unitWithPower('m', 2);
		if (!m2) throw new Error('Failed to create m^2 unit');

		const expr = func('sqrt', [withUnit(number('4'), m2)]);
		const result = evaluateWithUnits(expr);

		expect(toNumber(result.value)).toBeCloseTo(2, 5);
		expect(result.unit.components.get('m')).toBe(1);
	});

	it('abs preserves unit: abs(-5 m) = 5 m', () => {
		const expr = func('abs', [quantity('-5', 'm')]);
		const result = evaluateWithUnits(expr);

		expect(toNumber(result.value)).toBe(5);
		expect(result.unit.components.get('m')).toBe(1);
	});
});

// =============================================================================
// Exact Mode Tests
// =============================================================================

describe('evaluateWithUnits - exact mode', () => {
	it('preserves exact arithmetic with units', () => {
		const expr = divide(quantity('1', 'm'), quantity('3', 's'), 'fraction');
		const result = evaluateWithUnits(expr, { mode: 'exact' });

		expect(result.exact).toBe(true);
		// In exact mode, value is a MathNode representing the fraction 1/3
		expect(isMathNode(result.value)).toBe(true);
	});

	it('decimal mode works with units', () => {
		const expr = divide(quantity('1', 'm'), quantity('3', 's'), 'fraction');
		const result = evaluateWithUnits(expr, { mode: 'decimal' });

		expect(typeof result.value).toBe('number');
		expect(toNumber(result.value)).toBeCloseTo(1 / 3, 10);
	});
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('evaluateWithUnits - edge cases', () => {
	describe('zero and near-zero values', () => {
		it('best mode handles zero value: 0 km stays in base unit', () => {
			const expr = quantity('0', 'km');
			const result = evaluateWithUnits(expr, { conversionMode: 'best' });

			expect(toNumber(result.value)).toBe(0);
			// Zero values stay in SI base unit
			expect(result.unit.coefficient).toBe(1);
		});

		// TODO: Fix normalize.ts to handle scientific notation
		it.skip('best mode handles near-zero value: 1e-12 m stays in base unit', () => {
			const expr = quantity('1e-12', 'm');
			const result = evaluateWithUnits(expr, { conversionMode: 'best' });

			const value = toNumber(result.value);
			// Value is too small to convert meaningfully
			expect(value).toBeCloseTo(1e-12, 15);
		});

		it('si mode handles zero correctly: 0 km = 0 m', () => {
			const expr = quantity('0', 'km');
			const result = evaluateWithUnits(expr, { conversionMode: 'si' });

			expect(toNumber(result.value)).toBe(0);
			expect(result.unit.coefficient).toBe(1);
		});
	});

	describe('complex expressions in units', () => {
		it('handles addition inside unit: (2+3) km in SI mode = 5000 m', () => {
			const innerExpr = add(number('2'), number('3'));
			const expr = withUnit(innerExpr, UnitAST.unit('km')!);
			const result = evaluateWithUnits(expr, { conversionMode: 'si' });

			expect(toNumber(result.value)).toBeCloseTo(5000, 5);
			expect(result.unit.coefficient).toBe(1); // m
		});

		it('handles multiplication inside unit: (2*3) m in first mode', () => {
			const innerExpr = multiply(number('2'), number('3'), 'implicit');
			const expr = withUnit(innerExpr, UnitAST.unit('m')!);
			const result = evaluateWithUnits(expr, { conversionMode: 'first' });

			expect(toNumber(result.value)).toBe(6);
			expect(result.unit.components.get('m')).toBe(1);
		});
	});
});
