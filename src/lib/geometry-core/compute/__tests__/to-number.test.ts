import { describe, it, expect } from 'vitest';
import { geoToNumber, vec2ToPoint } from '../to-number';
import { exact, numeric } from '../../types/geo-value';
import { number, sqrt, fraction, add, multiply, opposite, piConstant } from '$lib/mathAST';

describe('geoToNumber - numeric values', () => {
	it('returns the value directly', () => {
		expect(geoToNumber(numeric(5))).toBe(5);
	});

	it('returns 0 for numeric(0)', () => {
		expect(geoToNumber(numeric(0))).toBe(0);
	});

	it('returns negative values', () => {
		expect(geoToNumber(numeric(-42.5))).toBe(-42.5);
	});

	it('returns very small values', () => {
		expect(geoToNumber(numeric(1e-15))).toBe(1e-15);
	});

	it('returns very large values', () => {
		expect(geoToNumber(numeric(1e15))).toBe(1e15);
	});
});

describe('geoToNumber - exact values', () => {
	it('evaluates exact integer', () => {
		expect(geoToNumber(exact(number('3')))).toBe(3);
	});

	it('evaluates exact zero', () => {
		expect(geoToNumber(exact(number('0')))).toBe(0);
	});

	it('evaluates exact negative', () => {
		expect(geoToNumber(exact(number('-7')))).toBe(-7);
	});

	it('evaluates exact negative via opposite', () => {
		expect(geoToNumber(exact(opposite(number('7'))))).toBe(-7);
	});

	it('evaluates exact fraction 1/3', () => {
		expect(geoToNumber(exact(fraction(number('1'), number('3'))))).toBeCloseTo(1 / 3, 10);
	});

	it('evaluates exact fraction 1/2', () => {
		expect(geoToNumber(exact(fraction(number('1'), number('2'))))).toBe(0.5);
	});

	it('evaluates exact fraction 22/7', () => {
		expect(geoToNumber(exact(fraction(number('22'), number('7'))))).toBeCloseTo(22 / 7, 10);
	});

	it('evaluates exact sqrt(2)', () => {
		expect(geoToNumber(exact(sqrt(number('2'))))).toBeCloseTo(Math.SQRT2, 10);
	});

	it('evaluates exact sqrt(0) = 0', () => {
		expect(geoToNumber(exact(sqrt(number('0'))))).toBe(0);
	});

	it('evaluates exact sqrt(1) = 1', () => {
		expect(geoToNumber(exact(sqrt(number('1'))))).toBe(1);
	});

	it('evaluates exact sqrt(9) = 3', () => {
		expect(geoToNumber(exact(sqrt(number('9'))))).toBe(3);
	});

	it('evaluates nested expression 2 + sqrt(3)', () => {
		const val = geoToNumber(exact(add(number('2'), sqrt(number('3')))));
		expect(val).toBeCloseTo(2 + Math.sqrt(3), 10);
	});

	it('evaluates product 3 * sqrt(2)', () => {
		const val = geoToNumber(exact(multiply(number('3'), sqrt(number('2')), 'dot')));
		expect(val).toBeCloseTo(3 * Math.SQRT2, 10);
	});

	it('evaluates pi', () => {
		expect(geoToNumber(exact(piConstant()))).toBeCloseTo(Math.PI, 10);
	});
});

describe('vec2ToPoint', () => {
	it('converts mixed exact/numeric', () => {
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

	it('converts both numeric values', () => {
		const p = vec2ToPoint({ x: numeric(1.5), y: numeric(-2.5) });
		expect(p.x).toBe(1.5);
		expect(p.y).toBe(-2.5);
	});

	it('converts zero point', () => {
		const p = vec2ToPoint({ x: exact(number('0')), y: exact(number('0')) });
		expect(p.x).toBe(0);
		expect(p.y).toBe(0);
	});
});
