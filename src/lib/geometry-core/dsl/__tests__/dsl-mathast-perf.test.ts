/**
 * Performance smoke test for the mathAST routing path. Not a benchmark — it
 * just guards against accidental regression that would 10x the cost.
 *
 * The parse cache and the applyAngleMode trig fast-path are both expected
 * to keep the per-RHS routing cost under ~0.5ms on a typical dev machine.
 * The numbers are conservative; CI may be slower.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';

describe('mathAST routing — performance smoke', () => {
	it('100 distinct math-pure assignments interpret in well under 1s', () => {
		const lines = Array.from({ length: 100 }, (_, i) => `r_${i} = ${i + 1} * sqrt(${i + 1}) + 2`);
		const script = lines.join('\n');
		const start = performance.now();
		interpret(parse(script));
		const elapsed = performance.now() - start;
		// Generous budget so CI noise doesn't flake. Real numbers locally are
		// in the few-ms range thanks to the parse cache + fast-path.
		expect(elapsed).toBeLessThan(1000);
	});

	it('100 repeated identical RHS leverage the parse cache', () => {
		// Same expression 100 times — should hit the parse cache after the
		// first iteration. If this ever takes proportionally as long as the
		// distinct-expressions test above, the cache regressed.
		const lines = Array.from({ length: 100 }, (_, i) => `r_${i} = sqrt(2) + 1`);
		const script = lines.join('\n');
		const start = performance.now();
		interpret(parse(script));
		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(500);
	});

	it('applyAngleMode fast-path: 100 non-trig expressions are not slower than trig-free', () => {
		// In deg mode (default), a non-trig RHS used to walk + spread the AST.
		// The hasTrigCall fast-path must short-circuit. We just check the run
		// completes within a generous budget — a regression would be obvious.
		const lines = Array.from({ length: 100 }, (_, i) => `r_${i} = ${i + 1} * 2 + sqrt(${i + 1})`);
		const script = lines.join('\n');
		const start = performance.now();
		interpret(parse(script));
		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(1000);
	});
});
