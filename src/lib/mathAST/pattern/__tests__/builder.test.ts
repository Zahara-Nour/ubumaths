/**
 * Unit tests for Pattern Builder API
 */

import { describe, it, expect } from 'vitest';
import { P } from '../builder';
import { number, variable, greek } from '../../factory';
import type { MathNode } from '../../types';

describe('Pattern Builder (P namespace)', () => {
	// ===========================================================================
	// Wildcard Patterns
	// ===========================================================================

	describe('wildcards', () => {
		describe('P._()', () => {
			it('creates a wildcard pattern with just a name', () => {
				const pattern = P._('x');

				expect(pattern.type).toBe('wildcard');
				expect(pattern.name).toBe('x');
				expect(pattern.constraint).toBeUndefined();
			});

			it('creates a wildcard pattern with a constraint', () => {
				const pattern = P._('n', P.isNumber());

				expect(pattern.type).toBe('wildcard');
				expect(pattern.name).toBe('n');
				expect(pattern.constraint).toBeDefined();
				expect(pattern.constraint?.kind).toBe('number');
			});

			it('handles various wildcard names', () => {
				const patterns = [P._('a'), P._('expr'), P._('left'), P._('base123')];

				expect(patterns[0].name).toBe('a');
				expect(patterns[1].name).toBe('expr');
				expect(patterns[2].name).toBe('left');
				expect(patterns[3].name).toBe('base123');
			});

			it('creates distinct patterns for different names', () => {
				const p1 = P._('x');
				const p2 = P._('y');

				expect(p1.name).not.toBe(p2.name);
			});
		});
	});

	// ===========================================================================
	// Literal Patterns
	// ===========================================================================

	describe('literals', () => {
		describe('P.num()', () => {
			it('creates a literal pattern for zero', () => {
				const pattern = P.num(0);

				expect(pattern.type).toBe('literal');
				expect(pattern.node.type).toBe('number');
				if (pattern.node.type === 'number') {
					expect(pattern.node.value).toBe('0');
				}
			});

			it('creates a literal pattern for positive integer', () => {
				const pattern = P.num(42);

				expect(pattern.type).toBe('literal');
				if (pattern.node.type === 'number') {
					expect(pattern.node.value).toBe('42');
				}
			});

			it('creates a literal pattern for negative number', () => {
				const pattern = P.num(-5);

				expect(pattern.type).toBe('literal');
				if (pattern.node.type === 'number') {
					expect(pattern.node.value).toBe('-5');
				}
			});

			it('creates a literal pattern for decimal', () => {
				const pattern = P.num(3.14);

				expect(pattern.type).toBe('literal');
				if (pattern.node.type === 'number') {
					expect(pattern.node.value).toBe('3.14');
				}
			});
		});

		describe('P.var()', () => {
			it('creates a literal pattern for a variable', () => {
				const pattern = P.var('x');

				expect(pattern.type).toBe('literal');
				expect(pattern.node.type).toBe('variable');
				if (pattern.node.type === 'variable') {
					expect(pattern.node.name).toBe('x');
				}
			});

			it('handles multi-character variable names', () => {
				const pattern = P.var('velocity');

				expect(pattern.type).toBe('literal');
				if (pattern.node.type === 'variable') {
					expect(pattern.node.name).toBe('velocity');
				}
			});
		});

		describe('P.lit()', () => {
			it('creates a literal pattern from a MathNode', () => {
				const node = number('123');
				const pattern = P.lit(node);

				expect(pattern.type).toBe('literal');
				expect(pattern.node).toBe(node);
			});

			it('works with variable nodes', () => {
				const node = variable('y');
				const pattern = P.lit(node);

				expect(pattern.type).toBe('literal');
				expect(pattern.node).toBe(node);
			});

			it('works with greek letter nodes', () => {
				const node = greek('pi');
				const pattern = P.lit(node);

				expect(pattern.type).toBe('literal');
				expect(pattern.node).toBe(node);
			});
		});
	});

	// ===========================================================================
	// Structural Patterns
	// ===========================================================================

	describe('structural patterns', () => {
		describe('P.add()', () => {
			it('creates an addition pattern', () => {
				const pattern = P.add(P._('x'), P._('y'));

				expect(pattern.type).toBe('addition-pattern');
				expect(pattern.left.type).toBe('wildcard');
				expect(pattern.right.type).toBe('wildcard');
			});

			it('creates nested addition patterns', () => {
				const pattern = P.add(P.add(P._('a'), P._('b')), P._('c'));

				expect(pattern.type).toBe('addition-pattern');
				expect(pattern.left.type).toBe('addition-pattern');
				expect(pattern.right.type).toBe('wildcard');
			});

			it('mixes wildcards and literals', () => {
				const pattern = P.add(P._('x'), P.num(0));

				expect(pattern.type).toBe('addition-pattern');
				expect(pattern.left.type).toBe('wildcard');
				expect(pattern.right.type).toBe('literal');
			});
		});

		describe('P.sub()', () => {
			it('creates a subtraction pattern', () => {
				const pattern = P.sub(P._('x'), P._('y'));

				expect(pattern.type).toBe('subtraction-pattern');
				expect(pattern.left.type).toBe('wildcard');
				expect(pattern.right.type).toBe('wildcard');
			});

			it('creates x - 0 pattern', () => {
				const pattern = P.sub(P._('x'), P.num(0));

				expect(pattern.type).toBe('subtraction-pattern');
				expect(pattern.right.type).toBe('literal');
			});
		});

		describe('P.mul()', () => {
			it('creates a multiplication pattern', () => {
				const pattern = P.mul(P._('x'), P._('y'));

				expect(pattern.type).toBe('multiplication-pattern');
				expect(pattern.left.type).toBe('wildcard');
				expect(pattern.right.type).toBe('wildcard');
			});

			it('creates x * 1 pattern', () => {
				const pattern = P.mul(P._('x'), P.num(1));

				expect(pattern.type).toBe('multiplication-pattern');
			});

			it('creates x * 0 pattern', () => {
				const pattern = P.mul(P._('x'), P.num(0));

				expect(pattern.type).toBe('multiplication-pattern');
			});
		});

		describe('P.div()', () => {
			it('creates a division pattern', () => {
				const pattern = P.div(P._('x'), P._('y'));

				expect(pattern.type).toBe('division-pattern');
				expect(pattern.numerator.type).toBe('wildcard');
				expect(pattern.denominator.type).toBe('wildcard');
			});

			it('creates x / 1 pattern', () => {
				const pattern = P.div(P._('x'), P.num(1));

				expect(pattern.type).toBe('division-pattern');
				expect(pattern.denominator.type).toBe('literal');
			});

			it('creates 0 / x pattern with nonzero constraint', () => {
				const pattern = P.div(P.num(0), P._('x', P.isNonzero()));

				expect(pattern.type).toBe('division-pattern');
				expect(pattern.numerator.type).toBe('literal');
				if (pattern.denominator.type === 'wildcard') {
					expect(pattern.denominator.constraint?.kind).toBe('nonzero');
				}
			});
		});

		describe('P.pow()', () => {
			it('creates a power pattern', () => {
				const pattern = P.pow(P._('x'), P._('n'));

				expect(pattern.type).toBe('superscript-pattern');
				expect(pattern.base.type).toBe('wildcard');
				expect(pattern.exponent.type).toBe('wildcard');
			});

			it('creates x^0 pattern', () => {
				const pattern = P.pow(P._('x'), P.num(0));

				expect(pattern.type).toBe('superscript-pattern');
				expect(pattern.exponent.type).toBe('literal');
			});

			it('creates x^1 pattern', () => {
				const pattern = P.pow(P._('x'), P.num(1));

				expect(pattern.type).toBe('superscript-pattern');
			});

			it('creates nested power pattern', () => {
				const pattern = P.pow(P.pow(P._('x'), P._('m')), P._('n'));

				expect(pattern.type).toBe('superscript-pattern');
				expect(pattern.base.type).toBe('superscript-pattern');
			});
		});

		describe('P.func()', () => {
			it('creates a function pattern with one argument', () => {
				const pattern = P.func('sin', [P._('x')]);

				expect(pattern.type).toBe('function-pattern');
				expect(pattern.name).toBe('sin');
				expect(pattern.args).toHaveLength(1);
			});

			it('creates a function pattern with multiple arguments', () => {
				const pattern = P.func('max', [P._('a'), P._('b')]);

				expect(pattern.type).toBe('function-pattern');
				expect(pattern.name).toBe('max');
				expect(pattern.args).toHaveLength(2);
			});

			it('creates a function pattern with no arguments', () => {
				const pattern = P.func('random', []);

				expect(pattern.type).toBe('function-pattern');
				expect(pattern.args).toHaveLength(0);
			});

			it('creates common function patterns', () => {
				const sinP = P.func('sin', [P._('x')]);
				const cosP = P.func('cos', [P._('x')]);
				const lnP = P.func('ln', [P._('x')]);
				const sqrtP = P.func('sqrt', [P._('x')]);

				expect(sinP.name).toBe('sin');
				expect(cosP.name).toBe('cos');
				expect(lnP.name).toBe('ln');
				expect(sqrtP.name).toBe('sqrt');
			});
		});

		describe('P.neg()', () => {
			it('creates an opposite pattern', () => {
				const pattern = P.neg(P._('x'));

				expect(pattern.type).toBe('opposite-pattern');
				expect(pattern.operand.type).toBe('wildcard');
			});

			it('creates double negation pattern', () => {
				const pattern = P.neg(P.neg(P._('x')));

				expect(pattern.type).toBe('opposite-pattern');
				expect(pattern.operand.type).toBe('opposite-pattern');
			});
		});

		describe('P.pos()', () => {
			it('creates a positive pattern', () => {
				const pattern = P.pos(P._('x'));

				expect(pattern.type).toBe('positive-pattern');
				expect(pattern.operand.type).toBe('wildcard');
			});
		});

		describe('P.paren()', () => {
			it('creates a delimiter pattern', () => {
				const pattern = P.paren(P._('x'));

				expect(pattern.type).toBe('delimiter-pattern');
				expect(pattern.content.type).toBe('wildcard');
			});

			it('creates nested delimiter pattern', () => {
				const pattern = P.paren(P.add(P._('a'), P._('b')));

				expect(pattern.type).toBe('delimiter-pattern');
				expect(pattern.content.type).toBe('addition-pattern');
			});
		});

		describe('P.subscript()', () => {
			it('creates a subscript pattern', () => {
				const pattern = P.subscript(P._('x'), P._('n'));

				expect(pattern.type).toBe('subscript-pattern');
				expect(pattern.base.type).toBe('wildcard');
				expect(pattern.subscript.type).toBe('wildcard');
			});
		});

		describe('P.rel()', () => {
			it('creates an equality relation pattern', () => {
				const pattern = P.rel('=', P._('x'), P._('y'));

				expect(pattern.type).toBe('relation-pattern');
				expect(pattern.relation).toBe('=');
				expect(pattern.left.type).toBe('wildcard');
				expect(pattern.right.type).toBe('wildcard');
			});

			it('creates a less-than relation pattern', () => {
				const pattern = P.rel('<', P._('x'), P._('y'));

				expect(pattern.type).toBe('relation-pattern');
				expect(pattern.relation).toBe('<');
			});

			it('creates an any relation pattern', () => {
				const pattern = P.rel('any', P._('x'), P._('y'));

				expect(pattern.type).toBe('relation-pattern');
				expect(pattern.relation).toBe('any');
			});

			it('creates patterns for various relation types', () => {
				const relations = ['=', '<', '>', '<=', '>=', '!='] as const;

				for (const rel of relations) {
					const pattern = P.rel(rel, P._('x'), P._('y'));
					expect(pattern.relation).toBe(rel);
				}
			});
		});
	});

	// ===========================================================================
	// Constraints
	// ===========================================================================

	describe('constraints', () => {
		describe('P.isType()', () => {
			it('creates a type constraint for single type', () => {
				const constraint = P.isType('number');

				expect(constraint.kind).toBe('type');
				expect(constraint.nodeType).toBe('number');
			});

			it('creates a type constraint for multiple types', () => {
				const constraint = P.isType('number', 'variable');

				expect(constraint.kind).toBe('type');
				expect(constraint.nodeType).toEqual(['number', 'variable']);
			});

			it('creates type constraint for all literal types', () => {
				const constraint = P.isType('number', 'variable', 'greek', 'symbol');

				expect(constraint.kind).toBe('type');
				expect(constraint.nodeType).toHaveLength(4);
			});
		});

		describe('P.isNumber()', () => {
			it('creates a number constraint', () => {
				const constraint = P.isNumber();

				expect(constraint.kind).toBe('number');
			});
		});

		describe('P.isVariable()', () => {
			it('creates a variable constraint', () => {
				const constraint = P.isVariable();

				expect(constraint.kind).toBe('variable');
			});
		});

		describe('P.isPositive()', () => {
			it('creates a positive constraint', () => {
				const constraint = P.isPositive();

				expect(constraint.kind).toBe('positive');
			});
		});

		describe('P.isNegative()', () => {
			it('creates a negative constraint', () => {
				const constraint = P.isNegative();

				expect(constraint.kind).toBe('negative');
			});
		});

		describe('P.isNonzero()', () => {
			it('creates a nonzero constraint', () => {
				const constraint = P.isNonzero();

				expect(constraint.kind).toBe('nonzero');
			});
		});

		describe('P.isInteger()', () => {
			it('creates an integer constraint', () => {
				const constraint = P.isInteger();

				expect(constraint.kind).toBe('integer');
			});
		});

		describe('P.isFreeOf()', () => {
			it('creates a freeOf constraint with one variable', () => {
				const constraint = P.isFreeOf('x');

				expect(constraint.kind).toBe('freeOf');
				expect(constraint.variables).toEqual(['x']);
			});

			it('creates a freeOf constraint with multiple variables', () => {
				const constraint = P.isFreeOf('x', 'y', 'z');

				expect(constraint.kind).toBe('freeOf');
				expect(constraint.variables).toEqual(['x', 'y', 'z']);
			});
		});

		describe('P.custom()', () => {
			it('creates a custom constraint with predicate', () => {
				const predicate = (_node: MathNode) => true;
				const constraint = P.custom(predicate);

				expect(constraint.kind).toBe('custom');
				expect(constraint.predicate).toBe(predicate);
				expect(constraint.label).toBeUndefined();
			});

			it('creates a custom constraint with predicate and label', () => {
				const predicate = (_node: MathNode) => true;
				const constraint = P.custom(predicate, 'my-constraint');

				expect(constraint.kind).toBe('custom');
				expect(constraint.predicate).toBe(predicate);
				expect(constraint.label).toBe('my-constraint');
			});
		});

		describe('P.and()', () => {
			it('creates an and constraint with two constraints', () => {
				const constraint = P.and(P.isNumber(), P.isPositive());

				expect(constraint.kind).toBe('and');
				expect(constraint.constraints).toHaveLength(2);
				expect(constraint.constraints[0].kind).toBe('number');
				expect(constraint.constraints[1].kind).toBe('positive');
			});

			it('creates an and constraint with multiple constraints', () => {
				const constraint = P.and(P.isNumber(), P.isInteger(), P.isPositive());

				expect(constraint.kind).toBe('and');
				expect(constraint.constraints).toHaveLength(3);
			});
		});

		describe('P.or()', () => {
			it('creates an or constraint with two constraints', () => {
				const constraint = P.or(P.isNumber(), P.isVariable());

				expect(constraint.kind).toBe('or');
				expect(constraint.constraints).toHaveLength(2);
				expect(constraint.constraints[0].kind).toBe('number');
				expect(constraint.constraints[1].kind).toBe('variable');
			});

			it('creates an or constraint with multiple constraints', () => {
				const constraint = P.or(P.isNumber(), P.isVariable(), P.isType('greek'));

				expect(constraint.kind).toBe('or');
				expect(constraint.constraints).toHaveLength(3);
			});
		});

		describe('P.not()', () => {
			it('creates a not constraint', () => {
				const constraint = P.not(P.isNumber());

				expect(constraint.kind).toBe('not');
				expect(constraint.constraint.kind).toBe('number');
			});

			it('creates nested not constraints', () => {
				const constraint = P.not(P.not(P.isNumber()));

				expect(constraint.kind).toBe('not');
				expect(constraint.constraint.kind).toBe('not');
			});
		});

		describe('constraint composition', () => {
			it('combines and/or/not constraints', () => {
				const constraint = P.and(P.not(P.isNumber()), P.or(P.isVariable(), P.isType('greek')));

				expect(constraint.kind).toBe('and');
				expect(constraint.constraints).toHaveLength(2);
				expect(constraint.constraints[0].kind).toBe('not');
				expect(constraint.constraints[1].kind).toBe('or');
			});

			it('creates complex constraint for positive integer', () => {
				const constraint = P.and(P.isInteger(), P.isPositive());
				const pattern = P._('k', constraint);

				expect(pattern.type).toBe('wildcard');
				expect(pattern.constraint?.kind).toBe('and');
			});

			it('creates constraint for nonzero denominator', () => {
				const pattern = P.div(
					P._('num'),
					P._('den', P.and(P.isNonzero(), P.not(P.isType('hole'))))
				);

				expect(pattern.type).toBe('division-pattern');
				if (pattern.denominator.type === 'wildcard') {
					expect(pattern.denominator.constraint?.kind).toBe('and');
				}
			});
		});
	});

	// ===========================================================================
	// Rules
	// ===========================================================================

	describe('rules', () => {
		describe('P.rule()', () => {
			it('creates a rule with pattern replacement', () => {
				const r = P.rule(P.add(P._('x'), P.num(0)), P._('x'), { name: 'additive-identity' });

				expect(r.name).toBe('additive-identity');
				expect(r.pattern.type).toBe('addition-pattern');
				if (r.replacement && typeof r.replacement === 'object' && 'type' in r.replacement) {
					expect(r.replacement.type).toBe('wildcard');
				}
			});

			it('creates a rule with function replacement', () => {
				const r = P.rule(P.mul(P._('x'), P.num(0)), () => number('0'), {
					name: 'multiply-by-zero'
				});

				expect(r.name).toBe('multiply-by-zero');
				expect(typeof r.replacement).toBe('function');
			});

			it('creates a rule with condition', () => {
				const r = P.rule(P.div(P._('x'), P._('x')), P.num(1), {
					name: 'self-division',
					condition: (bindings) => {
						const x = bindings.get('x');
						return x?.type !== 'number' || x.value !== '0';
					}
				});

				expect(r.name).toBe('self-division');
				expect(r.condition).toBeDefined();
			});

			it('creates a rule with priority', () => {
				const r = P.rule(P.add(P._('x'), P._('y')), P.add(P._('y'), P._('x')), {
					name: 'commutative',
					priority: 10
				});

				expect(r.priority).toBe(10);
			});

			it('creates a rule without options (unnamed)', () => {
				const r = P.rule(P.pow(P._('x'), P.num(1)), P._('x'));

				expect(r.name).toBe('unnamed-rule');
				expect(r.condition).toBeUndefined();
				expect(r.priority).toBeUndefined();
			});
		});
	});

	// ===========================================================================
	// Complex Pattern Construction
	// ===========================================================================

	describe('complex patterns', () => {
		it('creates pattern for distributive law: a*(b+c)', () => {
			const pattern = P.mul(P._('a'), P.add(P._('b'), P._('c')));

			expect(pattern.type).toBe('multiplication-pattern');
			expect(pattern.right.type).toBe('addition-pattern');
		});

		it('creates pattern for power of product: (a*b)^n', () => {
			const pattern = P.pow(P.paren(P.mul(P._('a'), P._('b'))), P._('n'));

			expect(pattern.type).toBe('superscript-pattern');
			expect(pattern.base.type).toBe('delimiter-pattern');
		});

		it('creates pattern for quotient rule: (a/b)^n', () => {
			const pattern = P.pow(P.paren(P.div(P._('a'), P._('b'))), P._('n'));

			expect(pattern.type).toBe('superscript-pattern');
			if (pattern.base.type === 'delimiter-pattern') {
				expect(pattern.base.content.type).toBe('division-pattern');
			}
		});

		it('creates pattern for polynomial term: c*x^n', () => {
			const pattern = P.mul(P._('c', P.isFreeOf('x')), P.pow(P.var('x'), P._('n', P.isInteger())));

			expect(pattern.type).toBe('multiplication-pattern');
			if (pattern.left.type === 'wildcard') {
				expect(pattern.left.constraint?.kind).toBe('freeOf');
			}
		});

		it('creates pattern for trigonometric identity: sin^2(x) + cos^2(x)', () => {
			const pattern = P.add(
				P.pow(P.func('sin', [P._('x')]), P.num(2)),
				P.pow(P.func('cos', [P._('x')]), P.num(2))
			);

			expect(pattern.type).toBe('addition-pattern');
			expect(pattern.left.type).toBe('superscript-pattern');
			expect(pattern.right.type).toBe('superscript-pattern');
		});

		it('creates pattern for logarithm rule: log(a*b)', () => {
			const pattern = P.func('log', [P.mul(P._('a'), P._('b'))]);

			expect(pattern.type).toBe('function-pattern');
			expect(pattern.name).toBe('log');
			expect(pattern.args[0].type).toBe('multiplication-pattern');
		});

		it('creates pattern for chain rule context: f(g(x))', () => {
			const pattern = P.func('f', [P.func('g', [P._('x')])]);

			expect(pattern.type).toBe('function-pattern');
			expect(pattern.args[0].type).toBe('function-pattern');
		});
	});

	// ===========================================================================
	// Edge Cases
	// ===========================================================================

	describe('edge cases', () => {
		it('handles empty variable names', () => {
			const pattern = P._('');
			expect(pattern.name).toBe('');
		});

		it('handles special characters in variable names', () => {
			const pattern = P._('var_1');
			expect(pattern.name).toBe('var_1');
		});

		it('handles deeply nested patterns', () => {
			const pattern = P.add(P.add(P.add(P._('a'), P._('b')), P._('c')), P._('d'));

			expect(pattern.type).toBe('addition-pattern');
			expect(pattern.left.type).toBe('addition-pattern');
		});

		it('handles pattern with all constraint types', () => {
			const constraint = P.and(
				P.or(P.isNumber(), P.isVariable()),
				P.not(P.isNegative()),
				P.isFreeOf('x'),
				P.custom((node) => node.type === 'number', 'is-number')
			);

			expect(constraint.kind).toBe('and');
			expect(constraint.constraints).toHaveLength(4);
		});

		it('handles function pattern with mixed argument types', () => {
			const pattern = P.func('mixed', [
				P._('a', P.isNumber()),
				P.num(42),
				P.var('x'),
				P.add(P._('b'), P._('c'))
			]);

			expect(pattern.type).toBe('function-pattern');
			expect(pattern.args).toHaveLength(4);
		});
	});
});
