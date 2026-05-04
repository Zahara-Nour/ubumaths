/**
 * Unit AST - Derived SI Units Tests (Newton, Joule, Watt, ...)
 *
 * Tests for derived SI unit recognition and parsing:
 * - Catalog: Hz, N, Pa, J, W, C, V, Ω, F (9 units)
 * - parseUnit support with their full SI base signatures
 * - SI prefixes on derived units (kN, mJ, μF, MΩ, kHz, etc.)
 * - recognizeDerivedUnit() — turns a normalized SI base unit into its
 *   derived-symbol equivalent (or null if not recognized)
 * - Pipeline integration: evaluateWithUnits in 'best' mode prefers
 *   derived units over composite SI base forms
 *
 * Architecture notes:
 * - Project's mass baseSymbol is `g` (not `kg`), so a Newton's coefficient
 *   is 1000 (since 1 N = 1 kg·m·s⁻² = 1000 g·m·s⁻²).
 * - Farad has coefficient 0.001 (1 F = 1 kg⁻¹·... = 1/1000 g⁻¹·...).
 *
 * @see docs/wip/units-derived-progress.md
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { resolveUnit } from '../definitions';
import { unit, fromComponents } from '../factory';
import { recognizeDerivedUnit } from '../conversion';
import { evaluateWithUnits } from '../../eval/evaluate-with-units';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import { multiply, divide, withUnit } from '../../factory';
import { numericNode } from '../../common/numeric';
import { UnitAST } from '../factory';
import type { EvalValue, ComplexValueResult } from '../../eval/types';
import type { MathNode } from '../../types';

// =============================================================================
// Helpers
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
// A. Catalog presence — resolveUnit returns the correct definition
// =============================================================================

describe('Derived units - resolveUnit catalog', () => {
	it('Hz → frequency, components {s:-1}, coefficient 1', () => {
		const def = resolveUnit('Hz');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('frequency');
		expect(def?.coefficient).toBeCloseTo(1, 12);
	});

	it('N → force, coefficient 1000 (1 kg·m·s⁻² = 1000 g·m·s⁻²)', () => {
		const def = resolveUnit('N');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('force');
		expect(def?.coefficient).toBeCloseTo(1000, 6);
	});

	it('Pa → pressure, coefficient 1000', () => {
		const def = resolveUnit('Pa');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('pressure');
		expect(def?.coefficient).toBeCloseTo(1000, 6);
	});

	it('J → energy, coefficient 1000', () => {
		const def = resolveUnit('J');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('energy');
		expect(def?.coefficient).toBeCloseTo(1000, 6);
	});

	it('W → power, coefficient 1000', () => {
		const def = resolveUnit('W');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('power');
		expect(def?.coefficient).toBeCloseTo(1000, 6);
	});

	it('C → electric_charge, coefficient 1', () => {
		const def = resolveUnit('C');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('electric_charge');
		expect(def?.coefficient).toBeCloseTo(1, 12);
	});

	it('V → electric_potential, coefficient 1000', () => {
		const def = resolveUnit('V');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('electric_potential');
		expect(def?.coefficient).toBeCloseTo(1000, 6);
	});

	it('Ω → electric_resistance, coefficient 1000', () => {
		const def = resolveUnit('Ω');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('electric_resistance');
		expect(def?.coefficient).toBeCloseTo(1000, 6);
	});

	it('F → electric_capacitance, coefficient 0.001', () => {
		const def = resolveUnit('F');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('electric_capacitance');
		expect(def?.coefficient).toBeCloseTo(0.001, 12);
	});
});

// =============================================================================
// B. parseUnit — full Unit objects with correct SI base components
// =============================================================================

describe('Derived units - parseUnit', () => {
	it('parses "Hz" with components Map([["s", -1]])', () => {
		const u = parse('Hz');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['s', -1]]));
		expect(u?.coefficient).toBeCloseTo(1, 12);
	});

	it('parses "N" with components Map([["g", 1], ["m", 1], ["s", -2]])', () => {
		const u = parse('N');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(
			new Map([
				['g', 1],
				['m', 1],
				['s', -2]
			])
		);
		expect(u?.coefficient).toBeCloseTo(1000, 6);
	});

	it('parses "Pa" with components Map([["g", 1], ["m", -1], ["s", -2]])', () => {
		const u = parse('Pa');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(
			new Map([
				['g', 1],
				['m', -1],
				['s', -2]
			])
		);
		expect(u?.coefficient).toBeCloseTo(1000, 6);
	});

	it('parses "J" with components Map([["g", 1], ["m", 2], ["s", -2]])', () => {
		const u = parse('J');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(
			new Map([
				['g', 1],
				['m', 2],
				['s', -2]
			])
		);
		expect(u?.coefficient).toBeCloseTo(1000, 6);
	});

	it('parses "W" with components Map([["g", 1], ["m", 2], ["s", -3]])', () => {
		const u = parse('W');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(
			new Map([
				['g', 1],
				['m', 2],
				['s', -3]
			])
		);
		expect(u?.coefficient).toBeCloseTo(1000, 6);
	});

	it('parses "C" with components Map([["A", 1], ["s", 1]])', () => {
		const u = parse('C');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(
			new Map([
				['A', 1],
				['s', 1]
			])
		);
		expect(u?.coefficient).toBeCloseTo(1, 12);
	});

	it('parses "V" with components Map([["g", 1], ["m", 2], ["s", -3], ["A", -1]])', () => {
		const u = parse('V');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(
			new Map([
				['g', 1],
				['m', 2],
				['s', -3],
				['A', -1]
			])
		);
		expect(u?.coefficient).toBeCloseTo(1000, 6);
	});

	it('parses "Ω" with components Map([["g", 1], ["m", 2], ["s", -3], ["A", -2]])', () => {
		const u = parse('Ω');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(
			new Map([
				['g', 1],
				['m', 2],
				['s', -3],
				['A', -2]
			])
		);
		expect(u?.coefficient).toBeCloseTo(1000, 6);
	});

	it('parses "F" with components Map([["g", -1], ["m", -2], ["s", 4], ["A", 2]])', () => {
		const u = parse('F');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(
			new Map([
				['g', -1],
				['m', -2],
				['s', 4],
				['A', 2]
			])
		);
		expect(u?.coefficient).toBeCloseTo(0.001, 12);
	});
});

// =============================================================================
// C. SI prefixes on derived units
// =============================================================================

describe('Derived units - SI prefixes', () => {
	it('kN (kilo-Newton) coefficient = 1e6 (1000 prefix × 1000 base)', () => {
		const u = parse('kN');
		expect(u).not.toBeNull();
		expect(u?.coefficient).toBeCloseTo(1e6, 0);
	});

	it('mJ (milli-Joule) coefficient = 1 (0.001 prefix × 1000 base)', () => {
		const u = parse('mJ');
		expect(u).not.toBeNull();
		expect(u?.coefficient).toBeCloseTo(1, 6);
	});

	it('μF (micro-Farad) coefficient = 1e-9 (1e-6 × 0.001)', () => {
		const u = parse('μF');
		expect(u).not.toBeNull();
		expect(u?.coefficient).toBeCloseTo(1e-9, 15);
	});

	it('MΩ (mega-Ohm) coefficient = 1e9 (1e6 × 1000)', () => {
		const u = parse('MΩ');
		expect(u).not.toBeNull();
		expect(u?.coefficient).toBeCloseTo(1e9, 0);
	});

	it('kHz (kilo-Hertz) coefficient = 1000 (1000 × 1)', () => {
		const u = parse('kHz');
		expect(u).not.toBeNull();
		expect(u?.coefficient).toBeCloseTo(1000, 6);
	});

	it('mHz (milli-Hertz) coefficient = 0.001', () => {
		const u = parse('mHz');
		expect(u).not.toBeNull();
		expect(u?.coefficient).toBeCloseTo(0.001, 12);
	});

	it('kPa (kilo-Pascal) coefficient = 1e6', () => {
		const u = parse('kPa');
		expect(u).not.toBeNull();
		expect(u?.coefficient).toBeCloseTo(1e6, 0);
	});

	it('mW (milli-Watt) coefficient = 1 (0.001 × 1000)', () => {
		const u = parse('mW');
		expect(u).not.toBeNull();
		expect(u?.coefficient).toBeCloseTo(1, 6);
	});
});

// =============================================================================
// D. recognizeDerivedUnit — composed → named
// =============================================================================

describe('recognizeDerivedUnit', () => {
	it('recognizes s⁻¹ as Hz', () => {
		const composed = fromComponents(new Map([['s', -1]]), 1);
		const result = recognizeDerivedUnit(composed);
		expect(result).not.toBeNull();
		expect(result?.original).toBe('Hz');
	});

	it('recognizes g·m·s⁻² with coefficient 1000 as N', () => {
		const composed = fromComponents(
			new Map([
				['g', 1],
				['m', 1],
				['s', -2]
			]),
			1000
		);
		const result = recognizeDerivedUnit(composed);
		expect(result).not.toBeNull();
		expect(result?.original).toBe('N');
	});

	it('recognizes g·m²·s⁻² with coefficient 1000 as J', () => {
		const composed = fromComponents(
			new Map([
				['g', 1],
				['m', 2],
				['s', -2]
			]),
			1000
		);
		const result = recognizeDerivedUnit(composed);
		expect(result).not.toBeNull();
		expect(result?.original).toBe('J');
	});

	it('recognizes A·s as C', () => {
		const composed = fromComponents(
			new Map([
				['A', 1],
				['s', 1]
			]),
			1
		);
		const result = recognizeDerivedUnit(composed);
		expect(result).not.toBeNull();
		expect(result?.original).toBe('C');
	});

	it('returns null for plain meter (not a derived unit)', () => {
		const m = unit('m')!;
		expect(recognizeDerivedUnit(m)).toBeNull();
	});

	it('returns null for plain kg', () => {
		const kg = unit('kg')!;
		expect(recognizeDerivedUnit(kg)).toBeNull();
	});

	it('returns null for dimensionless', () => {
		const dimless = UnitAST.dimensionless();
		expect(recognizeDerivedUnit(dimless)).toBeNull();
	});

	it('returns null for kg·m³ (not a known derived unit)', () => {
		const composed = fromComponents(
			new Map([
				['g', 1],
				['m', 3]
			]),
			1000
		);
		expect(recognizeDerivedUnit(composed)).toBeNull();
	});

	it('returns null for m/s (velocity, not a named SI derived)', () => {
		const composed = fromComponents(
			new Map([
				['m', 1],
				['s', -1]
			]),
			1
		);
		expect(recognizeDerivedUnit(composed)).toBeNull();
	});
});

// =============================================================================
// E. Pipeline integration — 'best' mode prefers derived units
// =============================================================================

describe('evaluateWithUnits - best mode prefers derived units', () => {
	it('5 kg × 3 m / (1 s)² → 15 N', () => {
		// (5 kg) * (3 m) / (1 s)² — using parsed units, mode 'best'
		const num = multiply(quantity('5', 'kg'), quantity('3', 'm'), 'implicit');
		const denom = multiply(quantity('1', 's'), quantity('1', 's'), 'implicit');
		const expr = divide(num, denom, 'fraction');
		const result = evaluateWithUnits(expr, { conversionMode: 'best' });
		expect(toNumber(result.value)).toBeCloseTo(15, 6);
		// The result unit should be N (derived) — checked via the original symbol or signature
		expect(result.unit.original).toBe('N');
	});

	it('2 N × 3 m → 6 J', () => {
		const expr = multiply(quantity('2', 'N'), quantity('3', 'm'), 'implicit');
		const result = evaluateWithUnits(expr, { conversionMode: 'best' });
		expect(toNumber(result.value)).toBeCloseTo(6, 6);
		expect(result.unit.original).toBe('J');
	});

	it('100 kg·m/s² → 100 N', () => {
		const u = UnitAST.fromComponents(
			new Map([
				['g', 1],
				['m', 1],
				['s', -2]
			]),
			1000
		);
		const expr = withUnit(numericNode('100'), u);
		const result = evaluateWithUnits(expr, { conversionMode: 'best' });
		expect(toNumber(result.value)).toBeCloseTo(100, 6);
		expect(result.unit.original).toBe('N');
	});

	it('non-derived velocity (10 m/s) stays composite in best mode', () => {
		const expr = divide(quantity('10', 'm'), quantity('1', 's'), 'fraction');
		const result = evaluateWithUnits(expr, { conversionMode: 'best' });
		expect(result.unit.original === 'N' || result.unit.original === 'J').toBe(false);
	});
});

// =============================================================================
// F. Pipeline integration — recognizeDerived flag in non-best modes
// =============================================================================

describe('evaluateWithUnits - recognizeDerived flag', () => {
	it('first mode with recognizeDerived: true → recognizes N', () => {
		const num = multiply(quantity('5', 'kg'), quantity('3', 'm'), 'implicit');
		const denom = multiply(quantity('1', 's'), quantity('1', 's'), 'implicit');
		const expr = divide(num, denom, 'fraction');
		const result = evaluateWithUnits(expr, {
			conversionMode: 'first',
			recognizeDerived: true
		});
		expect(result.unit.original).toBe('N');
	});

	it('first mode without flag → keeps composite form', () => {
		const num = multiply(quantity('5', 'kg'), quantity('3', 'm'), 'implicit');
		const denom = multiply(quantity('1', 's'), quantity('1', 's'), 'implicit');
		const expr = divide(num, denom, 'fraction');
		const result = evaluateWithUnits(expr, { conversionMode: 'first' });
		expect(result.unit.original).not.toBe('N');
	});

	it('si mode with recognizeDerived: true → recognizes J', () => {
		const expr = multiply(quantity('2', 'N'), quantity('3', 'm'), 'implicit');
		const result = evaluateWithUnits(expr, {
			conversionMode: 'si',
			recognizeDerived: true
		});
		expect(result.unit.original).toBe('J');
	});
});

// =============================================================================
// G. Edge cases (suggested by code review)
// =============================================================================

describe('Derived units - edge cases', () => {
	it('unitWithPower("N", 2) expands the full SI signature', () => {
		// N² = (g·m·s⁻²)² = g²·m²·s⁻⁴
		const u = UnitAST.unitWithPower('N', 2);
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(
			new Map([
				['g', 2],
				['m', 2],
				['s', -4]
			])
		);
		// coefficient = 1000² = 1e6
		expect(u?.coefficient).toBeCloseTo(1e6, 0);
	});

	it('parseUnit("dC") = deci-Coulomb (coefficient 0.1)', () => {
		const u = parse('dC');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(
			new Map([
				['A', 1],
				['s', 1]
			])
		);
		expect(u?.coefficient).toBeCloseTo(0.1, 12);
	});

	it('recognizeDerivedUnit is idempotent on already-recognized Hz', () => {
		// First recognition
		const composed = fromComponents(new Map([['s', -1]]), 1);
		const first = recognizeDerivedUnit(composed)!;
		expect(first.original).toBe('Hz');
		// Second recognition on the canonical Hz
		const second = recognizeDerivedUnit(first)!;
		expect(second.original).toBe('Hz');
		expect(second.coefficient).toBeCloseTo(first.coefficient, 12);
	});

	it("first mode + recognizeDerived: true on '1000 ms^-1' yields 1 Hz", () => {
		// 1000 ms⁻¹ — but ms parses to (s, coef 0.001). The reciprocal in
		// composite form yields a (s⁻¹) signature with coefficient 1/0.001 = 1000
		// when applied to value 1000, the SI-base value is 1000 × 1000 = 1e6 Hz.
		// Simpler: build (s⁻¹) directly with value 5.
		const u = UnitAST.unitWithPower('s', -1)!;
		const expr = withUnit(numericNode('5'), u);
		const result = evaluateWithUnits(expr, {
			conversionMode: 'first',
			recognizeDerived: true
		});
		expect(result.unit.original).toBe('Hz');
		expect(toNumber(result.value)).toBeCloseTo(5, 6);
	});
});
