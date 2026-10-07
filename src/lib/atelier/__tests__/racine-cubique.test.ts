/**
 * `cbrt(x)` dans Calcul : la racine cubique, pas le produit c·b·r·t.
 *
 * Avant (2026-10-07) : `.dériver cbrt(3x)` rendait « 3 b c r t », sans erreur.
 * Coefficient ≠ 1 : une dérivée intérieure oubliée s'y voit.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

describe('cbrt dans Calcul', () => {
	it('.dériver cbrt(3x) rend la dérivée de ∛(3x)', () => {
		const result = runInput(session(), '.dériver cbrt(3x)');

		expect('latex' in result ? result.latex : undefined).toBe('\\dfrac{1}{\\sqrt[3]{9 x^2}}');
	});

	it('f(x)=cbrt(x) se lit comme f(x)=sqrt[3](x)', () => {
		const s = session();
		runInput(s, 'f(x)=cbrt(x)');

		expect(s.atelier.get('f')?.status).toBe('ok');
		expect(runInput(s, 'f(8)')).toMatchObject({ kind: 'calcul', output: '2' });
	});
});
