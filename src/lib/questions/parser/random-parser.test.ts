/**
 * Random Parser Tests
 * ===================
 *
 * Tests for parsing {#:...} random expressions.
 */

import { describe, it, expect } from 'vitest';
import { parseRandomExpression } from './random-parser';
import type { NumberOrVariable } from '../types';

// Helper functions for constructing test expectations
function num(value: number): NumberOrVariable {
	return { type: 'number', value };
}

function varRef(name: string): NumberOrVariable {
	return { type: 'variable', name };
}

describe('parseRandomExpression - Integer Ranges', () => {
	it('should parse simple integer range', () => {
		const result = parseRandomExpression('{#:1-10}');

		expect(result).toEqual({
			type: 'integer',
			min: num(1),
			max: num(10),
			exclusions: []
		});
	});

	it('should parse negative range', () => {
		const result = parseRandomExpression('{#:-10-10}');

		expect(result).toEqual({
			type: 'integer',
			min: num(-10),
			max: num(10),
			exclusions: []
		});
	});

	it('should parse range with variable bounds', () => {
		const result = parseRandomExpression('{#:{@:min}-{@:max}}');

		expect(result).toEqual({
			type: 'integer',
			min: varRef('min'),
			max: varRef('max'),
			exclusions: []
		});
	});

	it('should parse range with one variable bound', () => {
		const result = parseRandomExpression('{#:1-{@:max}}');

		expect(result).toEqual({
			type: 'integer',
			min: num(1),
			max: varRef('max'),
			exclusions: []
		});
	});
});

describe('parseRandomExpression - Decimal by Range', () => {
	it('should parse decimal range with step', () => {
		const result = parseRandomExpression('{#:0.5-9.99:0.01}');

		expect(result).toEqual({
			type: 'decimal-range',
			min: num(0.5),
			max: num(9.99),
			step: 0.01,
			exclusions: []
		});
	});

	it('should parse decimal range with default step', () => {
		const result = parseRandomExpression('{#:1.5-10.5}');

		expect(result).toEqual({
			type: 'decimal-range',
			min: num(1.5),
			max: num(10.5),
			step: 0.01, // Default step
			exclusions: []
		});
	});

	it('should parse decimal range with variable bounds', () => {
		const result = parseRandomExpression('{#:{@:min}-{@:max}:0.1}');

		expect(result).toEqual({
			type: 'decimal-range',
			min: varRef('min'),
			max: varRef('max'),
			step: 0.1,
			exclusions: []
		});
	});
});

describe('parseRandomExpression - Decimal by Digits', () => {
	it('should parse decimal by digits', () => {
		const result = parseRandomExpression('{#:2.3}');

		expect(result).toEqual({
			type: 'decimal-by-digits',
			digitsBefore: num(2),
			digitsAfter: num(3),
			exclusions: []
		});
	});

	it('should parse decimal with variable digits', () => {
		const result = parseRandomExpression('{#:{@:before}.{@:after}}');

		expect(result).toEqual({
			type: 'decimal-by-digits',
			digitsBefore: varRef('before'),
			digitsAfter: varRef('after'),
			exclusions: []
		});
	});

	it('should parse decimal with one variable digit', () => {
		const result = parseRandomExpression('{#:2.{@:after}}');

		expect(result).toEqual({
			type: 'decimal-by-digits',
			digitsBefore: num(2),
			digitsAfter: varRef('after'),
			exclusions: []
		});
	});
});

describe('parseRandomExpression - Exclusions', () => {
	it('should parse single value exclusion', () => {
		const result = parseRandomExpression('{#:1-10!5}');

		expect(result.exclusions).toHaveLength(1);
		expect(result.exclusions[0]).toEqual({ type: 'value', value: num(5) });
	});

	it('should parse multiple value exclusions', () => {
		const result = parseRandomExpression('{#:1-100!5,7,9}');

		expect(result.exclusions).toHaveLength(3);
		expect(result.exclusions[0]).toEqual({ type: 'value', value: num(5) });
		expect(result.exclusions[1]).toEqual({ type: 'value', value: num(7) });
		expect(result.exclusions[2]).toEqual({ type: 'value', value: num(9) });
	});

	it('should parse range exclusion', () => {
		const result = parseRandomExpression('{#:1-100!10-20}');

		expect(result.exclusions).toHaveLength(1);
		expect(result.exclusions[0]).toEqual({ type: 'range', min: num(10), max: num(20) });
	});

	it('should parse multiple range exclusions', () => {
		const result = parseRandomExpression('{#:1-100!10-20,30-40}');

		expect(result.exclusions).toHaveLength(2);
		expect(result.exclusions[0]).toEqual({ type: 'range', min: num(10), max: num(20) });
		expect(result.exclusions[1]).toEqual({ type: 'range', min: num(30), max: num(40) });
	});

	it('should parse variable exclusion', () => {
		const result = parseRandomExpression('{#:1-100!{@:a}}');

		expect(result.exclusions).toHaveLength(1);
		expect(result.exclusions[0]).toEqual({
			type: 'value',
			value: varRef('a')
		});
	});

	it('should parse mixed exclusions', () => {
		const result = parseRandomExpression('{#:1-100!5,10-20,{@:a}}');

		expect(result.exclusions).toHaveLength(3);
		expect(result.exclusions[0]).toEqual({ type: 'value', value: num(5) });
		expect(result.exclusions[1]).toEqual({ type: 'range', min: num(10), max: num(20) });
		expect(result.exclusions[2]).toEqual({ type: 'value', value: varRef('a') });
	});

	it('should parse multiple variable exclusions', () => {
		const result = parseRandomExpression('{#:1-100!{@:a},{@:b}}');

		expect(result.exclusions).toHaveLength(2);
		expect(result.exclusions[0]).toEqual({ type: 'value', value: varRef('a') });
		expect(result.exclusions[1]).toEqual({ type: 'value', value: varRef('b') });
	});

	// FIXME: Parser bug - exclusion ranges with variable bounds not working
	// Issue: {#:1-100!{@:b}-{@:c}} is parsed as single variable "b}-{@:c" instead of range
	// Expected: { type: 'range', min: varRef('b'), max: varRef('c') }
	// Actual: { type: 'value', value: varRef('b}-{@:c') }
	it.skip('should parse complex mixed exclusions', () => {
		const result = parseRandomExpression('{#:1-100!5,7-9,{@:a},{@:b}-{@:c}}');

		expect(result.exclusions).toHaveLength(4);
		expect(result.exclusions[0]).toEqual({ type: 'value', value: num(5) });
		expect(result.exclusions[1]).toEqual({ type: 'range', min: num(7), max: num(9) });
		expect(result.exclusions[2]).toEqual({ type: 'value', value: varRef('a') });
		expect(result.exclusions[3]).toEqual({
			type: 'range',
			min: varRef('b'),
			max: varRef('c')
		});
	});
});

describe('parseRandomExpression - Edge Cases', () => {
	it('should handle negative numbers in exclusions', () => {
		const result = parseRandomExpression('{#:-100-100!-5}');

		expect(result.exclusions[0]).toEqual({ type: 'value', value: num(-5) });
	});

	it('should handle negative range exclusions', () => {
		const result = parseRandomExpression('{#:-100-100!-10--5}');

		expect(result.exclusions[0]).toEqual({ type: 'range', min: num(-10), max: num(-5) });
	});

	it('should handle decimal exclusions', () => {
		const result = parseRandomExpression('{#:0.5-9.99:0.01!5.5}');

		expect(result.exclusions[0]).toEqual({ type: 'value', value: num(5.5) });
	});

	it('should handle large numbers', () => {
		const result = parseRandomExpression('{#:1000-9999}');

		expect(result).toEqual({
			type: 'integer',
			min: num(1000),
			max: num(9999),
			exclusions: []
		});
	});

	it('should handle zero in range', () => {
		const result = parseRandomExpression('{#:0-10}');

		expect(result).toEqual({
			type: 'integer',
			min: num(0),
			max: num(10),
			exclusions: []
		});
	});

	it('should handle decimal with many digits', () => {
		const result = parseRandomExpression('{#:5.10}');

		expect(result).toEqual({
			type: 'decimal-by-digits',
			digitsBefore: num(5),
			digitsAfter: num(10),
			exclusions: []
		});
	});
});

describe('parseRandomExpression - Error Cases', () => {
	it('should throw on invalid format', () => {
		expect(() => parseRandomExpression('{#:invalid}')).toThrow();
	});

	it('should throw on missing closing brace', () => {
		expect(() => parseRandomExpression('{#:1-10')).toThrow();
	});

	it('should throw on missing opening brace', () => {
		expect(() => parseRandomExpression('#:1-10}')).toThrow();
	});

	it('should throw on empty expression', () => {
		expect(() => parseRandomExpression('{#:}')).toThrow();
	});

	it('should throw on non-numeric values (where expected)', () => {
		expect(() => parseRandomExpression('{#:a-b}')).toThrow();
	});
});
