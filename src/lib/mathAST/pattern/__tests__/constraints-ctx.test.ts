/**
 * Tests for constraint checking with TypeContext
 *
 * Verifies that P.isPositive(), P.isNegative(), P.isNonzero(), P.isInteger()
 * can match symbolic variables when assumptions are provided via TypeContext.
 */

import { describe, it, expect } from 'vitest';
import { P } from '../builder';
import { match } from '../match';
import { checkConstraint } from '../constraints';
import { applyRule, createRule } from '../rule';
import { variable, number, abs } from '../../factory';
import type { TypeContext } from '../../numtype/types';
import { EMPTY_BINDINGS } from '../types';

// =============================================================================
// Helpers
// =============================================================================

function ctxPositive(varName: string): TypeContext {
	return { assumptions: new Map([[varName, { sign: 'positive' }]]) };
}

function ctxNegative(varName: string): TypeContext {
	return { assumptions: new Map([[varName, { sign: 'negative' }]]) };
}

function ctxNonzero(varName: string): TypeContext {
	return { assumptions: new Map([[varName, { sign: 'nonzero' }]]) };
}

function ctxInteger(varName: string): TypeContext {
	return { variables: new Map([[varName, 'integer']]) };
}

// =============================================================================
// Tests
// =============================================================================

describe('checkConstraint with TypeContext', () => {
	describe('positive constraint', () => {
		it('should match a positive number without ctx', () => {
			expect(checkConstraint({ kind: 'positive' }, number('5'))).toBe(true);
		});

		it('should not match a variable without ctx', () => {
			expect(checkConstraint({ kind: 'positive' }, variable('x'))).toBe(false);
		});

		it('should match a variable declared positive via ctx', () => {
			expect(checkConstraint({ kind: 'positive' }, variable('x'), ctxPositive('x'))).toBe(true);
		});

		it('should not match a variable declared negative via ctx', () => {
			expect(checkConstraint({ kind: 'positive' }, variable('x'), ctxNegative('x'))).toBe(false);
		});
	});

	describe('negative constraint', () => {
		it('should match a variable declared negative via ctx', () => {
			expect(checkConstraint({ kind: 'negative' }, variable('x'), ctxNegative('x'))).toBe(true);
		});

		it('should not match a variable declared positive via ctx', () => {
			expect(checkConstraint({ kind: 'negative' }, variable('x'), ctxPositive('x'))).toBe(false);
		});
	});

	describe('nonzero constraint', () => {
		it('should match a variable declared nonzero via ctx', () => {
			expect(checkConstraint({ kind: 'nonzero' }, variable('x'), ctxNonzero('x'))).toBe(true);
		});

		it('should match a variable declared positive via ctx (positive implies nonzero)', () => {
			expect(checkConstraint({ kind: 'nonzero' }, variable('x'), ctxPositive('x'))).toBe(true);
		});
	});

	describe('integer constraint', () => {
		it('should match an integer number without ctx', () => {
			expect(checkConstraint({ kind: 'integer' }, number('3'))).toBe(true);
		});

		it('should not match a variable without ctx', () => {
			expect(checkConstraint({ kind: 'integer' }, variable('n'))).toBe(false);
		});

		it('should match a variable declared integer via ctx', () => {
			expect(checkConstraint({ kind: 'integer' }, variable('n'), ctxInteger('n'))).toBe(true);
		});
	});
});

describe('match with TypeContext', () => {
	it('should match P.isPositive() wildcard with positive variable via ctx', () => {
		const pattern = P._('x', P.isPositive());
		const result = match(pattern, variable('x'), EMPTY_BINDINGS, ctxPositive('x'));
		expect(result.success).toBe(true);
	});

	it('should not match P.isPositive() wildcard without ctx', () => {
		const pattern = P._('x', P.isPositive());
		const result = match(pattern, variable('x'));
		expect(result.success).toBe(false);
	});
});

describe('applyRule with TypeContext', () => {
	it('should apply rule |x| -> x when x is positive', () => {
		const rule = createRule(P.func('abs', [P._('x', P.isPositive())]), P._('x'), {
			name: 'abs-positive'
		});

		const node = abs(variable('x'));
		const ctx = ctxPositive('x');

		const result = applyRule(rule, node, ctx);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('variable');
		if (result!.type === 'variable') {
			expect(result!.name).toBe('x');
		}
	});

	it('should not apply rule |x| -> x without ctx', () => {
		const rule = createRule(P.func('abs', [P._('x', P.isPositive())]), P._('x'), {
			name: 'abs-positive'
		});

		const node = abs(variable('x'));
		const result = applyRule(rule, node);
		expect(result).toBeNull();
	});
});
