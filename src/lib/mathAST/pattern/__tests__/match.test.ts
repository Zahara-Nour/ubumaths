/**
 * Unit tests for Pattern Matching Algorithm
 */

import { describe, it, expect } from 'vitest';
import { match, nodesEqual, tryMatch, matches } from '../match';
import { P } from '../builder';
import {
	number,
	variable,
	add,
	subtract,
	multiply,
	divide,
	superscript,
	func,
	opposite,
	positive,
	parentheses,
	subscript,
	relation,
	greek
} from '../../factory';
import { parseLatex } from '../../parser';

describe('Pattern Matching Algorithm', () => {
	// ===========================================================================
	// Node Equality
	// ===========================================================================

	describe('nodesEqual', () => {
		it('compares identical numbers', () => {
			const a = number('42');
			const b = number('42');
			const c = number('43');

			expect(nodesEqual(a, b)).toBe(true);
			expect(nodesEqual(a, c)).toBe(false);
		});

		it('compares identical variables', () => {
			const a = variable('x');
			const b = variable('x');
			const c = variable('y');

			expect(nodesEqual(a, b)).toBe(true);
			expect(nodesEqual(a, c)).toBe(false);
		});

		it('compares different node types', () => {
			const num = number('42');
			const varNode = variable('x');

			expect(nodesEqual(num, varNode)).toBe(false);
		});

		it('compares complex expressions', () => {
			const expr1 = add(number('1'), number('2'));
			const expr2 = add(number('1'), number('2'));
			const expr3 = add(number('1'), number('3'));

			expect(nodesEqual(expr1, expr2)).toBe(true);
			expect(nodesEqual(expr1, expr3)).toBe(false);
		});

		it('compares deeply nested expressions', () => {
			const expr1 = add(multiply(number('2'), variable('x'), 'dot'), number('1'));
			const expr2 = add(multiply(number('2'), variable('x'), 'dot'), number('1'));
			const expr3 = add(multiply(number('2'), variable('y'), 'dot'), number('1'));

			expect(nodesEqual(expr1, expr2)).toBe(true);
			expect(nodesEqual(expr1, expr3)).toBe(false);
		});
	});

	// ===========================================================================
	// Wildcard Matching
	// ===========================================================================

	describe('wildcard matching', () => {
		describe('simple wildcards', () => {
			it('matches any node', () => {
				const pattern = P._('x');
				const node = number('42');

				const result = match(pattern, node);

				expect(result.success).toBe(true);
				expect(result.bindings.get('x')).toEqual(node);
			});

			it('matches complex expression', () => {
				const pattern = P._('expr');
				const node = add(number('1'), number('2'));

				const result = match(pattern, node);

				expect(result.success).toBe(true);
				expect(nodesEqual(result.bindings.get('expr')!, node)).toBe(true);
			});

			it('binds to correct name', () => {
				const pattern = P._('myvar');
				const node = variable('x');

				const result = match(pattern, node);

				expect(result.success).toBe(true);
				expect(result.bindings.has('myvar')).toBe(true);
				expect(result.bindings.has('x')).toBe(false);
			});
		});

		describe('wildcards with constraints', () => {
			it('matches when constraint passes', () => {
				const pattern = P._('n', P.isNumber());
				const node = number('42');

				const result = match(pattern, node);

				expect(result.success).toBe(true);
				expect(result.bindings.get('n')).toEqual(node);
			});

			it('fails when constraint fails', () => {
				const pattern = P._('n', P.isNumber());
				const node = variable('x');

				const result = match(pattern, node);

				expect(result.success).toBe(false);
			});

			it('matches positive integer constraint', () => {
				const pattern = P._('k', P.and(P.isInteger(), P.isPositive()));

				expect(match(pattern, number('5')).success).toBe(true);
				expect(match(pattern, number('-5')).success).toBe(false);
				expect(match(pattern, number('5.5')).success).toBe(false);
			});

			it('matches nonzero constraint', () => {
				const pattern = P._('d', P.isNonzero());

				expect(match(pattern, number('5')).success).toBe(true);
				expect(match(pattern, number('-3')).success).toBe(true);
				expect(match(pattern, number('0')).success).toBe(false);
			});

			it('matches freeOf constraint', () => {
				const pattern = P._('c', P.isFreeOf('x'));

				expect(match(pattern, number('5')).success).toBe(true);
				expect(match(pattern, variable('y')).success).toBe(true);
				expect(match(pattern, variable('x')).success).toBe(false);
				expect(match(pattern, add(variable('x'), number('1'))).success).toBe(false);
			});
		});

		describe('same-value wildcards', () => {
			it('matches when same wildcard has identical values', () => {
				// Pattern: x + x (same thing added to itself)
				const pattern = P.add(P._('x'), P._('x'));
				const node = add(number('5'), number('5'));

				const result = match(pattern, node);

				expect(result.success).toBe(true);
				expect(nodesEqual(result.bindings.get('x')!, number('5'))).toBe(true);
			});

			it('fails when same wildcard has different values', () => {
				// Pattern: x + x should NOT match a + b
				const pattern = P.add(P._('x'), P._('x'));
				const node = add(number('5'), number('6'));

				const result = match(pattern, node);

				expect(result.success).toBe(false);
			});

			it('matches complex same-value pattern', () => {
				// Pattern: x * x (squaring)
				const pattern = P.mul(P._('x'), P._('x'));
				const node = multiply(variable('a'), variable('a'), 'dot');

				const result = match(pattern, node);

				expect(result.success).toBe(true);
			});

			it('fails when same wildcard has structurally different values', () => {
				const pattern = P.mul(P._('x'), P._('x'));
				const node = multiply(variable('a'), variable('b'), 'dot');

				const result = match(pattern, node);

				expect(result.success).toBe(false);
			});

			it('matches x/x pattern', () => {
				// Division by same value (self-division)
				const pattern = P.div(P._('x'), P._('x'));
				const node = divide(variable('a'), variable('a'), 'fraction');

				const result = match(pattern, node);

				expect(result.success).toBe(true);
			});

			it('matches x/x with constraint', () => {
				// Pattern: x/x where x is nonzero
				const pattern = P.div(P._('x', P.isNonzero()), P._('x'));
				const node = divide(number('5'), number('5'), 'fraction');

				const result = match(pattern, node);

				expect(result.success).toBe(true);
			});
		});
	});

	// ===========================================================================
	// Literal Matching
	// ===========================================================================

	describe('literal matching', () => {
		it('matches exact number', () => {
			const pattern = P.num(0);
			const node = number('0');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('fails for different number', () => {
			const pattern = P.num(0);
			const node = number('1');

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});

		it('matches exact variable', () => {
			const pattern = P.var('x');
			const node = variable('x');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('fails for different variable', () => {
			const pattern = P.var('x');
			const node = variable('y');

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});

		it('matches literal node', () => {
			const originalNode = greek('alpha');
			const pattern = P.lit(originalNode);

			expect(match(pattern, greek('alpha')).success).toBe(true);
			expect(match(pattern, greek('beta')).success).toBe(false);
		});
	});

	// ===========================================================================
	// Addition Pattern Matching
	// ===========================================================================

	describe('addition pattern matching', () => {
		it('matches simple addition', () => {
			const pattern = P.add(P._('x'), P._('y'));
			const node = add(number('1'), number('2'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('x')!, number('1'))).toBe(true);
			expect(nodesEqual(result.bindings.get('y')!, number('2'))).toBe(true);
		});

		it('matches with literal on right', () => {
			const pattern = P.add(P._('x'), P.num(0));
			const node = add(variable('a'), number('0'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('x')!, variable('a'))).toBe(true);
		});

		it('matches commutatively (original order)', () => {
			const pattern = P.add(P.num(0), P._('x'));
			const node = add(number('0'), variable('a'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches commutatively (swapped order)', () => {
			// Pattern expects 0 + x, but node is x + 0
			const pattern = P.add(P.num(0), P._('x'));
			const node = add(variable('a'), number('0'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('x')!, variable('a'))).toBe(true);
		});

		it('fails for non-addition node', () => {
			const pattern = P.add(P._('x'), P._('y'));
			const node = multiply(number('1'), number('2'), 'dot');

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});

		it('matches nested addition', () => {
			const pattern = P.add(P.add(P._('a'), P._('b')), P._('c'));
			const node = add(add(number('1'), number('2')), number('3'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});
	});

	// ===========================================================================
	// Subtraction Pattern Matching
	// ===========================================================================

	describe('subtraction pattern matching', () => {
		it('matches simple subtraction', () => {
			const pattern = P.sub(P._('x'), P._('y'));
			const node = subtract(number('5'), number('3'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('x')!, number('5'))).toBe(true);
			expect(nodesEqual(result.bindings.get('y')!, number('3'))).toBe(true);
		});

		it('is NOT commutative', () => {
			// Pattern: x - 0
			const pattern = P.sub(P._('x'), P.num(0));

			// Node: 0 - a (should NOT match)
			const node1 = subtract(number('0'), variable('a'));
			expect(match(pattern, node1).success).toBe(false);

			// Node: a - 0 (should match)
			const node2 = subtract(variable('a'), number('0'));
			expect(match(pattern, node2).success).toBe(true);
		});

		it('matches x - x pattern', () => {
			const pattern = P.sub(P._('x'), P._('x'));
			const node = subtract(variable('a'), variable('a'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});
	});

	// ===========================================================================
	// Multiplication Pattern Matching
	// ===========================================================================

	describe('multiplication pattern matching', () => {
		it('matches simple multiplication', () => {
			const pattern = P.mul(P._('x'), P._('y'));
			const node = multiply(number('2'), number('3'), 'dot');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches x * 1 pattern', () => {
			const pattern = P.mul(P._('x'), P.num(1));
			const node = multiply(variable('a'), number('1'), 'dot');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches x * 0 pattern', () => {
			const pattern = P.mul(P._('x'), P.num(0));
			const node = multiply(variable('a'), number('0'), 'dot');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches commutatively', () => {
			// Pattern: 1 * x, Node: x * 1
			const pattern = P.mul(P.num(1), P._('x'));
			const node = multiply(variable('a'), number('1'), 'dot');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches 2*x + y pattern', () => {
			const pattern = P.add(P.mul(P.num(2), P._('x')), P._('y'));
			const node = add(multiply(number('2'), number('3'), 'dot'), number('5'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('x')!, number('3'))).toBe(true);
			expect(nodesEqual(result.bindings.get('y')!, number('5'))).toBe(true);
		});
	});

	// ===========================================================================
	// Division Pattern Matching
	// ===========================================================================

	describe('division pattern matching', () => {
		it('matches simple division', () => {
			const pattern = P.div(P._('x'), P._('y'));
			const node = divide(number('6'), number('2'), 'fraction');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('is NOT commutative', () => {
			// Pattern: x / 1
			const pattern = P.div(P._('x'), P.num(1));

			// Node: 1 / a (should NOT match)
			const node1 = divide(number('1'), variable('a'), 'fraction');
			expect(match(pattern, node1).success).toBe(false);

			// Node: a / 1 (should match)
			const node2 = divide(variable('a'), number('1'), 'fraction');
			expect(match(pattern, node2).success).toBe(true);
		});

		it('matches 0/x pattern with nonzero constraint', () => {
			const pattern = P.div(P.num(0), P._('x', P.isNonzero()));

			// 0 / 5 should match
			expect(match(pattern, divide(number('0'), number('5'), 'fraction')).success).toBe(true);

			// 0 / 0 should NOT match (denominator not nonzero)
			expect(match(pattern, divide(number('0'), number('0'), 'fraction')).success).toBe(false);
		});

		it('matches x/x pattern', () => {
			const pattern = P.div(P._('x'), P._('x'));

			const node = divide(variable('a'), variable('a'), 'fraction');
			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});
	});

	// ===========================================================================
	// Superscript Pattern Matching
	// ===========================================================================

	describe('superscript pattern matching', () => {
		it('matches simple power', () => {
			const pattern = P.pow(P._('x'), P._('n'));
			const node = superscript(variable('x'), number('2'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches x^0 pattern', () => {
			const pattern = P.pow(P._('x'), P.num(0));
			const node = superscript(variable('a'), number('0'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches x^1 pattern', () => {
			const pattern = P.pow(P._('x'), P.num(1));
			const node = superscript(variable('a'), number('1'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches (a^m)^n pattern', () => {
			const pattern = P.pow(P.pow(P._('a'), P._('m')), P._('n'));
			const node = superscript(superscript(variable('x'), number('2')), number('3'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});
	});

	// ===========================================================================
	// Function Pattern Matching
	// ===========================================================================

	describe('function pattern matching', () => {
		it('matches function by name', () => {
			const pattern = P.func('sin', [P._('x')]);
			const node = func('sin', [variable('x')]);

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('fails for wrong function name', () => {
			const pattern = P.func('sin', [P._('x')]);
			const node = func('cos', [variable('x')]);

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});

		it('fails for wrong argument count', () => {
			const pattern = P.func('log', [P._('x')]);
			const node = func('log', [variable('x'), number('10')]);

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});

		it('matches multiple arguments', () => {
			const pattern = P.func('max', [P._('a'), P._('b')]);
			const node = func('max', [number('5'), number('10')]);

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('a')!, number('5'))).toBe(true);
			expect(nodesEqual(result.bindings.get('b')!, number('10'))).toBe(true);
		});

		it('matches nested function', () => {
			const pattern = P.func('sin', [P.func('cos', [P._('x')])]);
			const node = func('sin', [func('cos', [variable('theta')])]);

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches function with power: sin²(x)', () => {
			const pattern = P.func('sin', [P._('x')], { power: P.num(2) });
			const node = func('sin', [variable('x')], { power: number('2') });

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('x')!, variable('x'))).toBe(true);
		});

		it('matches function with wildcard power: sin^n(x)', () => {
			const pattern = P.func('sin', [P._('x')], { power: P._('n') });
			const node = func('sin', [variable('x')], { power: number('3') });

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('n')!, number('3'))).toBe(true);
		});

		it('fails when pattern expects power but node has none', () => {
			const pattern = P.func('sin', [P._('x')], { power: P.num(2) });
			const node = func('sin', [variable('x')]);

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});

		it('fails when pattern expects no power but node has one', () => {
			const pattern = P.func('sin', [P._('x')]);
			const node = func('sin', [variable('x')], { power: number('2') });

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});

		it('fails when power value does not match', () => {
			const pattern = P.func('cos', [P._('x')], { power: P.num(2) });
			const node = func('cos', [variable('x')], { power: number('3') });

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});

		it('matches cos²(x) with parser output', () => {
			const pattern = P.func('cos', [P._('x')], { power: P.num(2) });
			const node = parseLatex('\\cos^2(x)');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('x')!, variable('x'))).toBe(true);
		});
	});

	// ===========================================================================
	// Opposite Pattern Matching
	// ===========================================================================

	describe('opposite pattern matching', () => {
		it('matches negation', () => {
			const pattern = P.neg(P._('x'));
			const node = opposite(variable('x'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches double negation', () => {
			const pattern = P.neg(P.neg(P._('x')));
			const node = opposite(opposite(variable('x')));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('fails for non-opposite node', () => {
			const pattern = P.neg(P._('x'));
			const node = positive(variable('x'));

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});
	});

	// ===========================================================================
	// Positive Pattern Matching
	// ===========================================================================

	describe('positive pattern matching', () => {
		it('matches positive sign', () => {
			const pattern = P.pos(P._('x'));
			const node = positive(variable('x'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('fails for opposite node', () => {
			const pattern = P.pos(P._('x'));
			const node = opposite(variable('x'));

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});
	});

	// ===========================================================================
	// Delimiter Pattern Matching
	// ===========================================================================

	describe('delimiter pattern matching', () => {
		it('matches parentheses', () => {
			const pattern = P.paren(P._('x'));
			const node = parentheses(variable('x'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches nested expression in parentheses', () => {
			const pattern = P.paren(P.add(P._('a'), P._('b')));
			const node = parentheses(add(number('1'), number('2')));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});
	});

	// ===========================================================================
	// Subscript Pattern Matching
	// ===========================================================================

	describe('subscript pattern matching', () => {
		it('matches subscript', () => {
			const pattern = P.subscript(P._('x'), P._('n'));
			const node = subscript(variable('x'), number('1'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches with literal subscript', () => {
			const pattern = P.subscript(P._('x'), P.num(0));
			const node = subscript(variable('a'), number('0'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});
	});

	// ===========================================================================
	// Relation Pattern Matching
	// ===========================================================================

	describe('relation pattern matching', () => {
		it('matches equality', () => {
			const pattern = P.rel('=', P._('x'), P._('y'));
			const node = relation('=', variable('a'), variable('b'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches less than', () => {
			const pattern = P.rel('<', P._('x'), P._('y'));
			const node = relation('<', number('1'), number('2'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches any relation type', () => {
			const pattern = P.rel('any', P._('x'), P._('y'));

			expect(match(pattern, relation('=', number('1'), number('2'))).success).toBe(true);
			expect(match(pattern, relation('<', number('1'), number('2'))).success).toBe(true);
			expect(match(pattern, relation('>=', number('1'), number('2'))).success).toBe(true);
		});

		it('fails for wrong relation type', () => {
			const pattern = P.rel('=', P._('x'), P._('y'));
			const node = relation('<', number('1'), number('2'));

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});
	});

	// ===========================================================================
	// Complex Pattern Tests
	// ===========================================================================

	describe('complex patterns', () => {
		it('matches distributive pattern: a*(b+c)', () => {
			const pattern = P.mul(P._('a'), P.add(P._('b'), P._('c')));
			const node = multiply(number('2'), add(number('3'), number('4')), 'dot');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('a')!, number('2'))).toBe(true);
		});

		it('matches power of product: (a*b)^n', () => {
			const pattern = P.pow(P.paren(P.mul(P._('a'), P._('b'))), P._('n'));
			const node = superscript(
				parentheses(multiply(variable('x'), variable('y'), 'dot')),
				number('2')
			);

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('matches polynomial term: c*x^n where c is free of x', () => {
			const pattern = P.mul(P._('c', P.isFreeOf('x')), P.pow(P.var('x'), P._('n', P.isInteger())));

			// 5 * x^2 should match
			const node = multiply(number('5'), superscript(variable('x'), number('2')), 'dot');
			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('c')!, number('5'))).toBe(true);
			expect(nodesEqual(result.bindings.get('n')!, number('2'))).toBe(true);
		});

		it('matches trig identity: sin^2(x) + cos^2(x)', () => {
			const pattern = P.add(
				P.pow(P.func('sin', [P._('x')]), P.num(2)),
				P.pow(P.func('cos', [P._('x')]), P.num(2))
			);

			const node = add(
				superscript(func('sin', [variable('theta')]), number('2')),
				superscript(func('cos', [variable('theta')]), number('2'))
			);

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('x')!, variable('theta'))).toBe(true);
		});

		it('fails trig identity when x values differ', () => {
			const pattern = P.add(
				P.pow(P.func('sin', [P._('x')]), P.num(2)),
				P.pow(P.func('cos', [P._('x')]), P.num(2))
			);

			// sin^2(a) + cos^2(b) - different variables
			const node = add(
				superscript(func('sin', [variable('a')]), number('2')),
				superscript(func('cos', [variable('b')]), number('2'))
			);

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});
	});

	// ===========================================================================
	// Utility Functions
	// ===========================================================================

	describe('tryMatch utility', () => {
		it('returns bindings on success', () => {
			const pattern = P._('x');
			const node = number('42');

			const bindings = tryMatch(pattern, node);

			expect(bindings).toBeDefined();
			expect(bindings?.get('x')).toEqual(node);
		});

		it('returns undefined on failure', () => {
			const pattern = P.add(P._('x'), P._('y'));
			const node = number('42');

			const bindings = tryMatch(pattern, node);

			expect(bindings).toBeUndefined();
		});
	});

	describe('matches utility', () => {
		it('returns true on success', () => {
			const pattern = P._('x');
			const node = number('42');

			expect(matches(pattern, node)).toBe(true);
		});

		it('returns false on failure', () => {
			const pattern = P.add(P._('x'), P._('y'));
			const node = number('42');

			expect(matches(pattern, node)).toBe(false);
		});
	});

	// ===========================================================================
	// Edge Cases
	// ===========================================================================

	describe('edge cases', () => {
		it('handles empty bindings correctly', () => {
			const pattern = P.num(0);
			const node = number('0');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(result.bindings.size).toBe(0);
		});

		it('handles deeply nested same-value wildcards', () => {
			const pattern = P.add(P.mul(P._('x'), P._('x')), P.mul(P._('x'), P._('x')));
			const node = add(
				multiply(number('2'), number('2'), 'dot'),
				multiply(number('2'), number('2'), 'dot')
			);

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('fails deeply nested same-value wildcards with different values', () => {
			const pattern = P.add(P.mul(P._('x'), P._('x')), P.mul(P._('x'), P._('x')));
			const node = add(
				multiply(number('2'), number('2'), 'dot'),
				multiply(number('3'), number('3'), 'dot')
			);

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});

		it('handles multiple different wildcards', () => {
			const pattern = P.add(P.add(P._('a'), P._('b')), P.add(P._('c'), P._('d')));
			const node = add(add(number('1'), number('2')), add(number('3'), number('4')));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(result.bindings.size).toBe(4);
		});

		it('commutative matching preserves bindings correctly', () => {
			// Pattern: 0 + x (expects 0 on left)
			// Node: a + 0 (0 is on right)
			// Should match due to commutativity
			const pattern = P.add(P.num(0), P._('x'));
			const node = add(variable('a'), number('0'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('x')!, variable('a'))).toBe(true);
		});
	});
});
