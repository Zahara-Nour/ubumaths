/**
 * E2E test: no NumberNode should have a negative value string.
 *
 * Canonical form: negative numbers are represented as opposite(number('N')),
 * never as number('-N').
 *
 * These tests are INTENTIONALLY RED in Phase 2.  They will turn green as
 * call sites are migrated in Phase 3.  Each test documents which call site
 * (#N from the migration table) must be fixed.
 *
 * Helper usage:
 *   findNegativeNumberNodes(ast) — returns all NumberNode whose value starts with '-'.
 */

import { describe, it, expect } from 'vitest';
import type { MathNode } from '../types';
import { findNodes } from '../transforms';
import { isNumber } from '../guards';
import { number, variable, power, opposite } from '../factory';
import { differentiate } from '../differentiation';
import { integrate } from '../integration';
import { MINUS_ONE } from '../analysis/coefficient-utils';
import { unitInterval } from '../domain/factory';
import type { IntervalSet } from '../domain/types';
import type { Interval } from '$lib/math/intervals/types';

// =============================================================================
// Helper: collect all NumberNode with a negative value string in an AST
// =============================================================================

/**
 * Walk a MathNode tree and return every NumberNode whose `value` starts with '-'.
 * Such nodes violate the canonical form; none should exist after the migration.
 */
export function findNegativeNumberNodes(ast: MathNode): MathNode[] {
	return findNodes(ast, (n) => isNumber(n) && n.value.startsWith('-'));
}

// =============================================================================
// Helper: collect all NumberNode with a negative value inside an IntervalSet
// =============================================================================

/**
 * Walk the MathNode bounds of an IntervalSet and return every negative NumberNode.
 * Intervals have lower/upper endpoints, each of which is a MathNode.
 */
function findNegativeNumberNodesInIntervalSet(domain: IntervalSet): MathNode[] {
	const negatives: MathNode[] = [];
	for (const interval of domain.intervals) {
		const iv = interval as Interval;
		negatives.push(...findNegativeNumberNodes(iv.lower.value));
		negatives.push(...findNegativeNumberNodes(iv.upper.value));
	}
	return negatives;
}

// =============================================================================
// Site #1 — analysis/coefficient-utils.ts:35  MINUS_ONE = number('-1')
// =============================================================================

describe('no negative NumberNode — site #1: MINUS_ONE constant', () => {
	it('MINUS_ONE from coefficient-utils should not be a negative NumberNode', () => {
		// TODO Phase 3: this test should turn green after migrating site #1
		// Fix: change `export const MINUS_ONE = number('-1')` to
		//      `export const MINUS_ONE = opposite(number('1'))` in coefficient-utils.ts
		const negatives = findNegativeNumberNodes(MINUS_ONE);
		expect(negatives).toHaveLength(0);
	});
});

// =============================================================================
// Site #1 indirect — differentiation uses MINUS_ONE via coefficient-utils
// =============================================================================

describe('no negative NumberNode — differentiation output', () => {
	it('d/dx[x^2] should not contain a negative NumberNode', () => {
		// power rule: d/dx[x^2] = 2*x — no negative node expected even today.
		// This case is a sanity check (should be green now and stay green).
		const ast = differentiate(power(variable('x'), number('2')));
		const negatives = findNegativeNumberNodes(ast);
		expect(negatives).toHaveLength(0);
	});

	it('d/dx[-x^3] should not contain a negative NumberNode', () => {
		// negation rule: d/dx[-(x^3)] = -(3*x^2) — uses MINUS_ONE internally
		// via coefficient-utils when computing the coefficient of the result.
		// TODO Phase 3: may turn green after migrating site #1 (MINUS_ONE)
		// depending on whether the differentiation engine rewrites negation
		// through multiply(MINUS_ONE, ...) at any step.
		const ast = differentiate(opposite(power(variable('x'), number('3'))));
		const negatives = findNegativeNumberNodes(ast);
		expect(negatives).toHaveLength(0);
	});
});

// =============================================================================
// Site #2 — integration/integrators/basic.ts:453  power(expr, number('-1'))
// =============================================================================

describe('no negative NumberNode — site #2: integration basic.ts power(-1)', () => {
	it('integrate(x^(-1)) antiderivative should not contain a negative NumberNode', () => {
		// NOTE: This test is CURRENTLY GREEN because the integration pipeline
		// normalises `power(x, opposite(1))` to `divide(1, x)` before reaching
		// the basic integrator, so the `power(expr, number('-1'))` branch at
		// basic.ts line 453 is never hit in practice.
		//
		// The site #2 fix (change `number('-1')` → `opposite(number('1'))`) is
		// still desirable for code-correctness, but this test does NOT turn red
		// today.  It is kept as a regression guard: if normalisation is removed
		// or bypassed in the future this test will catch the issue.
		//
		// TODO Phase 3: verify site #2 fix in basic.ts line 453 anyway.
		const expr = power(variable('x'), opposite(number('1')));
		const result = integrate(expr, { variable: 'x' });
		if (result.antiderivative === null) {
			// Integrator could not find a result — no AST to inspect.
			return;
		}
		const negatives = findNegativeNumberNodes(result.antiderivative);
		expect(negatives).toHaveLength(0);
	});
});

// =============================================================================
// Sites #5, #6, #7 — domain/builtins.ts:75,90,100  number(-1) in intervals
// Site  #8         — domain/factory.ts:201          number(-1) in unitInterval
// =============================================================================

describe('no negative NumberNode — sites #5-#8: domain factory / builtins', () => {
	it('unitInterval() bounds should not contain a negative NumberNode', () => {
		// TODO Phase 3: this test should turn green after migrating sites #5-#8.
		// Fix: change `number(-1)` calls in domain/factory.ts and domain/builtins.ts
		//      to `opposite(number('1'))`.
		//
		// unitInterval() → intervalSet([closedInterval(number(-1), number(1))])
		const domain = unitInterval();
		const negatives = findNegativeNumberNodesInIntervalSet(domain);
		expect(negatives).toHaveLength(0);
	});
});
