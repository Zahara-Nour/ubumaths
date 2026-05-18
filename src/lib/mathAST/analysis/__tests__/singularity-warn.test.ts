/**
 * V2 — `warnIfSingularitySuspected` wrapper around `analyzeRangeContinuity`.
 *
 * The wrapper emits a single `console.warn` when at least one discontinuity
 * in `[a, b]` forces the integral to diverge. Silent for clean expressions,
 * removable, jump, boundary-safe cases. See
 * `docs/wip/geometry/singularity-rigorous-study.md` Q1 / Q3 / C1 / C2 / C3.
 *
 * Behaviour-rich tests on `analyzeRangeContinuity` itself live in
 * `singularity-warn-v2.test.ts`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCustom } from '$lib/mathAST';
import { warnIfSingularitySuspected } from '../singularity-warn';

describe('warnIfSingularitySuspected', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	// ---------------------------------------------------------------------------
	// Silent cases
	// ---------------------------------------------------------------------------

	describe('silent cases', () => {
		it('does not warn for a polynomial', () => {
			const expr = parseCustom('x^2 + 2*x + 1');
			warnIfSingularitySuspected(expr, 'x', 0, 1);
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it('does not warn for cos(x)', () => {
			const expr = parseCustom('cos(x)');
			warnIfSingularitySuspected(expr, 'x', -5, 5);
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it('does not warn when 1/x is outside the range', () => {
			const expr = parseCustom('1/x');
			warnIfSingularitySuspected(expr, 'x', 1, 5);
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it('does not warn for a removable discontinuity (sin(x)/x on [-1, 1])', () => {
			const expr = parseCustom('sin(x)/x');
			warnIfSingularitySuspected(expr, 'x', -1, 1);
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it('does not warn for jump discontinuities (floor(x) on [0, 3])', () => {
			const expr = parseCustom('floor(x)');
			warnIfSingularitySuspected(expr, 'x', 0, 3);
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it('does not warn for sqrt(x) on [0, 4] (boundary-safe, finite right-limit)', () => {
			const expr = parseCustom('sqrt(x)');
			warnIfSingularitySuspected(expr, 'x', 0, 4);
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it('skips silently when bounds are non-finite (NaN)', () => {
			const expr = parseCustom('1/x');
			warnIfSingularitySuspected(expr, 'x', NaN, 1);
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it('skips silently when bounds are infinite', () => {
			const expr = parseCustom('1/x');
			warnIfSingularitySuspected(expr, 'x', -Infinity, 1);
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it('skips silently on a degenerate interval (a === b)', () => {
			const expr = parseCustom('1/x');
			warnIfSingularitySuspected(expr, 'x', 0.5, 0.5);
			expect(warnSpy).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------------------
	// Warning cases — divergent discontinuities
	// ---------------------------------------------------------------------------

	describe('warning cases', () => {
		it('emits one warn for 1/x on [-1, 1] (infinite interior)', () => {
			const expr = parseCustom('1/x');
			warnIfSingularitySuspected(expr, 'x', -1, 1);
			expect(warnSpy).toHaveBeenCalledTimes(1);
			const message = warnSpy.mock.calls[0][0] as string;
			expect(message).toContain('asymptote verticale');
			expect(message).toContain('division par zéro');
			expect(message).toContain("L'intégrale diverge");
		});

		it('emits one warn for sin(1/x) on [-1, 1] (essential interior)', () => {
			const expr = parseCustom('sin(1/x)');
			warnIfSingularitySuspected(expr, 'x', -1, 1);
			expect(warnSpy).toHaveBeenCalledTimes(1);
			const message = warnSpy.mock.calls[0][0] as string;
			expect(message).toContain('discontinuité essentielle');
		});

		it('emits one warn for 1/x on [0, 1] (infinite at lower boundary)', () => {
			const expr = parseCustom('1/x');
			warnIfSingularitySuspected(expr, 'x', 0, 1);
			expect(warnSpy).toHaveBeenCalledTimes(1);
		});

		it('aggregates 2 infinite discontinuities into a single warn (1/(x^2-1) on [-2, 2])', () => {
			const expr = parseCustom('1/(x^2-1)');
			warnIfSingularitySuspected(expr, 'x', -2, 2);
			expect(warnSpy).toHaveBeenCalledTimes(1);
			const message = warnSpy.mock.calls[0][0] as string;
			expect(message).toContain('2 discontinuités');
			expect(message).toContain('-1');
			expect(message).toContain("L'intégrale diverge");
		});
	});

	// ---------------------------------------------------------------------------
	// Format and prefix
	// ---------------------------------------------------------------------------

	describe('format and prefix', () => {
		it("uses the 'integrale ligne X:' prefix by default", () => {
			const expr = parseCustom('1/x');
			warnIfSingularitySuspected(expr, 'x', -1, 1, 7);
			const message = warnSpy.mock.calls[0][0] as string;
			expect(message.startsWith('integrale ligne 7:')).toBe(true);
		});

		it("uses the 'aire ligne X:' prefix when builtin is 'aire'", () => {
			const expr = parseCustom('1/x');
			warnIfSingularitySuspected(expr, 'x', -1, 1, 12, 'aire');
			const message = warnSpy.mock.calls[0][0] as string;
			expect(message.startsWith('aire ligne 12:')).toBe(true);
		});

		it("omits 'ligne X' when no line is provided", () => {
			const expr = parseCustom('1/x');
			warnIfSingularitySuspected(expr, 'x', -1, 1);
			const message = warnSpy.mock.calls[0][0] as string;
			expect(message.startsWith('integrale: ')).toBe(true);
		});

		it('mentions the range bounds in the message', () => {
			const expr = parseCustom('1/x');
			warnIfSingularitySuspected(expr, 'x', -2, 3);
			const message = warnSpy.mock.calls[0][0] as string;
			expect(message).toContain('[-2, 3]');
		});
	});

	// ---------------------------------------------------------------------------
	// Robustness
	// ---------------------------------------------------------------------------

	describe('robustness', () => {
		it('does not throw on inverted bounds (a > b)', () => {
			const expr = parseCustom('1/x');
			expect(() => warnIfSingularitySuspected(expr, 'x', 1, -1)).not.toThrow();
			// Inverted bounds normalise to [-1, 1] → still emits one warn.
			expect(warnSpy).toHaveBeenCalledTimes(1);
		});
	});
});
