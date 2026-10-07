/**
 * Tests for cooperative interruption of the simplify pipeline.
 */

import { describe, it, expect, vi } from 'vitest';
import { simplify } from '../simplify';
import { computeCost } from '../cost';
import { parseLatex } from '../../parser';

describe('simplify — AbortSignal', () => {
	it('returns unchanged behavior when no signal/timeout is provided', () => {
		const node = parseLatex('x + x');
		const { result, aborted } = simplify(node);
		expect(aborted).toBeUndefined();
		expect(result).toBeDefined();
	});

	it('returns aborted=true and original node when signal is pre-aborted', () => {
		const node = parseLatex('x + x');
		const ctrl = new AbortController();
		ctrl.abort();
		const { result, aborted } = simplify(node, { signal: ctrl.signal });
		expect(aborted).toBe(true);
		expect(result).toBe(node);
	});

	it('returns aborted=true on a tight timeoutMs against a complex expression', () => {
		// Worst-case-ish input: nested powers of binomials force many polynomial
		// multiplications + factorizations through the simplify loop.
		const node = parseLatex('((x+1)^{12} \\cdot (x-1)^{12})^{3}');
		const start = performance.now();
		const { aborted } = simplify(node, { timeoutMs: 5 });
		const elapsed = performance.now() - start;
		expect(aborted).toBe(true);
		// fail-fast: should bail out within a small multiple of the budget
		expect(elapsed).toBeLessThan(500);
	});

	it('returns best-so-far when signal aborts after a short timeout', () => {
		const node = parseLatex('((x+1)^{12} \\cdot (x-1)^{12})^{3}');
		const ctrl = new AbortController();
		// Horloge simulée : chaque lecture de `performance.now()` avance de 1 ms.
		// L'échéance de 5 ms tombe donc après quelques vérifications, quelle que
		// soit la vitesse de la machine (une vraie horloge rendait le test
		// dépendant du processeur : un calcul rapide finissait avant l'échéance).
		let fakeNow = 0;
		const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => fakeNow++);
		try {
			const { result, aborted, cost } = simplify(node, {
				signal: ctrl.signal,
				timeoutMs: 5
			});
			expect(aborted).toBe(true);
			expect(result).toBeDefined();
			expect(cost).toBe(computeCost(result));
		} finally {
			nowSpy.mockRestore();
		}
	});

	it('omits the aborted field on a normal completion (with signal still passed)', () => {
		const node = parseLatex('x + x');
		const ctrl = new AbortController(); // never aborted
		const result = simplify(node, { signal: ctrl.signal });
		expect(result.aborted).toBeUndefined();
	});

	it('respects a generous timeoutMs without aborting normal work', () => {
		const node = parseLatex('2x + 3x');
		const { result, aborted } = simplify(node, { timeoutMs: 5000 });
		expect(aborted).toBeUndefined();
		expect(result).toBeDefined();
	});

	it('combines external signal and timeoutMs — external abort wins', () => {
		const node = parseLatex('((x+1)^{6})^{3}');
		const ctrl = new AbortController();
		ctrl.abort();
		const { aborted } = simplify(node, { signal: ctrl.signal, timeoutMs: 5000 });
		expect(aborted).toBe(true);
	});

	it('Phase 2 — pattern-matching combinatorial loops bail out under a tight budget', () => {
		// Long sum of trig terms forces matchSumPattern to enumerate many
		// (combinations × permutations) before the simplify loop body can
		// even check shouldAbort between phases. Without instrumentation in
		// match.ts this would only abort between phases (potentially long).
		const tex =
			'\\sin(a)+\\sin(b)+\\sin(c)+\\sin(d)+\\sin(e)+\\sin(f)+' +
			'\\cos(a)+\\cos(b)+\\cos(c)+\\cos(d)+\\cos(e)+\\cos(f)';
		const node = parseLatex(tex);
		const start = performance.now();
		const result = simplify(node, { timeoutMs: 5 });
		const elapsed = performance.now() - start;
		// Either completed quickly OR was aborted; in any case fail-fast.
		expect(result).toBeDefined();
		expect(elapsed).toBeLessThan(500);
	});
});
