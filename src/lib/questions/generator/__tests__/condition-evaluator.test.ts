/**
 * Tests for condition-evaluator.ts
 * =================================
 *
 * Tests the boolean condition evaluation used as generation guards.
 * Covers the ~20 unique condition patterns found in the old question bank.
 */

import { describe, it, expect } from 'vitest';
import { evaluateConditions } from '../condition-evaluator';
import type { ResolvedVariable } from '$lib/ubumark/types/parameterization';

/** Helper to create resolved variables from a name/value map */
function makeVars(map: Record<string, number>): ResolvedVariable[] {
	return Object.entries(map).map(([name, value]) => ({
		name,
		value: String(value)
	}));
}

describe('evaluateConditions', () => {
	// =========================================================================
	// Basic conditions
	// =========================================================================

	it('returns true when no conditions', () => {
		expect(evaluateConditions([], makeVars({ a: 1 }))).toBe(true);
	});

	it('a*b!=0 — both non-zero', () => {
		expect(evaluateConditions(['a*b!=0'], makeVars({ a: 3, b: 5 }))).toBe(true);
	});

	it('a*b!=0 — one is zero', () => {
		expect(evaluateConditions(['a*b!=0'], makeVars({ a: 0, b: 5 }))).toBe(false);
	});

	it('a!=b — different values', () => {
		expect(evaluateConditions(['a!=b'], makeVars({ a: 3, b: 5 }))).toBe(true);
	});

	it('a!=b — same values', () => {
		expect(evaluateConditions(['a!=b'], makeVars({ a: 3, b: 3 }))).toBe(false);
	});

	it('a!=1 — exclude specific value', () => {
		expect(evaluateConditions(['a!=1'], makeVars({ a: 5 }))).toBe(true);
		expect(evaluateConditions(['a!=1'], makeVars({ a: 1 }))).toBe(false);
	});

	// =========================================================================
	// Logical operators
	// =========================================================================

	it('a != 0 && a != 1 — AND logic', () => {
		expect(evaluateConditions(['a != 0 && a != 1'], makeVars({ a: 5 }))).toBe(true);
		expect(evaluateConditions(['a != 0 && a != 1'], makeVars({ a: 0 }))).toBe(false);
		expect(evaluateConditions(['a != 0 && a != 1'], makeVars({ a: 1 }))).toBe(false);
	});

	it('a<=0 || b<=0 — OR logic', () => {
		expect(evaluateConditions(['a<=0 || b<=0'], makeVars({ a: -1, b: 3 }))).toBe(true);
		expect(evaluateConditions(['a<=0 || b<=0'], makeVars({ a: 3, b: -2 }))).toBe(true);
		expect(evaluateConditions(['a<=0 || b<=0'], makeVars({ a: 3, b: 5 }))).toBe(false);
	});

	// =========================================================================
	// Absolute value
	// =========================================================================

	it('abs(a) != abs(b) — different absolute values', () => {
		expect(evaluateConditions(['abs(a) != abs(b)'], makeVars({ a: 3, b: -5 }))).toBe(true);
	});

	it('abs(a) != abs(b) — same absolute values', () => {
		expect(evaluateConditions(['abs(a) != abs(b)'], makeVars({ a: 3, b: -3 }))).toBe(false);
	});

	it('abs(a) != abs(b) && abs(a) != abs(c) — composed abs+AND', () => {
		expect(
			evaluateConditions(['abs(a) != abs(b) && abs(a) != abs(c)'], makeVars({ a: 3, b: 5, c: 7 }))
		).toBe(true);
		expect(
			evaluateConditions(['abs(a) != abs(b) && abs(a) != abs(c)'], makeVars({ a: 3, b: 5, c: -3 }))
		).toBe(false);
	});

	it('abs(a+(b))>1 — abs of expression', () => {
		expect(evaluateConditions(['abs(a+(b))>1'], makeVars({ a: 5, b: -2 }))).toBe(true);
		expect(evaluateConditions(['abs(a+(b))>1'], makeVars({ a: 1, b: 0 }))).toBe(false);
	});

	// =========================================================================
	// Modulo and GCD
	// =========================================================================

	it('mod(a*b,10)!=0 — modulo', () => {
		expect(evaluateConditions(['mod(a*b,10)!=0'], makeVars({ a: 3, b: 7 }))).toBe(true);
		expect(evaluateConditions(['mod(a*b,10)!=0'], makeVars({ a: 2, b: 5 }))).toBe(false);
	});

	it('gcd(a+b,c)=1 — coprime (GCD)', () => {
		expect(evaluateConditions(['gcd(a+b,c)=1'], makeVars({ a: 3, b: 4, c: 5 }))).toBe(true);
		// gcd(6, 4) = 2 != 1
		expect(evaluateConditions(['gcd(a+b,c)=1'], makeVars({ a: 2, b: 4, c: 4 }))).toBe(false);
	});

	// =========================================================================
	// Comparison operators
	// =========================================================================

	it('a < b', () => {
		expect(evaluateConditions(['a < b'], makeVars({ a: 3, b: 5 }))).toBe(true);
		expect(evaluateConditions(['a < b'], makeVars({ a: 5, b: 3 }))).toBe(false);
	});

	it('a >= b', () => {
		expect(evaluateConditions(['a >= b'], makeVars({ a: 5, b: 5 }))).toBe(true);
		expect(evaluateConditions(['a >= b'], makeVars({ a: 3, b: 5 }))).toBe(false);
	});

	// =========================================================================
	// Multiple conditions (implicit AND between array elements)
	// =========================================================================

	it('multiple conditions — all true', () => {
		expect(evaluateConditions(['a != 0', 'b != 0', 'a != b'], makeVars({ a: 3, b: 5 }))).toBe(true);
	});

	it('multiple conditions — one false', () => {
		expect(evaluateConditions(['a != 0', 'b != 0', 'a != b'], makeVars({ a: 3, b: 3 }))).toBe(
			false
		);
	});

	// =========================================================================
	// Edge cases
	// =========================================================================

	it('invalid condition expression — returns false', () => {
		expect(evaluateConditions(['invalid!!!syntax'], makeVars({ a: 3 }))).toBe(false);
	});

	it('condition with unresolved variable in != — returns true (structural comparison)', () => {
		// When x is unresolved, numeric eval fails, fallback to areEquivalent:
		// x is structurally != 0, so returns true. This is acceptable for conditions
		// since all variables should be resolved before condition evaluation.
		expect(evaluateConditions(['x != 0'], makeVars({ a: 3 }))).toBe(true);
	});
});
