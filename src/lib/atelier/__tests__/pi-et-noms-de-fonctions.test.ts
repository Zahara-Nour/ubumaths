/**
 * `\pi` et les noms de fonctions dans un exposant `{…}` — révélés par l'oracle
 * des dérivées (#910).
 *
 * ⚠️ Cause commune : une saisie MÊLÉE — `cos(` sans antislash, avec `\pi` ou
 * `^{…}` — était prise pour du LaTeX par la détection de format, et le parseur
 * LaTeX lit `cos` comme c·o·s. Or l'atelier conseille `\pi` (#896), et la
 * substitution (`expressionOf`) écrit ses exposants entre accolades :
 * `e^(sin(x))` devenait `e^{sin(x)}`, relu `e^{s i n x}`.
 *
 * Coefficients ≠ 1 partout : une constante mal lue s'y voit.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, runAction, type CalcSession } from '../calcul';
import { expressionOf } from '../engine';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

/** La réponse LaTeX d'une ligne, quelle qu'elle soit. */
function latexOf(result: ReturnType<typeof runInput>): string | undefined {
	return 'latex' in result ? result.latex : undefined;
}

describe('(A) \\pi et π dans Calcul', () => {
	it.each(['\\pi', 'π'])('.dériver cos(3x+%s/4) rend -3 sin(π/4 + 3x)', (pi) => {
		const result = runInput(session(), `.dériver cos(3x+${pi}/4)`);

		expect(latexOf(result)).toBe('-3 \\sin\\left( \\dfrac{\\pi}{4} + 3 x \\right)');
	});

	it('les titres d’étapes ne parlent pas de « la constante c o s »', () => {
		const result = runInput(session(), '.dériver cos(3x+\\pi/4)');

		expect(JSON.stringify(result)).not.toContain('c o s');
	});

	it.each(['\\pi', 'π'])('f(x)=2sin(%s x) est une fonction lisible', (pi) => {
		const s = session();
		runInput(s, `f(x)=2sin(${pi} x)`);

		expect(s.atelier.get('f')?.status).toBe('ok');
	});

	// π est la CONSTANTE, pas une lettre qu'on dérive ou qu'on attend
	it.each(['\\pi', 'π'])('f(x)=2sin(%s x) : f(1/2) vaut 2', (pi) => {
		const s = session();
		runInput(s, `f(x)=2sin(${pi} x)`);

		expect(runInput(s, 'f(1/2)')).toMatchObject({ kind: 'calcul', output: '2' });
	});

	it.each(['\\pi', 'π'])('le bouton Dériver sur f(x)=cos(3x+%s/4)', (pi) => {
		const s = session();
		runInput(s, `f(x)=cos(3x+${pi}/4)`);

		const outcome = runAction(s, 'derive', 'f');

		expect(outcome).toMatchObject({
			ok: true,
			latex: "f'(x) = -3 \\sin\\left( \\dfrac{\\pi}{4} + 3 x \\right)"
		});
	});

	// La substitution écrivait `3\pix^2` (commande inconnue) : refusé au moteur
	it.each(['\\pi', 'π'])('Dériver et Variations sur f(x)=3%s x^2', (pi) => {
		const s = session();
		runInput(s, `f(x)=3${pi} x^2`);

		expect(runAction(s, 'derive', 'f')).toMatchObject({ ok: true, latex: "f'(x) = 6 \\pi x" });
		expect(runAction(s, 'variations', 'f')).toMatchObject({ ok: true });
	});

	it('pi en lettres reste refusé (#896)', () => {
		expect(runInput(session(), '.dériver cos(3x+pi/4)')).toEqual({
			kind: 'refus',
			message: 'Écris π avec \\pi ou le symbole π.'
		});
	});
});

describe('(B) un nom de fonction dans un exposant', () => {
	it('le bouton Dériver sur f(x)=2e^(sin(x))', () => {
		const s = session();
		runInput(s, 'f(x)=2e^(sin(x))');

		const outcome = runAction(s, 'derive', 'f');

		expect(outcome).toMatchObject({
			ok: true,
			latex: "f'(x) = 2 \\cos\\left( x \\right) \\exponentialE^{\\sin\\left( x \\right)}"
		});
	});

	it('le bouton Dériver sur f(x)=2ln(3)*3^(2x)', () => {
		const s = session();
		runInput(s, 'f(x)=2ln(3)*3^(2x)');

		const outcome = runAction(s, 'derive', 'f');

		expect(outcome.ok).toBe(true);
		expect(JSON.stringify(outcome)).not.toContain('l n');
	});

	it('la carte f′ de f(x)=2e^(sin(x)) se lit : son expression nomme sin et cos', () => {
		const s = session();
		runInput(s, 'f(x)=2e^(sin(x))');
		s.atelier.createDerivative('f');

		const derivative = expressionOf(s.atelier, "f'");

		expect(derivative).toEqual({ ok: true, expression: '2cos(x)e^{sin(x)}' });
	});

	it('la sortie texte de .dériver log_2(x) n’est pas g_2lo', () => {
		const result = runInput(session(), '.dériver 3log_2(x)');

		expect(result).toMatchObject({ kind: 'commande' });
		expect('output' in result ? result.output : '').toBe('d/dx(3log_2(x)) = 3/{xln(2)}');
		expect(latexOf(result)).toBe('\\dfrac{3}{x \\ln\\left( 2 \\right)}');
	});
});
