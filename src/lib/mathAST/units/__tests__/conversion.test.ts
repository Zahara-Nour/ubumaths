/**
 * Unit AST - Conversion Tests
 *
 * Tests for unit compatibility checking, conversion factors,
 * dimensional analysis, and unit normalization.
 */

import { describe, it, expect } from 'vitest';
import { unit, unitWithPower, dimensionless, fromComponents } from '../factory';
import {
	unitsAreCompatible,
	getConversionFactor,
	getDimensionalSignature,
	normalizeToBase
} from '../conversion';

describe('Unit Conversion', () => {
	// =============================================================================
	// unitsAreCompatible()
	// =============================================================================

	describe('unitsAreCompatible', () => {
		it('should recognize km and m as compatible (both length)', () => {
			const km = unit('km')!;
			const m = unit('m')!;

			expect(unitsAreCompatible(km, m)).toBe(true);
		});

		it('should recognize km/h and m/s as compatible (both velocity)', () => {
			const kmPerHour = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1000 / 3600,
				'km/h'
			);
			const mPerSecond = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1,
				'm/s'
			);

			expect(unitsAreCompatible(kmPerHour, mPerSecond)).toBe(true);
		});

		it('should recognize m and s as incompatible (different dimensions)', () => {
			const m = unit('m')!;
			const s = unit('s')!;

			expect(unitsAreCompatible(m, s)).toBe(false);
		});

		it('should recognize dimensionless units as compatible with each other', () => {
			const dim1 = dimensionless();
			const dim2 = dimensionless();

			expect(unitsAreCompatible(dim1, dim2)).toBe(true);
		});

		it('should recognize m² and m as incompatible (different powers)', () => {
			const m2 = unitWithPower('m', 2)!;
			const m = unit('m')!;

			expect(unitsAreCompatible(m2, m)).toBe(false);
		});

		it('should recognize cm and km as compatible (both length)', () => {
			const cm = unit('cm')!;
			const km = unit('km')!;

			expect(unitsAreCompatible(cm, km)).toBe(true);
		});

		it('should recognize h and min as compatible (both time)', () => {
			const h = unit('h')!;
			const min = unit('min')!;

			expect(unitsAreCompatible(h, min)).toBe(true);
		});

		it('should recognize kg and mg as compatible (both mass)', () => {
			const kg = unit('kg')!;
			const mg = unit('mg')!;

			expect(unitsAreCompatible(kg, mg)).toBe(true);
		});

		it('should recognize m/s² and km/h² as compatible (both acceleration)', () => {
			const accel1 = fromComponents(
				new Map([
					['m', 1],
					['s', -2]
				]),
				1,
				'm/s²'
			);
			// h is a special unit that converts to s, so h² = (3600 s)²
			const accel2 = fromComponents(
				new Map([
					['m', 1],
					['s', -2]
				]),
				1 / (3600 * 3600),
				'km/h²'
			);

			expect(unitsAreCompatible(accel1, accel2)).toBe(true);
		});

		it('should recognize complex units as incompatible when dimensions differ', () => {
			// kg.m/s² (force) vs m/s (velocity)
			const force = fromComponents(
				new Map([
					['kg', 1],
					['m', 1],
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

			expect(unitsAreCompatible(force, velocity)).toBe(false);
		});
	});

	// =============================================================================
	// getConversionFactor()
	// =============================================================================

	describe('getConversionFactor', () => {
		it('should convert km to m with factor 1000', () => {
			const km = unit('km')!;
			const m = unit('m')!;
			const factor = getConversionFactor(km, m);

			expect(factor).toBe(1000);
		});

		it('should convert m to km with factor 0.001', () => {
			const m = unit('m')!;
			const km = unit('km')!;
			const factor = getConversionFactor(m, km);

			expect(factor).toBe(0.001);
		});

		it('should convert h to s with factor 3600', () => {
			const h = unit('h')!;
			const s = unit('s')!;
			const factor = getConversionFactor(h, s);

			expect(factor).toBe(3600);
		});

		it('should convert s to h with factor 1/3600', () => {
			const s = unit('s')!;
			const h = unit('h')!;
			const factor = getConversionFactor(s, h);

			expect(Math.abs(factor! - 1 / 3600) < 1e-9).toBe(true);
		});

		it('should convert km/h to m/s with factor 1000/3600', () => {
			const kmPerHour = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1000 / 3600
			);
			const mPerSecond = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1
			);

			const factor = getConversionFactor(kmPerHour, mPerSecond);

			expect(Math.abs(factor! - 1000 / 3600) < 1e-9).toBe(true);
		});

		it('should convert m/s to km/h with factor 3600/1000', () => {
			const mPerSecond = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1
			);
			const kmPerHour = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1000 / 3600
			);

			const factor = getConversionFactor(mPerSecond, kmPerHour);

			expect(Math.abs(factor! - 3600 / 1000) < 1e-9).toBe(true);
		});

		it('should return null for incompatible units (m to s)', () => {
			const m = unit('m')!;
			const s = unit('s')!;

			const factor = getConversionFactor(m, s);

			expect(factor).toBeNull();
		});

		it('should return null for incompatible units (m² to m)', () => {
			const m2 = unitWithPower('m', 2)!;
			const m = unit('m')!;

			const factor = getConversionFactor(m2, m);

			expect(factor).toBeNull();
		});

		it('should handle dimensionless units', () => {
			const dim1 = dimensionless();
			const dim2 = dimensionless();

			const factor = getConversionFactor(dim1, dim2);

			expect(factor).toBe(1);
		});

		it('should convert mg to g with factor 0.001', () => {
			const mg = unit('mg')!;
			const g = unit('g')!;

			const factor = getConversionFactor(mg, g);

			expect(factor).toBe(0.001);
		});

		it('should convert cm to mm with factor 10', () => {
			const cm = unit('cm')!;
			const mm = unit('mm')!;

			const factor = getConversionFactor(cm, mm);

			expect(factor).toBe(10);
		});

		it('should convert min to s with factor 60', () => {
			const min = unit('min')!;
			const s = unit('s')!;

			const factor = getConversionFactor(min, s);

			expect(factor).toBe(60);
		});

		it('should handle complex composite units (m² to km²)', () => {
			const m2 = unitWithPower('m', 2)!;
			const km2 = unitWithPower('km', 2)!;

			const factor = getConversionFactor(m2, km2);

			// 1 m² = (0.001)² km² = 1e-6 km²
			expect(Math.abs(factor! - 1e-6) < 1e-12).toBe(true);
		});

		it('should handle units with existing coefficients', () => {
			const kmWithCoeff = fromComponents(new Map([['m', 1]]), 1000);
			const mWithCoeff = fromComponents(new Map([['m', 1]]), 1);

			const factor = getConversionFactor(kmWithCoeff, mWithCoeff);

			expect(factor).toBe(1000);
		});
	});

	// =============================================================================
	// getDimensionalSignature()
	// =============================================================================

	describe('getDimensionalSignature', () => {
		it('should return length dimension for meter', () => {
			const m = unit('m')!;
			const sig = getDimensionalSignature(m);

			expect(sig).toEqual({ length: 1 });
		});

		it('should return mass dimension for gram', () => {
			const g = unit('g')!;
			const sig = getDimensionalSignature(g);

			expect(sig).toEqual({ mass: 1 });
		});

		it('should return time dimension for second', () => {
			const s = unit('s')!;
			const sig = getDimensionalSignature(s);

			expect(sig).toEqual({ time: 1 });
		});

		it('should return velocity dimensions for m/s', () => {
			const mPerS = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1
			);
			const sig = getDimensionalSignature(mPerS);

			expect(sig).toEqual({ length: 1, time: -1 });
		});

		it('should return acceleration dimensions for m/s²', () => {
			const accel = fromComponents(
				new Map([
					['m', 1],
					['s', -2]
				]),
				1
			);
			const sig = getDimensionalSignature(accel);

			expect(sig).toEqual({ length: 1, time: -2 });
		});

		it('should return force dimensions for kg.m/s²', () => {
			const force = fromComponents(
				new Map([
					['kg', 1],
					['m', 1],
					['s', -2]
				]),
				1
			);
			const sig = getDimensionalSignature(force);

			expect(sig).toEqual({ mass: 1, length: 1, time: -2 });
		});

		it('should return empty signature for dimensionless unit', () => {
			const dim = dimensionless();
			const sig = getDimensionalSignature(dim);

			expect(sig).toEqual({});
		});

		it('should handle square length dimension', () => {
			const m2 = unitWithPower('m', 2)!;
			const sig = getDimensionalSignature(m2);

			expect(sig).toEqual({ length: 2 });
		});

		it('should handle cube length dimension', () => {
			const m3 = unitWithPower('m', 3)!;
			const sig = getDimensionalSignature(m3);

			expect(sig).toEqual({ length: 3 });
		});

		it('should handle prefixed units (km)', () => {
			const km = unit('km')!;
			const sig = getDimensionalSignature(km);

			expect(sig).toEqual({ length: 1 });
		});

		it('should handle energy dimensions (kg.m²/s²)', () => {
			const joule = fromComponents(
				new Map([
					['kg', 1],
					['m', 2],
					['s', -2]
				]),
				1
			);
			const sig = getDimensionalSignature(joule);

			expect(sig).toEqual({ mass: 1, length: 2, time: -2 });
		});

		it('should return empty signature when units cancel out', () => {
			const mTimesInvM = fromComponents(new Map([['m', 0]]), 1);
			const sig = getDimensionalSignature(mTimesInvM);

			expect(sig).toEqual({});
		});
	});

	// =============================================================================
	// normalizeToBase()
	// =============================================================================

	describe('normalizeToBase', () => {
		it('should keep meter as-is (already base unit)', () => {
			const m = unit('m')!;
			const normalized = normalizeToBase(m);

			expect(normalized.components.get('m')).toBe(1);
			expect(normalized.coefficient).toBe(1);
		});

		it('should convert km to m with coefficient 1000', () => {
			const km = unit('km')!;
			const normalized = normalizeToBase(km);

			expect(normalized.components.get('m')).toBe(1);
			expect(normalized.coefficient).toBe(1000);
		});

		it('should convert cm to m with coefficient 0.01', () => {
			const cm = unit('cm')!;
			const normalized = normalizeToBase(cm);

			expect(normalized.components.get('m')).toBe(1);
			expect(Math.abs(normalized.coefficient - 0.01) < 1e-9).toBe(true);
		});

		it('should convert mg to g with coefficient 0.001', () => {
			const mg = unit('mg')!;
			const normalized = normalizeToBase(mg);

			expect(normalized.components.get('g')).toBe(1);
			expect(Math.abs(normalized.coefficient - 0.001) < 1e-9).toBe(true);
		});

		it('should convert h to s with coefficient 3600', () => {
			const h = unit('h')!;
			const normalized = normalizeToBase(h);

			expect(normalized.components.get('s')).toBe(1);
			expect(normalized.coefficient).toBe(3600);
		});

		it('should convert km/h to m/s with coefficient 1000/3600', () => {
			const kmPerHour = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1000 / 3600
			);
			const normalized = normalizeToBase(kmPerHour);

			expect(normalized.components.get('m')).toBe(1);
			expect(normalized.components.get('s')).toBe(-1);
			expect(Math.abs(normalized.coefficient - 1000 / 3600) < 1e-9).toBe(true);
		});

		it('should convert km² to m² with coefficient 1e6', () => {
			const km2 = unitWithPower('km', 2)!;
			const normalized = normalizeToBase(km2);

			expect(normalized.components.get('m')).toBe(2);
			expect(Math.abs(normalized.coefficient - 1e6) < 1e-9).toBe(true);
		});

		it('should convert cm³ to m³ with coefficient 1e-6', () => {
			const cm3 = unitWithPower('cm', 3)!;
			const normalized = normalizeToBase(cm3);

			expect(normalized.components.get('m')).toBe(3);
			expect(Math.abs(normalized.coefficient - 1e-6) < 1e-9).toBe(true);
		});

		it('should preserve dimensionless unit', () => {
			const dim = dimensionless();
			const normalized = normalizeToBase(dim);

			expect(normalized.components.size).toBe(0);
			expect(normalized.coefficient).toBe(1);
		});

		it('should preserve original field if present', () => {
			const kmWithOriginal = fromComponents(new Map([['m', 1]]), 1000, 'km');
			const normalized = normalizeToBase(kmWithOriginal);

			expect(normalized.original).toBe('km');
		});

		it('should not include original field if not present', () => {
			const m = unit('m')!;
			const normalized = normalizeToBase(m);

			// Should have original from the factory function
			expect(normalized.original).toBe('m');
		});

		it('should handle complex composite units', () => {
			// kg.km/h -> g.m/s with coefficient k * K * (1/h)
			// We need to build this correctly using base symbols
			const complexUnit = fromComponents(
				new Map([
					['g', 1],
					['m', 1],
					['s', -1]
				]),
				1000 * 1000 * (1 / 3600) // kg = k*g (1000), km = k*m (1000), h = 3600 s
			);
			const normalized = normalizeToBase(complexUnit);

			expect(normalized.components.get('g')).toBe(1);
			expect(normalized.components.get('m')).toBe(1);
			expect(normalized.components.get('s')).toBe(-1);
			// Already normalized, coefficient should be preserved
			expect(Math.abs(normalized.coefficient - 1000 * 1000 * (1 / 3600)) < 1e-9).toBe(true);
		});

		it('should handle min to s conversion', () => {
			const min = unit('min')!;
			const normalized = normalizeToBase(min);

			expect(normalized.components.get('s')).toBe(1);
			expect(normalized.coefficient).toBe(60);
		});

		it('should handle degree to radian conversion', () => {
			const degree = unit('°')!;
			const normalized = normalizeToBase(degree);

			expect(normalized.components.get('rad')).toBe(1);
			expect(Math.abs(normalized.coefficient - Math.PI / 180) < 1e-9).toBe(true);
		});

		it('should combine coefficients correctly for multiple components', () => {
			// km × min = m × s with combined coefficient
			const kmMin = fromComponents(
				new Map([
					['m', 1],
					['min', -1]
				]),
				1000
			);
			const normalized = normalizeToBase(kmMin);

			expect(normalized.components.get('m')).toBe(1);
			expect(normalized.components.get('s')).toBe(-1);
			// 1000 (from km) * (1/60) (from 1/min) = 1000/60
			expect(Math.abs(normalized.coefficient - 1000 / 60) < 1e-9).toBe(true);
		});
	});
});
