/**
 * Unit tests for MathAST factory functions
 */

import { describe, it, expect } from 'vitest';
import {
	// Literal factories
	number,
	variable,
	greek,
	symbol,
	// Binary operation factories
	add,
	subtract,
	multiply,
	divide,
	fraction,
	implicitMultiply,
	// Unary operation factories
	opposite,
	positive,
	// Function factory
	func,
	sin,
	cos,
	tan,
	ln,
	log,
	exp,
	sqrt,
	abs,
	// Structural factories
	delimiter,
	parentheses,
	subscript,
	superscript,
	power,
	// Relation factories
	relation,
	equals,
	lessThan,
	greaterThan,
	lessThanOrEqual,
	greaterThanOrEqual,
	notEquals,
	approx,
	congruent,
	elementOf,
	notElementOf,
	subset,
	subsetOrEqual,
	superset,
	supersetOrEqual,
	implies,
	iff,
	// Relation chain factories
	relationChain,
	equalsChain,
	lessThanChain,
	lessThanOrEqualChain,
	greaterThanChain,
	greaterThanOrEqualChain,
	impliesChain,
	iffChain
} from '../factory';
import { flattenRelationChain } from '../flatten';

describe('factory', () => {
	// =============================================================================
	// Literal Factories
	// =============================================================================

	describe('number', () => {
		it('creates number node with correct type and value', () => {
			const node = number('42');
			expect(node.type).toBe('number');
			expect(node.value).toBe('42');
		});

		it('preserves exact formatting', () => {
			const node = number('3.140');
			expect(node.value).toBe('3.140');
		});

		it('includes metadata when provided', () => {
			const node = number('42', { color: 'red' });
			expect(node.metadata?.color).toBe('red');
		});

		it('does not include metadata when not provided', () => {
			const node = number('42');
			expect(node.metadata).toBeUndefined();
		});
	});

	describe('variable', () => {
		it('creates variable node with correct type and name', () => {
			const node = variable('x');
			expect(node.type).toBe('variable');
			expect(node.name).toBe('x');
		});

		it('handles multi-character identifiers', () => {
			const node = variable('velocity');
			expect(node.name).toBe('velocity');
		});

		it('includes metadata when provided', () => {
			const node = variable('x', { style: 'italic' });
			expect(node.metadata?.style).toBe('italic');
		});
	});

	describe('greek', () => {
		it('creates greek letter node with correct type and letter', () => {
			const node = greek('alpha');
			expect(node.type).toBe('greek');
			expect(node.letter).toBe('alpha');
		});

		it('handles all supported Greek letters', () => {
			const node = greek('gamma');
			expect(node.letter).toBe('gamma');
		});

		it('includes metadata when provided', () => {
			const node = greek('pi', { annotation: 'constant' });
			expect(node.metadata?.annotation).toBe('constant');
		});
	});

	describe('symbol', () => {
		it('creates symbol node with correct type and symbol', () => {
			const node = symbol('infinity');
			expect(node.type).toBe('symbol');
			expect(node.symbol).toBe('infinity');
		});

		it('handles various math symbols', () => {
			const infNode = symbol('infinity');
			expect(infNode.symbol).toBe('infinity');

			const emptyNode = symbol('emptyset');
			expect(emptyNode.symbol).toBe('emptyset');
		});

		it('includes metadata when provided', () => {
			const node = symbol('infinity', { color: 'blue' });
			expect(node.metadata?.color).toBe('blue');
		});
	});

	// =============================================================================
	// Binary Operation Factories
	// =============================================================================

	describe('add', () => {
		it('creates addition node with correct type and operands', () => {
			const left = number('2');
			const right = number('3');
			const node = add(left, right);

			expect(node.type).toBe('addition');
			expect(node.left).toBe(left);
			expect(node.right).toBe(right);
		});

		it('includes metadata when provided', () => {
			const node = add(number('2'), number('3'), { color: 'green' });
			expect(node.metadata?.color).toBe('green');
		});
	});

	describe('subtract', () => {
		it('creates subtraction node with correct type and operands', () => {
			const left = number('5');
			const right = number('2');
			const node = subtract(left, right);

			expect(node.type).toBe('subtraction');
			expect(node.left).toBe(left);
			expect(node.right).toBe(right);
		});

		it('includes metadata when provided', () => {
			const node = subtract(number('5'), number('2'), { style: 'bold' });
			expect(node.metadata?.style).toBe('bold');
		});
	});

	describe('multiply', () => {
		it('creates multiplication node with correct type and operands', () => {
			const left = number('2');
			const right = variable('x');
			const node = multiply(left, right, 'dot');

			expect(node.type).toBe('multiplication');
			expect(node.left).toBe(left);
			expect(node.right).toBe(right);
			expect(node.displayStyle).toBe('dot');
		});

		it('supports all display styles', () => {
			const left = number('2');
			const right = number('3');

			expect(multiply(left, right, 'implicit').displayStyle).toBe('implicit');
			expect(multiply(left, right, 'dot').displayStyle).toBe('dot');
			expect(multiply(left, right, 'cross').displayStyle).toBe('cross');
			expect(multiply(left, right, 'star').displayStyle).toBe('star');
		});

		it('includes metadata when provided', () => {
			const node = multiply(number('2'), number('3'), 'dot', { color: 'purple' });
			expect(node.metadata?.color).toBe('purple');
		});
	});

	describe('implicitMultiply', () => {
		it('creates implicit multiplication', () => {
			const node = implicitMultiply(number('2'), variable('x'));
			expect(node.type).toBe('multiplication');
			expect(node.displayStyle).toBe('implicit');
		});
	});

	describe('divide', () => {
		it('creates division node with correct type and operands', () => {
			const numerator = number('6');
			const denominator = number('2');
			const node = divide(numerator, denominator, 'inline');

			expect(node.type).toBe('division');
			expect(node.numerator).toBe(numerator);
			expect(node.denominator).toBe(denominator);
			expect(node.displayStyle).toBe('inline');
		});

		it('supports all display styles', () => {
			const num = number('1');
			const den = number('2');

			expect(divide(num, den, 'fraction').displayStyle).toBe('fraction');
			expect(divide(num, den, 'inline').displayStyle).toBe('inline');
			expect(divide(num, den, 'ratio').displayStyle).toBe('ratio');
		});

		it('includes metadata when provided', () => {
			const node = divide(number('6'), number('2'), 'fraction', { annotation: 'simplified' });
			expect(node.metadata?.annotation).toBe('simplified');
		});
	});

	describe('fraction', () => {
		it('creates fraction-style division', () => {
			const node = fraction(number('1'), number('2'));
			expect(node.type).toBe('division');
			expect(node.displayStyle).toBe('fraction');
		});
	});

	// =============================================================================
	// Unary Operation Factories
	// =============================================================================

	describe('opposite', () => {
		it('creates opposite node with correct type and operand', () => {
			const operand = number('5');
			const node = opposite(operand);

			expect(node.type).toBe('opposite');
			expect(node.operand).toBe(operand);
		});

		it('includes metadata when provided', () => {
			const node = opposite(number('5'), { color: 'red' });
			expect(node.metadata?.color).toBe('red');
		});
	});

	describe('positive', () => {
		it('creates positive node with correct type and operand', () => {
			const operand = number('5');
			const node = positive(operand);

			expect(node.type).toBe('positive');
			expect(node.operand).toBe(operand);
		});

		it('includes metadata when provided', () => {
			const node = positive(number('5'), { style: 'normal' });
			expect(node.metadata?.style).toBe('normal');
		});
	});

	// =============================================================================
	// Function Factory
	// =============================================================================

	describe('func', () => {
		it('creates function node with name and args', () => {
			const arg = variable('x');
			const node = func('f', [arg]);

			expect(node.type).toBe('function');
			expect(node.name).toBe('f');
			expect(node.args).toEqual([arg]);
		});

		it('supports empty arguments', () => {
			const node = func('f', []);
			expect(node.args).toEqual([]);
		});

		it('supports multiple arguments', () => {
			const args = [variable('x'), variable('y')];
			const node = func('max', args);
			expect(node.args).toEqual(args);
		});

		it('supports power option', () => {
			const powerValue = number('2');
			const node = func('f', [variable('x')], { power: powerValue });
			expect(node.power).toBe(powerValue);
		});

		it('supports base option', () => {
			const baseValue = number('2');
			const node = func('log', [variable('x')], { base: baseValue });
			expect(node.base).toBe(baseValue);
		});

		it('does not include power/base when not provided', () => {
			const node = func('f', [variable('x')]);
			expect(node.power).toBeUndefined();
			expect(node.base).toBeUndefined();
		});

		it('includes metadata when provided', () => {
			const node = func('f', [variable('x')], { metadata: { color: 'orange' } });
			expect(node.metadata?.color).toBe('orange');
		});
	});

	describe('sin', () => {
		it('creates sin function', () => {
			const arg = variable('x');
			const node = sin(arg);

			expect(node.type).toBe('function');
			expect(node.name).toBe('sin');
			expect(node.args).toEqual([arg]);
		});
	});

	describe('cos', () => {
		it('creates cos function', () => {
			const arg = variable('x');
			const node = cos(arg);

			expect(node.type).toBe('function');
			expect(node.name).toBe('cos');
			expect(node.args).toEqual([arg]);
		});
	});

	describe('tan', () => {
		it('creates tan function', () => {
			const arg = variable('x');
			const node = tan(arg);

			expect(node.type).toBe('function');
			expect(node.name).toBe('tan');
			expect(node.args).toEqual([arg]);
		});
	});

	describe('ln', () => {
		it('creates ln function', () => {
			const arg = variable('x');
			const node = ln(arg);

			expect(node.type).toBe('function');
			expect(node.name).toBe('ln');
			expect(node.args).toEqual([arg]);
		});
	});

	describe('log', () => {
		it('creates log function without base', () => {
			const arg = variable('x');
			const node = log(arg);

			expect(node.type).toBe('function');
			expect(node.name).toBe('log');
			expect(node.args).toEqual([arg]);
			expect(node.base).toBeUndefined();
		});

		it('creates log function with base', () => {
			const arg = variable('x');
			const baseValue = number('2');
			const node = log(arg, baseValue);

			expect(node.base).toBe(baseValue);
		});
	});

	describe('exp', () => {
		it('creates exp function', () => {
			const arg = variable('x');
			const node = exp(arg);

			expect(node.type).toBe('function');
			expect(node.name).toBe('exp');
			expect(node.args).toEqual([arg]);
		});
	});

	describe('sqrt', () => {
		it('creates sqrt function', () => {
			const arg = number('4');
			const node = sqrt(arg);

			expect(node.type).toBe('function');
			expect(node.name).toBe('sqrt');
			expect(node.args).toEqual([arg]);
		});
	});

	describe('abs', () => {
		it('creates abs function', () => {
			const arg = variable('x');
			const node = abs(arg);

			expect(node.type).toBe('function');
			expect(node.name).toBe('abs');
			expect(node.args).toEqual([arg]);
		});
	});

	// =============================================================================
	// Structural Factories
	// =============================================================================

	describe('delimiter', () => {
		it('creates delimiter node with type and content', () => {
			const content = variable('x');
			const node = delimiter('parentheses', content);

			expect(node.type).toBe('delimiter');
			expect(node.delimiters).toBe('parentheses');
			expect(node.content).toBe(content);
		});

		it('supports parentheses delimiter type', () => {
			const content = variable('x');
			expect(delimiter('parentheses', content).delimiters).toBe('parentheses');
		});

		it('includes semantic when provided', () => {
			const node = delimiter('parentheses', variable('x'), 'set');
			expect(node.semantic).toBe('set');
		});

		it('does not include semantic when not provided', () => {
			const node = delimiter('parentheses', variable('x'));
			expect(node.semantic).toBeUndefined();
		});

		it('includes metadata when provided', () => {
			const node = delimiter('parentheses', variable('x'), undefined, { color: 'blue' });
			expect(node.metadata?.color).toBe('blue');
		});
	});

	describe('parentheses', () => {
		it('creates parentheses delimiter with grouping semantic', () => {
			const content = variable('x');
			const node = parentheses(content);

			expect(node.delimiters).toBe('parentheses');
			expect(node.semantic).toBe('grouping');
		});
	});

	describe('subscript', () => {
		it('creates subscript node with base and subscript', () => {
			const base = variable('x');
			const sub = number('1');
			const node = subscript(base, sub);

			expect(node.type).toBe('subscript');
			expect(node.base).toBe(base);
			expect(node.subscript).toBe(sub);
		});

		it('includes metadata when provided', () => {
			const node = subscript(variable('x'), number('1'), { style: 'italic' });
			expect(node.metadata?.style).toBe('italic');
		});
	});

	describe('superscript', () => {
		it('creates superscript node with base and superscript', () => {
			const base = variable('x');
			const sup = number('2');
			const node = superscript(base, sup);

			expect(node.type).toBe('superscript');
			expect(node.base).toBe(base);
			expect(node.superscript).toBe(sup);
		});

		it('includes metadata when provided', () => {
			const node = superscript(variable('x'), number('2'), { annotation: 'squared' });
			expect(node.metadata?.annotation).toBe('squared');
		});
	});

	describe('power', () => {
		it('creates superscript node (alias)', () => {
			const base = variable('x');
			const exponent = number('3');
			const node = power(base, exponent);

			expect(node.type).toBe('superscript');
			expect(node.base).toBe(base);
			expect(node.superscript).toBe(exponent);
		});
	});

	// =============================================================================
	// Relation Factories
	// =============================================================================

	describe('relation', () => {
		it('creates relation node with type and operands', () => {
			const left = variable('x');
			const right = number('5');
			const node = relation('=', left, right);

			expect(node.type).toBe('relation');
			expect(node.relation).toBe('=');
			expect(node.left).toBe(left);
			expect(node.right).toBe(right);
		});

		it('supports all relation types', () => {
			const left = variable('x');
			const right = number('5');

			expect(relation('=', left, right).relation).toBe('=');
			expect(relation('<', left, right).relation).toBe('<');
			expect(relation('>', left, right).relation).toBe('>');
			expect(relation('<=', left, right).relation).toBe('<=');
			expect(relation('>=', left, right).relation).toBe('>=');
			expect(relation('!=', left, right).relation).toBe('!=');
		});

		it('includes metadata when provided', () => {
			const node = relation('=', variable('x'), number('5'), { color: 'green' });
			expect(node.metadata?.color).toBe('green');
		});
	});

	describe('equals', () => {
		it('creates equality relation', () => {
			const left = variable('x');
			const right = number('5');
			const node = equals(left, right);

			expect(node.relation).toBe('=');
		});
	});

	describe('lessThan', () => {
		it('creates less than relation', () => {
			const node = lessThan(variable('x'), number('5'));
			expect(node.relation).toBe('<');
		});
	});

	describe('greaterThan', () => {
		it('creates greater than relation', () => {
			const node = greaterThan(variable('x'), number('5'));
			expect(node.relation).toBe('>');
		});
	});

	describe('lessThanOrEqual', () => {
		it('creates less than or equal relation', () => {
			const node = lessThanOrEqual(variable('x'), number('5'));
			expect(node.relation).toBe('<=');
		});
	});

	describe('greaterThanOrEqual', () => {
		it('creates greater than or equal relation', () => {
			const node = greaterThanOrEqual(variable('x'), number('5'));
			expect(node.relation).toBe('>=');
		});
	});

	describe('notEquals', () => {
		it('creates not equal relation', () => {
			const node = notEquals(variable('x'), number('5'));
			expect(node.relation).toBe('!=');
		});
	});

	describe('approx', () => {
		it('creates approximately equal relation', () => {
			const node = approx(variable('x'), number('5'));
			expect(node.relation).toBe('≈');
		});
	});

	describe('congruent', () => {
		it('creates congruent relation', () => {
			const node = congruent(variable('x'), number('5'));
			expect(node.relation).toBe('≡');
		});
	});

	describe('elementOf', () => {
		it('creates element of relation', () => {
			const node = elementOf(variable('x'), variable('S'));
			expect(node.relation).toBe('∈');
		});
	});

	describe('notElementOf', () => {
		it('creates not element of relation', () => {
			const node = notElementOf(variable('x'), variable('S'));
			expect(node.relation).toBe('∉');
		});
	});

	describe('subset', () => {
		it('creates subset relation', () => {
			const node = subset(variable('A'), variable('B'));
			expect(node.relation).toBe('⊂');
		});
	});

	describe('subsetOrEqual', () => {
		it('creates subset or equal relation', () => {
			const node = subsetOrEqual(variable('A'), variable('B'));
			expect(node.relation).toBe('⊆');
		});
	});

	describe('superset', () => {
		it('creates superset relation', () => {
			const node = superset(variable('A'), variable('B'));
			expect(node.relation).toBe('⊃');
		});
	});

	describe('supersetOrEqual', () => {
		it('creates superset or equal relation', () => {
			const node = supersetOrEqual(variable('A'), variable('B'));
			expect(node.relation).toBe('⊇');
		});
	});

	describe('implies', () => {
		it('creates implies relation', () => {
			const node = implies(variable('P'), variable('Q'));
			expect(node.relation).toBe('⟹');
		});
	});

	describe('iff', () => {
		it('creates if and only if relation', () => {
			const node = iff(variable('P'), variable('Q'));
			expect(node.relation).toBe('⟺');
		});
	});

	// =============================================================================
	// Relation Chain Factories
	// =============================================================================

	describe('Relation Chain Factories', () => {
		describe('relationChain', () => {
			it('should create a binary relation', () => {
				const chain = relationChain([variable('a'), variable('b')], ['=']);
				expect(chain.type).toBe('relation');
				expect(chain.relation).toBe('=');
			});

			it('should create a chain of 3 operands', () => {
				const chain = relationChain([variable('a'), variable('b'), variable('c')], ['<', '<']);
				expect(chain.type).toBe('relation');
				// Check it's nested
				expect(chain.left.type).toBe('relation');
			});

			it('should apply metadata to outermost node', () => {
				const chain = relationChain([variable('a'), variable('b'), variable('c')], ['<', '<'], {
					color: 'red'
				});
				expect(chain.metadata?.color).toBe('red');
			});

			it('should throw for less than 2 operands', () => {
				expect(() => relationChain([variable('a')], [])).toThrow();
			});

			it('should throw for mismatched lengths', () => {
				expect(() => relationChain([variable('a'), variable('b')], ['=', '='])).toThrow();
			});

			it('should create mixed relation chain', () => {
				const chain = relationChain([variable('a'), variable('b'), variable('c')], ['<=', '<']);
				const flat = flattenRelationChain(chain);
				expect(flat.relations).toEqual(['<=', '<']);
			});
		});

		describe('equalsChain', () => {
			it('should create a = b', () => {
				const chain = equalsChain(variable('a'), variable('b'));
				expect(chain.relation).toBe('=');
			});

			it('should create a = b = c', () => {
				const chain = equalsChain(variable('a'), variable('b'), variable('c'));
				expect(chain.relation).toBe('=');
				expect(chain.left.type).toBe('relation');
			});

			it('should throw for less than 2 operands', () => {
				expect(() => equalsChain(variable('a'))).toThrow();
			});

			it('should create a = b = c = d', () => {
				const chain = equalsChain(variable('a'), variable('b'), variable('c'), variable('d'));
				const flat = flattenRelationChain(chain);
				expect(flat.operands).toHaveLength(4);
				expect(flat.relations).toEqual(['=', '=', '=']);
			});
		});

		describe('lessThanChain', () => {
			it('should create a < b < c', () => {
				const chain = lessThanChain(variable('a'), variable('b'), variable('c'));
				const flat = flattenRelationChain(chain);
				expect(flat.relations).toEqual(['<', '<']);
			});

			it('should throw for less than 2 operands', () => {
				expect(() => lessThanChain(variable('a'))).toThrow();
			});
		});

		describe('lessThanOrEqualChain', () => {
			it('should create a <= b <= c', () => {
				const chain = lessThanOrEqualChain(variable('a'), variable('b'), variable('c'));
				const flat = flattenRelationChain(chain);
				expect(flat.relations).toEqual(['<=', '<=']);
			});

			it('should throw for less than 2 operands', () => {
				expect(() => lessThanOrEqualChain(variable('a'))).toThrow();
			});
		});

		describe('greaterThanChain', () => {
			it('should create a > b > c', () => {
				const chain = greaterThanChain(variable('a'), variable('b'), variable('c'));
				const flat = flattenRelationChain(chain);
				expect(flat.relations).toEqual(['>', '>']);
			});

			it('should throw for less than 2 operands', () => {
				expect(() => greaterThanChain(variable('a'))).toThrow();
			});
		});

		describe('greaterThanOrEqualChain', () => {
			it('should create a >= b >= c', () => {
				const chain = greaterThanOrEqualChain(variable('a'), variable('b'), variable('c'));
				const flat = flattenRelationChain(chain);
				expect(flat.relations).toEqual(['>=', '>=']);
			});

			it('should throw for less than 2 operands', () => {
				expect(() => greaterThanOrEqualChain(variable('a'))).toThrow();
			});
		});

		describe('impliesChain', () => {
			it('should create P => Q => R', () => {
				const chain = impliesChain(variable('P'), variable('Q'), variable('R'));
				const flat = flattenRelationChain(chain);
				expect(flat.relations).toEqual(['⟹', '⟹']);
			});

			it('should throw for less than 2 operands', () => {
				expect(() => impliesChain(variable('P'))).toThrow();
			});
		});

		describe('iffChain', () => {
			it('should create P <=> Q <=> R', () => {
				const chain = iffChain(variable('P'), variable('Q'), variable('R'));
				const flat = flattenRelationChain(chain);
				expect(flat.relations).toEqual(['⟺', '⟺']);
			});

			it('should throw for less than 2 operands', () => {
				expect(() => iffChain(variable('P'))).toThrow();
			});
		});
	});
});
