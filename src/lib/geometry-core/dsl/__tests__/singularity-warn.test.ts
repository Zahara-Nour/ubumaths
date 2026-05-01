/**
 * Phase 2 — singularity warning heuristic for the `integrale()` DSL builtin.
 *
 * The heuristic emits a console.warn when the integrand contains suspect
 * subexpressions (1/g, tan, ln, sqrt) whose problematic values are inside
 * [a, b]. See `docs/wip/geometry/integrale-study.md` §2.4.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCustom } from '$lib/mathAST';
import {
	findSingularitiesInRange,
	formatSingularityWarnings,
	warnIfSingularitySuspected,
	type SingularityFinding
} from '../singularity-warn';

// =============================================================================
// A. Detection — clean cases (no findings)
// =============================================================================

describe('findSingularitiesInRange — clean cases', () => {
	it('returns [] for a polynomial', () => {
		const expr = parseCustom('x^2 + 2*x + 1');
		expect(findSingularitiesInRange(expr, 'x', 0, 1)).toEqual([]);
	});

	it('returns [] for sin(x) on any interval', () => {
		const expr = parseCustom('sin(x)');
		expect(findSingularitiesInRange(expr, 'x', 0, 10)).toEqual([]);
	});

	it('returns [] for cos(x) on any interval', () => {
		const expr = parseCustom('cos(x)');
		expect(findSingularitiesInRange(expr, 'x', -5, 5)).toEqual([]);
	});

	it('returns [] for exp(-x^2) on any finite interval', () => {
		const expr = parseCustom('exp(-x^2)');
		expect(findSingularitiesInRange(expr, 'x', -10, 10)).toEqual([]);
	});

	it('returns [] for 1/x outside the singularity range', () => {
		// 1/x has a pole at x = 0, but [1, 5] is safe.
		const expr = parseCustom('1/x');
		expect(findSingularitiesInRange(expr, 'x', 1, 5)).toEqual([]);
	});

	it('returns [] for ln(x) when the argument is positive on [a, b]', () => {
		// ln(x) is fine on [0.5, 3].
		const expr = parseCustom('ln(x)');
		expect(findSingularitiesInRange(expr, 'x', 0.5, 3)).toEqual([]);
	});

	it('returns [] for sqrt(x) when argument is non-negative on [a, b]', () => {
		const expr = parseCustom('sqrt(x)');
		expect(findSingularitiesInRange(expr, 'x', 0, 4)).toEqual([]);
	});

	it('returns [] for tan(x) on an interval that avoids odd-multiples of π/2', () => {
		// tan(x) is fine on [-1, 1] (poles at ±π/2 ≈ ±1.5708 are outside).
		const expr = parseCustom('tan(x)');
		expect(findSingularitiesInRange(expr, 'x', -1, 1)).toEqual([]);
	});
});

// =============================================================================
// B. Detection — division by zero (kind: 'division')
// =============================================================================

describe('findSingularitiesInRange — division', () => {
	it('detects 1/x with [a, b] = [-1, 1]', () => {
		const expr = parseCustom('1/x');
		const findings = findSingularitiesInRange(expr, 'x', -1, 1);
		expect(findings.length).toBeGreaterThan(0);
		expect(findings.some((f) => f.kind === 'division')).toBe(true);
	});

	it('detects 1/(x-2) with [a, b] = [0, 4]', () => {
		const expr = parseCustom('1/(x-2)');
		const findings = findSingularitiesInRange(expr, 'x', 0, 4);
		expect(findings.some((f) => f.kind === 'division')).toBe(true);
	});

	it('detects nested division 1/(x^2 - 1) with [a, b] crossing roots', () => {
		const expr = parseCustom('1/(x^2 - 1)');
		const findings = findSingularitiesInRange(expr, 'x', -2, 2);
		expect(findings.some((f) => f.kind === 'division')).toBe(true);
	});

	it('does NOT report division when the denominator is constant', () => {
		const expr = parseCustom('x/2');
		expect(findSingularitiesInRange(expr, 'x', -10, 10)).toEqual([]);
	});

	it('does NOT report division when the denominator stays positive on [a, b]', () => {
		// 1/(x^2 + 1) — denominator is always ≥ 1, never zero.
		const expr = parseCustom('1/(x^2 + 1)');
		expect(findSingularitiesInRange(expr, 'x', -10, 10)).toEqual([]);
	});

	it('reports approxLocation near the actual root', () => {
		const expr = parseCustom('1/(x-3)');
		const findings = findSingularitiesInRange(expr, 'x', 0, 6);
		const division = findings.find((f) => f.kind === 'division');
		expect(division).toBeDefined();
		expect(division!.approxLocation).toBeDefined();
		expect(division!.approxLocation!).toBeCloseTo(3, 0);
	});
});

// =============================================================================
// C. Detection — tan(x) (kind: 'tan')
// =============================================================================

describe('findSingularitiesInRange — tan', () => {
	it('detects tan(x) on [0, 2] (pole at π/2 ≈ 1.5708)', () => {
		const expr = parseCustom('tan(x)');
		const findings = findSingularitiesInRange(expr, 'x', 0, 2);
		expect(findings.some((f) => f.kind === 'tan')).toBe(true);
	});

	it('detects tan(2x) on [0, 1] (pole at π/4 ≈ 0.7854)', () => {
		const expr = parseCustom('tan(2*x)');
		const findings = findSingularitiesInRange(expr, 'x', 0, 1);
		expect(findings.some((f) => f.kind === 'tan')).toBe(true);
	});

	it('does NOT report tan(x) on a safe interval [-1, 1]', () => {
		const expr = parseCustom('tan(x)');
		expect(findSingularitiesInRange(expr, 'x', -1, 1)).toEqual([]);
	});
});

// =============================================================================
// D. Detection — ln(g) (kind: 'ln')
// =============================================================================

describe('findSingularitiesInRange — ln', () => {
	it('detects ln(x) on [-1, 1] (argument ≤ 0 in lower half)', () => {
		const expr = parseCustom('ln(x)');
		const findings = findSingularitiesInRange(expr, 'x', -1, 1);
		expect(findings.some((f) => f.kind === 'ln')).toBe(true);
	});

	it('detects ln(1-x) on [0, 2] (argument becomes ≤ 0 at x=1)', () => {
		const expr = parseCustom('ln(1-x)');
		const findings = findSingularitiesInRange(expr, 'x', 0, 2);
		expect(findings.some((f) => f.kind === 'ln')).toBe(true);
	});

	it('does NOT report ln(x+5) on [0, 3] (argument always > 0)', () => {
		const expr = parseCustom('ln(x+5)');
		expect(findSingularitiesInRange(expr, 'x', 0, 3)).toEqual([]);
	});
});

// =============================================================================
// E. Detection — sqrt(g) (kind: 'sqrt')
// =============================================================================

describe('findSingularitiesInRange — sqrt', () => {
	it('detects sqrt(x) on [-1, 1] (argument < 0 in lower half)', () => {
		const expr = parseCustom('sqrt(x)');
		const findings = findSingularitiesInRange(expr, 'x', -1, 1);
		expect(findings.some((f) => f.kind === 'sqrt')).toBe(true);
	});

	it('detects sqrt(1 - x^2) on [-2, 2] (argument < 0 outside [-1, 1])', () => {
		const expr = parseCustom('sqrt(1 - x^2)');
		const findings = findSingularitiesInRange(expr, 'x', -2, 2);
		expect(findings.some((f) => f.kind === 'sqrt')).toBe(true);
	});

	it('does NOT report sqrt(x) on [0.5, 4] (argument always ≥ 0)', () => {
		const expr = parseCustom('sqrt(x)');
		expect(findSingularitiesInRange(expr, 'x', 0.5, 4)).toEqual([]);
	});
});

// =============================================================================
// F. Robustness
// =============================================================================

describe('findSingularitiesInRange — robustness', () => {
	it('does not crash when sampling a NaN-producing expression', () => {
		// Even malformed at runtime (e.g., 1/(0*x)), should not throw.
		const expr = parseCustom('1/(0*x)');
		expect(() => findSingularitiesInRange(expr, 'x', -1, 1)).not.toThrow();
	});

	it('does not crash on degenerate interval (a == b)', () => {
		const expr = parseCustom('1/x');
		expect(() => findSingularitiesInRange(expr, 'x', 0.5, 0.5)).not.toThrow();
	});

	it('does not crash on inverted interval (a > b)', () => {
		const expr = parseCustom('1/x');
		expect(() => findSingularitiesInRange(expr, 'x', 1, -1)).not.toThrow();
	});
});

// =============================================================================
// G. Format and emission
// =============================================================================

describe('formatSingularityWarnings', () => {
	it('produces a non-empty string for a single finding', () => {
		const findings: SingularityFinding[] = [
			{
				kind: 'division',
				description: "contient 1/x qui s'annule en x ≈ 0",
				approxLocation: 0
			}
		];
		const msg = formatSingularityWarnings(findings);
		expect(msg).toContain('1/x');
		expect(msg.length).toBeGreaterThan(0);
	});

	it('aggregates multiple findings into one message', () => {
		const findings: SingularityFinding[] = [
			{ kind: 'division', description: 'description-A' },
			{ kind: 'ln', description: 'description-B' }
		];
		const msg = formatSingularityWarnings(findings);
		expect(msg).toContain('description-A');
		expect(msg).toContain('description-B');
	});

	it('includes line info when context.line is provided', () => {
		const findings: SingularityFinding[] = [{ kind: 'tan', description: 'foo' }];
		const msg = formatSingularityWarnings(findings, 7);
		expect(msg).toContain('7');
	});
});

describe('warnIfSingularitySuspected', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('emits a single console.warn when problems are found', () => {
		const expr = parseCustom('1/x');
		warnIfSingularitySuspected(expr, 'x', -1, 1);
		expect(warnSpy).toHaveBeenCalledTimes(1);
	});

	it('does not warn when expression is clean on the interval', () => {
		const expr = parseCustom('x^2');
		warnIfSingularitySuspected(expr, 'x', 0, 1);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('aggregates multiple findings in one console.warn call', () => {
		// 1/x + ln(x) on [-1, 1] — both kinds suspect.
		const expr = parseCustom('1/x + ln(x)');
		warnIfSingularitySuspected(expr, 'x', -1, 1);
		expect(warnSpy).toHaveBeenCalledTimes(1);
		const message = warnSpy.mock.calls[0][0] as string;
		// Both kinds should be mentioned in the same call.
		expect(message.toLowerCase()).toContain('dénominateur');
		expect(message.toLowerCase()).toContain('ln');
	});

	it('skips silently when bounds are non-finite (NaN)', () => {
		const expr = parseCustom('1/x');
		warnIfSingularitySuspected(expr, 'x', NaN, 1);
		expect(warnSpy).not.toHaveBeenCalled();
	});
});
