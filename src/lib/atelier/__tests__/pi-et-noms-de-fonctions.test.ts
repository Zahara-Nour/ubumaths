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
import { MIXED_NOTATION_MESSAGE } from '../parse';

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

	// Seul l'argument d'une commande de CALCUL devient `\pi` : l'écho garde ce
	// que l'élève a tapé (revue #911)
	it('l’écho de .dériver garde le π tapé', () => {
		expect(runInput(session(), '.dériver cos(3x+π/4)')).toMatchObject({
			kind: 'commande',
			input: '.dériver cos(3x+π/4)'
		});
	});

	// `.filtrer` lit des MODALITÉS : π y est une valeur comme une autre, pas la
	// constante. Réécrit en `\pi`, il répondait « \pi n'apparaît pas dans L »
	it('.filtrer L = π trouve la modalité π (L = π ; e ; π ; a)', () => {
		const s = session();
		s.atelier.create({ kind: 'list', name: 'L', definition: 'π ; e ; π ; a' });

		const result = runInput(s, '.filtrer L = π');

		expect(result).toMatchObject({ kind: 'commande', input: '.filtrer L = π' });
		expect(JSON.stringify(result)).not.toContain('apparaît pas');
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

/**
 * (C) Saisie MÊLÉE : un nom sans antislash (`sin(`) et une commande LaTeX que
 * le parseur maison ne lit pas (`\frac`, `\sqrt`, `\cdot`…). Le format détecté
 * est la syntaxe maison (le `sin(` l'emporte), qui refusait avec « Invalid
 * backslash sequence at position 0 » — en anglais, montré tel quel dans une
 * ligne de calcul (revue #911). Le message dit quoi faire, en français.
 */
describe('(C) saisie mêlée : un message français qui dit quoi écrire', () => {
	const MIXED = [
		'\\frac{1}{2}sin(x)',
		'sin(x)+\\frac{1}{x}',
		'\\sqrt{x}cos(x)',
		'a\\cdot sin(x)',
		'2\\times cos(x)',
		'\\left(sin(x)\\right)'
	];

	it.each(MIXED)('la carte h(x)=%s le dit', (text) => {
		const s = session();
		runInput(s, `h(x)=${text}`);

		const h = s.atelier.get('h');
		expect(h?.status).toBe('error');
		expect(h?.message).toBe(MIXED_NOTATION_MESSAGE);
	});

	it.each(MIXED)('la commande .dériver %s le dit', (text) => {
		expect(runInput(session(), `.dériver ${text}`)).toEqual({
			kind: 'refus',
			message: MIXED_NOTATION_MESSAGE
		});
	});

	it.each(MIXED.map((t) => t.replace(/\(x\)/g, '(2)').replace(/x/g, '3')))(
		'le calcul %s le dit',
		(text) => {
			const s = session();
			runInput(s, 'a=2');
			expect(runInput(s, text)).toEqual({ kind: 'refus', message: MIXED_NOTATION_MESSAGE });
		}
	);

	it('le message nomme les deux écritures, en français', () => {
		expect(MIXED_NOTATION_MESSAGE).toContain('\\sin(x)');
		expect(MIXED_NOTATION_MESSAGE).toContain('sin(x)');
		expect(MIXED_NOTATION_MESSAGE).not.toMatch(/Invalid|backslash/);
	});

	// Les saisies mêlées que le parseur maison LIT restent acceptées
	it.each(['cos(3x+\\pi/4)', '2sin(\\pi x)', 'e^{sin(x)}'])('%s reste lisible', (text) => {
		const s = session();
		runInput(s, `h(x)=${text}`);
		expect(s.atelier.get('h')?.status).toBe('ok');
	});
});
