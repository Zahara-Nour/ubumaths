/**
 * Unit tests for MathAST type guards and predicates
 */

import { describe, it, expect } from 'vitest';
import {
	// Individual type guards
	isNumber,
	isVariable,
	isGreek,
	isSymbol,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isPositive,
	isFunction,
	isDelimiter,
	isSubscript,
	isSuperscript,
	isRelation,
	// Utility predicates
	hasChildren,
	isLeaf,
	hasMetadata,
	// Specific predicates
	isFraction,
	isImplicitMultiplication,
	isComparison,
	isEquality,
	isInequality
} from '../guards';
import {
	number,
	variable,
	greek,
	symbol,
	add,
	subtract,
	multiply,
	divide,
	fraction,
	implicitMultiply,
	opposite,
	positive,
	func,
	sin,
	delimiter,
	parentheses,
	subscript,
	superscript,
	relation,
	equals,
	lessThan,
	greaterThan,
	notEquals
} from '../factory';

describe('guards', () => {
	// =============================================================================
	// Individual Type Guards
	// =============================================================================

	describe('isNumber', () => {
		it('returns true for number node', () => {
			const node = number('42');
			expect(isNumber(node)).toBe(true);
		});

		it('returns false for non-number nodes', () => {
			expect(isNumber(variable('x'))).toBe(false);
			expect(isNumber(add(number('1'), number('2')))).toBe(false);
		});
	});

	describe('isVariable', () => {
		it('returns true for variable node', () => {
			const node = variable('x');
			expect(isVariable(node)).toBe(true);
		});

		it('returns false for non-variable nodes', () => {
			expect(isVariable(number('42'))).toBe(false);
			expect(isVariable(greek('alpha'))).toBe(false);
		});
	});

	describe('isGreek', () => {
		it('returns true for greek letter node', () => {
			const node = greek('alpha');
			expect(isGreek(node)).toBe(true);
		});

		it('returns false for non-greek nodes', () => {
			expect(isGreek(variable('x'))).toBe(false);
			expect(isGreek(symbol('infinity'))).toBe(false);
		});
	});

	describe('isSymbol', () => {
		it('returns true for symbol node', () => {
			const node = symbol('infinity');
			expect(isSymbol(node)).toBe(true);
		});

		it('returns false for non-symbol nodes', () => {
			expect(isSymbol(variable('x'))).toBe(false);
			expect(isSymbol(greek('pi'))).toBe(false);
		});
	});

	describe('isAddition', () => {
		it('returns true for addition node', () => {
			const node = add(number('2'), number('3'));
			expect(isAddition(node)).toBe(true);
		});

		it('returns false for non-addition nodes', () => {
			expect(isAddition(subtract(number('5'), number('2')))).toBe(false);
			expect(isAddition(number('42'))).toBe(false);
		});
	});

	describe('isSubtraction', () => {
		it('returns true for subtraction node', () => {
			const node = subtract(number('5'), number('2'));
			expect(isSubtraction(node)).toBe(true);
		});

		it('returns false for non-subtraction nodes', () => {
			expect(isSubtraction(add(number('2'), number('3')))).toBe(false);
			expect(isSubtraction(number('42'))).toBe(false);
		});
	});

	describe('isMultiplication', () => {
		it('returns true for multiplication node', () => {
			const node = multiply(number('2'), number('3'), 'dot');
			expect(isMultiplication(node)).toBe(true);
		});

		it('returns false for non-multiplication nodes', () => {
			expect(isMultiplication(add(number('2'), number('3')))).toBe(false);
			expect(isMultiplication(divide(number('6'), number('2'), 'inline'))).toBe(false);
		});
	});

	describe('isDivision', () => {
		it('returns true for division node', () => {
			const node = divide(number('6'), number('2'), 'inline');
			expect(isDivision(node)).toBe(true);
		});

		it('returns false for non-division nodes', () => {
			expect(isDivision(multiply(number('2'), number('3'), 'dot'))).toBe(false);
			expect(isDivision(number('42'))).toBe(false);
		});
	});

	describe('isOpposite', () => {
		it('returns true for opposite node', () => {
			const node = opposite(number('5'));
			expect(isOpposite(node)).toBe(true);
		});

		it('returns false for non-opposite nodes', () => {
			expect(isOpposite(positive(number('5')))).toBe(false);
			expect(isOpposite(number('42'))).toBe(false);
		});
	});

	describe('isPositive', () => {
		it('returns true for positive node', () => {
			const node = positive(number('5'));
			expect(isPositive(node)).toBe(true);
		});

		it('returns false for non-positive nodes', () => {
			expect(isPositive(opposite(number('5')))).toBe(false);
			expect(isPositive(number('42'))).toBe(false);
		});
	});

	describe('isFunction', () => {
		it('returns true for function node', () => {
			const node = sin(variable('x'));
			expect(isFunction(node)).toBe(true);
		});

		it('returns true for custom function', () => {
			const node = func('f', [variable('x')]);
			expect(isFunction(node)).toBe(true);
		});

		it('returns false for non-function nodes', () => {
			expect(isFunction(variable('x'))).toBe(false);
			expect(isFunction(add(number('2'), number('3')))).toBe(false);
		});
	});

	describe('isDelimiter', () => {
		it('returns true for delimiter node', () => {
			const node = parentheses(variable('x'));
			expect(isDelimiter(node)).toBe(true);
		});

		it('returns true for various delimiter types', () => {
			expect(isDelimiter(delimiter('brackets', variable('x')))).toBe(true);
			expect(isDelimiter(delimiter('braces', variable('x')))).toBe(true);
		});

		it('returns false for non-delimiter nodes', () => {
			expect(isDelimiter(variable('x'))).toBe(false);
			expect(isDelimiter(add(number('2'), number('3')))).toBe(false);
		});
	});

	describe('isSubscript', () => {
		it('returns true for subscript node', () => {
			const node = subscript(variable('x'), number('1'));
			expect(isSubscript(node)).toBe(true);
		});

		it('returns false for non-subscript nodes', () => {
			expect(isSubscript(superscript(variable('x'), number('2')))).toBe(false);
			expect(isSubscript(variable('x'))).toBe(false);
		});
	});

	describe('isSuperscript', () => {
		it('returns true for superscript node', () => {
			const node = superscript(variable('x'), number('2'));
			expect(isSuperscript(node)).toBe(true);
		});

		it('returns false for non-superscript nodes', () => {
			expect(isSuperscript(subscript(variable('x'), number('1')))).toBe(false);
			expect(isSuperscript(variable('x'))).toBe(false);
		});
	});

	describe('isRelation', () => {
		it('returns true for relation node', () => {
			const node = equals(variable('x'), number('5'));
			expect(isRelation(node)).toBe(true);
		});

		it('returns true for various relation types', () => {
			expect(isRelation(lessThan(variable('x'), number('5')))).toBe(true);
			expect(isRelation(greaterThan(variable('x'), number('5')))).toBe(true);
			expect(isRelation(notEquals(variable('x'), number('5')))).toBe(true);
		});

		it('returns false for non-relation nodes', () => {
			expect(isRelation(variable('x'))).toBe(false);
			expect(isRelation(add(number('2'), number('3')))).toBe(false);
		});
	});

	// =============================================================================
	// Utility Predicates
	// =============================================================================

	describe('hasChildren', () => {
		it('returns false for number node', () => {
			expect(hasChildren(number('42'))).toBe(false);
		});

		it('returns false for variable node', () => {
			expect(hasChildren(variable('x'))).toBe(false);
		});

		it('returns false for greek letter node', () => {
			expect(hasChildren(greek('alpha'))).toBe(false);
		});

		it('returns false for symbol node', () => {
			expect(hasChildren(symbol('infinity'))).toBe(false);
		});

		it('returns true for addition node', () => {
			expect(hasChildren(add(number('2'), number('3')))).toBe(true);
		});

		it('returns true for subtraction node', () => {
			expect(hasChildren(subtract(number('5'), number('2')))).toBe(true);
		});

		it('returns true for multiplication node', () => {
			expect(hasChildren(multiply(number('2'), number('3'), 'dot'))).toBe(true);
		});

		it('returns true for division node', () => {
			expect(hasChildren(divide(number('6'), number('2'), 'inline'))).toBe(true);
		});

		it('returns true for opposite node', () => {
			expect(hasChildren(opposite(number('5')))).toBe(true);
		});

		it('returns true for positive node', () => {
			expect(hasChildren(positive(number('5')))).toBe(true);
		});

		it('returns true for function node', () => {
			expect(hasChildren(sin(variable('x')))).toBe(true);
		});

		it('returns true for delimiter node', () => {
			expect(hasChildren(parentheses(variable('x')))).toBe(true);
		});

		it('returns true for subscript node', () => {
			expect(hasChildren(subscript(variable('x'), number('1')))).toBe(true);
		});

		it('returns true for superscript node', () => {
			expect(hasChildren(superscript(variable('x'), number('2')))).toBe(true);
		});

		it('returns true for relation node', () => {
			expect(hasChildren(equals(variable('x'), number('5')))).toBe(true);
		});
	});

	describe('isLeaf', () => {
		it('returns true for literal nodes', () => {
			expect(isLeaf(number('42'))).toBe(true);
			expect(isLeaf(variable('x'))).toBe(true);
			expect(isLeaf(greek('alpha'))).toBe(true);
			expect(isLeaf(symbol('infinity'))).toBe(true);
		});

		it('returns false for nodes with children', () => {
			expect(isLeaf(add(number('2'), number('3')))).toBe(false);
			expect(isLeaf(sin(variable('x')))).toBe(false);
			expect(isLeaf(parentheses(variable('x')))).toBe(false);
		});
	});

	describe('hasMetadata', () => {
		it('returns false when no metadata', () => {
			const node = number('42');
			expect(hasMetadata(node)).toBe(false);
		});

		it('returns true when metadata exists', () => {
			const node = number('42', { color: 'red' });
			expect(hasMetadata(node)).toBe(true);
		});

		it('works with various metadata properties', () => {
			expect(hasMetadata(number('42', { color: 'red' }))).toBe(true);
			expect(hasMetadata(variable('x', { style: 'italic' }))).toBe(true);
			expect(hasMetadata(add(number('2'), number('3'), { annotation: 'sum' }))).toBe(true);
		});
	});

	// =============================================================================
	// Specific Predicates
	// =============================================================================

	describe('isFraction', () => {
		it('returns true for division with fraction display style', () => {
			const node = fraction(number('1'), number('2'));
			expect(isFraction(node)).toBe(true);
		});

		it('returns false for division with other display styles', () => {
			expect(isFraction(divide(number('6'), number('2'), 'inline'))).toBe(false);
			expect(isFraction(divide(number('6'), number('2'), 'ratio'))).toBe(false);
		});

		it('returns false for non-division nodes', () => {
			expect(isFraction(number('42'))).toBe(false);
			expect(isFraction(add(number('2'), number('3')))).toBe(false);
		});
	});

	describe('isImplicitMultiplication', () => {
		it('returns true for multiplication with implicit display style', () => {
			const node = implicitMultiply(number('2'), variable('x'));
			expect(isImplicitMultiplication(node)).toBe(true);
		});

		it('returns false for multiplication with other display styles', () => {
			expect(isImplicitMultiplication(multiply(number('2'), number('3'), 'dot'))).toBe(false);
			expect(isImplicitMultiplication(multiply(number('2'), number('3'), 'cross'))).toBe(false);
			expect(isImplicitMultiplication(multiply(number('2'), number('3'), 'star'))).toBe(false);
		});

		it('returns false for non-multiplication nodes', () => {
			expect(isImplicitMultiplication(number('42'))).toBe(false);
			expect(isImplicitMultiplication(add(number('2'), number('3')))).toBe(false);
		});
	});

	describe('isComparison', () => {
		it('returns true for less than relation', () => {
			const node = lessThan(variable('x'), number('5'));
			expect(isComparison(node)).toBe(true);
		});

		it('returns true for greater than relation', () => {
			const node = greaterThan(variable('x'), number('5'));
			expect(isComparison(node)).toBe(true);
		});

		it('returns true for less than or equal relation', () => {
			const node = relation('<=', variable('x'), number('5'));
			expect(isComparison(node)).toBe(true);
		});

		it('returns true for greater than or equal relation', () => {
			const node = relation('>=', variable('x'), number('5'));
			expect(isComparison(node)).toBe(true);
		});

		it('returns false for equality relation', () => {
			const node = equals(variable('x'), number('5'));
			expect(isComparison(node)).toBe(false);
		});

		it('returns false for inequality relation', () => {
			const node = notEquals(variable('x'), number('5'));
			expect(isComparison(node)).toBe(false);
		});

		it('returns false for non-relation nodes', () => {
			expect(isComparison(number('42'))).toBe(false);
			expect(isComparison(add(number('2'), number('3')))).toBe(false);
		});
	});

	describe('isEquality', () => {
		it('returns true for equals relation', () => {
			const node = equals(variable('x'), number('5'));
			expect(isEquality(node)).toBe(true);
		});

		it('returns false for other relations', () => {
			expect(isEquality(lessThan(variable('x'), number('5')))).toBe(false);
			expect(isEquality(greaterThan(variable('x'), number('5')))).toBe(false);
			expect(isEquality(notEquals(variable('x'), number('5')))).toBe(false);
		});

		it('returns false for non-relation nodes', () => {
			expect(isEquality(number('42'))).toBe(false);
			expect(isEquality(variable('x'))).toBe(false);
		});
	});

	describe('isInequality', () => {
		it('returns true for not equals relation', () => {
			const node = notEquals(variable('x'), number('5'));
			expect(isInequality(node)).toBe(true);
		});

		it('returns false for other relations', () => {
			expect(isInequality(equals(variable('x'), number('5')))).toBe(false);
			expect(isInequality(lessThan(variable('x'), number('5')))).toBe(false);
			expect(isInequality(greaterThan(variable('x'), number('5')))).toBe(false);
		});

		it('returns false for non-relation nodes', () => {
			expect(isInequality(number('42'))).toBe(false);
			expect(isInequality(variable('x'))).toBe(false);
		});
	});

	// =============================================================================
	// Edge Cases and Complex Scenarios
	// =============================================================================

	describe('edge cases', () => {
		it('correctly identifies types in nested structures', () => {
			// sin(2x + 3)
			const innerMult = implicitMultiply(number('2'), variable('x'));
			const innerAdd = add(innerMult, number('3'));
			const outer = sin(innerAdd);

			expect(isFunction(outer)).toBe(true);
			expect(isAddition(innerAdd)).toBe(true);
			expect(isImplicitMultiplication(innerMult)).toBe(true);
		});

		it('hasChildren returns true for function with empty args', () => {
			const node = func('f', []);
			expect(hasChildren(node)).toBe(true);
		});

		it('type guards work with metadata', () => {
			const node = number('42', { color: 'red' });
			expect(isNumber(node)).toBe(true);
			expect(hasMetadata(node)).toBe(true);
		});

		it('specific predicates combine type and property checks', () => {
			const frac = fraction(number('1'), number('2'));
			const implicitMult = implicitMultiply(number('2'), variable('x'));

			expect(isDivision(frac) && isFraction(frac)).toBe(true);
			expect(isMultiplication(implicitMult) && isImplicitMultiplication(implicitMult)).toBe(true);
		});

		it('comparison predicate handles all inequality types', () => {
			expect(isComparison(relation('<', variable('x'), number('5')))).toBe(true);
			expect(isComparison(relation('>', variable('x'), number('5')))).toBe(true);
			expect(isComparison(relation('<=', variable('x'), number('5')))).toBe(true);
			expect(isComparison(relation('>=', variable('x'), number('5')))).toBe(true);

			// Special unicode relations should not be comparisons
			expect(isComparison(relation('≈', variable('x'), number('5')))).toBe(false);
			expect(isComparison(relation('≡', variable('x'), number('5')))).toBe(false);
		});
	});
});
