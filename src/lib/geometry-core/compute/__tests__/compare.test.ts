import { describe, it, expect } from 'vitest';
import { geoEqual, geoIsZero, geoLessThan, geoApproxEqual } from '../compare';
import { exact, numeric } from '../../types/geo-value';
import { number, add, subtract, sqrt, multiply } from '$lib/mathAST';

describe('geoEqual - exact values', () => {
	it('same exact value -> true', () => {
		expect(geoEqual(exact(number('5')), exact(number('5')))).toBe(true);
	});

	it('algebraically equal expressions -> true (normalization)', () => {
		// 2 + 3 should equal 5
		expect(geoEqual(exact(add(number('2'), number('3'))), exact(number('5')))).toBe(true);
	});

	it('sqrt(2) equals sqrt(2) -> true', () => {
		expect(geoEqual(exact(sqrt(number('2'))), exact(sqrt(number('2'))))).toBe(true);
	});

	it('different exact values -> false', () => {
		expect(geoEqual(exact(number('3')), exact(number('4')))).toBe(false);
	});

	it('sqrt(8) equals 2*sqrt(2) -> true (radical normalization)', () => {
		expect(
			geoEqual(exact(sqrt(number('8'))), exact(multiply(number('2'), sqrt(number('2')), 'dot')))
		).toBe(true);
	});
});

describe('geoEqual - numeric values', () => {
	it('0.1 + 0.2 equals 0.3 within tolerance', () => {
		expect(geoEqual(numeric(0.1 + 0.2), numeric(0.3))).toBe(true);
	});

	it('values within relative tolerance -> true', () => {
		expect(geoEqual(numeric(1), numeric(1.0000000000001))).toBe(true);
	});

	it('clearly different values -> false', () => {
		expect(geoEqual(numeric(1), numeric(2))).toBe(false);
	});
});

describe('geoEqual - mixed exact/numeric', () => {
	it('falls back to numeric comparison', () => {
		expect(geoEqual(exact(number('5')), numeric(5))).toBe(true);
	});

	it('detects difference in mixed mode', () => {
		expect(geoEqual(exact(number('5')), numeric(6))).toBe(false);
	});
});

describe('geoIsZero', () => {
	it('exact(0) -> true', () => {
		expect(geoIsZero(exact(number('0')))).toBe(true);
	});

	it('exact(3-3) -> true (normalizes to 0)', () => {
		expect(geoIsZero(exact(subtract(number('3'), number('3'))))).toBe(true);
	});

	it('exact(1) -> false', () => {
		expect(geoIsZero(exact(number('1')))).toBe(false);
	});

	it('numeric very close to 0 -> true', () => {
		expect(geoIsZero(numeric(1e-16))).toBe(true);
	});

	it('numeric not close to 0 -> false', () => {
		expect(geoIsZero(numeric(0.001))).toBe(false);
	});
});

describe('geoLessThan', () => {
	it('1 < 2 -> true', () => {
		expect(geoLessThan(numeric(1), numeric(2))).toBe(true);
	});

	it('2 < 1 -> false', () => {
		expect(geoLessThan(numeric(2), numeric(1))).toBe(false);
	});

	it('equal values -> false (strict)', () => {
		expect(geoLessThan(numeric(5), numeric(5))).toBe(false);
	});

	it('exact values compared via float', () => {
		expect(geoLessThan(exact(number('1')), exact(number('2')))).toBe(true);
		expect(geoLessThan(exact(number('2')), exact(number('1')))).toBe(false);
	});
});

describe('geoApproxEqual', () => {
	it('exactly equal numbers -> true', () => {
		expect(geoApproxEqual(5, 5)).toBe(true);
	});

	it('0.1 + 0.2 vs 0.3 -> true', () => {
		expect(geoApproxEqual(0.1 + 0.2, 0.3)).toBe(true);
	});

	it('clearly different -> false', () => {
		expect(geoApproxEqual(1, 2)).toBe(false);
	});

	it('both zero -> true', () => {
		expect(geoApproxEqual(0, 0)).toBe(true);
	});
});
