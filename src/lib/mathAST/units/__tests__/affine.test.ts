/**
 * Unit AST - Affine Conversions Tests (Celsius/Fahrenheit)
 *
 * Tests for affine temperature conversions:
 * - °C and °F catalog presence with offset field
 * - convertAffine() function for absolute temperature conversion
 * - isAffine() helper
 * - multiply/divide rejection when affine units involved
 * - eval-pipeline semantics:
 *   - 100°C - 50°C → 50 K (difference of absolutes is a delta in K)
 *   - 5°C + 3 K → 8°C (absolute + delta = absolute)
 *   - 5°C + 3°C → error (sum of absolutes forbidden)
 *   - 5°C × 2 → error (composition forbidden)
 *
 * @see docs/wip/units-imperial-affine-progress.md
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { resolveUnit } from '../definitions';
import { unit } from '../factory';
import { getConversionFactor, unitsAreCompatible, convertAffine, isAffine } from '../conversion';
import { multiply as multiplyUnits, divide as divideUnits } from '../operations';
import { evaluateWithUnits, DimensionalEvaluationError } from '../../eval/evaluate-with-units';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import { add, subtract, multiply, withUnit } from '../../factory';
import { numericNode } from '../../common/numeric';
import { UnitAST } from '../factory';
import type { EvalValue, ComplexValueResult } from '../../eval/types';
import type { MathNode } from '../../types';

// =============================================================================
// Test Helpers
// =============================================================================

function quantity(value: string, unitStr: string) {
	const u = UnitAST.unit(unitStr);
	if (!u) throw new Error(`Invalid unit: ${unitStr}`);
	return withUnit(numericNode(value), u);
}

function isMathNode(value: EvalValue): value is MathNode {
	return typeof value === 'object' && 'type' in value;
}

function isComplex(value: EvalValue): value is ComplexValueResult {
	return typeof value === 'object' && 'real' in value && 'imag' in value;
}

function toNumber(value: EvalValue): number {
	if (isComplex(value)) {
		if (value.imag !== 0) throw new Error('Complex value');
		return value.real;
	}
	if (isMathNode(value)) {
		return evaluateNodeToApproximatedNumber(value);
	}
	return value;
}

// =============================================================================
// Catalog presence
// =============================================================================

describe('Affine units - catalog presence', () => {
	it('resolves "°C" with baseSymbol K, coefficient 1, offset 273.15', () => {
		const def = resolveUnit('°C');
		expect(def).not.toBeNull();
		expect(def?.baseSymbol).toBe('K');
		expect(def?.dimension).toBe('temperature');
		expect(def?.coefficient).toBeCloseTo(1, 12);
		expect(def?.offset).toBeCloseTo(273.15, 12);
	});

	it('resolves "°F" with baseSymbol K, coefficient 5/9, offset 459.67', () => {
		const def = resolveUnit('°F');
		expect(def).not.toBeNull();
		expect(def?.baseSymbol).toBe('K');
		expect(def?.dimension).toBe('temperature');
		expect(def?.coefficient).toBeCloseTo(5 / 9, 12);
		expect(def?.offset).toBeCloseTo(459.67, 12);
	});

	it('parses "°C" as a Unit with offset propagated', () => {
		const u = parse('°C');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['K', 1]]));
		expect(u?.coefficient).toBeCloseTo(1, 12);
		expect(u?.offset).toBeCloseTo(273.15, 12);
	});

	it('parses "°F" as a Unit with offset propagated', () => {
		const u = parse('°F');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['K', 1]]));
		expect(u?.coefficient).toBeCloseTo(5 / 9, 12);
		expect(u?.offset).toBeCloseTo(459.67, 12);
	});
});

// =============================================================================
// isAffine helper
// =============================================================================

describe('isAffine helper', () => {
	it('returns true for °C', () => {
		expect(isAffine(unit('°C')!)).toBe(true);
	});

	it('returns true for °F', () => {
		expect(isAffine(unit('°F')!)).toBe(true);
	});

	it('returns false for K (no offset)', () => {
		expect(isAffine(unit('K')!)).toBe(false);
	});

	it('returns false for plain length unit (m)', () => {
		expect(isAffine(unit('m')!)).toBe(false);
	});

	it('returns false for time unit (s)', () => {
		expect(isAffine(unit('s')!)).toBe(false);
	});
});

// =============================================================================
// convertAffine
// =============================================================================

describe('convertAffine - absolute temperature conversion', () => {
	it('converts 0°C to 273.15 K', () => {
		const result = convertAffine(0, unit('°C')!, unit('K')!);
		expect(result).not.toBeNull();
		expect(result!).toBeCloseTo(273.15, 9);
	});

	it('converts 100°C to 373.15 K', () => {
		const result = convertAffine(100, unit('°C')!, unit('K')!);
		expect(result).not.toBeNull();
		expect(result!).toBeCloseTo(373.15, 9);
	});

	it('converts 273.15 K to 0°C', () => {
		const result = convertAffine(273.15, unit('K')!, unit('°C')!);
		expect(result).not.toBeNull();
		expect(result!).toBeCloseTo(0, 9);
	});

	it('converts 0°C to 32°F', () => {
		const result = convertAffine(0, unit('°C')!, unit('°F')!);
		expect(result).not.toBeNull();
		expect(result!).toBeCloseTo(32, 9);
	});

	it('converts 100°C to 212°F', () => {
		const result = convertAffine(100, unit('°C')!, unit('°F')!);
		expect(result).not.toBeNull();
		expect(result!).toBeCloseTo(212, 9);
	});

	it('converts -40°C to -40°F (sanity check, intersection point)', () => {
		const result = convertAffine(-40, unit('°C')!, unit('°F')!);
		expect(result).not.toBeNull();
		expect(result!).toBeCloseTo(-40, 9);
	});

	it('converts 32°F to 0°C', () => {
		const result = convertAffine(32, unit('°F')!, unit('°C')!);
		expect(result).not.toBeNull();
		expect(result!).toBeCloseTo(0, 9);
	});

	it('converts 0°F to 255.372... K', () => {
		const result = convertAffine(0, unit('°F')!, unit('K')!);
		expect(result).not.toBeNull();
		// 0°F = (0 + 459.67) * 5/9 = 255.3722...K
		expect(result!).toBeCloseTo(255.3722222222, 8);
	});

	it('also handles non-affine pairs (delegates to multiplicative): 1 km to 1000 m', () => {
		// convertAffine should work on multiplicative units too (unified entry point)
		const result = convertAffine(1, unit('km')!, unit('m')!);
		expect(result).not.toBeNull();
		expect(result!).toBeCloseTo(1000, 9);
	});

	it('returns null for incompatible units (m vs K)', () => {
		const result = convertAffine(1, unit('m')!, unit('K')!);
		expect(result).toBeNull();
	});
});

// =============================================================================
// getConversionFactor with affine units
// =============================================================================

describe('getConversionFactor - affine units', () => {
	it('returns null when from unit is affine (°C → K)', () => {
		// Multiplicative conversion is undefined for absolute temperatures.
		// Use convertAffine instead.
		const factor = getConversionFactor(unit('°C')!, unit('K')!);
		expect(factor).toBeNull();
	});

	it('returns null when to unit is affine (K → °C)', () => {
		const factor = getConversionFactor(unit('K')!, unit('°C')!);
		expect(factor).toBeNull();
	});

	it('returns null when both are affine (°C → °F)', () => {
		const factor = getConversionFactor(unit('°C')!, unit('°F')!);
		expect(factor).toBeNull();
	});
});

// =============================================================================
// Composition rejection (multiply, divide)
// =============================================================================

describe('Composition rejection - multiply/divide affine units', () => {
	it('multiply(°C, m) throws AFFINE_COMPOSITION_FORBIDDEN', () => {
		expect(() => multiplyUnits(unit('°C')!, unit('m')!)).toThrow(/AFFINE/);
	});

	it('multiply(m, °C) throws AFFINE_COMPOSITION_FORBIDDEN', () => {
		expect(() => multiplyUnits(unit('m')!, unit('°C')!)).toThrow(/AFFINE/);
	});

	it('multiply(°C, °C) throws AFFINE_COMPOSITION_FORBIDDEN', () => {
		expect(() => multiplyUnits(unit('°C')!, unit('°C')!)).toThrow(/AFFINE/);
	});

	it('divide(°C, s) throws AFFINE_COMPOSITION_FORBIDDEN', () => {
		expect(() => divideUnits(unit('°C')!, unit('s')!)).toThrow(/AFFINE/);
	});

	it('divide(K, °C) throws AFFINE_COMPOSITION_FORBIDDEN', () => {
		expect(() => divideUnits(unit('K')!, unit('°C')!)).toThrow(/AFFINE/);
	});
});

// =============================================================================
// Compatibility (dimensional)
// =============================================================================

describe('Compatibility - affine units share temperature dimension', () => {
	it('°C and K are compatible', () => {
		expect(unitsAreCompatible(unit('°C')!, unit('K')!)).toBe(true);
	});

	it('°C and °F are compatible', () => {
		expect(unitsAreCompatible(unit('°C')!, unit('°F')!)).toBe(true);
	});

	it('°C and m are incompatible', () => {
		expect(unitsAreCompatible(unit('°C')!, unit('m')!)).toBe(false);
	});
});

// =============================================================================
// Integration with evaluateWithUnits (semantics of operations)
// =============================================================================

describe('evaluateWithUnits - affine semantics', () => {
	it('100°C - 50°C → 50 K (difference of absolute temperatures is a delta)', () => {
		const expr = subtract(quantity('100', '°C'), quantity('50', '°C'));
		const result = evaluateWithUnits(expr);
		expect(toNumber(result.value)).toBeCloseTo(50, 9);
		// Result unit should be K (delta), not °C (absolute)
		expect(result.unit.components.get('K')).toBe(1);
		expect(result.unit.offset === undefined || result.unit.offset === 0).toBe(true);
	});

	it('5°C + 3 K → 8°C (absolute + delta = absolute, in left unit)', () => {
		const expr = add(quantity('5', '°C'), quantity('3', 'K'));
		const result = evaluateWithUnits(expr);
		expect(toNumber(result.value)).toBeCloseTo(8, 9);
		// Result unit should be °C (preserved from left operand, absolute)
		expect(result.unit.offset).toBeCloseTo(273.15, 9);
	});

	it('rejects 5°C + 3°C (sum of absolute temperatures)', () => {
		const expr = add(quantity('5', '°C'), quantity('3', '°C'));
		expect(() => evaluateWithUnits(expr)).toThrow(DimensionalEvaluationError);
	});

	it('rejects 5°C × 2 (composition with scalar still meaningless for absolute)', () => {
		const expr = multiply(quantity('5', '°C'), numericNode('2'), 'implicit');
		expect(() => evaluateWithUnits(expr)).toThrow(/AFFINE/);
	});

	it('rejects 5°C × 3 m (composition with another unit)', () => {
		const expr = multiply(quantity('5', '°C'), quantity('3', 'm'), 'implicit');
		expect(() => evaluateWithUnits(expr)).toThrow(/AFFINE/);
	});

	it('handles delimiter-wrapped operands: (100°C) - (50°C) → 50 K', () => {
		const wrap = (q: ReturnType<typeof quantity>): MathNode => ({
			type: 'delimiter',
			content: q,
			delimiters: 'parentheses'
		});
		const expr = subtract(wrap(quantity('100', '°C')), wrap(quantity('50', '°C')));
		const result = evaluateWithUnits(expr);
		expect(toNumber(result.value)).toBeCloseTo(50, 9);
		expect(result.unit.components.get('K')).toBe(1);
		expect(result.unit.offset === undefined || result.unit.offset === 0).toBe(true);
	});

	it('handles °F + delta: 50°F + 9 K → 50°F (since 9 K = 16.2°F delta) ≈ 66.2°F', () => {
		// 9 K delta = 9 / (5/9) °F delta = 16.2 °F
		const expr = add(quantity('50', '°F'), quantity('9', 'K'));
		const result = evaluateWithUnits(expr);
		expect(toNumber(result.value)).toBeCloseTo(50 + 16.2, 6);
		expect(result.unit.offset).toBeCloseTo(459.67, 9);
	});

	it('handles °F − °F → K: 100°F - 32°F = 37.777... K', () => {
		// (100°F - 32°F) = 68 °F delta = 68 × 5/9 K = 37.777... K
		const expr = subtract(quantity('100', '°F'), quantity('32', '°F'));
		const result = evaluateWithUnits(expr);
		expect(toNumber(result.value)).toBeCloseTo((68 * 5) / 9, 9);
		expect(result.unit.components.get('K')).toBe(1);
		expect(result.unit.offset === undefined || result.unit.offset === 0).toBe(true);
	});

	it('rejects K - °C (delta - absolute is meaningless)', () => {
		const expr = subtract(quantity('5', 'K'), quantity('3', '°C'));
		expect(() => evaluateWithUnits(expr)).toThrow(/AFFINE/);
	});
});

// =============================================================================
// Round-trip and unit-equivalence tests
// =============================================================================

describe('convertAffine - round-trip and identity', () => {
	it('°F → K → °C round-trip: 212°F → ... → 100°C', () => {
		const k = convertAffine(212, unit('°F')!, unit('K')!)!;
		const c = convertAffine(k, unit('K')!, unit('°C')!)!;
		expect(c).toBeCloseTo(100, 9);
	});

	it('°C → °C identity (same unit) returns same value', () => {
		const result = convertAffine(42.5, unit('°C')!, unit('°C')!);
		expect(result).toBeCloseTo(42.5, 12);
	});
});
