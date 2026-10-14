/**
 * `.limite` : « Comment ? » (PR 3 de `.limite`, décisions de David du
 * 2026-10-14).
 *
 * - Les étapes sont celles de `generatePedagogicalLimitSteps` (lycée) ;
 *   elles ne s'affichent que si leur conclusion EST la réponse de `.limite`
 *   (valeur exacte comparée par valeur, « pas de limite » ↔ does-not-exist,
 *   même côté).
 * - Rien à montrer (substitution directe seule) → pas de « Comment ? », comme
 *   E4 de `.évaluer`.
 * - Résumé construit : la forme indéterminée, la technique, la conclusion.
 * - Une fonction ou une suite de l'atelier garde son nom : `\lim f(x)`.
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

// =============================================================================
// Décor
// =============================================================================

function session(setup: readonly string[] = []): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of setup) runInput(s, line);
	return s;
}

function commande(result: CalcResult) {
	if (result.kind !== 'commande') throw new Error(`attendu une commande, reçu ${result.kind}`);
	return result;
}

function line(input: string, setup: readonly string[] = []) {
	return commande(runInput(session(setup), input));
}

/** Les étapes de la ligne, qui doivent exister. */
function steps(input: string, setup: readonly string[] = []): readonly RenderedStep[] {
	const found = line(input, setup).steps;
	if (found === undefined) throw new Error(`pas d'étapes pour ${input}`);
	return found;
}

function summary(input: string, setup: readonly string[] = []): readonly RenderedStep[] {
	const found = line(input, setup).summary;
	if (found === undefined) throw new Error(`pas de résumé pour ${input}`);
	return found;
}

/**
 * Le LaTeX d'une étape, sans espaces, sans couleur, sans `\left`/`\right` ;
 * le saut de ligne `\\` devient `|`.
 */
function flat(step: RenderedStep): string {
	return (step.expressionLatex ?? '')
		.replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
		.replace(/\\textcolor\{blue\}\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g, '$1')
		.replace(/\\left|\\right/g, '')
		.replace(/[\s&]/g, '')
		.replace(/\\\\/g, '|');
}

function titles(list: readonly RenderedStep[]): string[] {
	return list.map((s) => s.title);
}

function last(list: readonly RenderedStep[]): RenderedStep {
	return list[list.length - 1];
}

/** Tout le texte des étapes (titres, explications), sous-étapes comprises. */
function prose(list: readonly RenderedStep[]): string[] {
	return list.flatMap((s) => [s.title, s.explanation ?? '', ...prose(s.subSteps ?? [])]);
}

// =============================================================================
// Les techniques
// =============================================================================

describe('factorisation : (x²−1)/(x−1) en 1', () => {
	const input = '.limite (x^2-1)/(x-1) en 1';

	it('la forme 0/0, la simplification, la conclusion', () => {
		const list = steps(input);
		expect(titles(list)).toEqual([
			"On veut calculer la limite de l'expression quand $x$ tend vers $1$",
			'Forme indéterminée $\\frac{0}{0}$ reconnue',
			'Simplification du facteur commun',
			'Substitution directe : on remplace $x$ par $1$',
			'La limite vaut $2$'
		]);
		// La fraction s'écrit en fraction, jamais `(x^2-1) / (x-1)`
		expect(flat(list[0])).toBe('\\lim_{x\\to1}\\dfrac{x^2-1}{x-1}');
		expect(flat(list[2])).toBe('\\lim_{x\\to1}\\dfrac{x^2-1}{x-1}|=\\lim_{x\\to1}(x+1)');
		expect(flat(list[2].subSteps?.[0] ?? list[2])).toBe('x^2-1|=(x-1)(x+1)');
		expect(flat(last(list))).toBe('\\lim_{x\\to1}(x+1)|=2');
	});

	it('le résumé : la technique, la conclusion, sans explications (ni la forme, 2026-10-12)', () => {
		const list = summary(input);
		expect(titles(list)).toEqual(['Simplification du facteur commun', 'La limite vaut $2$']);
		expect(list.every((s) => s.explanation === undefined)).toBe(true);
	});
});

describe('terme prépondérant : (3x²+1)/(x²−2) en +∞', () => {
	const input = '.limite (3x^2+1)/(x^2-2) en +inf';

	it('on factorise, on simplifie par x², limite 3', () => {
		const list = steps(input);
		const read = titles(list);
		expect(read).toContain('On factorise par le terme prépondérant');
		expect(read).toContain('Simplification par $x^2$');
		expect(read).toContain('Limites des termes');
		expect(last(list).title).toBe('La limite vaut $3$');
		expect(flat(last(list))).toBe('\\lim_{x\\to+\\infty}\\dfrac{3x^2+1}{x^2-2}|=3');
	});

	it('le résumé garde la factorisation, ni la forme ∞/∞ ni les limites des termes', () => {
		expect(titles(summary(input))).toEqual([
			'On factorise par le terme prépondérant',
			'Simplification par $x^2$',
			'La limite vaut $3$'
		]);
	});
});

describe('limites de référence', () => {
	it('1/x en 0⁺ : limite de référence, +∞', () => {
		const list = steps('.limite 1/x en 0+');
		expect(titles(list)).toEqual([
			"On veut calculer la limite de l'expression quand $x$ tend vers $0^+$",
			'Limite de référence',
			'La limite vaut $+\\infty$'
		]);
		expect(flat(last(list))).toBe('\\lim_{x\\to0^+}\\dfrac{1}{x}|=+\\infty');
	});

	it('e^x/x en +∞ : croissance comparée', () => {
		const list = steps('.limite e^x/x en +inf');
		expect(titles(list)).toContain('Croissance comparée');
		expect(last(list).title).toBe('La limite vaut $+\\infty$');
	});

	it('x e^{−x} en +∞ : croissance comparée, 0', () => {
		const list = steps('.limite x e^{-x} en +inf');
		expect(titles(list)).toContain('Croissance comparée');
		expect(last(list).title).toBe('La limite vaut $0$');
	});

	it('(√(x+4)−2)/x en 0 : la fraction sans les parenthèses tapées', () => {
		const list = steps('.limite (sqrt(x+4)-2)/x en 0');
		expect(flat(list[0])).toBe('\\lim_{x\\to0}\\dfrac{\\sqrt{x+4}-2}{x}');
		expect(last(list).title).toBe('La limite vaut $\\dfrac{1}{4}$');
	});

	it('(√(x+1)−1)/x en 0 : le conjugué, 1/2', () => {
		const list = steps('.limite (sqrt(x+1)-1)/x en 0');
		expect(flat(list[0])).toBe('\\lim_{x\\to0}\\dfrac{\\sqrt{x+1}-1}{x}');
		expect(titles(list)).toContain('Rationalisation : on multiplie par le conjugué');
		expect(last(list).title).toBe('La limite vaut $\\dfrac{1}{2}$');
	});
});

describe('les côtés', () => {
	it('1/x en 0 sans côté : à gauche −∞, à droite +∞, pas de limite', () => {
		const list = steps('.limite 1/x en 0');
		expect(titles(list)).toEqual([
			"On veut calculer la limite de l'expression quand $x$ tend vers $0$",
			'Étude de la limite à gauche en $0$',
			'Étude de la limite à droite en $0$',
			'Comparaison des limites à gauche et à droite',
			"La limite n'existe pas (limites à gauche et à droite distinctes)"
		]);
		expect(flat(list[1])).toBe('\\lim_{x\\to0^-}\\dfrac{1}{x}|=-\\infty');
		expect(flat(list[2])).toBe('\\lim_{x\\to0^+}\\dfrac{1}{x}|=+\\infty');
	});

	it('1/(2x−1) en 1/2⁺ : le point s’écrit {\\tfrac{1}{2}}^+, comme la ligne', () => {
		const list = steps('.limite 1/(2x-1) en 1/2+');
		const all = list.map((st) => `${st.title} ${st.expressionLatex ?? ''}`).join(' ');
		expect(all).toContain('{\\tfrac{1}{2}}^+');
		expect(all).not.toContain('\\dfrac{1}{2}^+');
	});

	it('ln x en 0 : le côté implicite, à droite, −∞', () => {
		const list = steps('.limite ln(x) en 0');
		expect(list[1].title).toBe('Étude de la limite à droite en $0$');
		expect(list[1].explanation).toBe(
			"L'expression n'est définie qu'à droite de $0$ : la limite en $0$ est la limite à droite."
		);
		expect(last(list).title).toBe('La limite vaut $-\\infty$');
		expect(flat(last(list))).toBe('\\lim_{x\\to0^+}\\ln(x)|=-\\infty');
	});
});

// =============================================================================
// Pas de « Comment ? »
// =============================================================================

describe('pas de « Comment ? »', () => {
	it.each([
		// Substitution directe seule : rien à montrer (E4 de `.évaluer`)
		['.limite x^2+1 en 2'],
		['.limite sqrt(x) en 0'],
		// Le moteur pédagogique ne sait pas (∞ − ∞ sans terme prépondérant),
		// `.limite` répond 0
		['.limite sqrt(x+1)-sqrt(x) en +inf'],
		// Oscillation : la raison de `.limite`, que les étapes ne rédigent pas
		['.limite sin(1/x) en 0'],
		// Gendarmes : le moteur ne rend pas les bornes (sondes numériques),
		// « Encadrement de l'expression » n'écrirait aucune inégalité
		['.limite x^2 sin(1/x) en 0'],
		['.limite x sin(1/x) en 0'],
		// « Je ne sais pas »
		['.limite x sin(x) en +inf'],
		// V60 : fonctions en escalier — le moteur pédagogique substitue
		// floor(1) = 1 sans voir le saut ; aucune étape plutôt qu'une fausse
		['.limite floor(x) en 1'],
		['.limite floor(x) en 1^+'],
		['.limite floor(x) en 1^-'],
		['.limite floor(x) en 1/2'],
		['.limite floor(x) en +inf'],
		['.limite floor(2x) en 1/2'],
		['.limite floor(x)/x en 1^+'],
		['.limite (x-floor(x))/(x-1) en 1^+'],
		['.limite sign(x) en 0'],
		['.limite sign(x)*x en 0'],
		// Conclusion juste par hasard (floor(1) = 1 à droite), raisonnement faux
		['.limite (x^2-1)/(x-1)+floor(x) en 1^+'],
		['.limite (x^2-1)/(x-1)+floor(x) en 1/2'],
		['.limite (x^2-4)/(x-2)*sign(x) en 2']
	])('%s : la réponse seule', (input) => {
		const result = line(input);
		expect(result.steps).toBeUndefined();
		expect(result.summary).toBeUndefined();
	});

	it('un refus n’a pas d’étapes', () => {
		const result = runInput(session(), '.limite 1/x en');
		expect(result.kind).toBe('refus');
		expect('steps' in result).toBe(false);
	});
});

// =============================================================================
// Fonctions et suites de l'atelier
// =============================================================================

describe('une fonction de l’atelier garde son nom', () => {
	it('g en 1 : on part de g(x), on conclut sur g(x)', () => {
		const list = steps('.limite g en 1', ['g(x) = (x^2-1)/(x-1)']);
		expect(list[0].title).toBe('On veut calculer la limite de $g(x)$ quand $x$ tend vers $1$');
		expect(flat(list[0])).toBe('\\lim_{x\\to1}g(x)|=\\lim_{x\\to1}\\dfrac{x^2-1}{x-1}');
		expect(flat(last(list))).toBe('\\lim_{x\\to1}g(x)|=2');
	});

	it('f(t) = 1/t : les étapes parlent de t', () => {
		const list = steps('.limite f en 0+', ['f(t) = 1/t']);
		expect(list[0].title).toBe('On veut calculer la limite de $f(t)$ quand $t$ tend vers $0^+$');
		expect(flat(last(list))).toBe('\\lim_{t\\to0^+}f(t)|=+\\infty');
		expect(prose(list).join(' ')).not.toContain('$x$');
	});

	it('une suite : u_n en +∞', () => {
		const list = steps('.limite u en +inf', ['u(n) = (2n+1)/(n+3)']);
		expect(list[0].title).toBe(
			'On veut calculer la limite de $u_n$ quand $n$ tend vers $+\\infty$'
		);
		expect(flat(last(list))).toBe('\\lim_{n\\to+\\infty}u_n|=2');
	});
});

// =============================================================================
// Écriture
// =============================================================================

describe('écriture', () => {
	it.each([
		['.limite (x^2-1)/(x-1) en 1'],
		['.limite (3x^2+1)/(x^2-2) en +inf'],
		['.limite 1/x en 0'],
		['.limite ln(x) en 0']
	])('%s : aucun `*`, aucune barre de division, maths entre $', (input) => {
		const list = steps(input);
		const all = (l: readonly RenderedStep[]): RenderedStep[] =>
			l.flatMap((s) => [s, ...all(s.subSteps ?? [])]);
		for (const step of all(list)) {
			expect(step.expressionLatex ?? '').not.toContain('*');
			expect(step.expressionLatex ?? '').not.toMatch(/\s\/\s/);
		}
		// Hors des `$…$`, aucune commande LaTeX dans la prose
		for (const text of prose(list)) {
			expect(text.replace(/\$[^$]*\$/g, '')).not.toMatch(/\\[a-zA-Z]/);
		}
	});
});
