/**
 * Un nom de fonction n'est JAMAIS lu en silence comme autre chose.
 *
 * Avant : `.dériver acos(3x)` rendait `-3a·sin(3x)` (a·cos), `floor(3x)` se
 * dérivait en `3flo^2r` (lu f·l·o·o·r), `sec(3x)` en `3sec'(3x)` (fonction
 * générique), `racine(x)` en produit de six lettres — sans aucune erreur.
 *
 * Règle (notation maison) :
 * (a) les alias usuels sont lus sous le nom du moteur (`acos` → arccos,
 *     `sh` → sinh, `tg` → tan…) ;
 * (b) floor, ceil, round, sign : la valeur se calcule, la DÉRIVÉE est refusée
 *     en français ;
 * (c) une suite d'au moins 3 lettres collée à `(`, qui n'est ni une fonction
 *     ni « une lettre + une fonction » (`xsin(x)`), est refusée : « Fonction
 *     inconnue ». Deux lettres (`ab(x+1)`, `ax(x-2)`) restent un produit.
 *
 * Coefficients ≠ 1 partout : une constante mal lue s'y voit.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, runAction, type CalcSession } from '../calcul';
import { parseLatex } from '$lib/mathAST/parser';
import { compile } from '$lib/mathAST/eval/compile';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function latexOf(result: ReturnType<typeof runInput>): string | undefined {
	return 'latex' in result ? result.latex : undefined;
}

/** La valeur en `x` d'une réponse LaTeX — le RÉSULTAT, pas sa forme. */
function valueAt(latex: string | undefined, x: number): number {
	if (latex === undefined) return NaN;
	return compile(parseLatex(latex))({ x });
}

describe('(a) alias usuels', () => {
	it.each([
		['acos(3x)', 'arccos(3x)'],
		['asin(2x)', 'arcsin(2x)'],
		['atan(x^2)', 'arctan(x^2)'],
		['Arccos(3x)', 'arccos(3x)'],
		['Arcsin(2x)', 'arcsin(2x)'],
		['Arctan(3x)', 'arctan(3x)'],
		['sh(3x)', 'sinh(3x)'],
		['ch(3x)', 'cosh(3x)'],
		['th(3x)', 'tanh(3x)'],
		['tg(3x)', 'tan(3x)']
	])('.dériver %s = .dériver %s', (alias, canonical) => {
		const got = runInput(session(), `.dériver ${alias}`);
		const reference = runInput(session(), `.dériver ${canonical}`);

		expect(latexOf(reference)).toBeDefined();
		expect(latexOf(got)).toBe(latexOf(reference));
	});

	it('acos(1/2) se calcule comme arccos(1/2)', () => {
		const got = runInput(session(), 'acos(1/2)');
		const reference = runInput(session(), 'arccos(1/2)');
		expect(latexOf(got)).toBe(latexOf(reference));
	});

	it('f(x)=acos(3x) est une fonction lisible, pas « en attente de a »', () => {
		const s = session();
		runInput(s, 'f(x)=acos(3x)');

		expect(s.atelier.get('f')?.status).toBe('ok');
	});

	it.each([
		['sec(3x)', (x: number) => (3 * Math.sin(3 * x)) / Math.cos(3 * x) ** 2],
		['csc(3x)', (x: number) => (-3 * Math.cos(3 * x)) / Math.sin(3 * x) ** 2],
		['cot(3x)', (x: number) => -3 / Math.sin(3 * x) ** 2]
	])('.dériver %s rend la vraie dérivée, pas une fonction générique', (input, reference) => {
		const latex = latexOf(runInput(session(), `.dériver ${input}`));

		expect(latex).not.toContain("'");
		for (const x of [0.3, 0.7, 1.1]) {
			expect(valueAt(latex, x)).toBeCloseTo(reference(x), 8);
		}
	});

	// Valeur exacte gardée, comme sin(1/2) — mais plus « Unknown function: sec »
	it('sec(1/2) se calcule comme sin(1/2), sans erreur', () => {
		const result = runInput(session(), 'sec(1/2)');

		expect(result).toMatchObject({ kind: 'calcul', latex: '\\sec\\left( \\dfrac{1}{2} \\right)' });
		expect(JSON.stringify(result)).not.toMatch(/error|Unknown/i);
	});
});

describe('(b) fonctions sans dérivée classique', () => {
	it.each([
		['floor(3x)', 'partie entière'],
		['ceil(3x)', 'partie entière'],
		['round(3x)', 'arrondi'],
		['sign(3x)', 'signe'],
		['sgn(3x)', 'signe']
	])('.dériver %s est refusé en français', (input, word) => {
		const result = runInput(session(), `.dériver ${input}`);

		expect(result.kind).toBe('refus');
		expect((result as { message: string }).message).toContain(word);
		expect((result as { message: string }).message).toContain('pas dérivable');
	});

	it('la partie entière : « n’est pas dérivable partout »', () => {
		const result = runInput(session(), '.dériver floor(3x)');

		expect(result).toMatchObject({
			kind: 'refus',
			message: expect.stringContaining("la partie entière n'est pas dérivable partout")
		});
	});

	it.each([
		['floor(2.5)', '2'],
		['ceil(2.5)', '3'],
		['round(2.4)', '2'],
		['sign(-3)', '-1']
	])('%s se calcule : %s', (input, value) => {
		expect(runInput(session(), input)).toMatchObject({ kind: 'calcul', output: value });
	});

	it('f(x)=floor(3x) : f(0.5) vaut 1, le bouton Dériver refuse en français', () => {
		const s = session();
		runInput(s, 'f(x)=floor(3x)');

		expect(runInput(s, 'f(1/2)')).toMatchObject({ kind: 'calcul', output: '1' });
		const derived = runAction(s, 'derive', 'f');
		expect(derived.ok).toBe(false);
		expect((derived as { message: string }).message).toContain('partie entière');
	});

	it('.dériver abs(3x) dit pourquoi, pas « Je n’ai pas su lire »', () => {
		const result = runInput(session(), '.dériver abs(3x)');

		expect(result.kind).toBe('refus');
		expect((result as { message: string }).message).toContain('valeur absolue');
	});
});

describe('(c) fonction inconnue', () => {
	it.each(['racine(3x)', 'acoss(3x)', 'arcos(3x)', 'Racine(4)'])(
		'.dériver %s : « Fonction inconnue »',
		(input) => {
			const result = runInput(session(), `.dériver ${input}`);
			const name = input.slice(0, input.indexOf('('));

			expect(result).toMatchObject({
				kind: 'refus',
				message: expect.stringContaining(`Fonction inconnue : ${name}`)
			});
		}
	);

	it('racine(4) en calcul : refusé, avec les fonctions disponibles', () => {
		const result = runInput(session(), 'racine(4)');

		expect(result).toMatchObject({
			kind: 'refus',
			message: expect.stringContaining('Fonctions disponibles')
		});
		expect((result as { message: string }).message).toContain('sqrt');
	});

	it('f(x)=racine(x) : définition refusée, pas « en attente de r, a, c… »', () => {
		const s = session();
		const result = runInput(s, 'f(x)=racine(x)');

		expect(result.kind === 'refus' || s.atelier.get('f')?.status === 'error').toBe(true);
		expect(JSON.stringify(result)).toContain('Fonction inconnue : racine');
	});

	it('abc(x+1) : le message propose a*b*c*(x+1)', () => {
		const result = runInput(session(), '.dériver abc(x+1)');

		expect(result).toMatchObject({
			kind: 'refus',
			message: expect.stringContaining('a*b*c*(')
		});
	});

	// Cas légitimes : ils ne changent pas
	it('ax(x-2) reste a·x·(x−2) : .dériver rend 2ax − 2a', () => {
		const s = session();
		runInput(s, 'a = 3');
		const latex = latexOf(runInput(s, '.dériver ax(x-2)'));

		// a = 3 : 6x − 6
		expect(valueAt(latex?.replace(/a/g, '(3)'), 2)).toBeCloseTo(6, 8);
	});

	it('xsin(x) reste x·sin(x)', () => {
		const latex = latexOf(runInput(session(), '.dériver 3xsin(x)'));

		expect(valueAt(latex, 0.7)).toBeCloseTo(3 * Math.sin(0.7) + 3 * 0.7 * Math.cos(0.7), 8);
	});

	it('ab(x+1) reste un produit en calcul', () => {
		const s = session();
		runInput(s, 'a = 2');
		runInput(s, 'b = 5');

		expect(runInput(s, 'ab(3+1)')).toMatchObject({ kind: 'calcul', output: '40' });
	});
});
