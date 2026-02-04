/**
 * Unit tests for Pattern Matching Constraints
 */

import { describe, it, expect } from 'vitest';
import { checkConstraint, containsVariable, isFreeOfVariables } from '../constraints';
import { P } from '../builder';
import type { PatternConstraint } from '../types';
import { number, variable, add, multiply, divide, opposite, func, greek } from '../../factory';
import {
	intervalSet,
	openInterval,
	closedInterval,
	leftClosedInterval,
	fromNumber
} from '$lib/math/intervals';
import { parsePattern } from '../../parser/custom/pattern-parser';

describe('Constraint Evaluation', () => {
	// ===========================================================================
	// Type Constraint
	// ===========================================================================

	describe('type constraint', () => {
		it('matches single type', () => {
			const constraint = P.isType('number');
			const node = number('42');

			expect(checkConstraint(constraint, node)).toBe(true);
		});

		it('fails for wrong type', () => {
			const constraint = P.isType('number');
			const node = variable('x');

			expect(checkConstraint(constraint, node)).toBe(false);
		});

		it('matches any of multiple types', () => {
			const constraint = P.isType('number', 'variable');
			const numNode = number('5');
			const varNode = variable('x');
			const greekNode = greek('alpha');

			expect(checkConstraint(constraint, numNode)).toBe(true);
			expect(checkConstraint(constraint, varNode)).toBe(true);
			expect(checkConstraint(constraint, greekNode)).toBe(false);
		});

		it('matches all literal types', () => {
			const constraint = P.isType('number', 'variable', 'greek');

			expect(checkConstraint(constraint, number('1'))).toBe(true);
			expect(checkConstraint(constraint, variable('x'))).toBe(true);
			expect(checkConstraint(constraint, greek('alpha'))).toBe(true);
		});
	});

	// ===========================================================================
	// Number Constraint
	// ===========================================================================

	describe('number constraint', () => {
		it('matches number nodes', () => {
			const constraint = P.isNumber();

			expect(checkConstraint(constraint, number('42'))).toBe(true);
			expect(checkConstraint(constraint, number('3.14'))).toBe(true);
			expect(checkConstraint(constraint, number('-5'))).toBe(true);
			expect(checkConstraint(constraint, number('0'))).toBe(true);
		});

		it('fails for non-number nodes', () => {
			const constraint = P.isNumber();

			expect(checkConstraint(constraint, variable('x'))).toBe(false);
			expect(checkConstraint(constraint, greek('alpha'))).toBe(false);
			expect(checkConstraint(constraint, add(number('1'), number('2')))).toBe(false);
		});
	});

	// ===========================================================================
	// Variable Constraint
	// ===========================================================================

	describe('variable constraint', () => {
		it('matches variable nodes', () => {
			const constraint = P.isVariable();

			expect(checkConstraint(constraint, variable('x'))).toBe(true);
			expect(checkConstraint(constraint, variable('velocity'))).toBe(true);
		});

		it('fails for non-variable nodes', () => {
			const constraint = P.isVariable();

			expect(checkConstraint(constraint, number('42'))).toBe(false);
			expect(checkConstraint(constraint, greek('alpha'))).toBe(false);
		});
	});

	// ===========================================================================
	// Positive Constraint
	// ===========================================================================

	describe('positive constraint', () => {
		it('matches positive numbers', () => {
			const constraint = P.isPositive();

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, number('0.001'))).toBe(true);
			expect(checkConstraint(constraint, number('999'))).toBe(true);
		});

		it('fails for zero', () => {
			const constraint = P.isPositive();

			expect(checkConstraint(constraint, number('0'))).toBe(false);
		});

		it('fails for negative numbers', () => {
			const constraint = P.isPositive();

			expect(checkConstraint(constraint, number('-5'))).toBe(false);
			expect(checkConstraint(constraint, number('-0.001'))).toBe(false);
		});

		it('fails for non-number nodes', () => {
			const constraint = P.isPositive();

			expect(checkConstraint(constraint, variable('x'))).toBe(false);
		});
	});

	// ===========================================================================
	// Negative Constraint
	// ===========================================================================

	describe('negative constraint', () => {
		it('matches negative numbers', () => {
			const constraint = P.isNegative();

			expect(checkConstraint(constraint, number('-5'))).toBe(true);
			expect(checkConstraint(constraint, number('-0.001'))).toBe(true);
			expect(checkConstraint(constraint, number('-999'))).toBe(true);
		});

		it('fails for zero', () => {
			const constraint = P.isNegative();

			expect(checkConstraint(constraint, number('0'))).toBe(false);
		});

		it('fails for positive numbers', () => {
			const constraint = P.isNegative();

			expect(checkConstraint(constraint, number('5'))).toBe(false);
			expect(checkConstraint(constraint, number('0.001'))).toBe(false);
		});

		it('fails for non-number nodes', () => {
			const constraint = P.isNegative();

			expect(checkConstraint(constraint, variable('x'))).toBe(false);
		});
	});

	// ===========================================================================
	// Nonzero Constraint
	// ===========================================================================

	describe('nonzero constraint', () => {
		it('matches positive numbers', () => {
			const constraint = P.isNonzero();

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, number('0.001'))).toBe(true);
		});

		it('matches negative numbers', () => {
			const constraint = P.isNonzero();

			expect(checkConstraint(constraint, number('-5'))).toBe(true);
			expect(checkConstraint(constraint, number('-0.001'))).toBe(true);
		});

		it('fails for zero', () => {
			const constraint = P.isNonzero();

			expect(checkConstraint(constraint, number('0'))).toBe(false);
		});

		it('fails for non-number nodes', () => {
			const constraint = P.isNonzero();

			expect(checkConstraint(constraint, variable('x'))).toBe(false);
		});
	});

	// ===========================================================================
	// Nonone Constraint
	// ===========================================================================

	describe('nonone constraint', () => {
		it('matches numbers different from 1', () => {
			const constraint = P.isNonone();

			expect(checkConstraint(constraint, number('0'))).toBe(true);
			expect(checkConstraint(constraint, number('2'))).toBe(true);
			expect(checkConstraint(constraint, number('-1'))).toBe(true);
			expect(checkConstraint(constraint, number('0.5'))).toBe(true);
		});

		it('fails for 1', () => {
			const constraint = P.isNonone();

			expect(checkConstraint(constraint, number('1'))).toBe(false);
			expect(checkConstraint(constraint, number('1.0'))).toBe(false);
		});

		it('fails for non-number nodes', () => {
			const constraint = P.isNonone();

			expect(checkConstraint(constraint, variable('x'))).toBe(false);
		});
	});

	// ===========================================================================
	// Comparison Constraints
	// ===========================================================================

	describe('comparison constraints', () => {
		describe('gt (greater than)', () => {
			it('matches values greater than threshold', () => {
				expect(checkConstraint(P.gt(5), number('6'))).toBe(true);
				expect(checkConstraint(P.gt(5), number('10'))).toBe(true);
				expect(checkConstraint(P.gt(0), number('0.001'))).toBe(true);
			});

			it('fails for values equal or less than threshold', () => {
				expect(checkConstraint(P.gt(5), number('5'))).toBe(false);
				expect(checkConstraint(P.gt(5), number('4'))).toBe(false);
				expect(checkConstraint(P.gt(5), number('-1'))).toBe(false);
			});

			it('fails for non-number nodes', () => {
				expect(checkConstraint(P.gt(5), variable('x'))).toBe(false);
			});
		});

		describe('lt (less than)', () => {
			it('matches values less than threshold', () => {
				expect(checkConstraint(P.lt(10), number('9'))).toBe(true);
				expect(checkConstraint(P.lt(10), number('-5'))).toBe(true);
				expect(checkConstraint(P.lt(0), number('-0.001'))).toBe(true);
			});

			it('fails for values equal or greater than threshold', () => {
				expect(checkConstraint(P.lt(10), number('10'))).toBe(false);
				expect(checkConstraint(P.lt(10), number('11'))).toBe(false);
			});

			it('fails for non-number nodes', () => {
				expect(checkConstraint(P.lt(10), variable('x'))).toBe(false);
			});
		});

		describe('gte (greater or equal)', () => {
			it('matches values greater than or equal to threshold', () => {
				expect(checkConstraint(P.gte(5), number('5'))).toBe(true);
				expect(checkConstraint(P.gte(5), number('6'))).toBe(true);
				expect(checkConstraint(P.gte(0), number('0'))).toBe(true);
			});

			it('fails for values less than threshold', () => {
				expect(checkConstraint(P.gte(5), number('4'))).toBe(false);
				expect(checkConstraint(P.gte(5), number('-1'))).toBe(false);
			});
		});

		describe('lte (less or equal)', () => {
			it('matches values less than or equal to threshold', () => {
				expect(checkConstraint(P.lte(10), number('10'))).toBe(true);
				expect(checkConstraint(P.lte(10), number('9'))).toBe(true);
				expect(checkConstraint(P.lte(0), number('0'))).toBe(true);
			});

			it('fails for values greater than threshold', () => {
				expect(checkConstraint(P.lte(10), number('11'))).toBe(false);
				expect(checkConstraint(P.lte(10), number('100'))).toBe(false);
			});
		});

		describe('eq (equal to)', () => {
			it('matches values equal to threshold', () => {
				expect(checkConstraint(P.eq(5), number('5'))).toBe(true);
				expect(checkConstraint(P.eq(0), number('0'))).toBe(true);
				expect(checkConstraint(P.eq(-3), number('-3'))).toBe(true);
			});

			it('fails for values not equal to threshold', () => {
				expect(checkConstraint(P.eq(5), number('4'))).toBe(false);
				expect(checkConstraint(P.eq(5), number('6'))).toBe(false);
			});
		});

		describe('ne (not equal)', () => {
			it('matches values not equal to threshold', () => {
				expect(checkConstraint(P.ne(0), number('1'))).toBe(true);
				expect(checkConstraint(P.ne(0), number('-1'))).toBe(true);
				expect(checkConstraint(P.ne(1), number('0'))).toBe(true);
			});

			it('fails for values equal to threshold', () => {
				expect(checkConstraint(P.ne(0), number('0'))).toBe(false);
				expect(checkConstraint(P.ne(5), number('5'))).toBe(false);
			});
		});
	});

	// ===========================================================================
	// Interval Constraints
	// ===========================================================================

	describe('interval constraints', () => {
		describe('inPositiveReals - x > 0', () => {
			it('matches positive numbers', () => {
				expect(checkConstraint(P.inPositiveReals(), number('5'))).toBe(true);
				expect(checkConstraint(P.inPositiveReals(), number('0.001'))).toBe(true);
				expect(checkConstraint(P.inPositiveReals(), number('1000'))).toBe(true);
			});

			it('fails for zero', () => {
				expect(checkConstraint(P.inPositiveReals(), number('0'))).toBe(false);
			});

			it('fails for negative numbers', () => {
				expect(checkConstraint(P.inPositiveReals(), number('-5'))).toBe(false);
				expect(checkConstraint(P.inPositiveReals(), number('-0.001'))).toBe(false);
			});

			it('fails for non-number nodes', () => {
				expect(checkConstraint(P.inPositiveReals(), variable('x'))).toBe(false);
			});
		});

		describe('inNonNegativeReals - x >= 0', () => {
			it('matches positive numbers', () => {
				expect(checkConstraint(P.inNonNegativeReals(), number('5'))).toBe(true);
				expect(checkConstraint(P.inNonNegativeReals(), number('0.001'))).toBe(true);
			});

			it('matches zero', () => {
				expect(checkConstraint(P.inNonNegativeReals(), number('0'))).toBe(true);
			});

			it('fails for negative numbers', () => {
				expect(checkConstraint(P.inNonNegativeReals(), number('-5'))).toBe(false);
				expect(checkConstraint(P.inNonNegativeReals(), number('-0.001'))).toBe(false);
			});
		});

		describe('inUnitInterval - -1 <= x <= 1', () => {
			it('matches values in [-1, 1]', () => {
				expect(checkConstraint(P.inUnitInterval(), number('0'))).toBe(true);
				expect(checkConstraint(P.inUnitInterval(), number('0.5'))).toBe(true);
				expect(checkConstraint(P.inUnitInterval(), number('-0.5'))).toBe(true);
				expect(checkConstraint(P.inUnitInterval(), number('1'))).toBe(true);
				expect(checkConstraint(P.inUnitInterval(), number('-1'))).toBe(true);
			});

			it('fails for values outside [-1, 1]', () => {
				expect(checkConstraint(P.inUnitInterval(), number('1.01'))).toBe(false);
				expect(checkConstraint(P.inUnitInterval(), number('-1.01'))).toBe(false);
				expect(checkConstraint(P.inUnitInterval(), number('5'))).toBe(false);
			});
		});

		describe('mathematical domain shortcuts', () => {
			describe('inR - all reals', () => {
				it('matches any finite number', () => {
					expect(checkConstraint(P.inR(), number('5'))).toBe(true);
					expect(checkConstraint(P.inR(), number('-100'))).toBe(true);
					expect(checkConstraint(P.inR(), number('0'))).toBe(true);
					expect(checkConstraint(P.inR(), number('3.14'))).toBe(true);
				});

				it('fails for non-number nodes', () => {
					expect(checkConstraint(P.inR(), variable('x'))).toBe(false);
				});
			});

			describe('inRplus - non-negative reals (x >= 0)', () => {
				it('matches non-negative numbers', () => {
					expect(checkConstraint(P.inRplus(), number('0'))).toBe(true);
					expect(checkConstraint(P.inRplus(), number('5'))).toBe(true);
					expect(checkConstraint(P.inRplus(), number('0.001'))).toBe(true);
				});

				it('fails for negative numbers', () => {
					expect(checkConstraint(P.inRplus(), number('-1'))).toBe(false);
					expect(checkConstraint(P.inRplus(), number('-0.001'))).toBe(false);
				});
			});

			describe('inRplusStar - positive reals (x > 0)', () => {
				it('matches positive numbers', () => {
					expect(checkConstraint(P.inRplusStar(), number('5'))).toBe(true);
					expect(checkConstraint(P.inRplusStar(), number('0.001'))).toBe(true);
				});

				it('fails for zero and negative numbers', () => {
					expect(checkConstraint(P.inRplusStar(), number('0'))).toBe(false);
					expect(checkConstraint(P.inRplusStar(), number('-1'))).toBe(false);
				});
			});

			describe('inRstar - non-zero reals (x != 0)', () => {
				it('matches non-zero numbers', () => {
					expect(checkConstraint(P.inRstar(), number('5'))).toBe(true);
					expect(checkConstraint(P.inRstar(), number('-5'))).toBe(true);
					expect(checkConstraint(P.inRstar(), number('0.001'))).toBe(true);
				});

				it('fails for zero', () => {
					expect(checkConstraint(P.inRstar(), number('0'))).toBe(false);
				});
			});

			describe('inRminus - non-positive reals (x <= 0)', () => {
				it('matches non-positive numbers', () => {
					expect(checkConstraint(P.inRminus(), number('0'))).toBe(true);
					expect(checkConstraint(P.inRminus(), number('-5'))).toBe(true);
					expect(checkConstraint(P.inRminus(), number('-0.001'))).toBe(true);
				});

				it('fails for positive numbers', () => {
					expect(checkConstraint(P.inRminus(), number('1'))).toBe(false);
					expect(checkConstraint(P.inRminus(), number('0.001'))).toBe(false);
				});
			});

			describe('inRminusStar - negative reals (x < 0)', () => {
				it('matches negative numbers', () => {
					expect(checkConstraint(P.inRminusStar(), number('-5'))).toBe(true);
					expect(checkConstraint(P.inRminusStar(), number('-0.001'))).toBe(true);
				});

				it('fails for zero and positive numbers', () => {
					expect(checkConstraint(P.inRminusStar(), number('0'))).toBe(false);
					expect(checkConstraint(P.inRminusStar(), number('1'))).toBe(false);
				});
			});

			describe('inN - natural numbers (integers >= 0)', () => {
				it('matches natural numbers', () => {
					expect(checkConstraint(P.inN(), number('0'))).toBe(true);
					expect(checkConstraint(P.inN(), number('1'))).toBe(true);
					expect(checkConstraint(P.inN(), number('100'))).toBe(true);
				});

				it('fails for negative integers', () => {
					expect(checkConstraint(P.inN(), number('-1'))).toBe(false);
					expect(checkConstraint(P.inN(), number('-100'))).toBe(false);
				});

				it('fails for non-integers', () => {
					expect(checkConstraint(P.inN(), number('3.14'))).toBe(false);
					expect(checkConstraint(P.inN(), number('0.5'))).toBe(false);
				});
			});

			describe('inNstar - positive integers (integers > 0)', () => {
				it('matches positive integers', () => {
					expect(checkConstraint(P.inNstar(), number('1'))).toBe(true);
					expect(checkConstraint(P.inNstar(), number('100'))).toBe(true);
				});

				it('fails for zero', () => {
					expect(checkConstraint(P.inNstar(), number('0'))).toBe(false);
				});

				it('fails for negative integers', () => {
					expect(checkConstraint(P.inNstar(), number('-1'))).toBe(false);
				});

				it('fails for non-integers', () => {
					expect(checkConstraint(P.inNstar(), number('3.14'))).toBe(false);
				});
			});

			describe('inZ - all integers', () => {
				it('matches any integer', () => {
					expect(checkConstraint(P.inZ(), number('0'))).toBe(true);
					expect(checkConstraint(P.inZ(), number('5'))).toBe(true);
					expect(checkConstraint(P.inZ(), number('-5'))).toBe(true);
				});

				it('fails for non-integers', () => {
					expect(checkConstraint(P.inZ(), number('3.14'))).toBe(false);
					expect(checkConstraint(P.inZ(), number('0.5'))).toBe(false);
				});
			});

			describe('inZstar - non-zero integers', () => {
				it('matches non-zero integers', () => {
					expect(checkConstraint(P.inZstar(), number('1'))).toBe(true);
					expect(checkConstraint(P.inZstar(), number('-1'))).toBe(true);
					expect(checkConstraint(P.inZstar(), number('100'))).toBe(true);
				});

				it('fails for zero', () => {
					expect(checkConstraint(P.inZstar(), number('0'))).toBe(false);
				});

				it('fails for non-integers', () => {
					expect(checkConstraint(P.inZstar(), number('3.14'))).toBe(false);
				});
			});
		});

		describe('inInterval - custom interval', () => {
			it('matches values in custom open interval ]0, 10[', () => {
				const customInterval = P.inInterval(
					intervalSet([openInterval(fromNumber(0), fromNumber(10))])
				);

				expect(checkConstraint(customInterval, number('5'))).toBe(true);
				expect(checkConstraint(customInterval, number('0.001'))).toBe(true);
				expect(checkConstraint(customInterval, number('9.999'))).toBe(true);
			});

			it('fails for endpoints on open interval ]0, 10[', () => {
				const customInterval = P.inInterval(
					intervalSet([openInterval(fromNumber(0), fromNumber(10))])
				);

				expect(checkConstraint(customInterval, number('0'))).toBe(false);
				expect(checkConstraint(customInterval, number('10'))).toBe(false);
			});

			it('matches endpoints on closed interval [0, 10]', () => {
				const customInterval = P.inInterval(
					intervalSet([closedInterval(fromNumber(0), fromNumber(10))])
				);

				expect(checkConstraint(customInterval, number('0'))).toBe(true);
				expect(checkConstraint(customInterval, number('10'))).toBe(true);
				expect(checkConstraint(customInterval, number('5'))).toBe(true);
			});

			it('matches left-closed right-open interval [0, 10[', () => {
				const customInterval = P.inInterval(
					intervalSet([leftClosedInterval(fromNumber(0), fromNumber(10))])
				);

				expect(checkConstraint(customInterval, number('0'))).toBe(true);
				expect(checkConstraint(customInterval, number('10'))).toBe(false);
				expect(checkConstraint(customInterval, number('5'))).toBe(true);
			});
		});

		describe('symbolic bounds (parsed from pattern strings)', () => {
			// Note: Use \pi for π (not just 'pi' which parses as p*i)
			// Use e for Euler's number (recognized as reserved constant)

			it('matches interval with \\pi bound: in]0,\\pi]', () => {
				const pattern = parsePattern('n:in]0,\\pi]') as {
					type: 'wildcard';
					constraint?: unknown;
				};
				expect(pattern.type).toBe('wildcard');
				expect(pattern.constraint).toBeDefined();

				const constraint = pattern.constraint as PatternConstraint;
				// pi ≈ 3.14159...
				expect(checkConstraint(constraint, number('1'))).toBe(true);
				expect(checkConstraint(constraint, number('3'))).toBe(true);
				expect(checkConstraint(constraint, number('3.14159'))).toBe(true);
				expect(checkConstraint(constraint, number('0'))).toBe(false); // open at 0
				expect(checkConstraint(constraint, number('4'))).toBe(false); // > pi
			});

			it('matches interval with 2*\\pi bound: in]0,2*\\pi[', () => {
				const pattern = parsePattern('n:in]0,2*\\pi[') as {
					type: 'wildcard';
					constraint?: unknown;
				};
				const constraint = pattern.constraint as PatternConstraint;
				// 2*pi ≈ 6.28318...
				expect(checkConstraint(constraint, number('3'))).toBe(true);
				expect(checkConstraint(constraint, number('6'))).toBe(true);
				expect(checkConstraint(constraint, number('6.28'))).toBe(true);
				expect(checkConstraint(constraint, number('0'))).toBe(false);
				expect(checkConstraint(constraint, number('7'))).toBe(false);
			});

			it('matches interval with sqrt(2) bound: in[1,sqrt(2)]', () => {
				const pattern = parsePattern('n:in[1,sqrt(2)]') as {
					type: 'wildcard';
					constraint?: unknown;
				};
				const constraint = pattern.constraint as PatternConstraint;
				// sqrt(2) ≈ 1.41421...
				expect(checkConstraint(constraint, number('1'))).toBe(true);
				expect(checkConstraint(constraint, number('1.2'))).toBe(true);
				expect(checkConstraint(constraint, number('1.41'))).toBe(true);
				expect(checkConstraint(constraint, number('1.42'))).toBe(false); // > sqrt(2)
				expect(checkConstraint(constraint, number('0.9'))).toBe(false);
			});

			it('matches interval with fraction bounds: in[-1/2,1/2]', () => {
				const pattern = parsePattern('n:in[-1/2,1/2]') as {
					type: 'wildcard';
					constraint?: unknown;
				};
				const constraint = pattern.constraint as PatternConstraint;
				expect(checkConstraint(constraint, number('0'))).toBe(true);
				expect(checkConstraint(constraint, number('0.25'))).toBe(true);
				expect(checkConstraint(constraint, number('-0.25'))).toBe(true);
				expect(checkConstraint(constraint, number('0.5'))).toBe(true);
				expect(checkConstraint(constraint, number('-0.5'))).toBe(true);
				expect(checkConstraint(constraint, number('0.6'))).toBe(false);
				expect(checkConstraint(constraint, number('-0.6'))).toBe(false);
			});

			it('matches interval with complex expression: in[(1+sqrt(5))/2,2]', () => {
				const pattern = parsePattern('n:in[(1+sqrt(5))/2,2]') as {
					type: 'wildcard';
					constraint?: unknown;
				};
				const constraint = pattern.constraint as PatternConstraint;
				// Golden ratio φ ≈ 1.6180339887...
				// Note: 1.618 < φ, so it's NOT in the interval [φ, 2]
				expect(checkConstraint(constraint, number('1.6181'))).toBe(true); // > φ
				expect(checkConstraint(constraint, number('1.7'))).toBe(true);
				expect(checkConstraint(constraint, number('2'))).toBe(true);
				expect(checkConstraint(constraint, number('1.618'))).toBe(false); // < φ (barely)
				expect(checkConstraint(constraint, number('1.5'))).toBe(false); // < φ
				expect(checkConstraint(constraint, number('2.1'))).toBe(false);
			});

			it('matches interval with e bound: in]0,e[', () => {
				const pattern = parsePattern('n:in]0,e[') as { type: 'wildcard'; constraint?: unknown };
				const constraint = pattern.constraint as PatternConstraint;
				// e ≈ 2.71828...
				expect(checkConstraint(constraint, number('1'))).toBe(true);
				expect(checkConstraint(constraint, number('2'))).toBe(true);
				expect(checkConstraint(constraint, number('2.7'))).toBe(true);
				expect(checkConstraint(constraint, number('0'))).toBe(false);
				expect(checkConstraint(constraint, number('3'))).toBe(false);
			});
		});
	});

	// ===========================================================================
	// Integer Constraint
	// ===========================================================================

	describe('integer constraint', () => {
		it('matches integer numbers', () => {
			const constraint = P.isInteger();

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, number('-42'))).toBe(true);
			expect(checkConstraint(constraint, number('0'))).toBe(true);
			expect(checkConstraint(constraint, number('1000000'))).toBe(true);
		});

		it('fails for decimal numbers', () => {
			const constraint = P.isInteger();

			expect(checkConstraint(constraint, number('3.14'))).toBe(false);
			expect(checkConstraint(constraint, number('0.5'))).toBe(false);
			expect(checkConstraint(constraint, number('-2.7'))).toBe(false);
		});

		it('fails for non-number nodes', () => {
			const constraint = P.isInteger();

			expect(checkConstraint(constraint, variable('n'))).toBe(false);
		});
	});

	// ===========================================================================
	// FreeOf Constraint
	// ===========================================================================

	describe('freeOf constraint', () => {
		it('matches when variable is not present', () => {
			const constraint = P.isFreeOf('x');
			const node = number('42');

			expect(checkConstraint(constraint, node)).toBe(true);
		});

		it('matches when variable is not present in expression', () => {
			const constraint = P.isFreeOf('x');
			const node = add(variable('y'), number('5'));

			expect(checkConstraint(constraint, node)).toBe(true);
		});

		it('fails when variable is present', () => {
			const constraint = P.isFreeOf('x');
			const node = variable('x');

			expect(checkConstraint(constraint, node)).toBe(false);
		});

		it('fails when variable is present in nested expression', () => {
			const constraint = P.isFreeOf('x');
			const node = add(variable('y'), multiply(number('2'), variable('x'), 'dot'));

			expect(checkConstraint(constraint, node)).toBe(false);
		});

		it('handles multiple variables', () => {
			const constraint = P.isFreeOf('x', 'y');
			const nodeWithX = add(variable('x'), number('1'));
			const nodeWithY = add(variable('y'), number('1'));
			const nodeWithZ = add(variable('z'), number('1'));

			expect(checkConstraint(constraint, nodeWithX)).toBe(false);
			expect(checkConstraint(constraint, nodeWithY)).toBe(false);
			expect(checkConstraint(constraint, nodeWithZ)).toBe(true);
		});

		it('checks deeply nested structures', () => {
			const constraint = P.isFreeOf('x');
			const deepNode = divide(
				add(variable('y'), number('1')),
				multiply(number('2'), add(variable('z'), variable('x')), 'dot'),
				'fraction'
			);

			expect(checkConstraint(constraint, deepNode)).toBe(false);
		});

		it('checks function arguments', () => {
			const constraint = P.isFreeOf('x');
			const funcNode = func('sin', [variable('x')]);

			expect(checkConstraint(constraint, funcNode)).toBe(false);
		});

		it('matches when empty variable list', () => {
			const constraint = P.isFreeOf();
			const node = add(variable('x'), variable('y'));

			// Empty variable list means nothing to check for - always true
			expect(checkConstraint(constraint, node)).toBe(true);
		});
	});

	// ===========================================================================
	// And Constraint
	// ===========================================================================

	describe('and constraint', () => {
		it('passes when all constraints pass', () => {
			const constraint = P.and(P.isNumber(), P.isPositive());

			expect(checkConstraint(constraint, number('5'))).toBe(true);
		});

		it('fails when any constraint fails', () => {
			const constraint = P.and(P.isNumber(), P.isPositive());

			expect(checkConstraint(constraint, number('-5'))).toBe(false);
			expect(checkConstraint(constraint, variable('x'))).toBe(false);
		});

		it('handles multiple constraints', () => {
			const constraint = P.and(P.isNumber(), P.isInteger(), P.isPositive());

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, number('5.5'))).toBe(false);
			expect(checkConstraint(constraint, number('-5'))).toBe(false);
		});

		it('handles empty and constraint', () => {
			const constraint = P.and();

			// Empty AND should be true (vacuously true)
			expect(checkConstraint(constraint, number('5'))).toBe(true);
		});

		it('handles single constraint', () => {
			const constraint = P.and(P.isNumber());

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, variable('x'))).toBe(false);
		});
	});

	// ===========================================================================
	// Or Constraint
	// ===========================================================================

	describe('or constraint', () => {
		it('passes when any constraint passes', () => {
			const constraint = P.or(P.isNumber(), P.isVariable());

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, variable('x'))).toBe(true);
		});

		it('fails when all constraints fail', () => {
			const constraint = P.or(P.isNumber(), P.isVariable());

			expect(checkConstraint(constraint, greek('alpha'))).toBe(false);
		});

		it('handles multiple constraints', () => {
			const constraint = P.or(P.isNumber(), P.isVariable(), P.isType('greek'));

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, variable('x'))).toBe(true);
			expect(checkConstraint(constraint, greek('alpha'))).toBe(true);
		});

		it('handles empty or constraint', () => {
			const constraint = P.or();

			// Empty OR should be false (no options to match)
			expect(checkConstraint(constraint, number('5'))).toBe(false);
		});

		it('handles single constraint', () => {
			const constraint = P.or(P.isNumber());

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, variable('x'))).toBe(false);
		});
	});

	// ===========================================================================
	// Not Constraint
	// ===========================================================================

	describe('not constraint', () => {
		it('inverts constraint result', () => {
			const constraint = P.not(P.isNumber());

			expect(checkConstraint(constraint, number('5'))).toBe(false);
			expect(checkConstraint(constraint, variable('x'))).toBe(true);
		});

		it('double negation returns to original', () => {
			const constraint = P.not(P.not(P.isNumber()));

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, variable('x'))).toBe(false);
		});

		it('works with complex constraints', () => {
			const constraint = P.not(P.and(P.isNumber(), P.isPositive()));

			// Not (number AND positive) = not number OR not positive
			expect(checkConstraint(constraint, number('5'))).toBe(false);
			expect(checkConstraint(constraint, number('-5'))).toBe(true);
			expect(checkConstraint(constraint, variable('x'))).toBe(true);
		});
	});

	// ===========================================================================
	// Custom Constraint
	// ===========================================================================

	describe('custom constraint', () => {
		it('calls predicate function', () => {
			const constraint = P.custom((node) => node.type === 'number');

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, variable('x'))).toBe(false);
		});

		it('works with complex predicates', () => {
			const constraint = P.custom((node) => {
				if (node.type !== 'number') return false;
				const value = parseFloat(node.value);
				return value > 0 && value < 100;
			});

			expect(checkConstraint(constraint, number('50'))).toBe(true);
			expect(checkConstraint(constraint, number('150'))).toBe(false);
			expect(checkConstraint(constraint, number('-5'))).toBe(false);
		});

		it('can access node properties', () => {
			const constraint = P.custom((node) => {
				if (node.type !== 'variable') return false;
				return node.name.length === 1;
			});

			expect(checkConstraint(constraint, variable('x'))).toBe(true);
			expect(checkConstraint(constraint, variable('velocity'))).toBe(false);
		});
	});

	// ===========================================================================
	// Constraint Composition
	// ===========================================================================

	describe('constraint composition', () => {
		it('positive integer constraint', () => {
			const constraint = P.and(P.isInteger(), P.isPositive());

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, number('-5'))).toBe(false);
			expect(checkConstraint(constraint, number('5.5'))).toBe(false);
			expect(checkConstraint(constraint, number('0'))).toBe(false);
		});

		it('nonzero free of x constraint', () => {
			const constraint = P.and(P.isNonzero(), P.isFreeOf('x'));

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, number('0'))).toBe(false);
			expect(checkConstraint(constraint, variable('x'))).toBe(false);
			expect(checkConstraint(constraint, variable('y'))).toBe(false); // Not a number
		});

		it('number or variable, not negative', () => {
			const constraint = P.and(P.or(P.isNumber(), P.isVariable()), P.not(P.isNegative()));

			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, number('0'))).toBe(true);
			expect(checkConstraint(constraint, number('-5'))).toBe(false);
			expect(checkConstraint(constraint, variable('x'))).toBe(true);
		});

		it('deeply nested constraints', () => {
			const constraint = P.and(P.not(P.or(P.isNegative(), P.not(P.isNumber()))), P.isInteger());

			// This is equivalent to: isNumber AND not isNegative AND isInteger
			// = positive or zero integer
			expect(checkConstraint(constraint, number('5'))).toBe(true);
			expect(checkConstraint(constraint, number('0'))).toBe(true);
			expect(checkConstraint(constraint, number('-5'))).toBe(false);
			expect(checkConstraint(constraint, number('5.5'))).toBe(false);
		});
	});

	// ===========================================================================
	// Edge Cases
	// ===========================================================================

	describe('edge cases', () => {
		it('handles special number values', () => {
			// Note: parseFloat handles these as Infinity/-Infinity which are not finite
			const infConstraint = P.isNumber();
			expect(checkConstraint(infConstraint, number('Infinity'))).toBe(true);

			// But positive/nonzero constraints check parseFloat result
			const posConstraint = P.isPositive();
			// Infinity is positive but not finite - our impl returns false
			expect(checkConstraint(posConstraint, number('Infinity'))).toBe(false);
		});

		it('handles NaN', () => {
			const constraint = P.isNonzero();
			// NaN is not a valid finite number
			expect(checkConstraint(constraint, number('NaN'))).toBe(false);
		});

		it('handles very large numbers', () => {
			const constraint = P.isPositive();
			expect(checkConstraint(constraint, number('1e308'))).toBe(true);
		});

		it('handles very small numbers', () => {
			const constraint = P.isPositive();
			expect(checkConstraint(constraint, number('1e-308'))).toBe(true);
		});
	});
});

// ===========================================================================
// Helper Function Tests
// ===========================================================================

describe('containsVariable', () => {
	it('finds variable in simple expression', () => {
		expect(containsVariable(variable('x'), 'x')).toBe(true);
		expect(containsVariable(variable('x'), 'y')).toBe(false);
	});

	it('finds variable in addition', () => {
		const node = add(variable('x'), number('1'));
		expect(containsVariable(node, 'x')).toBe(true);
		expect(containsVariable(node, 'y')).toBe(false);
	});

	it('finds variable in nested multiplication', () => {
		const node = multiply(variable('x'), multiply(variable('y'), number('2'), 'dot'), 'dot');
		expect(containsVariable(node, 'x')).toBe(true);
		expect(containsVariable(node, 'y')).toBe(true);
		expect(containsVariable(node, 'z')).toBe(false);
	});

	it('finds variable in division', () => {
		const node = divide(variable('x'), variable('y'), 'fraction');
		expect(containsVariable(node, 'x')).toBe(true);
		expect(containsVariable(node, 'y')).toBe(true);
	});

	it('finds variable in function arguments', () => {
		const node = func('sin', [variable('x')]);
		expect(containsVariable(node, 'x')).toBe(true);
		expect(containsVariable(node, 'y')).toBe(false);
	});

	it('finds variable in opposite', () => {
		const node = opposite(variable('x'));
		expect(containsVariable(node, 'x')).toBe(true);
	});

	it('does not find variable in number', () => {
		expect(containsVariable(number('42'), 'x')).toBe(false);
	});

	it('does not find variable in greek letter', () => {
		expect(containsVariable(greek('alpha'), 'alpha')).toBe(false);
	});
});

describe('isFreeOfVariables', () => {
	it('returns true for number', () => {
		expect(isFreeOfVariables(number('42'), ['x', 'y'])).toBe(true);
	});

	it('returns true when variable not in list', () => {
		expect(isFreeOfVariables(variable('z'), ['x', 'y'])).toBe(true);
	});

	it('returns false when variable in list', () => {
		expect(isFreeOfVariables(variable('x'), ['x', 'y'])).toBe(false);
	});

	it('checks all variables in expression', () => {
		const node = add(variable('x'), variable('y'));
		expect(isFreeOfVariables(node, ['x'])).toBe(false);
		expect(isFreeOfVariables(node, ['y'])).toBe(false);
		expect(isFreeOfVariables(node, ['z'])).toBe(true);
	});

	it('returns true for empty variable list', () => {
		expect(isFreeOfVariables(variable('x'), [])).toBe(true);
	});
});
