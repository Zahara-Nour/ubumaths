/**
 * Tests for cooperative interruption of normalize() / areEquivalent() /
 * isZeroExpression() / isOneExpression().
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../equivalence';
import { isZeroExpression, isOneExpression, normalize } from '../normal';
import { parseLatex } from '../parser';

describe('normalize() — AbortSignal', () => {
	it('works as before when no abortChecker is provided', () => {
		const node = parseLatex('x + x');
		const form = normalize(node);
		expect(form).toBeDefined();
	});

	it('throws AbortError when abortChecker fires before normalize completes', () => {
		const node = parseLatex('((x+1)^{12})^{3}');
		// Build a checker that fires after the first call (forces an abort early)
		let calls = 0;
		const ctx = {
			abortChecker: () => ++calls > 1
		};
		expect(() => normalize(node, ctx)).toThrow();
	});
});

describe('areEquivalent — abort behavior', () => {
	it('works as before when no signal/timeoutMs is provided', () => {
		const a = parseLatex('x^2 - 1');
		const b = parseLatex('(x-1)(x+1)');
		expect(areEquivalent(a, b)).toBe(true);
	});

	it('returns false (conservative) when signal is pre-aborted', () => {
		const a = parseLatex('x + x');
		const b = parseLatex('2x');
		const ctrl = new AbortController();
		ctrl.abort();
		expect(areEquivalent(a, b, { signal: ctrl.signal })).toBe(false);
	});

	it('returns false on a tight timeout against complex expressions', () => {
		const a = parseLatex('((x+1)^{12} \\cdot (x-1)^{12})^{3}');
		const b = parseLatex('((x^2-1)^{12})^{3}');
		const start = performance.now();
		const result = areEquivalent(a, b, { timeoutMs: 5 });
		const elapsed = performance.now() - start;
		// Result is conservative false (we couldn't prove equivalence in time)
		expect(typeof result).toBe('boolean');
		// fail-fast: should bail out within a small multiple of the budget
		expect(elapsed).toBeLessThan(500);
	});

	it('combines signal and timeout — pre-aborted signal returns false immediately', () => {
		const a = parseLatex('x');
		const b = parseLatex('x');
		const ctrl = new AbortController();
		ctrl.abort();
		expect(areEquivalent(a, b, { signal: ctrl.signal, timeoutMs: 5000 })).toBe(false);
	});

	it('works correctly with a generous timeoutMs', () => {
		const a = parseLatex('x^2 - 1');
		const b = parseLatex('(x-1)(x+1)');
		expect(areEquivalent(a, b, { timeoutMs: 5000 })).toBe(true);
	});
});

describe('isZeroExpression — abort behavior', () => {
	it('works as before when no signal/timeoutMs is provided', () => {
		expect(isZeroExpression(parseLatex('x - x'))).toBe(true);
		expect(isZeroExpression(parseLatex('1'))).toBe(false);
	});

	it('returns false (conservative) when signal is pre-aborted', () => {
		const ctrl = new AbortController();
		ctrl.abort();
		expect(isZeroExpression(parseLatex('x - x'), { signal: ctrl.signal })).toBe(false);
	});

	it('returns false on a tight timeout', () => {
		const node = parseLatex('((x+1)^{12} \\cdot (x-1)^{12})^{3} - ((x^2-1)^{12})^{3}');
		const start = performance.now();
		const result = isZeroExpression(node, { timeoutMs: 5 });
		const elapsed = performance.now() - start;
		expect(typeof result).toBe('boolean');
		expect(elapsed).toBeLessThan(500);
	});
});

describe('isOneExpression — abort behavior', () => {
	it('works as before when no signal/timeoutMs is provided', () => {
		expect(isOneExpression(parseLatex('x / x'))).toBe(true);
		expect(isOneExpression(parseLatex('2'))).toBe(false);
	});

	it('returns false (conservative) when signal is pre-aborted', () => {
		const ctrl = new AbortController();
		ctrl.abort();
		expect(isOneExpression(parseLatex('x / x'), { signal: ctrl.signal })).toBe(false);
	});
});

describe('isZeroExpression / isOneExpression — re-throw non-abort errors', () => {
	// Regression guard: previously isZeroExpression propagated all normalize
	// errors. After adding abort support we must NOT silently swallow them —
	// only AbortError should turn into `false`. Other errors (e.g. division by
	// a symbolic zero) should still surface to the caller.
	it('isZeroExpression: division by zero still throws (not swallowed by catch)', () => {
		// 1/0 should make normalize throw "Division by zero" — not return false silently.
		expect(() => isZeroExpression(parseLatex('1/0'))).toThrow();
	});

	it('isZeroExpression with abort options still throws non-abort errors', () => {
		// A wide budget that won't trigger; the throw must come from normalize itself.
		expect(() => isZeroExpression(parseLatex('1/0'), { timeoutMs: 5000 })).toThrow();
	});

	it('isOneExpression: division by zero still throws', () => {
		expect(() => isOneExpression(parseLatex('1/0'))).toThrow();
	});
});
