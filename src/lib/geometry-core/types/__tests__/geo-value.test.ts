import { describe, it, expect } from 'vitest';
import { exact, numeric, isExact, isNumeric, type GeoValue } from '../geo-value';
import { number, sqrt, fraction, add, opposite, multiply, piConstant } from '$lib/mathAST';

describe('GeoValue constructors', () => {
	it('exact() creates an exact value from a MathNode', () => {
		const node = number('5');
		const v = exact(node);
		expect(v.kind).toBe('exact');
		expect(v.node).toBe(node);
	});

	it('numeric() creates a numeric value from a float', () => {
		const v = numeric(3.14);
		expect(v.kind).toBe('numeric');
		expect(v.value).toBe(3.14);
	});

	it('numeric() accepts 0 and negative zero', () => {
		expect(numeric(0).value).toBe(0);
		expect(numeric(-0).value).toBe(-0);
	});

	it('numeric() accepts very small positive numbers', () => {
		expect(numeric(Number.MIN_VALUE).value).toBe(Number.MIN_VALUE);
		expect(numeric(1e-300).value).toBe(1e-300);
	});

	it('numeric() accepts very large numbers', () => {
		expect(numeric(Number.MAX_VALUE).value).toBe(Number.MAX_VALUE);
		expect(numeric(1e300).value).toBe(1e300);
	});

	it('numeric() accepts negative numbers', () => {
		expect(numeric(-42.5).value).toBe(-42.5);
	});

	it('numeric() rejects NaN', () => {
		expect(() => numeric(NaN)).toThrow('finite');
	});

	it('numeric() rejects Infinity', () => {
		expect(() => numeric(Infinity)).toThrow('finite');
		expect(() => numeric(-Infinity)).toThrow('finite');
	});

	it('exact() works with sqrt', () => {
		const v = exact(sqrt(number('2')));
		expect(v.kind).toBe('exact');
		expect(v.node.type).toBe('function');
	});

	it('exact() works with fraction', () => {
		const v = exact(fraction(number('1'), number('3')));
		expect(v.kind).toBe('exact');
		expect(v.node.type).toBe('division');
	});

	it('exact() works with nested expression (2 + sqrt(3))', () => {
		const v = exact(add(number('2'), sqrt(number('3'))));
		expect(v.kind).toBe('exact');
		expect(v.node.type).toBe('addition');
	});

	it('exact() works with negative via opposite', () => {
		const v = exact(opposite(number('5')));
		expect(v.kind).toBe('exact');
	});

	it('exact() works with pi', () => {
		const v = exact(piConstant());
		expect(v.kind).toBe('exact');
	});

	it('exact() works with zero', () => {
		const v = exact(number('0'));
		expect(v.kind).toBe('exact');
	});

	it('exact() preserves the exact same node reference', () => {
		const node = multiply(number('3'), sqrt(number('5')), 'dot');
		const v = exact(node);
		expect(v.node).toBe(node); // same object, not a copy
	});
});

describe('GeoValue type guards', () => {
	it('isExact() returns true for exact values', () => {
		expect(isExact(exact(number('5')))).toBe(true);
	});

	it('isExact() returns false for numeric values', () => {
		expect(isExact(numeric(5))).toBe(false);
	});

	it('isNumeric() returns true for numeric values', () => {
		expect(isNumeric(numeric(5))).toBe(true);
	});

	it('isNumeric() returns false for exact values', () => {
		expect(isNumeric(exact(number('5')))).toBe(false);
	});

	it('isExact() narrows the type to access .node', () => {
		const v: GeoValue = exact(number('5'));
		if (isExact(v)) {
			expect(v.node).toBeDefined();
		}
	});

	it('isNumeric() narrows the type to access .value', () => {
		const v: GeoValue = numeric(5);
		if (isNumeric(v)) {
			expect(v.value).toBe(5);
		}
	});

	it('exact and numeric are mutually exclusive', () => {
		const e: GeoValue = exact(number('1'));
		const n: GeoValue = numeric(1);
		expect(isExact(e) && !isNumeric(e)).toBe(true);
		expect(isNumeric(n) && !isExact(n)).toBe(true);
	});
});
