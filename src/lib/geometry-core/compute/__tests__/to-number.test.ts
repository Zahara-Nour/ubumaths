import { describe, it, expect } from 'vitest';
import { geoToNumber, vec2ToPoint } from '../to-number';
import { exact, numeric } from '../../types/geo-value';
import { number, sqrt, fraction } from '$lib/mathAST';

describe('geoToNumber', () => {
	it('returns the value directly for numeric', () => {
		expect(geoToNumber(numeric(5))).toBe(5);
	});

	it('returns 0 for numeric(0)', () => {
		expect(geoToNumber(numeric(0))).toBe(0);
	});

	it('evaluates exact integer to float', () => {
		expect(geoToNumber(exact(number('3')))).toBe(3);
	});

	it('evaluates exact fraction to float', () => {
		expect(geoToNumber(exact(fraction(number('1'), number('3'))))).toBeCloseTo(1 / 3, 10);
	});

	it('evaluates exact sqrt(2) to float', () => {
		expect(geoToNumber(exact(sqrt(number('2'))))).toBeCloseTo(Math.SQRT2, 10);
	});

	it('evaluates exact negative number', () => {
		expect(geoToNumber(exact(number('-7')))).toBe(-7);
	});
});

describe('vec2ToPoint', () => {
	it('converts Vec2<GeoValue> to Point (numeric coords)', () => {
		const p = vec2ToPoint({ x: exact(number('3')), y: numeric(4) });
		expect(p.x).toBe(3);
		expect(p.y).toBe(4);
	});

	it('converts both exact values', () => {
		const p = vec2ToPoint({
			x: exact(fraction(number('1'), number('2'))),
			y: exact(sqrt(number('2')))
		});
		expect(p.x).toBeCloseTo(0.5, 10);
		expect(p.y).toBeCloseTo(Math.SQRT2, 10);
	});
});
