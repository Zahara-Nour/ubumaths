/**
 * Unit AST - Operations Tests
 *
 * Tests for unit arithmetic operations and comparisons.
 */

import { describe, it, expect } from 'vitest';
import { unit, unitWithPower, dimensionless, fromComponents } from '../factory';
import {
	multiply,
	divide,
	power,
	invert,
	simplify,
	unitsEqual,
	unitsEquivalent
} from '../operations';

describe('Unit Operations', () => {
	// =============================================================================
	// multiply()
	// =============================================================================

	describe('multiply', () => {
		it('should multiply same units to get squared unit', () => {
			const m = unit('m')!;
			const result = multiply(m, m);

			expect(result.components.get('m')).toBe(2);
			expect(result.coefficient).toBe(1);
		});

		it('should multiply different units to create composite unit', () => {
			const m = unit('m')!;
			const s = unit('s')!;
			const result = multiply(m, s);

			expect(result.components.get('m')).toBe(1);
			expect(result.components.get('s')).toBe(1);
			expect(result.coefficient).toBe(1);
		});

		it('should multiply prefixed units with correct coefficient', () => {
			const km = unit('km')!; // coefficient 1000
			const sInv = unitWithPower('s', -1)!; // s^-1
			const result = multiply(km, sInv);

			expect(result.components.get('m')).toBe(1);
			expect(result.components.get('s')).toBe(-1);
			expect(result.coefficient).toBe(1000);
		});

		it('should multiply dimensionless unit as identity', () => {
			const m = unit('m')!;
			const one = dimensionless();
			const result = multiply(m, one);

			expect(result.components.get('m')).toBe(1);
			expect(result.coefficient).toBe(1);
		});

		it('should cancel out units with opposite exponents', () => {
			const m = unit('m')!;
			const mInv = unitWithPower('m', -1)!;
			const result = multiply(m, mInv);

			expect(result.components.size).toBe(0); // dimensionless
			expect(result.coefficient).toBe(1);
		});

		it('should multiply complex units', () => {
			// (m.s^-1) × (m.s^-2) = m².s^-3
			const velocity = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1
			);
			const accel = fromComponents(
				new Map([
					['m', 1],
					['s', -2]
				]),
				1
			);
			const result = multiply(velocity, accel);

			expect(result.components.get('m')).toBe(2);
			expect(result.components.get('s')).toBe(-3);
		});

		it('should combine coefficients from both prefixed units', () => {
			// km × mm = m² with coefficient 1000 × 0.001 = 1
			const km = unit('km')!;
			const mm = unit('mm')!;
			const result = multiply(km, mm);

			expect(result.components.get('m')).toBe(2);
			expect(result.coefficient).toBe(1); // 1000 × 0.001
		});

		it('should not preserve original field', () => {
			const m = unit('m')!;
			const result = multiply(m, m);

			expect(result.original).toBeUndefined();
		});
	});

	// =============================================================================
	// divide()
	// =============================================================================

	describe('divide', () => {
		it('should divide units to create inverse composite', () => {
			const m = unit('m')!;
			const s = unit('s')!;
			const result = divide(m, s);

			expect(result.components.get('m')).toBe(1);
			expect(result.components.get('s')).toBe(-1);
			expect(result.coefficient).toBe(1);
		});

		it('should divide same units to get dimensionless', () => {
			const m = unit('m')!;
			const result = divide(m, m);

			expect(result.components.size).toBe(0);
			expect(result.coefficient).toBe(1);
		});

		it('should divide prefixed units with correct coefficient', () => {
			// km / h = (1000 m) / (3600 s) = m/s with coefficient 1000/3600
			const km = unit('km')!;
			const h = unit('h')!;
			const result = divide(km, h);

			expect(result.components.get('m')).toBe(1);
			expect(result.components.get('s')).toBe(-1);
			expect(result.coefficient).toBeCloseTo(1000 / 3600);
		});

		it('should divide complex units', () => {
			// (m².s^-2) / (m.s^-1) = m.s^-1
			const energy = fromComponents(
				new Map([
					['m', 2],
					['s', -2]
				]),
				1
			);
			const velocity = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1
			);
			const result = divide(energy, velocity);

			expect(result.components.get('m')).toBe(1);
			expect(result.components.get('s')).toBe(-1);
		});

		it('should handle division by dimensionless', () => {
			const m = unit('m')!;
			const one = dimensionless();
			const result = divide(m, one);

			expect(result.components.get('m')).toBe(1);
			expect(result.coefficient).toBe(1);
		});
	});

	// =============================================================================
	// power()
	// =============================================================================

	describe('power', () => {
		it('should square a unit', () => {
			const m = unit('m')!;
			const result = power(m, 2);

			expect(result.components.get('m')).toBe(2);
			expect(result.coefficient).toBe(1);
		});

		it('should cube a squared unit', () => {
			// (m²)³ = m⁶
			const m2 = unitWithPower('m', 2)!;
			const result = power(m2, 3);

			expect(result.components.get('m')).toBe(6);
			expect(result.coefficient).toBe(1);
		});

		it('should raise prefixed unit to power with coefficient', () => {
			// km² = (1000 m)² = m² with coefficient 1e6
			const km = unit('km')!;
			const result = power(km, 2);

			expect(result.components.get('m')).toBe(2);
			expect(result.coefficient).toBe(1e6);
		});

		it('should raise to negative power', () => {
			const m = unit('m')!;
			const result = power(m, -1);

			expect(result.components.get('m')).toBe(-1);
			expect(result.coefficient).toBe(1);
		});

		it('should raise to fractional power', () => {
			// m^(1/2) = √m
			const m = unit('m')!;
			const result = power(m, 0.5);

			expect(result.components.get('m')).toBe(0.5);
			expect(result.coefficient).toBe(1);
		});

		it('should raise to zero power to get dimensionless', () => {
			const m = unit('m')!;
			const result = power(m, 0);

			expect(result.components.size).toBe(0);
			expect(result.coefficient).toBe(1);
		});

		it('should raise complex unit to power', () => {
			// (m.s^-1)² = m².s^-2
			const velocity = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1
			);
			const result = power(velocity, 2);

			expect(result.components.get('m')).toBe(2);
			expect(result.components.get('s')).toBe(-2);
		});

		it('should handle coefficient in power operation', () => {
			// (km)³ = (1000 m)³ = m³ with coefficient 1e9
			const km = unit('km')!;
			const result = power(km, 3);

			expect(result.components.get('m')).toBe(3);
			expect(result.coefficient).toBe(1e9);
		});
	});

	// =============================================================================
	// invert()
	// =============================================================================

	describe('invert', () => {
		it('should invert simple unit', () => {
			const s = unit('s')!;
			const result = invert(s);

			expect(result.components.get('s')).toBe(-1);
			expect(result.coefficient).toBe(1);
		});

		it('should invert inverted unit to get original', () => {
			// (s^-1)^-1 = s
			const sInv = unitWithPower('s', -1)!;
			const result = invert(sInv);

			expect(result.components.get('s')).toBe(1);
			expect(result.coefficient).toBe(1);
		});

		it('should invert composite unit', () => {
			// (m.s^-1)^-1 = m^-1.s
			const velocity = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1
			);
			const result = invert(velocity);

			expect(result.components.get('m')).toBe(-1);
			expect(result.components.get('s')).toBe(1);
		});

		it('should invert coefficient', () => {
			// (km)^-1 = m^-1 with coefficient 1/1000
			const km = unit('km')!;
			const result = invert(km);

			expect(result.components.get('m')).toBe(-1);
			expect(result.coefficient).toBe(1 / 1000);
		});
	});

	// =============================================================================
	// simplify()
	// =============================================================================

	describe('simplify', () => {
		it('should return same reference if already simplified', () => {
			const m = unit('m')!;
			const result = simplify(m);

			expect(result).toBe(m); // Same object reference
		});

		it('should remove zero exponents', () => {
			const unsimplified = fromComponents(
				new Map([
					['m', 1],
					['s', 0]
				]),
				1
			);
			const result = simplify(unsimplified);

			expect(result.components.size).toBe(1);
			expect(result.components.get('m')).toBe(1);
			expect(result.components.has('s')).toBe(false);
		});

		it('should preserve original field when simplifying', () => {
			const unsimplified = fromComponents(
				new Map([
					['m', 1],
					['s', 0]
				]),
				1,
				'test'
			);
			const result = simplify(unsimplified);

			expect(result.original).toBe('test');
		});

		it('should handle all zero exponents', () => {
			const unsimplified = fromComponents(
				new Map([
					['m', 0],
					['s', 0]
				]),
				1
			);
			const result = simplify(unsimplified);

			expect(result.components.size).toBe(0);
		});
	});

	// =============================================================================
	// unitsEqual()
	// =============================================================================

	describe('unitsEqual', () => {
		it('should return true for identical units', () => {
			const m1 = unit('m')!;
			const m2 = unit('m')!;

			expect(unitsEqual(m1, m2)).toBe(true);
		});

		it('should return false for different coefficients', () => {
			const km = unit('km')!; // coefficient 1000
			const m = unit('m')!; // coefficient 1

			expect(unitsEqual(km, m)).toBe(false);
		});

		it('should return false for different dimensions', () => {
			const m = unit('m')!;
			const s = unit('s')!;

			expect(unitsEqual(m, s)).toBe(false);
		});

		it('should return true regardless of component order', () => {
			// m.s and s.m should be equal
			const ms = fromComponents(
				new Map([
					['m', 1],
					['s', 1]
				]),
				1
			);
			const sm = fromComponents(
				new Map([
					['s', 1],
					['m', 1]
				]),
				1
			);

			expect(unitsEqual(ms, sm)).toBe(true);
		});

		it('should handle floating-point coefficients with epsilon', () => {
			const u1 = fromComponents(new Map([['m', 1]]), 1.0000000001);
			const u2 = fromComponents(new Map([['m', 1]]), 1.0);

			expect(unitsEqual(u1, u2)).toBe(true);
		});

		it('should return true for km and 1000m equivalent representation', () => {
			// Both represent the same unit: 1000 meters
			const km = fromComponents(new Map([['m', 1]]), 1000);
			const thousandM = fromComponents(new Map([['m', 1]]), 1000);

			expect(unitsEqual(km, thousandM)).toBe(true);
		});

		it('should return false for different exponents', () => {
			const m = unit('m')!;
			const m2 = unitWithPower('m', 2)!;

			expect(unitsEqual(m, m2)).toBe(false);
		});

		it('should return true for dimensionless units', () => {
			const one1 = dimensionless();
			const one2 = dimensionless();

			expect(unitsEqual(one1, one2)).toBe(true);
		});
	});

	// =============================================================================
	// unitsEquivalent()
	// =============================================================================

	describe('unitsEquivalent', () => {
		it('should return true for same dimension with different coefficients', () => {
			const km = unit('km')!; // coefficient 1000
			const m = unit('m')!; // coefficient 1

			expect(unitsEquivalent(km, m)).toBe(true);
		});

		it('should return true for equivalent prefixed units', () => {
			const km = unit('km')!;
			const cm = unit('cm')!;

			expect(unitsEquivalent(km, cm)).toBe(true);
		});

		it('should return false for different dimensions', () => {
			const m = unit('m')!;
			const s = unit('s')!;

			expect(unitsEquivalent(m, s)).toBe(false);
		});

		it('should return true for composite velocity units', () => {
			// m/s and km/h are both velocity (dimensionally equivalent)
			const ms = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1
			);
			const kmh = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1000 / 3600
			);

			expect(unitsEquivalent(ms, kmh)).toBe(true);
		});

		it('should return false for different composite units', () => {
			// m/s (velocity) vs m/s² (acceleration)
			const velocity = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1
			);
			const accel = fromComponents(
				new Map([
					['m', 1],
					['s', -2]
				]),
				1
			);

			expect(unitsEquivalent(velocity, accel)).toBe(false);
		});

		it('should return true regardless of component order', () => {
			const ms = fromComponents(
				new Map([
					['m', 1],
					['s', 1]
				]),
				1
			);
			const sm = fromComponents(
				new Map([
					['s', 1],
					['m', 1]
				]),
				2
			); // Different coefficient

			expect(unitsEquivalent(ms, sm)).toBe(true);
		});

		it('should return true for dimensionless units', () => {
			const one1 = dimensionless();
			const one2 = fromComponents(new Map(), 5); // Dimensionless with different coefficient

			expect(unitsEquivalent(one1, one2)).toBe(true);
		});
	});

	// =============================================================================
	// Integration Tests (Combined Operations)
	// =============================================================================

	describe('integration tests', () => {
		it('should handle velocity calculation: distance / time', () => {
			// 10 km / 2 h = 5 km/h
			const km = unit('km')!;
			const h = unit('h')!;
			const velocity = divide(km, h);

			expect(velocity.components.get('m')).toBe(1);
			expect(velocity.components.get('s')).toBe(-1);
			expect(velocity.coefficient).toBeCloseTo(1000 / 3600);
		});

		it('should handle force calculation: mass × acceleration', () => {
			// kg × m.s^-2 = kg.m.s^-2 (Newton)
			const kg = unit('kg')!;
			const accel = fromComponents(
				new Map([
					['m', 1],
					['s', -2]
				]),
				1
			);
			const force = multiply(kg, accel);

			expect(force.components.get('g')).toBe(1); // kg maps to g
			expect(force.components.get('m')).toBe(1);
			expect(force.components.get('s')).toBe(-2);
			expect(force.coefficient).toBe(1000); // kg coefficient
		});

		it('should handle energy calculation: force × distance', () => {
			// (kg.m.s^-2) × m = kg.m².s^-2 (Joule)
			const force = fromComponents(
				new Map([
					['g', 1],
					['m', 1],
					['s', -2]
				]),
				1000
			);
			const distance = unit('m')!;
			const energy = multiply(force, distance);

			expect(energy.components.get('g')).toBe(1);
			expect(energy.components.get('m')).toBe(2);
			expect(energy.components.get('s')).toBe(-2);
			expect(energy.coefficient).toBe(1000);
		});

		it('should handle area calculation with prefixed units', () => {
			// km × km = km² = m² with coefficient 1e6
			const km = unit('km')!;
			const area = multiply(km, km);

			expect(area.components.get('m')).toBe(2);
			expect(area.coefficient).toBe(1e6);
		});

		it('should handle volume calculation', () => {
			// m × m × m = m³
			const m = unit('m')!;
			const area = multiply(m, m);
			const volume = multiply(area, m);

			expect(volume.components.get('m')).toBe(3);
			expect(volume.coefficient).toBe(1);
		});

		it('should verify dimensional consistency in physics equations', () => {
			// E = mc²: energy units should match
			// (kg)(m/s)² = kg.m².s^-2
			const mass = unit('kg')!;
			const velocity = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1
			);
			const velocitySquared = power(velocity, 2);
			const energy = multiply(mass, velocitySquared);

			expect(energy.components.get('g')).toBe(1);
			expect(energy.components.get('m')).toBe(2);
			expect(energy.components.get('s')).toBe(-2);
		});
	});
});
