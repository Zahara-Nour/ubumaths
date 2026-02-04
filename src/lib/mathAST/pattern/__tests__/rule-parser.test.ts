/**
 * Unit tests for Rule Parser
 *
 * Tests the parseRule function that converts rule strings into Rule objects.
 */

import { describe, it, expect } from 'vitest';
import { parseRule, RuleParseError } from '../../parser/custom/rule-parser';
import { P } from '../builder';
import { applyRule } from '../rule';
import { number, variable, add, multiply, divide, power } from '../../factory';
import type { MathNode } from '../../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a number node for testing
 */
function num(value: string | number): MathNode {
	return number(String(value));
}

/**
 * Creates a variable node for testing
 */
function varNode(name: string): MathNode {
	return variable(name);
}

// =============================================================================
// Basic Rule Parsing Tests
// =============================================================================

describe('parseRule', () => {
	describe('basic rules', () => {
		it('parses additive identity: x + 0 -> x', () => {
			const rule = parseRule('x + 0 -> x');

			expect(rule.name).toBe('parsed-rule');
			expect(rule.pattern.type).toBe('addition-pattern');
			expect(rule.replacement).toEqual(P._('x'));
			expect(rule.condition).toBeUndefined();
		});

		it('parses multiplicative identity: x * 1 -> x', () => {
			const rule = parseRule('x * 1 -> x');

			expect(rule.pattern.type).toBe('multiplication-pattern');
			expect(rule.replacement).toEqual(P._('x'));
		});

		it('parses zero rule: x * 0 -> 0', () => {
			const rule = parseRule('x * 0 -> 0');

			expect(rule.pattern.type).toBe('multiplication-pattern');
			expect(rule.replacement).toEqual(P.num(0));
		});

		it('parses power of zero: x ^ 0 -> 1', () => {
			const rule = parseRule('x ^ 0 -> 1');

			expect(rule.pattern.type).toBe('superscript-pattern');
			expect(rule.replacement).toEqual(P.num(1));
		});

		it('parses power of one: x ^ 1 -> x', () => {
			const rule = parseRule('x ^ 1 -> x');

			expect(rule.pattern.type).toBe('superscript-pattern');
			expect(rule.replacement).toEqual(P._('x'));
		});

		it('parses double negation: -(-x) -> x', () => {
			const rule = parseRule('-(-x) -> x');

			expect(rule.pattern.type).toBe('opposite-pattern');
			expect(rule.replacement).toEqual(P._('x'));
		});

		it('parses division identity: x / 1 -> x', () => {
			const rule = parseRule('x / 1 -> x');

			expect(rule.pattern.type).toBe('division-pattern');
			expect(rule.replacement).toEqual(P._('x'));
		});
	});

	// =========================================================================
	// New Syntax Without Underscore
	// =========================================================================

	describe('new syntax without underscore', () => {
		it('parses additive identity: x + 0 -> x (letters are wildcards)', () => {
			const rule = parseRule('x + 0 -> x');

			expect(rule.pattern.type).toBe('addition-pattern');
			expect(rule.replacement).toEqual(P._('x'));
		});

		it('parses multiplicative identity: x * 1 -> x', () => {
			const rule = parseRule('x * 1 -> x');

			expect(rule.pattern.type).toBe('multiplication-pattern');
			expect(rule.replacement).toEqual(P._('x'));
		});

		it('parses rule with constraint: x / x -> 1 ; x:nonzero', () => {
			const rule = parseRule('x / x -> 1 ; x:nonzero');

			expect(rule.pattern.type).toBe('division-pattern');
			expect(rule.replacement).toEqual(P.num(1));
			expect(rule.condition).toBeDefined();
		});

		it('parses power rule with constraints: a^n * a^m -> a^(n+m) ; n:integer, m:integer', () => {
			const rule = parseRule('a^n * a^m -> a^(n+m) ; n:integer, m:integer');

			expect(rule.pattern.type).toBe('multiplication-pattern');
			expect(rule.condition).toBeDefined();
		});

		it('rejects old _x syntax (not supported)', () => {
			// Old syntax with underscore prefix is no longer supported
			expect(() => parseRule('_x + y -> _x')).toThrow("'_x' syntax is not supported");
		});
	});

	// =========================================================================
	// Rule Options
	// =========================================================================

	describe('rule options', () => {
		it('accepts custom rule name', () => {
			const rule = parseRule('x + 0 -> x', { name: 'additive-identity' });

			expect(rule.name).toBe('additive-identity');
		});

		it('accepts priority option', () => {
			const rule = parseRule('x + 0 -> x', { priority: 10 });

			expect(rule.priority).toBe(10);
		});

		it('accepts both name and priority', () => {
			const rule = parseRule('x + 0 -> x', {
				name: 'high-priority-rule',
				priority: 100
			});

			expect(rule.name).toBe('high-priority-rule');
			expect(rule.priority).toBe(100);
		});
	});

	// =========================================================================
	// Rules with Conditions
	// =========================================================================

	describe('rules with conditions', () => {
		it('parses single condition: x / x -> 1 ; x:nonzero', () => {
			const rule = parseRule('x / x -> 1 ; x:nonzero');

			expect(rule.pattern.type).toBe('division-pattern');
			expect(rule.replacement).toEqual(P.num(1));
			expect(rule.condition).toBeDefined();
		});

		it('condition passes for nonzero value', () => {
			const rule = parseRule('x / x -> 1 ; x:nonzero');

			// Test with nonzero binding
			const bindings = new Map<string, MathNode>([['x', num(5)]]);
			expect(rule.condition!(bindings)).toBe(true);
		});

		it('condition fails for zero value', () => {
			const rule = parseRule('x / x -> 1 ; x:nonzero');

			// Test with zero binding
			const bindings = new Map<string, MathNode>([['x', num(0)]]);
			expect(rule.condition!(bindings)).toBe(false);
		});

		it('parses multiple conditions', () => {
			const rule = parseRule('a^n * a^m -> a^(n+m) ; n:integer, m:integer');

			expect(rule.pattern.type).toBe('multiplication-pattern');
			expect(rule.condition).toBeDefined();
		});

		it('multiple conditions all pass', () => {
			const rule = parseRule('a^n * a^m -> a^(n+m) ; n:integer, m:integer');

			const bindings = new Map<string, MathNode>([
				['a', varNode('x')],
				['n', num(2)],
				['m', num(3)]
			]);
			expect(rule.condition!(bindings)).toBe(true);
		});

		it('multiple conditions fail if one fails', () => {
			const rule = parseRule('a^n * a^m -> a^(n+m) ; n:integer, m:integer');

			const bindings = new Map<string, MathNode>([
				['a', varNode('x')],
				['n', num(2)],
				['m', num(3.5)] // Not an integer
			]);
			expect(rule.condition!(bindings)).toBe(false);
		});

		it('parses positive constraint', () => {
			const rule = parseRule('sqrt(x) -> y ; x:positive');

			const posBindings = new Map<string, MathNode>([['x', num(4)]]);
			expect(rule.condition!(posBindings)).toBe(true);

			const negBindings = new Map<string, MathNode>([['x', num(-4)]]);
			expect(rule.condition!(negBindings)).toBe(false);
		});

		it('parses negative constraint', () => {
			const rule = parseRule('x + y -> z ; x:negative');

			const negBindings = new Map<string, MathNode>([['x', num(-5)]]);
			expect(rule.condition!(negBindings)).toBe(true);

			const posBindings = new Map<string, MathNode>([['x', num(5)]]);
			expect(rule.condition!(posBindings)).toBe(false);
		});

		it('parses number constraint', () => {
			const rule = parseRule('a * x -> b ; a:number');

			const numBindings = new Map<string, MathNode>([['a', num(5)]]);
			expect(rule.condition!(numBindings)).toBe(true);

			const varBindings = new Map<string, MathNode>([['a', varNode('y')]]);
			expect(rule.condition!(varBindings)).toBe(false);
		});

		it('parses variable constraint', () => {
			const rule = parseRule('a * x -> b ; x:variable');

			const varBindings = new Map<string, MathNode>([['x', varNode('y')]]);
			expect(rule.condition!(varBindings)).toBe(true);

			const numBindings = new Map<string, MathNode>([['x', num(5)]]);
			expect(rule.condition!(numBindings)).toBe(false);
		});

		it('condition returns true for unbound wildcards (skips check)', () => {
			// If a wildcard mentioned in condition is not bound, the condition fails
			const rule = parseRule('x + 0 -> x ; y:nonzero');

			// Only 'x' is bound, 'y' is not in bindings
			const bindings = new Map<string, MathNode>([['x', num(5)]]);
			expect(rule.condition!(bindings)).toBe(false);
		});
	});

	// =========================================================================
	// Whitespace Handling
	// =========================================================================

	describe('whitespace handling', () => {
		it('handles extra whitespace around arrow', () => {
			const rule = parseRule('x + 0   ->   x');

			expect(rule.pattern.type).toBe('addition-pattern');
		});

		it('handles extra whitespace around semicolon', () => {
			const rule = parseRule('x / x -> 1   ;   x:nonzero');

			expect(rule.condition).toBeDefined();
		});

		it('handles no whitespace', () => {
			const rule = parseRule('x+0->x');

			expect(rule.pattern.type).toBe('addition-pattern');
		});

		it('handles whitespace only before rule', () => {
			const rule = parseRule('  x + 0 -> x');

			expect(rule.pattern.type).toBe('addition-pattern');
		});
	});

	// =========================================================================
	// Complex Rules
	// =========================================================================

	describe('complex rules', () => {
		it('parses rule with function pattern', () => {
			const rule = parseRule('sin(x)^2 + cos(x)^2 -> 1');

			expect(rule.pattern.type).toBe('addition-pattern');
			expect(rule.replacement).toEqual(P.num(1));
		});

		it('parses rule with parenthesized replacement', () => {
			const rule = parseRule('a * (b + c) -> a * b + a * c');

			expect(rule.pattern.type).toBe('multiplication-pattern');
			expect(rule.replacement.type).toBe('addition-pattern');
		});

		it('parses rule with nested powers', () => {
			const rule = parseRule('(x^a)^b -> x^(a*b)');

			expect(rule.pattern.type).toBe('superscript-pattern');
		});

		it('parses rule with constrained pattern wildcards', () => {
			const rule = parseRule('n:integer + m:integer -> r');

			expect(rule.pattern.type).toBe('addition-pattern');
			// Pattern itself has constraints, not condition
			expect(rule.condition).toBeUndefined();
		});

		it('parses rule with both pattern constraints and conditions', () => {
			const rule = parseRule('n:number * x -> y ; n:positive');

			// Pattern has :number constraint on n
			expect(rule.pattern.type).toBe('multiplication-pattern');
			// Condition checks :positive on n
			expect(rule.condition).toBeDefined();

			const posBindings = new Map<string, MathNode>([
				['n', num(5)],
				['x', varNode('a')]
			]);
			expect(rule.condition!(posBindings)).toBe(true);

			const negBindings = new Map<string, MathNode>([
				['n', num(-5)],
				['x', varNode('a')]
			]);
			expect(rule.condition!(negBindings)).toBe(false);
		});
	});

	// =========================================================================
	// Error Handling
	// =========================================================================

	describe('error handling', () => {
		it('throws on missing arrow', () => {
			expect(() => parseRule('x + 0')).toThrow(RuleParseError);
			expect(() => parseRule('x + 0')).toThrow("Missing '->'");
		});

		it('throws on empty pattern', () => {
			expect(() => parseRule('-> x')).toThrow(RuleParseError);
			expect(() => parseRule('-> x')).toThrow('Empty pattern');
		});

		it('throws on empty replacement', () => {
			expect(() => parseRule('x + 0 ->')).toThrow(RuleParseError);
			expect(() => parseRule('x + 0 ->')).toThrow('Empty replacement');
		});

		it('throws on invalid pattern syntax', () => {
			expect(() => parseRule('x + + 0 -> x')).toThrow(RuleParseError);
		});

		it('throws on invalid replacement syntax', () => {
			expect(() => parseRule('x + 0 -> x +')).toThrow(RuleParseError);
		});

		it('throws on condition with unsupported _x syntax', () => {
			// With new syntax, y without constraint is just a wildcard, not a condition error
			// The condition parsing now uses the tokenizer which rejects _y
			expect(() => parseRule('x + 0 -> x ; _y')).toThrow("'_x' syntax is not supported");
		});

		it('throws on invalid condition syntax', () => {
			expect(() => parseRule('x + 0 -> x ; invalid')).toThrow(RuleParseError);
		});

		it('throws RuleParseError instance', () => {
			try {
				parseRule('x + 0');
			} catch (e) {
				expect(e).toBeInstanceOf(RuleParseError);
			}
		});
	});

	// =========================================================================
	// Integration with applyRule
	// =========================================================================

	describe('integration with applyRule', () => {
		it('parsed rule applies correctly (additive identity)', () => {
			const rule = parseRule('x + 0 -> x');
			const expr = add(varNode('a'), num(0));

			const result = applyRule(rule, expr);

			expect(result).not.toBeNull();
			expect(result?.type).toBe('variable');
			expect((result as { name: string }).name).toBe('a');
		});

		it('parsed rule applies correctly (multiplicative identity)', () => {
			const rule = parseRule('x * 1 -> x');
			const expr = multiply(varNode('b'), num(1));

			const result = applyRule(rule, expr);

			expect(result).not.toBeNull();
			expect(result?.type).toBe('variable');
			expect((result as { name: string }).name).toBe('b');
		});

		it('parsed rule with condition applies correctly (division)', () => {
			const rule = parseRule('x / x -> 1 ; x:nonzero');

			// Should apply when x is nonzero
			const expr1 = divide(num(5), num(5));
			const result1 = applyRule(rule, expr1);
			expect(result1).not.toBeNull();
			expect(result1?.type).toBe('number');
			expect((result1 as { value: string }).value).toBe('1');

			// Should not apply when x is zero
			const expr2 = divide(num(0), num(0));
			const result2 = applyRule(rule, expr2);
			expect(result2).toBeNull();
		});

		it('parsed rule applies with complex expression', () => {
			const rule = parseRule('x ^ 0 -> 1');
			const expr = power(add(varNode('a'), varNode('b')), num(0));

			const result = applyRule(rule, expr);

			expect(result).not.toBeNull();
			expect(result?.type).toBe('number');
			expect((result as { value: string }).value).toBe('1');
		});

		it('parsed rule does not apply when pattern does not match', () => {
			const rule = parseRule('x + 0 -> x');
			const expr = add(varNode('a'), num(1)); // 1, not 0

			const result = applyRule(rule, expr);

			expect(result).toBeNull();
		});
	});

	// =========================================================================
	// P.parseRule Integration
	// =========================================================================

	describe('P.parseRule integration', () => {
		it('P.parseRule is available on P namespace', () => {
			expect(typeof P.parseRule).toBe('function');
		});

		it('P.parseRule produces same result as parseRule', () => {
			const rule1 = parseRule('x + 0 -> x');
			const rule2 = P.parseRule('x + 0 -> x');

			expect(rule1.pattern).toEqual(rule2.pattern);
			expect(rule1.replacement).toEqual(rule2.replacement);
		});
	});
});
