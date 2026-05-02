/**
 * D1 — Greek letter DSL identifiers integration tests.
 *
 * Verifies that all lowercase Greek letters can be used as DSL variable names
 * with both ASCII (`phi`) and LaTeX (`\phi`) syntax. Both forms must produce
 * the same symbol-table entry.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';

describe('D1 — Greek letter DSL identifiers', () => {
	it('\\phi = ... then r = \\phi * 2 works (Greek RHS outside equation string)', () => {
		const { symbols } = runDsl(`\\phi = (1 + sqrt(5)) / 2\nr = \\phi * 2`);
		const phi = symbols.get('phi');
		const r = symbols.get('r');
		expect(phi).toBeDefined();
		expect(r).toBeDefined();
		expect((phi as { value: number }).value).toBeCloseTo(1.618, 3);
		expect((r as { value: number }).value).toBeCloseTo(3.236, 3);
	});

	it('phi (ASCII) and \\phi (LaTeX) point to the same symbol — interchangeable', () => {
		// Mixing ASCII LHS and LaTeX RHS: must resolve to the same `phi` entry.
		const { symbols } = runDsl(`phi = 1.618\nx = \\phi * 2`);
		const x = symbols.get('x');
		expect(x).toBeDefined();
		expect((x as { value: number }).value).toBeCloseTo(3.236, 3);
	});

	it('\\theta = \\pi/4 in DSL assignment works', () => {
		const { symbols } = runDsl(`\\theta = \\pi / 4\nresult = \\theta * 2`);
		const theta = symbols.get('theta');
		const result = symbols.get('result');
		expect(theta).toBeDefined();
		expect(result).toBeDefined();
		expect((theta as { value: number }).value).toBeCloseTo(Math.PI / 4, 6);
		expect((result as { value: number }).value).toBeCloseTo(Math.PI / 2, 6);
	});

	it('\\alpha and ASCII alpha are interchangeable', () => {
		const { symbols } = runDsl(`alpha = 0.5\nbeta = \\alpha + 0.25`);
		const beta = symbols.get('beta');
		expect(beta).toBeDefined();
		expect((beta as { value: number }).value).toBeCloseTo(0.75, 6);
	});

	it('all 22 lowercase Greek letters (excluding pi) work as DSL identifiers', () => {
		// pi is special-cased as a math constant; the rest become regular variables.
		const letters = [
			'alpha',
			'beta',
			'gamma',
			'delta',
			'epsilon',
			'zeta',
			'eta',
			'theta',
			'iota',
			'kappa',
			'lambda',
			'mu',
			'nu',
			'xi',
			'rho',
			'sigma',
			'tau',
			'upsilon',
			'phi',
			'chi',
			'psi',
			'omega'
		];
		for (const letter of letters) {
			const { symbols } = runDsl(`\\${letter} = 42`);
			const entry = symbols.get(letter);
			expect(entry, `\\${letter} should be tokenized as IDENTIFIER "${letter}"`).toBeDefined();
			expect((entry as { value: number }).value).toBe(42);
		}
	});

	it('\\pi remains a reserved math constant (cannot be assigned)', () => {
		// \pi is in RESERVED_NAMES; assignment must throw.
		expect(() => runDsl(`\\pi = 3.14`)).toThrow();
	});

	it('non-lowercase Greek (\\Pi capital) rejected at tokenizer level', () => {
		expect(() => runDsl(`\\Pi = 3`)).toThrow(/\\Pi.*inconnue/i);
	});
});
