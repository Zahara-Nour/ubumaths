/**
 * Random Parser Tests
 * ====================
 *
 * Comprehensive tests for parsing random number specifications in dual syntax.
 * Covers integer ranges, decimal formats, exclusions, variables, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { parseRandomSpec } from './random-parser';

describe('parseRandomSpec - Integer ranges (Questions syntax)', () => {
	it('should parse simple integer range', () => {
		const spec = parseRandomSpec('{#:1-10}', 'questions');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: 1 },
			max: { type: 'number', value: 10 },
			exclusions: []
		});
	});

	it('should parse range with negative minimum', () => {
		const spec = parseRandomSpec('{#:-5-10}', 'questions');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: -5 },
			max: { type: 'number', value: 10 }
		});
	});

	it('should parse range with negative maximum', () => {
		const spec = parseRandomSpec('{#:-20--5}', 'questions');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: -20 },
			max: { type: 'number', value: -5 }
		});
	});

	it('should parse range with both negative bounds', () => {
		const spec = parseRandomSpec('{#:-100--1}', 'questions');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: -100 },
			max: { type: 'number', value: -1 }
		});
	});

	it('should parse large number ranges', () => {
		const spec = parseRandomSpec('{#:1000-9999}', 'questions');

		expect(spec).toMatchObject({
			min: { type: 'number', value: 1000 },
			max: { type: 'number', value: 9999 }
		});
	});
});

describe('parseRandomSpec - Integer ranges (Markdown syntax)', () => {
	it('should parse with random: prefix', () => {
		const spec = parseRandomSpec('{{random:1-10}}', 'markdown');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: 1 },
			max: { type: 'number', value: 10 },
			exclusions: []
		});
	});

	it('should parse shorthand syntax', () => {
		const spec = parseRandomSpec('{{1-10}}', 'markdown');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: 1 },
			max: { type: 'number', value: 10 }
		});
	});

	it('should parse negative numbers in shorthand', () => {
		const spec = parseRandomSpec('{{-5-10}}', 'markdown');

		expect(spec?.min).toMatchObject({ type: 'number', value: -5 });
		expect(spec?.max).toMatchObject({ type: 'number', value: 10 });
	});

	it('should parse with random: prefix and negative numbers', () => {
		const spec = parseRandomSpec('{{random:-5-10}}', 'markdown');

		expect(spec?.min).toMatchObject({ type: 'number', value: -5 });
	});
});

describe('parseRandomSpec - Decimal by digits', () => {
	it('should parse Questions syntax', () => {
		const spec = parseRandomSpec('{#:2.3}', 'questions');

		expect(spec).toMatchObject({
			type: 'decimal-by-digits',
			digitsBefore: { type: 'number', value: 2 },
			digitsAfter: { type: 'number', value: 3 },
			exclusions: []
		});
	});

	it('should parse Markdown syntax with prefix', () => {
		const spec = parseRandomSpec('{{random:2.3}}', 'markdown');

		expect(spec).toMatchObject({
			type: 'decimal-by-digits',
			digitsBefore: { type: 'number', value: 2 },
			digitsAfter: { type: 'number', value: 3 }
		});
	});

	it('should parse Markdown shorthand', () => {
		const spec = parseRandomSpec('{{2.3}}', 'markdown');

		expect(spec?.type).toBe('decimal-by-digits');
	});

	it('should parse single digit before decimal', () => {
		const spec = parseRandomSpec('{#:1.5}', 'questions');

		expect(spec?.digitsBefore).toMatchObject({ type: 'number', value: 1 });
		expect(spec?.digitsAfter).toMatchObject({ type: 'number', value: 5 });
	});

	it('should parse large digit counts', () => {
		const spec = parseRandomSpec('{#:10.8}', 'questions');

		expect(spec?.digitsBefore).toMatchObject({ type: 'number', value: 10 });
		expect(spec?.digitsAfter).toMatchObject({ type: 'number', value: 8 });
	});
});

describe('parseRandomSpec - Decimal range with step', () => {
	it('should parse Questions syntax', () => {
		const spec = parseRandomSpec('{#:0.5-9.99:0.01}', 'questions');

		expect(spec).toMatchObject({
			type: 'decimal-range',
			min: { type: 'number', value: 0.5 },
			max: { type: 'number', value: 9.99 },
			step: 0.01,
			exclusions: []
		});
	});

	it('should parse Markdown syntax', () => {
		const spec = parseRandomSpec('{{random:0.5-9.99:0.01}}', 'markdown');

		expect(spec?.type).toBe('decimal-range');
		expect(spec?.step).toBe(0.01);
	});

	it('should parse Markdown shorthand', () => {
		const spec = parseRandomSpec('{{0.5-9.99:0.01}}', 'markdown');

		expect(spec?.type).toBe('decimal-range');
	});

	it('should parse with larger step', () => {
		const spec = parseRandomSpec('{#:0-100:0.5}', 'questions');

		expect(spec?.step).toBe(0.5);
	});

	it('should infer decimal type from decimal bounds without step', () => {
		const spec = parseRandomSpec('{#:0.5-9.99}', 'questions');

		expect(spec?.type).toBe('decimal-range');
		expect(spec?.step).toBe(0.01); // Default step
	});

	it('should parse negative decimal ranges', () => {
		const spec = parseRandomSpec('{#:-5.5-5.5:0.1}', 'questions');

		expect(spec?.min).toMatchObject({ type: 'number', value: -5.5 });
		expect(spec?.max).toMatchObject({ type: 'number', value: 5.5 });
	});
});

describe('parseRandomSpec - Variable bounds', () => {
	it('should parse Questions syntax with variable bounds', () => {
		const spec = parseRandomSpec('{#:{@:min}-{@:max}}', 'questions');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'variable', name: 'min' },
			max: { type: 'variable', name: 'max' },
			exclusions: []
		});
	});

	it('should parse Markdown syntax with variable bounds', () => {
		const spec = parseRandomSpec('{{random:{{min}}-{{max}}}}', 'markdown');

		expect(spec?.min).toMatchObject({ type: 'variable', name: 'min' });
		expect(spec?.max).toMatchObject({ type: 'variable', name: 'max' });
	});

	it('should parse Markdown shorthand with variable bounds', () => {
		const spec = parseRandomSpec('{{{{min}}-{{max}}}}', 'markdown');

		expect(spec?.type).toBe('integer');
		expect(spec?.min).toMatchObject({ type: 'variable', name: 'min' });
	});

	it('should parse mixed number and variable bounds', () => {
		const spec = parseRandomSpec('{#:1-{@:max}}', 'questions');

		expect(spec?.min).toMatchObject({ type: 'number', value: 1 });
		expect(spec?.max).toMatchObject({ type: 'variable', name: 'max' });
	});

	it('should parse variable minimum with number maximum', () => {
		const spec = parseRandomSpec('{#:{@:min}-100}', 'questions');

		expect(spec?.min).toMatchObject({ type: 'variable', name: 'min' });
		expect(spec?.max).toMatchObject({ type: 'number', value: 100 });
	});
});

describe('parseRandomSpec - Variable digits', () => {
	it('should parse Questions syntax with variable digits', () => {
		const spec = parseRandomSpec('{#:{@:before}.{@:after}}', 'questions');

		expect(spec).toMatchObject({
			type: 'decimal-by-digits',
			digitsBefore: { type: 'variable', name: 'before' },
			digitsAfter: { type: 'variable', name: 'after' }
		});
	});

	it('should parse Markdown syntax with variable digits', () => {
		const spec = parseRandomSpec('{{random:{{before}}.{{after}}}}', 'markdown');

		expect(spec?.digitsBefore).toMatchObject({ type: 'variable', name: 'before' });
		expect(spec?.digitsAfter).toMatchObject({ type: 'variable', name: 'after' });
	});

	it('should parse mixed number and variable digits', () => {
		const spec = parseRandomSpec('{#:2.{@:after}}', 'questions');

		expect(spec?.digitsBefore).toMatchObject({ type: 'number', value: 2 });
		expect(spec?.digitsAfter).toMatchObject({ type: 'variable', name: 'after' });
	});
});

describe('parseRandomSpec - Exclusions (single values)', () => {
	it('should parse single exclusion', () => {
		const spec = parseRandomSpec('{#:1-10!5}', 'questions');

		expect(spec?.exclusions).toHaveLength(1);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'value',
			value: { type: 'number', value: 5 }
		});
	});

	it('should parse multiple exclusions', () => {
		const spec = parseRandomSpec('{#:1-10!3,5,7}', 'questions');

		expect(spec?.exclusions).toHaveLength(3);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'value',
			value: { type: 'number', value: 3 }
		});
	});

	it('should parse exclusions in Markdown syntax', () => {
		const spec = parseRandomSpec('{{random:1-10!5}}', 'markdown');

		expect(spec?.exclusions).toHaveLength(1);
	});

	it('should parse exclusions in Markdown shorthand', () => {
		const spec = parseRandomSpec('{{1-10!5}}', 'markdown');

		expect(spec?.exclusions).toHaveLength(1);
	});

	it('should parse negative exclusions', () => {
		const spec = parseRandomSpec('{#:-10-10!0,-5}', 'questions');

		expect(spec?.exclusions).toHaveLength(2);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'value',
			value: { type: 'number', value: 0 }
		});
		expect(spec?.exclusions[1]).toMatchObject({
			type: 'value',
			value: { type: 'number', value: -5 }
		});
	});
});

describe('parseRandomSpec - Exclusions (ranges)', () => {
	it('should parse range exclusion', () => {
		const spec = parseRandomSpec('{#:1-20!5-9}', 'questions');

		expect(spec?.exclusions).toHaveLength(1);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'range',
			min: { type: 'number', value: 5 },
			max: { type: 'number', value: 9 }
		});
	});

	it('should parse multiple range exclusions', () => {
		const spec = parseRandomSpec('{#:1-100!10-20,30-40}', 'questions');

		expect(spec?.exclusions).toHaveLength(2);
		expect(spec?.exclusions[0].type).toBe('range');
		expect(spec?.exclusions[1].type).toBe('range');
	});

	it('should parse mixed value and range exclusions', () => {
		const spec = parseRandomSpec('{#:1-20!5,7-9,15}', 'questions');

		expect(spec?.exclusions).toHaveLength(3);
		expect(spec?.exclusions[0].type).toBe('value');
		expect(spec?.exclusions[1].type).toBe('range');
		expect(spec?.exclusions[2].type).toBe('value');
	});

	it('should parse negative range exclusions', () => {
		const spec = parseRandomSpec('{#:-20-20!-10--5}', 'questions');

		expect(spec?.exclusions[0]).toMatchObject({
			type: 'range',
			min: { type: 'number', value: -10 },
			max: { type: 'number', value: -5 }
		});
	});
});

describe('parseRandomSpec - Exclusions (variables)', () => {
	it('should parse variable exclusion (Questions)', () => {
		const spec = parseRandomSpec('{#:1-100!{@:a}}', 'questions');

		expect(spec?.exclusions).toHaveLength(1);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'value',
			value: { type: 'variable', name: 'a' }
		});
	});

	it('should parse variable exclusion (Markdown)', () => {
		const spec = parseRandomSpec('{{random:1-100!{{a}}}}', 'markdown');

		expect(spec?.exclusions[0]).toMatchObject({
			type: 'value',
			value: { type: 'variable', name: 'a' }
		});
	});

	it('should parse multiple variable exclusions', () => {
		const spec = parseRandomSpec('{#:1-100!{@:a},{@:b}}', 'questions');

		expect(spec?.exclusions).toHaveLength(2);
		expect(spec?.exclusions[0].value).toMatchObject({ type: 'variable', name: 'a' });
		expect(spec?.exclusions[1].value).toMatchObject({ type: 'variable', name: 'b' });
	});

	it('should parse variable range exclusion', () => {
		const spec = parseRandomSpec('{#:1-100!{@:min}-{@:max}}', 'questions');

		expect(spec?.exclusions).toHaveLength(1);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'range',
			min: { type: 'variable', name: 'min' },
			max: { type: 'variable', name: 'max' }
		});
	});

	it('should parse mixed number and variable exclusions', () => {
		const spec = parseRandomSpec('{#:1-100!5,{@:a},10-20}', 'questions');

		expect(spec?.exclusions).toHaveLength(3);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'value',
			value: { type: 'number', value: 5 }
		});
		expect(spec?.exclusions[1]).toMatchObject({
			type: 'value',
			value: { type: 'variable', name: 'a' }
		});
		expect(spec?.exclusions[2]).toMatchObject({
			type: 'range',
			min: { type: 'number', value: 10 }
		});
	});
});

describe('parseRandomSpec - Auto-detection and syntax parameter', () => {
	it('should auto-detect Questions syntax', () => {
		const spec = parseRandomSpec('{#:1-10}');

		expect(spec?.type).toBe('integer');
	});

	it('should auto-detect Markdown syntax', () => {
		const spec = parseRandomSpec('{{random:1-10}}');

		expect(spec?.type).toBe('integer');
	});

	it('should auto-detect Markdown shorthand', () => {
		const spec = parseRandomSpec('{{1-10}}');

		expect(spec?.type).toBe('integer');
	});

	it('should respect explicit syntax parameter', () => {
		expect(parseRandomSpec('{#:1-10}', 'questions')).toBeTruthy();
		expect(parseRandomSpec('{{1-10}}', 'markdown')).toBeTruthy();
	});

	it('should work with both syntax parameter', () => {
		expect(parseRandomSpec('{#:1-10}', 'both')).toBeTruthy();
		expect(parseRandomSpec('{{1-10}}', 'both')).toBeTruthy();
	});
});

describe('parseRandomSpec - Invalid specifications', () => {
	it('should return null for variable token', () => {
		expect(parseRandomSpec('{@:a}', 'questions')).toBeNull();
	});

	it('should return null for eval token', () => {
		expect(parseRandomSpec('{eval:a+b}', 'questions')).toBeNull();
	});

	it('should return null for malformed range', () => {
		expect(parseRandomSpec('{#:1-}', 'questions')).toBeNull();
	});

	it('should return null for missing range separator', () => {
		expect(parseRandomSpec('{#:10}', 'questions')).toBeNull();
	});

	it('should return null for empty token', () => {
		expect(parseRandomSpec('{#:}', 'questions')).toBeNull();
	});

	it('should return null for incomplete token', () => {
		expect(parseRandomSpec('{#:1-10', 'questions')).toBeNull();
	});

	it('should return null for wrong syntax', () => {
		expect(parseRandomSpec('{{1-10}}', 'questions')).toBeNull();
		expect(parseRandomSpec('{#:1-10}', 'markdown')).toBeNull();
	});

	it('should return null for plain text', () => {
		expect(parseRandomSpec('just text', 'questions')).toBeNull();
	});
});

describe('parseRandomSpec - Edge cases', () => {
	it('should handle whitespace in exclusions', () => {
		const spec = parseRandomSpec('{#:1-10!5, 7, 9}', 'questions');

		expect(spec?.exclusions).toHaveLength(3);
	});

	it('should handle zero in ranges', () => {
		const spec = parseRandomSpec('{#:0-10}', 'questions');

		expect(spec?.min).toMatchObject({ type: 'number', value: 0 });
	});

	it('should handle very small decimals', () => {
		const spec = parseRandomSpec('{#:0.001-0.999:0.001}', 'questions');

		expect(spec?.min).toMatchObject({ type: 'number', value: 0.001 });
		expect(spec?.step).toBe(0.001);
	});

	it('should handle single-digit ranges', () => {
		const spec = parseRandomSpec('{#:1-9}', 'questions');

		expect(spec?.type).toBe('integer');
	});

	it('should distinguish decimal range from decimal by digits', () => {
		const byDigits = parseRandomSpec('{#:2.3}', 'questions');
		// Note: 2.0 and 3.0 are integers in JavaScript (2 === 2.0)
		// So this is detected as integer range
		const range = parseRandomSpec('{#:2.5-3.5}', 'questions');

		expect(byDigits?.type).toBe('decimal-by-digits');
		expect(range?.type).toBe('decimal-range');
	});
});
