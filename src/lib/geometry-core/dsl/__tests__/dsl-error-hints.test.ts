/**
 * Tests for the contextual hints attached to "Variable inconnue" and
 * "Fonction inconnue" runtime errors. The mathAST routing path may bail
 * silently for many reasons; the resulting DSL error should at least
 * point the user at the most likely fix.
 *
 * V2 #3 of the dsl-mathast-routing follow-ups.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';

function tryRun(script: string): string {
	try {
		runDsl(script);
		return '';
	} catch (e) {
		return e instanceof Error ? e.message : String(e);
	}
}

describe('Variable inconnue — hints for π and e typos', () => {
	it('"pi" suggests \\pi (mathAST custom uses \\pi for the math constant)', () => {
		const msg = tryRun('r = pi');
		expect(msg).toMatch(/Variable inconnue/);
		expect(msg).toMatch(/\\pi/);
	});

	it('"PI" suggests \\pi (uppercase typo)', () => {
		const msg = tryRun('r = PI');
		expect(msg).toMatch(/Variable inconnue/);
		expect(msg).toMatch(/\\pi/);
	});

	it('"Pi" suggests \\pi (capitalized typo)', () => {
		const msg = tryRun('r = Pi');
		expect(msg).toMatch(/\\pi/);
	});

	it('"E" suggests lowercase e (Euler is lowercase)', () => {
		const msg = tryRun('r = E');
		expect(msg).toMatch(/Variable inconnue/);
		expect(msg).toMatch(/[Ee]uler|"e" en minuscule/);
	});

	it('"Euler" suggests lowercase e', () => {
		const msg = tryRun('r = Euler');
		expect(msg).toMatch(/[Ee]uler|"e"/);
	});

	it('plain unknown variable still gets a clear error (no false hint)', () => {
		const msg = tryRun('r = inconnue');
		expect(msg).toMatch(/Variable inconnue : "inconnue"/);
		expect(msg).not.toMatch(/\\pi/);
	});
});

describe('Fonction inconnue — hints listing categories', () => {
	it('unknown function lists the categories of available functions', () => {
		const msg = tryRun('r = wibble(2)');
		expect(msg).toMatch(/Fonction inconnue/);
		// The hint should mention math functions and DSL builtins so the user
		// knows where to look.
		expect(msg).toMatch(/math|sqrt|sin|cos/);
	});

	it('typo "polair" (not polaire) still produces a clear unknown-function message', () => {
		const msg = tryRun(
			[
				'A = point(0, 0)',
				'c = courbe("x^2 + y^2 - 1 = 0")',
				'p = polair(A, c)' // intentional typo for `polaire`
			].join('\n')
		);
		expect(msg).toMatch(/Fonction inconnue : "polair"/);
	});

	it('Fonction math inconnue inside evaluateMathFunction also gets a hint', () => {
		// `sqrtX` is not a MATH_FUNCTIONS entry; force the path that goes
		// through evaluateMathFunction by referencing a property access (so the
		// expression is not math-pure and the routing skips it).
		const msg = tryRun(
			[
				'A = point(0, 0)',
				'r = sqrtX(A.x)' // non-existent function on a property access
			].join('\n')
		);
		// Either path can fire; both should produce a "Fonction inconnue"-style
		// message.
		expect(msg).toMatch(/Fonction (math )?inconnue/);
	});
});
