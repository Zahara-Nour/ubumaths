import { describe, it, expect } from 'vitest';
import {
	geoAdd,
	geoSub,
	geoMul,
	geoDiv,
	geoSqrt,
	geoOpposite,
	geoFromInteger,
	geoFromFraction
} from '../geo-arithmetic';
import { exact, numeric, isExact, isNumeric } from '../../types/geo-value';
import { geoToNumber } from '../to-number';
import { number } from '$lib/mathAST';

describe('exact + exact = exact', () => {
	it('geoAdd(exact(3), exact(4)) -> exact(7)', () => {
		const result = geoAdd(exact(number('3')), exact(number('4')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(7);
	});

	it('geoSub(exact(5), exact(3)) -> exact(2)', () => {
		const result = geoSub(exact(number('5')), exact(number('3')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(2);
	});

	it('geoMul(exact(2), exact(3)) -> exact(6)', () => {
		const result = geoMul(exact(number('2')), exact(number('3')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(6);
	});

	it('geoDiv(exact(1), exact(3)) -> exact(1/3)', () => {
		const result = geoDiv(exact(number('1')), exact(number('3')));
		expect(result).not.toBeNull();
		expect(isExact(result!)).toBe(true);
		expect(geoToNumber(result!)).toBeCloseTo(1 / 3, 10);
	});
});

describe('exact + numeric = numeric', () => {
	it('geoAdd(exact(3), numeric(4)) -> numeric(7)', () => {
		const result = geoAdd(exact(number('3')), numeric(4));
		expect(isNumeric(result)).toBe(true);
		expect(geoToNumber(result)).toBe(7);
	});

	it('geoMul(numeric(2), exact(3)) -> numeric(6)', () => {
		const result = geoMul(numeric(2), exact(number('3')));
		expect(isNumeric(result)).toBe(true);
		expect(geoToNumber(result)).toBe(6);
	});
});

describe('numeric + numeric = numeric', () => {
	it('geoAdd(numeric(3), numeric(4)) -> numeric(7)', () => {
		const result = geoAdd(numeric(3), numeric(4));
		expect(isNumeric(result)).toBe(true);
		expect(geoToNumber(result)).toBe(7);
	});
});

describe('geoDiv edge cases', () => {
	it('geoDiv by exact(0) returns null', () => {
		expect(geoDiv(exact(number('1')), exact(number('0')))).toBeNull();
	});

	it('geoDiv by numeric(0) returns null', () => {
		expect(geoDiv(numeric(1), numeric(0))).toBeNull();
	});

	it('geoDiv exact / numeric -> numeric', () => {
		const result = geoDiv(exact(number('6')), numeric(2));
		expect(result).not.toBeNull();
		expect(isNumeric(result!)).toBe(true);
		expect(geoToNumber(result!)).toBe(3);
	});

	it('geoDiv 0 / something -> exact(0) or numeric(0)', () => {
		const result = geoDiv(exact(number('0')), exact(number('5')));
		expect(result).not.toBeNull();
		expect(geoToNumber(result!)).toBe(0);
	});
});

describe('geoSqrt', () => {
	it('geoSqrt(exact(4)) -> exact(2)', () => {
		const result = geoSqrt(exact(number('4')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(2);
	});

	it('geoSqrt(exact(2)) -> exact (symbolic sqrt)', () => {
		const result = geoSqrt(exact(number('2')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBeCloseTo(Math.SQRT2, 10);
	});

	it('geoSqrt(numeric(2)) -> numeric', () => {
		const result = geoSqrt(numeric(2));
		expect(isNumeric(result)).toBe(true);
		expect(geoToNumber(result)).toBeCloseTo(Math.SQRT2, 10);
	});

	it('geoSqrt(numeric(-1)) throws (NaN not finite)', () => {
		expect(() => geoSqrt(numeric(-1))).toThrow();
	});
});

describe('geoOpposite', () => {
	it('geoOpposite(exact(3)) -> exact(-3)', () => {
		const result = geoOpposite(exact(number('3')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(-3);
	});

	it('geoOpposite(numeric(5)) -> numeric(-5)', () => {
		const result = geoOpposite(numeric(5));
		expect(isNumeric(result)).toBe(true);
		expect(geoToNumber(result)).toBe(-5);
	});
});

describe('convenience constructors', () => {
	it('geoFromInteger(5) -> exact MathNode', () => {
		const result = geoFromInteger(5);
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(5);
	});

	it('geoFromInteger(-3) -> exact MathNode', () => {
		expect(geoToNumber(geoFromInteger(-3))).toBe(-3);
	});

	it('geoFromFraction(1, 3) -> exact MathNode', () => {
		const result = geoFromFraction(1, 3);
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBeCloseTo(1 / 3, 10);
	});

	it('geoFromFraction rejects non-integer arguments', () => {
		expect(() => geoFromFraction(1.5, 2)).toThrow('integers');
		expect(() => geoFromFraction(1, 2.5)).toThrow('integers');
	});
});
