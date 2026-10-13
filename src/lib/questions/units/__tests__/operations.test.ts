/**
 * Unit System - Operations Tests
 * ===============================
 *
 * Comprehensive tests for Phase 1 of the unit system:
 * - Unit operations (operations.ts)
 *
 * Test Categories:
 * 1. Unit Creation
 * 2. Unit Operations (multiply, divide, power)
 * 3. Unit Comparison (equality, compatibility)
 * 4. Conversion Factors
 * 5. Dimensional Analysis
 * 6. Formatting
 * 7. Parsing
 */

import { describe, test, expect } from 'vitest';
import {
	createUnit,
	dimensionlessUnit,
	createUnitFromComponents,
	multiplyUnits,
	divideUnits,
	powerUnit,
	invertUnit,
	unitsAreEqual,
	unitsAreCompatible,
	getConversionFactor,
	normalizeUnit,
	getDimensionalSignature,
	getDimension,
	isLength,
	isMass,
	isDuration,
	isVolume,
	isSpeed,
	isArea,
	isDimensionless,
	formatUnit,
	formatUnitUnicode,
	parseSimpleUnit
} from '../operations';
import type { Unit } from '../types';

// ============================================================================
// UNIT CREATION (operations.ts)
// ============================================================================

describe('Unit Creation', () => {
	describe('createUnit', () => {
		test('creates simple unit: m', () => {
			const unit = createUnit('m');
			expect(unit.components.get('m')).toBe(1);
			expect(unit.coefficient).toBe(1);
		});

		test('creates prefixed unit: km with coefficient 1000', () => {
			const unit = createUnit('km');
			expect(unit.components.get('m')).toBe(1);
			expect(unit.coefficient).toBe(1000);
		});

		test('creates prefixed unit: cm with coefficient 0.01', () => {
			const unit = createUnit('cm');
			expect(unit.components.get('m')).toBe(1);
			expect(unit.coefficient).toBe(0.01);
		});

		test('creates special unit: h with coefficient 3600', () => {
			const unit = createUnit('h');
			expect(unit.components.get('s')).toBe(1);
			expect(unit.coefficient).toBe(3600);
		});

		test('creates special unit: min with coefficient 60', () => {
			const unit = createUnit('min');
			expect(unit.components.get('s')).toBe(1);
			expect(unit.coefficient).toBe(60);
		});

		test('creates liter unit', () => {
			const unit = createUnit('L');
			expect(unit.components.get('m')).toBe(3);
			expect(unit.coefficient).toBe(0.001);
		});

		test('throws error for invalid unit', () => {
			expect(() => createUnit('xyz')).toThrow('Unknown unit symbol: xyz');
		});
	});

	describe('dimensionlessUnit', () => {
		test('creates unit with no components', () => {
			const unit = dimensionlessUnit();
			expect(unit.components.size).toBe(0);
			expect(unit.coefficient).toBe(1);
		});
	});

	describe('createUnitFromComponents', () => {
		test('creates unit from components', () => {
			const unit = createUnitFromComponents(new Map([['m', 2]]), 1);
			expect(unit.components.get('m')).toBe(2);
			expect(unit.coefficient).toBe(1);
		});

		test('removes zero exponents', () => {
			const unit = createUnitFromComponents(
				new Map([
					['m', 1],
					['s', 0]
				]),
				1
			);
			expect(unit.components.has('s')).toBe(false);
			expect(unit.components.get('m')).toBe(1);
		});

		test('uses default coefficient of 1', () => {
			const unit = createUnitFromComponents(new Map([['m', 1]]));
			expect(unit.coefficient).toBe(1);
		});
	});
});

// ============================================================================
// UNIT OPERATIONS
// ============================================================================

describe('Unit Operations', () => {
	describe('multiplyUnits', () => {
		test('m * m = m²', () => {
			const m = createUnit('m');
			const result = multiplyUnits(m, m);
			expect(result.components.get('m')).toBe(2);
			expect(result.coefficient).toBe(1);
		});

		test('m * s = m·s', () => {
			const m = createUnit('m');
			const s = createUnit('s');
			const result = multiplyUnits(m, s);
			expect(result.components.get('m')).toBe(1);
			expect(result.components.get('s')).toBe(1);
			expect(result.coefficient).toBe(1);
		});

		test('km * km = km² with coefficient 1000000', () => {
			const km = createUnit('km');
			const result = multiplyUnits(km, km);
			expect(result.components.get('m')).toBe(2);
			expect(result.coefficient).toBe(1000000);
		});

		test('kg * m / s² = kg·m·s⁻²', () => {
			const kg = createUnit('kg');
			const m = createUnit('m');
			const s = createUnit('s');
			const s2 = powerUnit(s, 2);
			const result = divideUnits(multiplyUnits(kg, m), s2);
			expect(result.components.get('g')).toBe(1);
			expect(result.components.get('m')).toBe(1);
			expect(result.components.get('s')).toBe(-2);
		});

		test('multiplying cancels opposite exponents', () => {
			const m = createUnit('m');
			const mInv = powerUnit(m, -1);
			const result = multiplyUnits(m, mInv);
			expect(result.components.size).toBe(0); // Dimensionless
		});
	});

	describe('divideUnits', () => {
		test('m / s = m·s⁻¹', () => {
			const m = createUnit('m');
			const s = createUnit('s');
			const result = divideUnits(m, s);
			expect(result.components.get('m')).toBe(1);
			expect(result.components.get('s')).toBe(-1);
		});

		test('km / h = km·h⁻¹', () => {
			const km = createUnit('km');
			const h = createUnit('h');
			const result = divideUnits(km, h);
			expect(result.components.get('m')).toBe(1);
			expect(result.components.get('s')).toBe(-1);
			expect(result.coefficient).toBe(1000 / 3600);
		});

		test('m² / m = m', () => {
			const m2 = powerUnit(createUnit('m'), 2);
			const m = createUnit('m');
			const result = divideUnits(m2, m);
			expect(result.components.get('m')).toBe(1);
		});

		test('dividing same units gives dimensionless', () => {
			const m = createUnit('m');
			const result = divideUnits(m, m);
			expect(result.components.size).toBe(0);
		});
	});

	describe('powerUnit', () => {
		test('m^2 = m²', () => {
			const m = createUnit('m');
			const result = powerUnit(m, 2);
			expect(result.components.get('m')).toBe(2);
		});

		test('m^3 = m³', () => {
			const m = createUnit('m');
			const result = powerUnit(m, 3);
			expect(result.components.get('m')).toBe(3);
		});

		test('m^-1 = m⁻¹', () => {
			const m = createUnit('m');
			const result = powerUnit(m, -1);
			expect(result.components.get('m')).toBe(-1);
		});

		test('m^0 = dimensionless', () => {
			const m = createUnit('m');
			const result = powerUnit(m, 0);
			expect(result.components.size).toBe(0);
			expect(result.coefficient).toBe(1);
		});

		test('(m/s)^2 = m²/s²', () => {
			const m = createUnit('m');
			const s = createUnit('s');
			const ms = divideUnits(m, s);
			const result = powerUnit(ms, 2);
			expect(result.components.get('m')).toBe(2);
			expect(result.components.get('s')).toBe(-2);
		});

		test('km^2 has correct coefficient (1000000)', () => {
			const km = createUnit('km');
			const result = powerUnit(km, 2);
			expect(result.coefficient).toBe(1000000);
		});

		test('fractional power: m^0.5 = m^(1/2)', () => {
			const m2 = powerUnit(createUnit('m'), 2);
			const result = powerUnit(m2, 0.5);
			expect(result.components.get('m')).toBe(1);
		});
	});

	describe('invertUnit', () => {
		test('inverts meter to m^-1', () => {
			const m = createUnit('m');
			const result = invertUnit(m);
			expect(result.components.get('m')).toBe(-1);
		});

		test('inverts m/s to s/m', () => {
			const m = createUnit('m');
			const s = createUnit('s');
			const ms = divideUnits(m, s);
			const result = invertUnit(ms);
			expect(result.components.get('m')).toBe(-1);
			expect(result.components.get('s')).toBe(1);
		});
	});
});

// ============================================================================
// UNIT COMPARISON
// ============================================================================

describe('Unit Comparison', () => {
	describe('unitsAreEqual', () => {
		test('m equals m', () => {
			const m1 = createUnit('m');
			const m2 = createUnit('m');
			expect(unitsAreEqual(m1, m2)).toBe(true);
		});

		test('km does not equal m (different coefficient)', () => {
			const km = createUnit('km');
			const m = createUnit('m');
			expect(unitsAreEqual(km, m)).toBe(false);
		});

		test('m does not equal s (different components)', () => {
			const m = createUnit('m');
			const s = createUnit('s');
			expect(unitsAreEqual(m, s)).toBe(false);
		});

		test('m² equals m²', () => {
			const m2a = powerUnit(createUnit('m'), 2);
			const m2b = powerUnit(createUnit('m'), 2);
			expect(unitsAreEqual(m2a, m2b)).toBe(true);
		});

		test('handles floating point tolerance', () => {
			// unitsAreEqual uses 1e-10 tolerance
			const u1: Unit = { components: new Map([['m', 1]]), coefficient: 1.0 + 1e-11 };
			const u2: Unit = { components: new Map([['m', 1]]), coefficient: 1.0 };
			expect(unitsAreEqual(u1, u2)).toBe(true);
		});
	});

	describe('unitsAreCompatible', () => {
		test('km and m are compatible (same dimension)', () => {
			const km = createUnit('km');
			const m = createUnit('m');
			expect(unitsAreCompatible(km, m)).toBe(true);
		});

		test('km and kg are not compatible (different dimensions)', () => {
			const km = createUnit('km');
			const kg = createUnit('kg');
			expect(unitsAreCompatible(km, kg)).toBe(false);
		});

		test('m/s and km/h are compatible (both speed)', () => {
			const m = createUnit('m');
			const s = createUnit('s');
			const ms = divideUnits(m, s);

			const km = createUnit('km');
			const h = createUnit('h');
			const kmh = divideUnits(km, h);

			expect(unitsAreCompatible(ms, kmh)).toBe(true);
		});

		test('m² and cm² are compatible (both area)', () => {
			const m2 = powerUnit(createUnit('m'), 2);
			const cm2 = powerUnit(createUnit('cm'), 2);
			expect(unitsAreCompatible(m2, cm2)).toBe(true);
		});

		test('m³ and L sont le même volume', () => {
			const m3 = powerUnit(createUnit('m'), 3);
			const L = createUnit('L');
			// Ce test assertait l'INVERSE, en documentant le défaut comme une
			// « design decision that may need Phase 2 enhancement ». Un litre est
			// un volume : il doit être comparable à un mètre cube, sinon la
			// conversion L <-> dm^3, qui est au programme de 6e, rend null.
			expect(unitsAreCompatible(m3, L)).toBe(true);
		});

		test('m and m² are not compatible (different powers)', () => {
			const m = createUnit('m');
			const m2 = powerUnit(createUnit('m'), 2);
			expect(unitsAreCompatible(m, m2)).toBe(false);
		});

		test('dimensionless units are compatible', () => {
			const u1 = dimensionlessUnit();
			const u2 = dimensionlessUnit();
			expect(unitsAreCompatible(u1, u2)).toBe(true);
		});
	});

	describe('getConversionFactor', () => {
		test('km to m = 1000', () => {
			const km = createUnit('km');
			const m = createUnit('m');
			const factor = getConversionFactor(km, m);
			expect(factor).toBe(1000);
		});

		test('m to km = 0.001', () => {
			const m = createUnit('m');
			const km = createUnit('km');
			const factor = getConversionFactor(m, km);
			expect(factor).toBe(0.001);
		});

		test('h to min = 60', () => {
			const h = createUnit('h');
			const min = createUnit('min');
			const factor = getConversionFactor(h, min);
			expect(factor).toBe(60);
		});

		test('km/h to m/s ≈ 0.2778', () => {
			const km = createUnit('km');
			const h = createUnit('h');
			const kmh = divideUnits(km, h);

			const m = createUnit('m');
			const s = createUnit('s');
			const ms = divideUnits(m, s);

			const factor = getConversionFactor(kmh, ms);
			expect(factor).toBeCloseTo(1000 / 3600, 4);
		});

		test('returns null for incompatible units', () => {
			const m = createUnit('m');
			const kg = createUnit('kg');
			const factor = getConversionFactor(m, kg);
			expect(factor).toBeNull();
		});

		test('same units give factor 1', () => {
			const m = createUnit('m');
			const factor = getConversionFactor(m, m);
			expect(factor).toBe(1);
		});

		test('cm² to m² conversion', () => {
			const cm2 = powerUnit(createUnit('cm'), 2);
			const m2 = powerUnit(createUnit('m'), 2);
			const factor = getConversionFactor(cm2, m2);
			expect(factor).toBe(0.0001); // 1 cm² = 0.0001 m²
		});
	});
});

// ============================================================================
// NORMALIZATION
// ============================================================================

describe('Normalization', () => {
	describe('normalizeUnit', () => {
		test('normalizes km to maintain coefficient', () => {
			const km = createUnit('km');
			const normalized = normalizeUnit(km);
			expect(normalized.components.get('m')).toBe(1);
			expect(normalized.coefficient).toBe(1000);
		});

		test('returns a copy, not the same reference', () => {
			const m = createUnit('m');
			const normalized = normalizeUnit(m);
			expect(normalized).not.toBe(m);
			expect(normalized.components).not.toBe(m.components);
		});
	});
});

// ============================================================================
// DIMENSIONAL ANALYSIS
// ============================================================================

describe('Dimensional Analysis', () => {
	describe('getDimensionalSignature', () => {
		test('simple unit: m gives { length: 1 }', () => {
			const m = createUnit('m');
			const sig = getDimensionalSignature(m);
			expect(sig.length).toBe(1);
			expect(Object.keys(sig).length).toBe(1);
		});

		test('composite unit: m/s gives { length: 1, time: -1 }', () => {
			const m = createUnit('m');
			const s = createUnit('s');
			const ms = divideUnits(m, s);
			const sig = getDimensionalSignature(ms);
			expect(sig.length).toBe(1);
			expect(sig.time).toBe(-1);
		});

		test('area: m² gives { length: 2 }', () => {
			const m2 = powerUnit(createUnit('m'), 2);
			const sig = getDimensionalSignature(m2);
			expect(sig.length).toBe(2);
		});

		test('dimensionless unit gives empty signature', () => {
			const u = dimensionlessUnit();
			const sig = getDimensionalSignature(u);
			expect(Object.keys(sig).length).toBe(0);
		});

		test('force: kg·m·s⁻²', () => {
			const kg = createUnit('kg');
			const m = createUnit('m');
			const s2 = powerUnit(createUnit('s'), 2);
			const force = divideUnits(multiplyUnits(kg, m), s2);
			const sig = getDimensionalSignature(force);
			expect(sig.mass).toBe(1);
			expect(sig.length).toBe(1);
			expect(sig.time).toBe(-2);
		});
	});

	describe('getDimension', () => {
		test('simple length: m', () => {
			const m = createUnit('m');
			expect(getDimension(m)).toBe('length');
		});

		test('simple mass: kg', () => {
			const kg = createUnit('kg');
			expect(getDimension(kg)).toBe('mass');
		});

		test('simple time: s', () => {
			const s = createUnit('s');
			expect(getDimension(s)).toBe('time');
		});

		test('composite unit: m/s gives "composite"', () => {
			const m = createUnit('m');
			const s = createUnit('s');
			const ms = divideUnits(m, s);
			expect(getDimension(ms)).toBe('composite');
		});

		test('area: m² gives "composite"', () => {
			const m2 = powerUnit(createUnit('m'), 2);
			expect(getDimension(m2)).toBe('composite');
		});

		test('dimensionless gives "dimensionless"', () => {
			const u = dimensionlessUnit();
			expect(getDimension(u)).toBe('dimensionless');
		});
	});

	describe('Dimensional type checks', () => {
		test('isLength: m, km, cm', () => {
			expect(isLength(createUnit('m'))).toBe(true);
			expect(isLength(createUnit('km'))).toBe(true);
			expect(isLength(createUnit('cm'))).toBe(true);
			expect(isLength(createUnit('kg'))).toBe(false);
			expect(isLength(powerUnit(createUnit('m'), 2))).toBe(false);
		});

		test('isMass: g, kg, mg', () => {
			expect(isMass(createUnit('g'))).toBe(true);
			expect(isMass(createUnit('kg'))).toBe(true);
			expect(isMass(createUnit('mg'))).toBe(true);
			expect(isMass(createUnit('m'))).toBe(false);
		});

		test('isDuration: s, min, h', () => {
			expect(isDuration(createUnit('s'))).toBe(true);
			expect(isDuration(createUnit('min'))).toBe(true);
			expect(isDuration(createUnit('h'))).toBe(true);
			expect(isDuration(createUnit('m'))).toBe(false);
		});

		test('isVolume: L and m³', () => {
			// L has dimension 'volume' in BASE_UNIT_DEFS
			expect(isVolume(createUnit('L'))).toBe(true);
			expect(isVolume(createUnit('mL'))).toBe(true);
			const m3 = powerUnit(createUnit('m'), 3);
			expect(isVolume(m3)).toBe(true);
			expect(isVolume(powerUnit(createUnit('m'), 2))).toBe(false);
		});

		test('isSpeed: m/s, km/h', () => {
			const ms = divideUnits(createUnit('m'), createUnit('s'));
			expect(isSpeed(ms)).toBe(true);

			const kmh = divideUnits(createUnit('km'), createUnit('h'));
			expect(isSpeed(kmh)).toBe(true);

			expect(isSpeed(createUnit('m'))).toBe(false);
		});

		test('isArea: m², cm²', () => {
			expect(isArea(powerUnit(createUnit('m'), 2))).toBe(true);
			expect(isArea(powerUnit(createUnit('cm'), 2))).toBe(true);
			expect(isArea(powerUnit(createUnit('m'), 3))).toBe(false);
		});

		test('isDimensionless', () => {
			expect(isDimensionless(dimensionlessUnit())).toBe(true);
			expect(isDimensionless(createUnit('m'))).toBe(false);
		});
	});
});

// ============================================================================
// FORMATTING
// ============================================================================

describe('Formatting', () => {
	describe('formatUnit - fraction style', () => {
		test('formats simple unit: m', () => {
			const m = createUnit('m');
			expect(formatUnit(m, 'fraction')).toBe('m');
		});

		test('formats squared: m²', () => {
			const m2 = powerUnit(createUnit('m'), 2);
			expect(formatUnit(m2, 'fraction')).toBe('m^2');
		});

		test('formats fraction: m/s', () => {
			const ms = divideUnits(createUnit('m'), createUnit('s'));
			expect(formatUnit(ms, 'fraction')).toBe('m/s');
		});

		test('formats complex fraction: m²/s', () => {
			const m2 = powerUnit(createUnit('m'), 2);
			const m2s = divideUnits(m2, createUnit('s'));
			expect(formatUnit(m2s, 'fraction')).toBe('m^2/s');
		});

		test('formats multi-denominator: kg/(m.s²)', () => {
			const kg = createUnit('kg');
			const m = createUnit('m');
			const s2 = powerUnit(createUnit('s'), 2);
			const ms2 = multiplyUnits(m, s2);
			const result = divideUnits(kg, ms2);
			expect(formatUnit(result, 'fraction')).toContain('g/(');
		});

		test('formats dimensionless as "1"', () => {
			const u = dimensionlessUnit();
			expect(formatUnit(u, 'fraction')).toBe('1');
		});
	});

	describe('formatUnit - powers style', () => {
		test('formats simple unit: m', () => {
			const m = createUnit('m');
			expect(formatUnit(m, 'powers')).toBe('m');
		});

		test('formats squared: m^2', () => {
			const m2 = powerUnit(createUnit('m'), 2);
			expect(formatUnit(m2, 'powers')).toBe('m^2');
		});

		test('formats m/s as m.s^-1', () => {
			const ms = divideUnits(createUnit('m'), createUnit('s'));
			expect(formatUnit(ms, 'powers')).toBe('m.s^-1');
		});

		test('formats acceleration: m.s^-2', () => {
			const m = createUnit('m');
			const s2 = powerUnit(createUnit('s'), -2);
			const result = multiplyUnits(m, s2);
			expect(formatUnit(result, 'powers')).toBe('m.s^-2');
		});
	});

	describe('formatUnitUnicode', () => {
		test('formats m² with Unicode superscript', () => {
			const m2 = powerUnit(createUnit('m'), 2);
			const formatted = formatUnitUnicode(m2);
			expect(formatted).toBe('m²');
		});

		test('formats m³ with Unicode superscript', () => {
			const m3 = powerUnit(createUnit('m'), 3);
			const formatted = formatUnitUnicode(m3);
			expect(formatted).toBe('m³');
		});

		test('formats m/s² with Unicode', () => {
			const m = createUnit('m');
			const s2 = powerUnit(createUnit('s'), 2);
			const ms2 = divideUnits(m, s2);
			const formatted = formatUnitUnicode(ms2);
			// With exponent > 1 in denominator, formatter adds parentheses
			expect(formatted).toBe('m/(s²)');
		});

		test('formats m·s⁻¹ with Unicode (powers style)', () => {
			const ms = divideUnits(createUnit('m'), createUnit('s'));
			const formatted = formatUnitUnicode(ms, 'powers');
			expect(formatted).toBe('m·s⁻¹');
		});
	});
});

// ============================================================================
// PARSING
// ============================================================================

describe('Parsing', () => {
	describe('parseSimpleUnit', () => {
		test('parses simple unit: m', () => {
			const unit = parseSimpleUnit('m');
			expect(unit.components.get('m')).toBe(1);
			expect(unit.coefficient).toBe(1);
		});

		test('parses squared: m^2', () => {
			const unit = parseSimpleUnit('m^2');
			expect(unit.components.get('m')).toBe(2);
		});

		test('parses fraction: m/s', () => {
			const unit = parseSimpleUnit('m/s');
			expect(unit.components.get('m')).toBe(1);
			expect(unit.components.get('s')).toBe(-1);
		});

		test('parses product: kg.m', () => {
			const unit = parseSimpleUnit('kg.m');
			expect(unit.components.get('g')).toBe(1);
			expect(unit.components.get('m')).toBe(1);
		});

		test('parses Unicode: m²', () => {
			const unit = parseSimpleUnit('m²');
			expect(unit.components.get('m')).toBe(2);
		});

		test('parses Unicode: m·s⁻¹', () => {
			const unit = parseSimpleUnit('m·s⁻¹');
			expect(unit.components.get('m')).toBe(1);
			expect(unit.components.get('s')).toBe(-1);
		});

		test('parses dimensionless: 1', () => {
			const unit = parseSimpleUnit('1');
			expect(unit.components.size).toBe(0);
		});

		test('throws error for invalid unit', () => {
			expect(() => parseSimpleUnit('xyz')).toThrow();
		});
	});
});

// ============================================================================
// EDGE CASES AND INTEGRATION TESTS
// ============================================================================

describe('Edge Cases', () => {
	test('handles very small coefficients (nano)', () => {
		const nm = createUnit('nm');
		expect(nm.coefficient).toBe(1e-9);
	});

	test('handles very large coefficients (giga)', () => {
		const Gm = createUnit('Gm');
		expect(Gm.coefficient).toBe(1e9);
	});

	test('handles multiple operations in sequence', () => {
		const km = createUnit('km');
		const h = createUnit('h');
		const velocity = divideUnits(km, h);
		const velocity2 = powerUnit(velocity, 2);
		const m = createUnit('m');
		const acceleration = divideUnits(velocity2, m);

		expect(acceleration.components.get('m')).toBe(1);
		expect(acceleration.components.get('s')).toBe(-2);
	});

	test('cancellation in complex expressions', () => {
		const m = createUnit('m');
		const s = createUnit('s');
		const kg = createUnit('kg');

		// (kg·m/s) / (kg/s) should give m
		const numerator = divideUnits(multiplyUnits(kg, m), s);
		const denominator = divideUnits(kg, s);
		const result = divideUnits(numerator, denominator);

		expect(result.components.get('m')).toBe(1);
		expect(result.components.size).toBe(1);
	});

	test('coefficient propagation through operations', () => {
		const km = createUnit('km');
		const km2 = powerUnit(km, 2);
		expect(km2.coefficient).toBe(1000000);

		const cm = createUnit('cm');
		const cm2 = powerUnit(cm, 2);
		expect(cm2.coefficient).toBe(0.0001);
	});

	test('tolerance in floating point comparisons', () => {
		const kmh = divideUnits(createUnit('km'), createUnit('h'));
		const ms = divideUnits(createUnit('m'), createUnit('s'));

		// These should be compatible despite floating point arithmetic
		expect(unitsAreCompatible(kmh, ms)).toBe(true);
	});
});

describe('Integration: Real-world physics scenarios', () => {
	test('speed calculation: distance / time', () => {
		const distance = createUnit('km');
		const time = createUnit('h');
		const speed = divideUnits(distance, time);

		expect(isSpeed(speed)).toBe(true);

		// Convert to m/s
		const ms = divideUnits(createUnit('m'), createUnit('s'));
		expect(unitsAreCompatible(speed, ms)).toBe(true);
		expect(getConversionFactor(speed, ms)).toBeCloseTo(1000 / 3600, 4);
	});

	test('force calculation: mass * acceleration', () => {
		const kg = createUnit('kg');
		const m = createUnit('m');
		const s2 = powerUnit(createUnit('s'), 2);
		const acceleration = divideUnits(m, s2);
		const force = multiplyUnits(kg, acceleration);

		const sig = getDimensionalSignature(force);
		expect(sig.mass).toBe(1);
		expect(sig.length).toBe(1);
		expect(sig.time).toBe(-2);
	});

	test('energy calculation: force * distance', () => {
		const kg = createUnit('kg');
		const m = createUnit('m');
		const s2 = powerUnit(createUnit('s'), 2);
		const force = divideUnits(multiplyUnits(kg, m), s2);
		const distance = createUnit('m');
		const energy = multiplyUnits(force, distance);

		const sig = getDimensionalSignature(energy);
		expect(sig.mass).toBe(1);
		expect(sig.length).toBe(2);
		expect(sig.time).toBe(-2);
	});

	test('density calculation: mass / volume', () => {
		const kg = createUnit('kg');
		const m3 = powerUnit(createUnit('m'), 3);
		const density = divideUnits(kg, m3);

		const sig = getDimensionalSignature(density);
		expect(sig.mass).toBe(1);
		expect(sig.length).toBe(-3);
	});

	test('volume conversions: L to m³', () => {
		const L = createUnit('L');
		const m3 = powerUnit(createUnit('m'), 3);

		// Ce test assertait l'INVERSE, en renvoyant la correction à une « Phase 2 »
		// qui n'est jamais venue. Les deux écritures désignent le même volume.
		expect(unitsAreCompatible(L, m3)).toBe(true);
		expect(getConversionFactor(L, m3)).toBeCloseTo(0.001, 12);
	});
});
