/**
 * Expression Normalizer Tests
 * ============================
 *
 * Tests for the expression normalizer that converts simplified
 * variable syntax to legacy {{...}} syntax.
 */

import { describe, it, expect } from 'vitest';
import {
	detectExpressionType,
	normalizeExpression
} from '../../../parameterization/parser/expression-normalizer';

describe('detectExpressionType', () => {
	describe('random expressions', () => {
		it('detects integer range', () => {
			expect(detectExpressionType('1..10')).toBe('random');
		});

		it('detects variable bounds range', () => {
			expect(detectExpressionType('min..max')).toBe('random');
		});

		it('detects range with sign modifier', () => {
			expect(detectExpressionType('2..9;+-')).toBe('random');
		});

		it('detects decimal range', () => {
			expect(detectExpressionType('1.5..9.5')).toBe('random');
		});

		it('detects random by digits with prefix', () => {
			expect(detectExpressionType('random:2.3')).toBe('random');
		});

		it('detects range with exclusion', () => {
			expect(detectExpressionType('1..10!5')).toBe('random');
		});
	});

	describe('discrete list expressions', () => {
		it('detects simple discrete list', () => {
			expect(detectExpressionType('rouge|vert|bleu')).toBe('discrete-list');
		});

		it('detects two-item list', () => {
			expect(detectExpressionType('oui|non')).toBe('discrete-list');
		});

		it('detects list with exclusion', () => {
			expect(detectExpressionType('a|b|c!b')).toBe('discrete-list');
		});

		it('ignores pipe inside parentheses', () => {
			// This is not a discrete list - pipe is nested
			expect(detectExpressionType('func(a|b)')).toBe('text-literal');
		});
	});

	describe('eval expressions', () => {
		it('detects eval prefix', () => {
			expect(detectExpressionType('eval:a+b')).toBe('eval');
		});

		it('detects eval with complex expression', () => {
			expect(detectExpressionType('eval:2*x+3')).toBe('eval');
		});

		it('detects eval with LaTeX', () => {
			expect(detectExpressionType('eval:\\frac{a}{b}')).toBe('eval');
		});
	});

	describe('digits expressions', () => {
		it('detects digits prefix with single digit', () => {
			expect(detectExpressionType('digits:1')).toBe('digits');
		});

		it('detects digits prefix with range', () => {
			expect(detectExpressionType('digits:1..3')).toBe('digits');
		});

		it('detects digits prefix with two digits', () => {
			expect(detectExpressionType('digits:2')).toBe('digits');
		});
	});

	describe('text literals', () => {
		it('detects text prefix', () => {
			expect(detectExpressionType('text:hello')).toBe('text-literal');
		});

		it('detects text with spaces', () => {
			expect(detectExpressionType('text:hello world')).toBe('text-literal');
		});

		it('detects empty expression as text-literal', () => {
			expect(detectExpressionType('')).toBe('text-literal');
		});

		it('detects whitespace-only as text-literal', () => {
			expect(detectExpressionType('   ')).toBe('text-literal');
		});

		it('detects arbitrary text as text-literal', () => {
			expect(detectExpressionType('some random text')).toBe('text-literal');
		});
	});

	describe('numeric literals', () => {
		it('detects positive integer', () => {
			expect(detectExpressionType('42')).toBe('numeric-literal');
		});

		it('detects negative integer', () => {
			expect(detectExpressionType('-5')).toBe('numeric-literal');
		});

		it('detects decimal', () => {
			expect(detectExpressionType('3.14')).toBe('numeric-literal');
		});

		it('detects negative decimal', () => {
			expect(detectExpressionType('-2.5')).toBe('numeric-literal');
		});

		it('detects zero', () => {
			expect(detectExpressionType('0')).toBe('numeric-literal');
		});
	});

	describe('variable references', () => {
		it('detects single letter variable', () => {
			expect(detectExpressionType('a')).toBe('variable-ref');
		});

		it('detects multi-letter variable', () => {
			expect(detectExpressionType('myVar')).toBe('variable-ref');
		});

		it('detects variable with underscore', () => {
			expect(detectExpressionType('my_var')).toBe('variable-ref');
		});

		it('detects variable starting with underscore', () => {
			expect(detectExpressionType('_private')).toBe('variable-ref');
		});

		it('detects variable with numbers', () => {
			expect(detectExpressionType('var123')).toBe('variable-ref');
		});

		it('treats math expression with operators as text-literal', () => {
			expect(detectExpressionType('x+1')).toBe('text-literal');
		});
	});

	describe('already-wrapped expressions', () => {
		it('detects {{...}} wrapped expression', () => {
			expect(detectExpressionType('{{1..10}}')).toBe('already-wrapped');
		});

		it('detects {{...}} with eval', () => {
			expect(detectExpressionType('{{eval:a+b}}')).toBe('already-wrapped');
		});

		it('detects {{...}} with variable', () => {
			expect(detectExpressionType('{{a}}')).toBe('already-wrapped');
		});
	});
});

describe('normalizeExpression', () => {
	describe('random expressions', () => {
		it('wraps integer range with {{}}', () => {
			expect(normalizeExpression('1..10')).toBe('{{1..10}}');
		});

		it('wraps variable bounds range', () => {
			expect(normalizeExpression('min..max')).toBe('{{min..max}}');
		});

		it('wraps range with sign modifier', () => {
			expect(normalizeExpression('2..9;+-')).toBe('{{2..9;+-}}');
		});

		it('wraps decimal range', () => {
			expect(normalizeExpression('1.5..9.5')).toBe('{{1.5..9.5}}');
		});

		it('wraps random by digits', () => {
			expect(normalizeExpression('random:2.3')).toBe('{{random:2.3}}');
		});

		it('wraps range with exclusion', () => {
			expect(normalizeExpression('1..10!5,7')).toBe('{{1..10!5,7}}');
		});
	});

	describe('discrete list expressions', () => {
		it('wraps discrete list with {{}}', () => {
			expect(normalizeExpression('rouge|vert|bleu')).toBe('{{rouge|vert|bleu}}');
		});

		it('wraps operator list', () => {
			expect(normalizeExpression('+|-')).toBe('{{+|-}}');
		});

		it('wraps list with exclusion', () => {
			expect(normalizeExpression('a|b|c!b')).toBe('{{a|b|c!b}}');
		});
	});

	describe('eval expressions', () => {
		it('wraps eval expression with {{}}', () => {
			expect(normalizeExpression('eval:a+b')).toBe('{{eval:a+b}}');
		});

		it('wraps eval with complex math', () => {
			expect(normalizeExpression('eval:2*x+3')).toBe('{{eval:2*x+3}}');
		});
	});

	describe('digits expressions', () => {
		it('wraps digits with single digit count', () => {
			expect(normalizeExpression('digits:1')).toBe('{{digits:1}}');
		});

		it('wraps digits with range', () => {
			expect(normalizeExpression('digits:1..3')).toBe('{{digits:1..3}}');
		});

		it('wraps digits with two digit count', () => {
			expect(normalizeExpression('digits:2')).toBe('{{digits:2}}');
		});
	});

	describe('variable references', () => {
		it('wraps variable reference with {{}}', () => {
			expect(normalizeExpression('a')).toBe('{{a}}');
		});

		it('wraps multi-letter variable', () => {
			expect(normalizeExpression('myVar')).toBe('{{myVar}}');
		});

		it('keeps math expression with operators unchanged (text-literal)', () => {
			expect(normalizeExpression('x+1')).toBe('x+1');
		});
	});

	describe('text literals', () => {
		it('strips text: prefix', () => {
			expect(normalizeExpression('text:hello')).toBe('hello');
		});

		it('strips text: and preserves content', () => {
			expect(normalizeExpression('text:hello world!')).toBe('hello world!');
		});

		it('preserves empty string', () => {
			expect(normalizeExpression('')).toBe('');
		});
	});

	describe('numeric literals', () => {
		it('keeps integer unchanged', () => {
			expect(normalizeExpression('42')).toBe('42');
		});

		it('keeps negative integer unchanged', () => {
			expect(normalizeExpression('-5')).toBe('-5');
		});

		it('keeps decimal unchanged', () => {
			expect(normalizeExpression('3.14')).toBe('3.14');
		});
	});

	describe('already-wrapped expressions (backward compatibility)', () => {
		it('preserves {{...}} syntax unchanged', () => {
			expect(normalizeExpression('{{1..10}}')).toBe('{{1..10}}');
		});

		it('preserves {{eval:...}} unchanged', () => {
			expect(normalizeExpression('{{eval:a+b}}')).toBe('{{eval:a+b}}');
		});

		it('preserves {{var}} unchanged', () => {
			expect(normalizeExpression('{{a}}')).toBe('{{a}}');
		});

		it('preserves complex {{...}} unchanged', () => {
			expect(normalizeExpression('{{random:{{min}}..{{max}}}}')).toBe(
				'{{random:{{min}}..{{max}}}}'
			);
		});
	});

	describe('whitespace handling', () => {
		it('trims before detecting type but preserves in result', () => {
			expect(normalizeExpression('  1..10  ')).toBe('{{1..10}}');
		});

		it('preserves original whitespace for numeric literals', () => {
			expect(normalizeExpression('  42  ')).toBe('  42  ');
		});
	});
});
