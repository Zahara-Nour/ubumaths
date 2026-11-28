/**
 * V103 (registre des écarts) : une limite avec une lettre (k) se calculait en
 * supposant k « comme il faut » : `1/(x² + k)` en 0 → 1/k, faux pour k = 0
 * (+∞). Décision de David du 2026-11-24 : la réponse dit sa condition
 * (« 1/k, pour k ≠ 0 ») ; une limite qui ne dépend pas de k est donnée sans
 * condition ; une condition qu'on ne sait pas écrire fait refuser
 * (docs/wip/ecarts-valeurs-fausses-progress.md).
 *
 * Sonde : le chemin de l'Atelier (`runInput`), le rendu LaTeX affiché.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '#lib/atelier/atelier.svelte.ts';
import { WebReplEngine } from '#lib/mathAST/cli/web/web-repl-engine.ts';
import { runInput, type CalcResult } from '#lib/atelier/calcul.ts';

/** Une saisie de l'Atelier, dans une session neuve. */
function run(input: string): CalcResult {
	return runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, input);
}

/** Le LaTeX d'une réponse de l'Atelier (vide pour un refus). */
function latexOf(result: CalcResult): string {
	return 'latex' in result && result.latex ? result.latex : '';
}

/** Le texte d'une réponse : la sortie d'une commande, ou le message d'un refus. */
function textOf(result: CalcResult): string {
	if ('output' in result && result.output) return result.output;
	return 'message' in result ? result.message : '';
}

const FOR = '\\text{,}\\quad\\text{pour }';

describe('V103 — la limite dit sa condition sur k', () => {
	it.each([
		['\\frac{1}{x^2+k} en 0', 'x\\to 0', '\\dfrac{1}{x^2 + k}', '\\dfrac{1}{k}', 'k \\neq 0'],
		['\\frac{1}{x+k} en 0', 'x\\to 0', '\\dfrac{1}{x + k}', '\\dfrac{1}{k}', 'k \\neq 0'],
		[
			'\\ln(x+k) en 0+',
			'x\\to 0^+',
			'\\ln\\left( x + k \\right)',
			'\\ln\\left( k \\right)',
			'k > 0'
		],
		[
			'\\ln(x^2+k) en 0',
			'x\\to 0',
			'\\ln\\left( x^2 + k \\right)',
			'\\ln\\left( k \\right)',
			'k > 0'
		],
		['\\sqrt{x+k} en 0+', 'x\\to 0^+', '\\sqrt{x + k}', '\\sqrt{k}', 'k \\geqslant 0']
	])('.limite %s', (typed, point, body, value, condition) => {
		expect(latexOf(run(`.limite ${typed}`))).toBe(
			`\\lim\\limits_{${point}} ${body} = ${value}${FOR}${condition}`
		);
	});

	it('tan(x + k) en 0 : tan k, pour k ≠ π/2 + nπ', () => {
		expect(latexOf(run('.limite \\tan(x+k) en 0'))).toBe(
			`\\lim\\limits_{x\\to 0} \\tan\\left( x + k \\right) = \\tan\\left( k \\right)${FOR}k \\neq \\dfrac{\\pi}{2} + n \\pi,\\ n \\in \\mathbb{Z}`
		);
	});

	it('le texte de la ligne dit aussi la condition', () => {
		expect(textOf(run('.limite \\frac{1}{x^2+k} en 0'))).toBe(
			'lim x→0 1/(x^2+k) = 1/k, pour k ≠ 0'
		);
	});
});

describe('V103 — sans condition : vrai pour tout k', () => {
	it.each([
		['kx+1 en 2', '\\lim\\limits_{x\\to 2} \\left(k x + 1\\right) = 2 k + 1'],
		[
			'\\frac{1}{x^2+k^2+1} en 0',
			'\\lim\\limits_{x\\to 0} \\dfrac{1}{x^2 + k^2 + 1} = \\dfrac{1}{k^2 + 1}'
		],
		// k = 0 : l'expression tapée n'existe déjà pas
		['\\frac{x}{k} en 1', '\\lim\\limits_{x\\to 1} \\dfrac{x}{k} = \\dfrac{1}{k}']
	])('.limite %s', (typed, expected) => {
		expect(latexOf(run(`.limite ${typed}`))).toBe(expected);
	});
});

describe('V103 — acceptées au lieu d’être refusées (même valeur pour tout k)', () => {
	it.each([
		['x^2+kx en 0+', '\\lim\\limits_{x\\to 0^+} \\left(x^2 + k x\\right) = 0'],
		[
			'x\\ln x+kx en 0+',
			'\\lim\\limits_{x\\to 0^+} \\left(x \\ln\\left( x \\right) + k x\\right) = 0'
		],
		['\\frac{k^2+1}{x} en 0+', '\\lim\\limits_{x\\to 0^+} \\dfrac{k^2 + 1}{x} = +\\infty']
	])('.limite %s', (typed, expected) => {
		expect(latexOf(run(`.limite ${typed}`))).toBe(expected);
	});
});

describe('V103 — toujours refusées', () => {
	it('e^{kx} en +∞ : la discussion selon le signe de k est pour plus tard', () => {
		const result = run('.limite e^{kx} en +inf');

		expect(latexOf(result)).toBe('');
		expect(textOf(result)).toBe(
			'Je ne sais pas calculer cette limite : elle peut dépendre du signe de k.'
		);
	});

	it('1/(x + a + b) en 0 : la condition a + b ≠ 0 ne s’écrit pas, refus', () => {
		const result = run('.limite \\frac{1}{x+a+b} en 0');

		// Aujourd'hui `1/(a + b)`, sans condition.
		expect(latexOf(result)).toBe('');
		expect(textOf(result)).toMatch(/^Je ne sais pas calculer cette limite/);
	});

	it('1/(x − kx) en 0+ : son signe dépend de k, refus', () => {
		const result = run('.limite \\frac{1}{x-kx} en 0+');

		expect(latexOf(result)).toBe('');
		expect(textOf(result)).toMatch(/^Je ne sais pas calculer cette limite/);
	});
});

describe('V103 — revue : k = 0 change la limite', () => {
	// Rendaient 0 et +∞ sans condition : faux pour k = 0 (pas de limite, −∞)
	it.each([
		['\\frac{x}{x^2+k} en 0', `\\lim\\limits_{x\\to 0} \\dfrac{x}{x^2 + k} = 0${FOR}k \\neq 0`],
		[
			'\\frac{1}{x+k}+\\frac{1}{x-k} en 0',
			`\\lim\\limits_{x\\to 0} \\left(\\dfrac{1}{x + k} + \\dfrac{1}{x - k}\\right) = 0${FOR}k \\neq 0`
		],
		[
			'\\frac{1}{x}-\\frac{1}{x^2+k} en 0+',
			`\\lim\\limits_{x\\to 0^+} \\left(\\dfrac{1}{x} - \\dfrac{1}{x^2 + k}\\right) = +\\infty${FOR}k \\neq 0`
		],
		[
			'\\frac{1}{x}-\\frac{1}{x^2+k^2} en 0+',
			`\\lim\\limits_{x\\to 0^+} \\left(\\dfrac{1}{x} - \\dfrac{1}{x^2 + k^2}\\right) = +\\infty${FOR}k \\neq 0`
		]
	])('.limite %s', (typed, expected) => {
		expect(latexOf(run(`.limite ${typed}`))).toBe(expected);
	});

	it('(k² + 1)/x en 0+ reste +∞ sans condition', () => {
		expect(latexOf(run('.limite \\frac{k^2+1}{x} en 0+'))).toBe(
			'\\lim\\limits_{x\\to 0^+} \\dfrac{k^2 + 1}{x} = +\\infty'
		);
	});
});

describe('V125 — une valeur dont les lettres se simplifient est un nombre', () => {
	it('(x + k)/(x² + k) en 0 : 1, pour k ≠ 0 (pour k = 0, 1/x n’a pas de limite)', () => {
		expect(latexOf(run('.limite \\frac{x+k}{x^2+k} en 0'))).toBe(
			`\\lim\\limits_{x\\to 0} \\dfrac{x + k}{x^2 + k} = 1${FOR}k \\neq 0`
		);
	});
});

describe('L121 — d’un seul côté, la limite des deux côtés quand elle existe', () => {
	it('x/(kx + x²) en 0⁺ : 1/k, pour k ≠ 0 (l’expression vaut 1/(k + x))', () => {
		expect(latexOf(run('.limite \\frac{x}{kx+x^2} en 0+'))).toBe(
			`\\lim\\limits_{x\\to 0^+} \\dfrac{x}{k x + x^2} = \\dfrac{1}{k}${FOR}k \\neq 0`
		);
	});
});
