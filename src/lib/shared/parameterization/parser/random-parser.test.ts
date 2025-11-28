/**
 * Random Parser Tests
 * ====================
 *
 * Comprehensive tests for parsing random number specifications in Markdown syntax.
 * Covers integer ranges, decimal formats, exclusions, variables, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { parseRandomSpec } from './random-parser';

describe('parseRandomSpec - Integer ranges (Markdown syntax)', () => {
	it('should parse with random: prefix', () => {
		const spec = parseRandomSpec('{{random:1..10}}');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: 1 },
			max: { type: 'number', value: 10 },
			exclusions: []
		});
	});

	it('should parse shorthand syntax', () => {
		const spec = parseRandomSpec('{{1..10}}');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: 1 },
			max: { type: 'number', value: 10 }
		});
	});

	it('should parse negative numbers in shorthand', () => {
		const spec = parseRandomSpec('{{-5..10}}');

		if (spec?.type === 'integer' || spec?.type === 'decimal-range') {
			expect(spec.min).toMatchObject({ type: 'number', value: -5 });
			expect(spec.max).toMatchObject({ type: 'number', value: 10 });
		}
	});

	it('should parse with random: prefix and negative numbers', () => {
		const spec = parseRandomSpec('{{random:-5..10}}');

		if (spec?.type === 'integer' || spec?.type === 'decimal-range') {
			expect(spec.min).toMatchObject({ type: 'number', value: -5 });
		}
	});

	it('should parse range with negative minimum and maximum', () => {
		const spec = parseRandomSpec('{{random:-20..-5}}');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: -20 },
			max: { type: 'number', value: -5 }
		});
	});

	it('should parse large number ranges', () => {
		const spec = parseRandomSpec('{{random:1000..9999}}');

		expect(spec).toMatchObject({
			min: { type: 'number', value: 1000 },
			max: { type: 'number', value: 9999 }
		});
	});
});

describe('parseRandomSpec - Decimal by digits', () => {
	it('should parse Markdown syntax with prefix', () => {
		const spec = parseRandomSpec('{{random:2.3}}');

		expect(spec).toMatchObject({
			type: 'decimal-by-digits',
			digitsBefore: { type: 'number', value: 2 },
			digitsAfter: { type: 'number', value: 3 }
		});
	});

	it('should parse Markdown shorthand', () => {
		const spec = parseRandomSpec('{{2.3}}');

		expect(spec?.type).toBe('decimal-by-digits');
	});

	it('should parse single digit before decimal', () => {
		const spec = parseRandomSpec('{{random:1.5}}');

		if (spec?.type === 'decimal-by-digits') {
			expect(spec.digitsBefore).toMatchObject({ type: 'number', value: 1 });
			expect(spec.digitsAfter).toMatchObject({ type: 'number', value: 5 });
		}
	});

	it('should parse large digit counts', () => {
		const spec = parseRandomSpec('{{random:10.8}}');

		if (spec?.type === 'decimal-by-digits') {
			expect(spec.digitsBefore).toMatchObject({ type: 'number', value: 10 });
			expect(spec.digitsAfter).toMatchObject({ type: 'number', value: 8 });
		}
	});
});

describe('parseRandomSpec - Decimal range with step', () => {
	it('should parse Markdown syntax', () => {
		const spec = parseRandomSpec('{{random:0.5..9.99:0.01}}');

		expect(spec?.type).toBe('decimal-range');
		if (spec?.type === 'decimal-range') {
			expect(spec.step).toBe(0.01);
		}
	});

	it('should parse Markdown shorthand', () => {
		const spec = parseRandomSpec('{{0.5..9.99:0.01}}');

		expect(spec?.type).toBe('decimal-range');
	});

	it('should parse with larger step', () => {
		const spec = parseRandomSpec('{{random:0..100:0.5}}');

		if (spec?.type === 'decimal-range') {
			expect(spec.step).toBe(0.5);
		}
	});

	it('should infer decimal type from decimal bounds without step', () => {
		const spec = parseRandomSpec('{{random:0.5..9.99}}');

		expect(spec?.type).toBe('decimal-range');
		if (spec?.type === 'decimal-range') {
			expect(spec.step).toBe(0.01); // Default step
		}
	});

	it('should parse negative decimal ranges', () => {
		const spec = parseRandomSpec('{{random:-5.5..5.5:0.1}}');

		if (spec?.type === 'decimal-range') {
			expect(spec.min).toMatchObject({ type: 'number', value: -5.5 });
			expect(spec.max).toMatchObject({ type: 'number', value: 5.5 });
		}
	});
});

describe('parseRandomSpec - Variable bounds', () => {
	it('should parse Markdown syntax with variable bounds', () => {
		const spec = parseRandomSpec('{{random:{{min}}..{{max}}}}');

		if (spec?.type === 'integer' || spec?.type === 'decimal-range') {
			expect(spec.min).toMatchObject({ type: 'variable', name: 'min' });
			expect(spec.max).toMatchObject({ type: 'variable', name: 'max' });
		}
	});

	it('should parse Markdown shorthand with variable bounds', () => {
		const spec = parseRandomSpec('{{{{min}}..{{max}}}}');

		expect(spec?.type).toBe('integer');
		if (spec?.type === 'integer') {
			expect(spec.min).toMatchObject({ type: 'variable', name: 'min' });
		}
	});

	it('should parse mixed number and variable bounds', () => {
		const spec = parseRandomSpec('{{random:1..{{max}}}}');

		if (spec?.type === 'integer' || spec?.type === 'decimal-range') {
			expect(spec.min).toMatchObject({ type: 'number', value: 1 });
			expect(spec.max).toMatchObject({ type: 'variable', name: 'max' });
		}
	});

	it('should parse variable minimum with number maximum', () => {
		const spec = parseRandomSpec('{{random:{{min}}..100}}');

		if (spec?.type === 'integer' || spec?.type === 'decimal-range') {
			expect(spec.min).toMatchObject({ type: 'variable', name: 'min' });
			expect(spec.max).toMatchObject({ type: 'number', value: 100 });
		}
	});
});

describe('parseRandomSpec - Variable digits', () => {
	it('should parse Markdown syntax with variable digits', () => {
		const spec = parseRandomSpec('{{random:{{before}}.{{after}}}}');

		if (spec?.type === 'decimal-by-digits') {
			expect(spec.digitsBefore).toMatchObject({ type: 'variable', name: 'before' });
			expect(spec.digitsAfter).toMatchObject({ type: 'variable', name: 'after' });
		}
	});

	it('should parse mixed number and variable digits', () => {
		const spec = parseRandomSpec('{{random:2.{{after}}}}');

		if (spec?.type === 'decimal-by-digits') {
			expect(spec.digitsBefore).toMatchObject({ type: 'number', value: 2 });
			expect(spec.digitsAfter).toMatchObject({ type: 'variable', name: 'after' });
		}
	});
});

describe('parseRandomSpec - Exclusions (single values)', () => {
	it('should parse single exclusion', () => {
		const spec = parseRandomSpec('{{random:1..10!5}}');

		expect(spec?.exclusions).toHaveLength(1);
		if (spec) {
			expect(spec.exclusions[0]).toMatchObject({
				type: 'value',
				value: { type: 'number', value: 5 }
			});
		}
	});

	it('should parse multiple exclusions', () => {
		const spec = parseRandomSpec('{{random:1..10!3,5,7}}');

		expect(spec?.exclusions).toHaveLength(3);
		if (spec) {
			expect(spec.exclusions[0]).toMatchObject({
				type: 'value',
				value: { type: 'number', value: 3 }
			});
		}
	});

	it('should parse exclusions in Markdown shorthand', () => {
		const spec = parseRandomSpec('{{1..10!5}}');

		expect(spec?.exclusions).toHaveLength(1);
	});

	it('should parse negative exclusions', () => {
		const spec = parseRandomSpec('{{random:-10..10!0,-5}}');

		expect(spec?.exclusions).toHaveLength(2);
		if (spec) {
			expect(spec.exclusions[0]).toMatchObject({
				type: 'value',
				value: { type: 'number', value: 0 }
			});
			expect(spec.exclusions[1]).toMatchObject({
				type: 'value',
				value: { type: 'number', value: -5 }
			});
		}
	});
});

describe('parseRandomSpec - Exclusions (ranges)', () => {
	it('should parse range exclusion', () => {
		const spec = parseRandomSpec('{{random:1..20!5..9}}');

		expect(spec?.exclusions).toHaveLength(1);
		if (spec) {
			expect(spec.exclusions[0]).toMatchObject({
				type: 'range',
				min: { type: 'number', value: 5 },
				max: { type: 'number', value: 9 }
			});
		}
	});

	it('should parse multiple range exclusions', () => {
		const spec = parseRandomSpec('{{random:1..100!10..20,30..40}}');

		expect(spec?.exclusions).toHaveLength(2);
		if (spec && spec.type !== 'discrete-list') {
			expect(spec.exclusions[0].type).toBe('range');
			expect(spec.exclusions[1].type).toBe('range');
		}
	});

	it('should parse mixed value and range exclusions', () => {
		const spec = parseRandomSpec('{{random:1..20!5,7..9,15}}');

		expect(spec?.exclusions).toHaveLength(3);
		if (spec && spec.type !== 'discrete-list') {
			expect(spec.exclusions[0].type).toBe('value');
			expect(spec.exclusions[1].type).toBe('range');
			expect(spec.exclusions[2].type).toBe('value');
		}
	});

	it('should parse negative range exclusions', () => {
		const spec = parseRandomSpec('{{random:-20..20!-10..-5}}');

		if (spec) {
			expect(spec.exclusions[0]).toMatchObject({
				type: 'range',
				min: { type: 'number', value: -10 },
				max: { type: 'number', value: -5 }
			});
		}
	});
});

describe('parseRandomSpec - Exclusions (variables)', () => {
	it('should parse variable exclusion (Markdown)', () => {
		const spec = parseRandomSpec('{{random:1..100!{{a}}}}');

		if (spec) {
			expect(spec.exclusions[0]).toMatchObject({
				type: 'value',
				value: { type: 'variable', name: 'a' }
			});
		}
	});

	it('should parse multiple variable exclusions', () => {
		const spec = parseRandomSpec('{{random:1..100!{{a}},{{b}}}}');

		expect(spec?.exclusions).toHaveLength(2);
		if (spec && spec.type !== 'discrete-list') {
			if (spec.exclusions[0].type === 'value') {
				expect(spec.exclusions[0].value).toMatchObject({ type: 'variable', name: 'a' });
			}
			if (spec.exclusions[1].type === 'value') {
				expect(spec.exclusions[1].value).toMatchObject({ type: 'variable', name: 'b' });
			}
		}
	});

	it('should parse variable range exclusion', () => {
		const spec = parseRandomSpec('{{random:1..100!{{min}}..{{max}}}}');

		expect(spec?.exclusions).toHaveLength(1);
		if (spec) {
			expect(spec.exclusions[0]).toMatchObject({
				type: 'range',
				min: { type: 'variable', name: 'min' },
				max: { type: 'variable', name: 'max' }
			});
		}
	});

	it('should parse mixed number and variable exclusions', () => {
		const spec = parseRandomSpec('{{random:1..100!5,{{a}},10..20}}');

		expect(spec?.exclusions).toHaveLength(3);
		if (spec && spec.type !== 'discrete-list') {
			expect(spec.exclusions[0]).toMatchObject({
				type: 'value',
				value: { type: 'number', value: 5 }
			});
			expect(spec.exclusions[1]).toMatchObject({
				type: 'value',
				value: { type: 'variable', name: 'a' }
			});
			if (spec.exclusions[2].type === 'range') {
				expect(spec.exclusions[2].min).toMatchObject({ type: 'number', value: 10 });
			}
		}
	});
});

describe('parseRandomSpec - Auto-detection', () => {
	it('should auto-detect Markdown syntax', () => {
		const spec = parseRandomSpec('{{random:1..10}}');

		expect(spec?.type).toBe('integer');
	});

	it('should auto-detect Markdown shorthand', () => {
		const spec = parseRandomSpec('{{1..10}}');

		expect(spec?.type).toBe('integer');
	});
});

describe('parseRandomSpec - Invalid specifications', () => {
	it('should return null for variable token', () => {
		expect(parseRandomSpec('{{a}}')).toBeNull();
	});

	it('should return null for eval token', () => {
		expect(parseRandomSpec('{{eval:a+b}}')).toBeNull();
	});

	it('should return null for malformed range', () => {
		expect(parseRandomSpec('{{random:1..}}')).toBeNull();
	});

	it('should return null for missing range separator', () => {
		expect(parseRandomSpec('{{random:10}}')).toBeNull();
	});

	it('should return null for empty token', () => {
		expect(parseRandomSpec('{{}}')).toBeNull();
	});

	it('should return null for incomplete token', () => {
		expect(parseRandomSpec('{{random:1..10')).toBeNull();
	});

	it('should return null for plain text', () => {
		expect(parseRandomSpec('just text')).toBeNull();
	});
});

describe('parseRandomSpec - Edge cases', () => {
	it('should handle whitespace in exclusions', () => {
		const spec = parseRandomSpec('{{random:1..10!5, 7, 9}}');

		expect(spec?.exclusions).toHaveLength(3);
	});

	it('should handle zero in ranges', () => {
		const spec = parseRandomSpec('{{random:0..10}}');

		if (spec?.type === 'integer' || spec?.type === 'decimal-range') {
			expect(spec.min).toMatchObject({ type: 'number', value: 0 });
		}
	});

	it('should handle very small decimals', () => {
		const spec = parseRandomSpec('{{random:0.001..0.999:0.001}}');

		if (spec?.type === 'decimal-range') {
			expect(spec.min).toMatchObject({ type: 'number', value: 0.001 });
			expect(spec.step).toBe(0.001);
		}
	});

	it('should handle single-digit ranges', () => {
		const spec = parseRandomSpec('{{random:1..9}}');

		expect(spec?.type).toBe('integer');
	});

	it('should distinguish decimal range from decimal by digits', () => {
		const byDigits = parseRandomSpec('{{random:2.3}}');
		const range = parseRandomSpec('{{random:2.5..3.5}}');

		expect(byDigits?.type).toBe('decimal-by-digits');
		expect(range?.type).toBe('decimal-range');
	});
});

// ============================================================================
// NEW SYNTAX TESTS
// ============================================================================

describe('parseRandomSpec - Double dot (..) range separator', () => {
	it('should parse integer range with .. separator', () => {
		const spec = parseRandomSpec('{{3..5}}');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: 3 },
			max: { type: 'number', value: 5 },
			exclusions: []
		});
	});

	it('should parse negative range with .. separator', () => {
		const spec = parseRandomSpec('{{-3..-1}}');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: -3 },
			max: { type: 'number', value: -1 },
			exclusions: []
		});
	});

	it('should parse range crossing zero with .. separator', () => {
		const spec = parseRandomSpec('{{-5..5}}');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: -5 },
			max: { type: 'number', value: 5 }
		});
	});

	it('should parse variable range with .. separator', () => {
		const spec = parseRandomSpec('{{{{min}}..{{max}}}}');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'variable', name: 'min' },
			max: { type: 'variable', name: 'max' }
		});
	});

	it('should parse exclusion range with .. separator', () => {
		const spec = parseRandomSpec('{{1..20!5..7}}');

		expect(spec).toMatchObject({
			type: 'integer',
			min: { type: 'number', value: 1 },
			max: { type: 'number', value: 20 }
		});
		expect(spec?.exclusions).toHaveLength(1);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'range',
			min: { type: 'number', value: 5 },
			max: { type: 'number', value: 7 }
		});
	});

	it('should parse mixed exclusions with .. separator', () => {
		const spec = parseRandomSpec('{{1..100!5,10..15,{{a}}}}');

		expect(spec?.exclusions).toHaveLength(3);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'value',
			value: { type: 'number', value: 5 }
		});
		expect(spec?.exclusions[1]).toMatchObject({
			type: 'range',
			min: { type: 'number', value: 10 },
			max: { type: 'number', value: 15 }
		});
		expect(spec?.exclusions[2]).toMatchObject({
			type: 'value',
			value: { type: 'variable', name: 'a' }
		});
	});

	it('should prefer .. over - when both could be separators', () => {
		// {{1..10}} should use .. as separator, not interpret as decimal
		const spec = parseRandomSpec('{{1..10}}');

		expect(spec?.type).toBe('integer');
		if (spec?.type === 'integer') {
			expect(spec.min).toMatchObject({ type: 'number', value: 1 });
			expect(spec.max).toMatchObject({ type: 'number', value: 10 });
		}
	});
});

describe('parseRandomSpec - Relative integers (±)', () => {
	it('should parse relative integer with ± prefix', () => {
		const spec = parseRandomSpec('{{±2..9}}');

		expect(spec).toMatchObject({
			type: 'relative-integer',
			min: { type: 'number', value: 2 },
			max: { type: 'number', value: 9 },
			exclusions: []
		});
	});

	it('should parse relative integer with +/- prefix', () => {
		const spec = parseRandomSpec('{{+/-2..9}}');

		expect(spec).toMatchObject({
			type: 'relative-integer',
			min: { type: 'number', value: 2 },
			max: { type: 'number', value: 9 }
		});
	});

	it('should parse relative integer with exclusion', () => {
		const spec = parseRandomSpec('{{±2..9!5}}');

		expect(spec).toMatchObject({
			type: 'relative-integer',
			min: { type: 'number', value: 2 },
			max: { type: 'number', value: 9 }
		});
		expect(spec?.exclusions).toHaveLength(1);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'value',
			value: { type: 'number', value: 5 }
		});
	});

	it('should parse relative integer with variable bounds', () => {
		const spec = parseRandomSpec('{{±{{min}}..{{max}}}}');

		expect(spec).toMatchObject({
			type: 'relative-integer',
			min: { type: 'variable', name: 'min' },
			max: { type: 'variable', name: 'max' }
		});
	});

	it('should parse relative integer with variable exclusion', () => {
		const spec = parseRandomSpec('{{±2..9!{{a}}}}');

		expect(spec).toMatchObject({
			type: 'relative-integer'
		});
		expect(spec?.exclusions).toHaveLength(1);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'value',
			value: { type: 'variable', name: 'a' }
		});
	});
});

describe('parseRandomSpec - Decimal auto-step inference', () => {
	it('should infer step=0.1 from 1 decimal place', () => {
		const spec = parseRandomSpec('{{1..1.6}}');

		expect(spec).toMatchObject({
			type: 'decimal-range',
			min: { type: 'number', value: 1 },
			max: { type: 'number', value: 1.6 },
			step: 0.1
		});
	});

	it('should infer step=0.01 from 2 decimal places', () => {
		const spec = parseRandomSpec('{{1..1.25}}');

		expect(spec).toMatchObject({
			type: 'decimal-range',
			min: { type: 'number', value: 1 },
			max: { type: 'number', value: 1.25 },
			step: 0.01
		});
	});

	it('should use max decimal places from both bounds', () => {
		const spec = parseRandomSpec('{{0.5..2.5}}');

		expect(spec).toMatchObject({
			type: 'decimal-range',
			min: { type: 'number', value: 0.5 },
			max: { type: 'number', value: 2.5 },
			step: 0.1
		});
	});

	it('should infer step from min bound decimals', () => {
		const spec = parseRandomSpec('{{1.25..2}}');

		expect(spec).toMatchObject({
			type: 'decimal-range',
			step: 0.01
		});
	});

	it('should handle negative decimal ranges', () => {
		const spec = parseRandomSpec('{{-0.5..0.5}}');

		expect(spec).toMatchObject({
			type: 'decimal-range',
			min: { type: 'number', value: -0.5 },
			max: { type: 'number', value: 0.5 },
			step: 0.1
		});
	});

	it('should allow explicit step to override auto-step', () => {
		const spec = parseRandomSpec('{{1..2:0.5}}');

		expect(spec).toMatchObject({
			type: 'decimal-range',
			min: { type: 'number', value: 1 },
			max: { type: 'number', value: 2 },
			step: 0.5
		});
	});

	it('should handle decimal range with exclusion', () => {
		const spec = parseRandomSpec('{{1..1.6!1.3}}');

		expect(spec).toMatchObject({
			type: 'decimal-range',
			min: { type: 'number', value: 1 },
			max: { type: 'number', value: 1.6 },
			step: 0.1
		});
		expect(spec?.exclusions).toHaveLength(1);
		expect(spec?.exclusions[0]).toMatchObject({
			type: 'value',
			value: { type: 'number', value: 1.3 }
		});
	});

	it('should use double dot separator for decimal range', () => {
		const spec = parseRandomSpec('{{1.5..2.5}}');

		expect(spec).toMatchObject({
			type: 'decimal-range',
			min: { type: 'number', value: 1.5 },
			max: { type: 'number', value: 2.5 },
			step: 0.1
		});
	});

	it('should support explicit step with double dot separator', () => {
		const spec = parseRandomSpec('{{0.5..9.99:0.01}}');

		expect(spec).toMatchObject({
			type: 'decimal-range',
			min: { type: 'number', value: 0.5 },
			max: { type: 'number', value: 9.99 },
			step: 0.01
		});
	});

	it('should not confuse decimal-by-digits with decimal range', () => {
		// {{2.3}} should be decimal-by-digits (2 digits before, 3 after)
		const byDigits = parseRandomSpec('{{2.3}}');
		expect(byDigits?.type).toBe('decimal-by-digits');

		// {{1..1.6}} should be decimal range with auto-step
		const range = parseRandomSpec('{{1..1.6}}');
		expect(range?.type).toBe('decimal-range');
	});
});
