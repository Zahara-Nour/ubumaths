import { describe, it, expect } from 'vitest';
import { exact, numeric, isExact, isNumeric, type GeoValue } from '../geo-value';
import { number, sqrt, fraction } from '$lib/mathAST';

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

	it('numeric() accepts 0, negative zero, and Infinity', () => {
		expect(numeric(0).value).toBe(0);
		expect(numeric(-0).value).toBe(-0);
		expect(numeric(Infinity).value).toBe(Infinity);
		expect(numeric(-Infinity).value).toBe(-Infinity);
	});

	it('numeric() rejects NaN', () => {
		expect(() => numeric(NaN)).toThrow('NaN');
	});

	it('exact() works with complex MathNode expressions', () => {
		const node = sqrt(number('2'));
		const v = exact(node);
		expect(v.kind).toBe('exact');
		expect(v.node.type).toBe('function');
	});

	it('exact() works with fraction MathNode', () => {
		const node = fraction(number('1'), number('3'));
		const v = exact(node);
		expect(v.kind).toBe('exact');
		expect(v.node.type).toBe('division');
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

	it('isExact() narrows the type', () => {
		const v: GeoValue = exact(number('5'));
		if (isExact(v)) {
			expect(v.node).toBeDefined();
		}
	});

	it('isNumeric() narrows the type', () => {
		const v: GeoValue = numeric(5);
		if (isNumeric(v)) {
			expect(v.value).toBe(5);
		}
	});
});
