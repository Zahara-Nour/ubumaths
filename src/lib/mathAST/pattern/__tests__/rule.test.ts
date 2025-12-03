/**
 * Unit tests for Rule System
 */

import { describe, it, expect } from 'vitest';
import { createRule, instantiate, applyRule, applyRuleDeep, applyRules } from '../rule';
import { P } from '../builder';
import { nodesEqual } from '../match';
import {
	number,
	variable,
	add,
	subtract,
	multiply,
	divide,
	superscript,
	opposite
} from '../../factory';
import type { MathNode } from '../../types';
import type { MatchBindings } from '../types';

describe('Rule System', () => {
	// ===========================================================================
	// createRule
	// ===========================================================================

	describe('createRule', () => {
		it('creates a rule with default name', () => {
			const rule = createRule(P._('x'), P._('x'));

			expect(rule.name).toBe('unnamed-rule');
			expect(rule.pattern).toBeDefined();
			expect(rule.replacement).toBeDefined();
		});

		it('creates a rule with custom name', () => {
			const rule = createRule(P._('x'), P._('x'), { name: 'identity' });

			expect(rule.name).toBe('identity');
		});

		it('creates a rule with condition', () => {
			const condition = (bindings: ReadonlyMap<string, MathNode>) => {
				const x = bindings.get('x');
				return x?.type === 'number' && x.value !== '0';
			};

			const rule = createRule(P._('x'), P._('x'), { condition });

			expect(rule.condition).toBe(condition);
		});

		it('creates a rule with priority', () => {
			const rule = createRule(P._('x'), P._('x'), { priority: 10 });

			expect(rule.priority).toBe(10);
		});

		it('creates a rule with function replacement', () => {
			const replacement = (bindings: ReadonlyMap<string, MathNode>) => {
				return bindings.get('x')!;
			};

			const rule = createRule(P._('x'), replacement);

			expect(typeof rule.replacement).toBe('function');
		});
	});

	// ===========================================================================
	// instantiate
	// ===========================================================================

	describe('instantiate', () => {
		describe('wildcard patterns', () => {
			it('replaces wildcard with bound value', () => {
				const pattern = P._('x');
				const bindings = new Map([['x', number('42')]]);

				const result = instantiate(pattern, bindings);

				expect(nodesEqual(result, number('42'))).toBe(true);
			});

			it('throws for unbound wildcard', () => {
				const pattern = P._('x');
				const bindings = new Map<string, MathNode>();

				expect(() => instantiate(pattern, bindings)).toThrow("Wildcard 'x' not found in bindings");
			});
		});

		describe('literal patterns', () => {
			it('returns the literal node unchanged', () => {
				const pattern = P.num(0);
				const bindings = new Map<string, MathNode>();

				const result = instantiate(pattern, bindings);

				expect(nodesEqual(result, number('0'))).toBe(true);
			});

			it('returns variable literal unchanged', () => {
				const pattern = P.var('x');
				const bindings = new Map<string, MathNode>();

				const result = instantiate(pattern, bindings);

				expect(nodesEqual(result, variable('x'))).toBe(true);
			});
		});

		describe('structural patterns', () => {
			it('instantiates addition pattern', () => {
				const pattern = P.add(P._('a'), P._('b'));
				const bindings = new Map([
					['a', number('1')],
					['b', number('2')]
				]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('addition');
				expect(nodesEqual(result, add(number('1'), number('2')))).toBe(true);
			});

			it('instantiates subtraction pattern', () => {
				const pattern = P.sub(P._('a'), P._('b'));
				const bindings = new Map([
					['a', number('5')],
					['b', number('3')]
				]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('subtraction');
			});

			it('instantiates multiplication pattern', () => {
				const pattern = P.mul(P._('a'), P._('b'));
				const bindings = new Map([
					['a', number('2')],
					['b', number('3')]
				]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('multiplication');
			});

			it('instantiates division pattern', () => {
				const pattern = P.div(P._('num'), P._('den'));
				const bindings = new Map([
					['num', number('6')],
					['den', number('2')]
				]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('division');
			});

			it('instantiates superscript pattern', () => {
				const pattern = P.pow(P._('base'), P._('exp'));
				const bindings: MatchBindings = new Map<string, MathNode>([
					['base', variable('x')],
					['exp', number('2')]
				]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('superscript');
			});

			it('instantiates function pattern', () => {
				const pattern = P.func('sin', [P._('arg')]);
				const bindings = new Map([['arg', variable('x')]]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('function');
				if (result.type === 'function') {
					expect(result.name).toBe('sin');
				}
			});

			it('instantiates opposite pattern', () => {
				const pattern = P.neg(P._('x'));
				const bindings = new Map([['x', number('5')]]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('opposite');
			});

			it('instantiates positive pattern', () => {
				const pattern = P.pos(P._('x'));
				const bindings = new Map([['x', number('5')]]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('positive');
			});

			it('instantiates delimiter pattern', () => {
				const pattern = P.paren(P._('x'));
				const bindings = new Map([['x', variable('a')]]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('delimiter');
			});

			it('instantiates subscript pattern', () => {
				const pattern = P.subscript(P._('base'), P._('sub'));
				const bindings: MatchBindings = new Map<string, MathNode>([
					['base', variable('a')],
					['sub', number('1')]
				]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('subscript');
			});

			it('instantiates relation pattern', () => {
				const pattern = P.rel('=', P._('left'), P._('right'));
				const bindings: MatchBindings = new Map<string, MathNode>([
					['left', variable('x')],
					['right', number('5')]
				]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('relation');
			});

			it('instantiates nested patterns', () => {
				// Pattern: (a + b) * c
				const pattern = P.mul(P.add(P._('a'), P._('b')), P._('c'));
				const bindings = new Map([
					['a', number('1')],
					['b', number('2')],
					['c', number('3')]
				]);

				const result = instantiate(pattern, bindings);

				expect(result.type).toBe('multiplication');
			});
		});
	});

	// ===========================================================================
	// applyRule
	// ===========================================================================

	describe('applyRule', () => {
		describe('simple rules', () => {
			it('applies x + 0 = x rule', () => {
				const rule = createRule(P.add(P._('x'), P.num(0)), P._('x'), { name: 'add-zero-right' });
				const node = add(variable('a'), number('0'));

				const result = applyRule(rule, node);

				expect(result).not.toBeNull();
				expect(nodesEqual(result!, variable('a'))).toBe(true);
			});

			it('applies 0 + x = x rule (commutatively)', () => {
				const rule = createRule(P.add(P.num(0), P._('x')), P._('x'), { name: 'add-zero-left' });
				const node = add(number('0'), variable('a'));

				const result = applyRule(rule, node);

				expect(result).not.toBeNull();
				expect(nodesEqual(result!, variable('a'))).toBe(true);
			});

			it('applies x * 1 = x rule', () => {
				const rule = createRule(P.mul(P._('x'), P.num(1)), P._('x'), { name: 'mul-one-right' });
				const node = multiply(variable('a'), number('1'), 'dot');

				const result = applyRule(rule, node);

				expect(result).not.toBeNull();
				expect(nodesEqual(result!, variable('a'))).toBe(true);
			});

			it('applies x * 0 = 0 rule', () => {
				const rule = createRule(P.mul(P._('x'), P.num(0)), P.num(0), { name: 'mul-zero' });
				const node = multiply(variable('a'), number('0'), 'dot');

				const result = applyRule(rule, node);

				expect(result).not.toBeNull();
				expect(nodesEqual(result!, number('0'))).toBe(true);
			});

			it('applies x^1 = x rule', () => {
				const rule = createRule(P.pow(P._('x'), P.num(1)), P._('x'), { name: 'pow-one' });
				const node = superscript(variable('a'), number('1'));

				const result = applyRule(rule, node);

				expect(result).not.toBeNull();
				expect(nodesEqual(result!, variable('a'))).toBe(true);
			});
		});

		describe('rules with conditions', () => {
			it('applies x^0 = 1 rule with nonzero condition', () => {
				const rule = createRule(P.pow(P._('x'), P.num(0)), P.num(1), {
					name: 'pow-zero',
					condition: (bindings) => {
						const x = bindings.get('x');
						// x must not be zero
						return !(x?.type === 'number' && x.value === '0');
					}
				});

				// 5^0 = 1
				const node1 = superscript(number('5'), number('0'));
				const result1 = applyRule(rule, node1);
				expect(result1).not.toBeNull();
				expect(nodesEqual(result1!, number('1'))).toBe(true);

				// x^0 = 1 (variable)
				const node2 = superscript(variable('x'), number('0'));
				const result2 = applyRule(rule, node2);
				expect(result2).not.toBeNull();

				// 0^0 - condition fails
				const node3 = superscript(number('0'), number('0'));
				const result3 = applyRule(rule, node3);
				expect(result3).toBeNull();
			});

			it('applies x/x = 1 rule with nonzero condition', () => {
				const rule = createRule(P.div(P._('x'), P._('x')), P.num(1), {
					name: 'div-self',
					condition: (bindings) => {
						const x = bindings.get('x');
						return !(x?.type === 'number' && x.value === '0');
					}
				});

				// 5/5 = 1
				const node1 = divide(number('5'), number('5'), 'fraction');
				const result1 = applyRule(rule, node1);
				expect(result1).not.toBeNull();
				expect(nodesEqual(result1!, number('1'))).toBe(true);

				// a/a = 1
				const node2 = divide(variable('a'), variable('a'), 'fraction');
				const result2 = applyRule(rule, node2);
				expect(result2).not.toBeNull();

				// 0/0 - condition fails
				const node3 = divide(number('0'), number('0'), 'fraction');
				const result3 = applyRule(rule, node3);
				expect(result3).toBeNull();
			});
		});

		describe('rules with function replacement', () => {
			it('uses function replacement', () => {
				const rule = createRule(
					P.add(P._('x'), P._('x')),
					(bindings) => {
						const x = bindings.get('x')!;
						return multiply(number('2'), x, 'implicit');
					},
					{ name: 'double' }
				);

				const node = add(variable('a'), variable('a'));
				const result = applyRule(rule, node);

				expect(result).not.toBeNull();
				expect(result!.type).toBe('multiplication');
			});
		});

		describe('non-matching rules', () => {
			it('returns null when pattern does not match', () => {
				const rule = createRule(P.add(P._('x'), P.num(0)), P._('x'));
				const node = multiply(variable('a'), number('0'), 'dot');

				const result = applyRule(rule, node);

				expect(result).toBeNull();
			});

			it('returns null when condition fails', () => {
				const rule = createRule(P._('x', P.isNumber()), P._('x'), {
					condition: () => false
				});
				const node = number('5');

				const result = applyRule(rule, node);

				expect(result).toBeNull();
			});
		});
	});

	// ===========================================================================
	// applyRuleDeep
	// ===========================================================================

	describe('applyRuleDeep', () => {
		it('applies rule to nested expressions', () => {
			const rule = createRule(P.add(P._('x'), P.num(0)), P._('x'));

			// (a + 0) + (b + 0)
			const node = add(add(variable('a'), number('0')), add(variable('b'), number('0')));

			const result = applyRuleDeep(rule, node);

			// Should become a + b
			expect(nodesEqual(result, add(variable('a'), variable('b')))).toBe(true);
		});

		it('applies rule at all levels', () => {
			const rule = createRule(P.mul(P._('x'), P.num(1)), P._('x'));

			// ((a * 1) * 1) * 1
			const node = multiply(
				multiply(multiply(variable('a'), number('1'), 'dot'), number('1'), 'dot'),
				number('1'),
				'dot'
			);

			const result = applyRuleDeep(rule, node);

			// Should become just a
			expect(nodesEqual(result, variable('a'))).toBe(true);
		});

		it('leaves non-matching nodes unchanged', () => {
			const rule = createRule(P.add(P._('x'), P.num(0)), P._('x'));

			// a + b (no zeros to eliminate)
			const node = add(variable('a'), variable('b'));

			const result = applyRuleDeep(rule, node);

			expect(nodesEqual(result, node)).toBe(true);
		});

		it('applies rule bottom-up', () => {
			const rule = createRule(P.add(P._('x'), P.num(0)), P._('x'));

			// (0 + a) + 0
			const node = add(add(number('0'), variable('a')), number('0'));

			const result = applyRuleDeep(rule, node);

			// Inner (0 + a) becomes a, then a + 0 becomes a
			expect(nodesEqual(result, variable('a'))).toBe(true);
		});
	});

	// ===========================================================================
	// applyRules
	// ===========================================================================

	describe('applyRules', () => {
		const standardRules = [
			createRule(P.add(P._('x'), P.num(0)), P._('x'), { name: 'add-zero', priority: 1 }),
			createRule(P.mul(P._('x'), P.num(1)), P._('x'), { name: 'mul-one', priority: 1 }),
			createRule(P.mul(P._('x'), P.num(0)), P.num(0), { name: 'mul-zero', priority: 2 }),
			createRule(P.pow(P._('x'), P.num(1)), P._('x'), { name: 'pow-one', priority: 1 }),
			createRule(P.pow(P._('x'), P.num(0)), P.num(1), {
				name: 'pow-zero',
				priority: 1,
				condition: (b) => {
					const x = b.get('x');
					return !(x?.type === 'number' && x.value === '0');
				}
			})
		];

		it('applies multiple rules to reach fixpoint', () => {
			// (x + 0) * 1 -> x * 1 -> x
			const node = multiply(add(variable('x'), number('0')), number('1'), 'dot');

			const result = applyRules(standardRules, node);

			expect(nodesEqual(result, variable('x'))).toBe(true);
		});

		it('applies rules in priority order', () => {
			// With mul-zero having higher priority (2), it should be applied first
			// x * 0 + y * 0 -> 0 + 0 -> 0
			const node = add(
				multiply(variable('x'), number('0'), 'dot'),
				multiply(variable('y'), number('0'), 'dot')
			);

			const result = applyRules(standardRules, node);

			expect(nodesEqual(result, number('0'))).toBe(true);
		});

		it('handles complex nested expressions', () => {
			// ((a + 0) * 1)^1 + 0
			const node = add(
				superscript(multiply(add(variable('a'), number('0')), number('1'), 'dot'), number('1')),
				number('0')
			);

			const result = applyRules(standardRules, node);

			expect(nodesEqual(result, variable('a'))).toBe(true);
		});

		it('stops after maxIterations', () => {
			// Create a rule that would loop forever (toggle sign)
			const toggleRule = createRule(P.neg(P._('x')), P._('x'));

			const node = opposite(variable('a'));

			// Should stop after max iterations without infinite loop
			const result = applyRules([toggleRule], node, 5);

			// Result should exist (not hang)
			expect(result).toBeDefined();
		});

		it('returns unchanged node when no rules match', () => {
			const node = add(variable('a'), variable('b'));

			const result = applyRules(standardRules, node);

			expect(nodesEqual(result, node)).toBe(true);
		});

		it('handles empty rules array', () => {
			const node = add(variable('a'), number('0'));

			const result = applyRules([], node);

			expect(nodesEqual(result, node)).toBe(true);
		});

		it('handles rules with undefined priority', () => {
			const rules = [
				createRule(P.add(P._('x'), P.num(0)), P._('x'), { name: 'add-zero' }),
				createRule(P.mul(P._('x'), P.num(0)), P.num(0), { name: 'mul-zero', priority: 1 })
			];

			// mul-zero has priority 1, add-zero has undefined (treated as 0)
			// So mul-zero should come first
			const node = add(multiply(variable('x'), number('0'), 'dot'), number('0'));

			const result = applyRules(rules, node);

			expect(nodesEqual(result, number('0'))).toBe(true);
		});
	});

	// ===========================================================================
	// Real Simplification Scenarios
	// ===========================================================================

	describe('real simplification scenarios', () => {
		const simplificationRules = [
			// Additive identity
			createRule(P.add(P._('x'), P.num(0)), P._('x'), { name: 'add-zero-right' }),
			createRule(P.add(P.num(0), P._('x')), P._('x'), { name: 'add-zero-left' }),

			// Multiplicative identity
			createRule(P.mul(P._('x'), P.num(1)), P._('x'), { name: 'mul-one-right' }),
			createRule(P.mul(P.num(1), P._('x')), P._('x'), { name: 'mul-one-left' }),

			// Multiplicative zero
			createRule(P.mul(P._('x'), P.num(0)), P.num(0), { name: 'mul-zero-right', priority: 1 }),
			createRule(P.mul(P.num(0), P._('x')), P.num(0), { name: 'mul-zero-left', priority: 1 }),

			// Power rules
			createRule(P.pow(P._('x'), P.num(0)), P.num(1), {
				name: 'pow-zero',
				condition: (b) => {
					const x = b.get('x');
					return !(x?.type === 'number' && x.value === '0');
				}
			}),
			createRule(P.pow(P._('x'), P.num(1)), P._('x'), { name: 'pow-one' }),

			// Self-division
			createRule(P.div(P._('x'), P._('x')), P.num(1), {
				name: 'div-self',
				condition: (b) => {
					const x = b.get('x');
					return !(x?.type === 'number' && x.value === '0');
				}
			}),

			// Division by 1
			createRule(P.div(P._('x'), P.num(1)), P._('x'), { name: 'div-one' }),

			// Subtractive identity
			createRule(P.sub(P._('x'), P.num(0)), P._('x'), { name: 'sub-zero' }),

			// Self subtraction
			createRule(P.sub(P._('x'), P._('x')), P.num(0), { name: 'sub-self' }),

			// Double negation
			createRule(P.neg(P.neg(P._('x'))), P._('x'), { name: 'double-neg' })
		];

		it('simplifies polynomial expression', () => {
			// x^1 + 0 -> x + 0 -> x
			const node = add(superscript(variable('x'), number('1')), number('0'));

			const result = applyRules(simplificationRules, node);

			expect(nodesEqual(result, variable('x'))).toBe(true);
		});

		it('simplifies fraction to 1', () => {
			// (a + 0) / (a + 0) -> a / a -> 1
			const node = divide(
				add(variable('a'), number('0')),
				add(variable('a'), number('0')),
				'fraction'
			);

			const result = applyRules(simplificationRules, node);

			expect(nodesEqual(result, number('1'))).toBe(true);
		});

		it('simplifies product with zero', () => {
			// (complex expression) * 0 -> 0
			const node = multiply(
				add(superscript(variable('x'), number('2')), multiply(number('3'), variable('x'), 'dot')),
				number('0'),
				'dot'
			);

			const result = applyRules(simplificationRules, node);

			expect(nodesEqual(result, number('0'))).toBe(true);
		});

		it('simplifies double negation in nested expression', () => {
			// (--a) + 0 -> a + 0 -> a
			const node = add(opposite(opposite(variable('a'))), number('0'));

			const result = applyRules(simplificationRules, node);

			expect(nodesEqual(result, variable('a'))).toBe(true);
		});

		it('simplifies x - x to 0', () => {
			// a - a -> 0
			const node = subtract(variable('a'), variable('a'));

			const result = applyRules(simplificationRules, node);

			expect(nodesEqual(result, number('0'))).toBe(true);
		});

		it('handles deeply nested simplification', () => {
			// ((x * 1) + 0)^1 / 1 -> ((x) + 0)^1 / 1 -> (x)^1 / 1 -> x / 1 -> x
			const node = divide(
				superscript(add(multiply(variable('x'), number('1'), 'dot'), number('0')), number('1')),
				number('1'),
				'fraction'
			);

			const result = applyRules(simplificationRules, node);

			expect(nodesEqual(result, variable('x'))).toBe(true);
		});
	});
});
