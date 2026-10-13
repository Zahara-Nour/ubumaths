/**
 * Atelier — « Comment ? » pour `.intégrer` (plan `docs/wip/atelier-progress.md`,
 * 2b, PR 1 ; décisions de David du 2026-10-13).
 *
 * La réponse de la ligne reste celle du moteur `integration`. Les étapes de
 * `pedagogical-integration` ne s'ajoutent que quand elles disent vrai :
 *
 * - **montrées** : polynômes, eˣ, 1/x sur un intervalle de signe constant,
 *   cos/sin, IPP (cyclique comprise), éléments simples, et les composées dont
 *   l'intégrande est EXACTEMENT u′·f(u) (`2e^{2x}`, `\frac{2x}{x^2+1}`) ;
 * - **refusées** (pas d'étapes, la ligne garde sa réponse) : une composée dont
 *   le coefficient 1/u′ n'est pas expliqué (`e^{2x}`, `\sin(2x)`, `e^{-x}`,
 *   `\frac3x`…), des bornes littérales, des étapes qui ne concordent pas avec
 *   le moteur (`\ln x` de 0 à 1), un intégrande que les étapes ne savent pas
 *   rédiger (`\frac{1}{x^2}`).
 * - **pôle dans [a ; b]** : la ligne est un REFUS, qui ne porte pas d'étapes.
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { integrateSteps } from '../integrate-steps';
import { astOf } from '../parse';

// =============================================================================
// Décor
// =============================================================================

function lastEntry(input: string) {
	const desk = new CalcDesk(new Atelier());
	desk.submit(input);
	return desk.entries[desk.entries.length - 1];
}

/** Toutes les étapes, sous-étapes comprises. */
function flatten(steps: readonly RenderedStep[]): RenderedStep[] {
	return steps.flatMap((step) => [step, ...flatten(step.subSteps ?? [])]);
}

/** La réponse du moteur, en arbre, pour appeler `integrateSteps` directement. */
function node(text: string) {
	const parsed = astOf(text, 'text');
	if (parsed === null) throw new Error(`illisible : ${text}`);
	return parsed;
}

// =============================================================================
// Montrées : la ligne porte des étapes et leur résumé
// =============================================================================

describe('.intégrer : étapes montrées quand elles disent vrai', () => {
	it.each([
		// [saisie, réponse de la ligne — celle du moteur, inchangée]
		['.intégrer x^2', '\\dfrac{1}{3} x^3 + C'],
		['.intégrer 3x^2+2x', 'x^3 + x^2 + C'],
		['.intégrer 3e^x', '3 \\exponentialE^x + C'],
		['.intégrer 5\\cos(x)', '5 \\sin\\left( x \\right) + C'],
		['.intégrer 2e^{2x}', '\\exponentialE^{2 x} + C'],
		['.intégrer 2xe^{x^2}', '\\exponentialE^{x^2} + C'],
		['.intégrer \\frac{2x}{x^2+1}', '\\ln\\left( x^2 + 1 \\right) + C'],
		['.intégrer xe^x', '\\left( x - 1 \\right) \\exponentialE^x + C'],
		['.intégrer \\ln(x)', 'x \\ln\\left( x \\right) - x + C'],
		// Hors terminale, montrés (décision de David) : IPP cyclique, éléments simples
		[
			'.intégrer e^x\\sin(x)',
			'\\dfrac{1}{2} \\exponentialE^x \\sin\\left( x \\right) - \\dfrac{1}{2} \\cos\\left( x \\right) \\exponentialE^x + C'
		],
		[
			'.intégrer \\frac{1}{x^2-1}',
			'\\dfrac{1}{2} \\ln\\left( \\left| x - 1 \\right| \\right) - \\dfrac{1}{2} \\ln\\left( \\left| x + 1 \\right| \\right) + C'
		]
	])('%s', (input, answer) => {
		const entry = lastEntry(input);
		expect(entry.failed).toBe(false);
		expect(entry.latex).toBe(answer);
		expect(entry.steps).toBeDefined();
		expect(entry.steps!.length).toBeGreaterThan(0);
		// Le résumé : mêmes titres, sans les « pourquoi »
		expect(entry.summary).toBeDefined();
		expect(flatten(entry.summary!).map((s) => s.title)).toEqual(
			flatten(entry.steps!).map((s) => s.title)
		);
		expect(flatten(entry.summary!).every((s) => s.explanation === undefined)).toBe(true);
	});

	it('texte : `.intégrer x^3+1` (sans LaTeX)', () => {
		const entry = lastEntry('.intégrer x^3+1');
		expect(entry.steps).toBeDefined();
	});

	it('`+ C` gardé : la dernière étape ajoute la constante', () => {
		const entry = lastEntry('.intégrer x^2');
		expect(entry.steps![entry.steps!.length - 1].rule).toBe('add-constant');
	});

	it.each([
		['.intégrer x^2 de 0 à 1', '\\dfrac{1}{3}'],
		['.intégrer \\frac1x de 1 à 2', '\\ln\\left( 2 \\right)'],
		['.intégrer 1/x de 1 à 2', '\\ln\\left( 2 \\right)'],
		// Éléments simples, facteurs x − r : rien de caché
		['.intégrer \\frac{1}{x(x-1)} de 2 à 3', '2 \\ln\\left( 2 \\right) - \\ln\\left( 3 \\right)']
	])('intégrale définie %s', (input, answer) => {
		const entry = lastEntry(input);
		expect(entry.latex).toBe(answer);
		expect(entry.steps).toBeDefined();
		expect(entry.steps!.map((s) => s.rule)).toContain('simplify-bounds-result');
	});

	it('une autre variable : `.intégrer 3t^2 pour t`', () => {
		const entry = lastEntry('.intégrer 3t^2 pour t');
		expect(entry.latex).toBe('t^3 + C');
		expect(entry.steps).toBeDefined();
	});

	it('les virgules décimales s’écrivent aussi dans les étapes', () => {
		const entry = lastEntry('.intégrer x de 0 à 0.5');
		const latex = flatten(entry.steps!)
			.map((s) => s.expressionLatex ?? '')
			.join(' ');
		expect(latex).toContain('{,}');
		expect(latex).not.toMatch(/\d\.\d/);
	});
});

// =============================================================================
// Refusées : la ligne garde la réponse du moteur, sans étapes
// =============================================================================

describe('.intégrer : coefficient non expliqué (composée, éléments simples) → pas d’étapes', () => {
	it.each([
		['.intégrer e^{2x}', '\\dfrac{1}{2} \\exponentialE^{2 x} + C'],
		['.intégrer \\sin(2x)', '-\\dfrac{1}{2} \\cos\\left( 2 x \\right) + C'],
		['.intégrer xe^{x^2}', '\\dfrac{1}{2} \\exponentialE^{x^2} + C'],
		['.intégrer \\cos(3x+1)', '\\dfrac{1}{3} \\sin\\left( 3 x + 1 \\right) + C'],
		[
			'.intégrer \\frac{1}{2x+1}',
			'\\dfrac{1}{2} \\ln\\left( \\left| 2 x + 1 \\right| \\right) + C'
		],
		['.intégrer e^{-x}', '-\\exponentialE^{-x} + C'],
		['.intégrer -e^{-x}', '\\exponentialE^{-x} + C'],
		['.intégrer \\frac3x', '3 \\ln\\left( \\left| x \\right| \\right) + C'],
		['.intégrer \\frac{x}{x^2+1}', '\\dfrac{1}{2} \\ln\\left( x^2 + 1 \\right) + C'],
		['.intégrer (2x+1)^3', '\\dfrac{1}{8} \\left( 2 x + 1 \\right)^4 + C'],
		// IPP : le ½ caché est dans la sous-étape ∫v·u′ (½e^{2x} → ¼e^{2x})
		[
			'.intégrer xe^{2x}',
			'\\dfrac{1}{2} x \\exponentialE^{2 x} - \\dfrac{1}{4} \\exponentialE^{2 x} + C'
		],
		['.intégrer e^{2x} de 0 à 1', '\\dfrac{1}{2} \\exponentialE^2 - \\dfrac{1}{2}'],
		// Éléments simples à facteur non unitaire : le titre promet A·ln|x − r|,
		// la ligne écrit (A/2)·ln|2x − 1| (revue du 2026-10-13)
		[
			'.intégrer \\frac{1}{(2x-1)(x+1)}',
			'\\dfrac{1}{3} \\ln\\left( \\left| 2 x - 1 \\right| \\right) - \\dfrac{1}{3} \\ln\\left( \\left| x + 1 \\right| \\right) + C'
		],
		[
			'.intégrer \\frac{3}{2x^2+x-1}',
			'\\ln\\left( \\left| 2 x - 1 \\right| \\right) - \\ln\\left( \\left| x + 1 \\right| \\right) + C'
		],
		[
			'.intégrer \\frac{1}{4x^2-1}',
			'\\dfrac{1}{4} \\ln\\left( \\left| 2 x - 1 \\right| \\right) - \\dfrac{1}{4} \\ln\\left( \\left| 2 x + 1 \\right| \\right) + C'
		]
	])('%s', (input, answer) => {
		const entry = lastEntry(input);
		expect(entry.failed).toBe(false);
		expect(entry.latex).toBe(answer);
		expect(entry.steps).toBeUndefined();
		expect(entry.summary).toBeUndefined();
	});

	it('en texte aussi : `.intégrer exp(2x)`', () => {
		expect(lastEntry('.intégrer exp(2x)').steps).toBeUndefined();
	});
});

describe('.intégrer : autres refus', () => {
	it('bornes littérales : `.intégrer x^2 de 0 à a` → pas d’étapes, réponse du moteur', () => {
		const entry = lastEntry('.intégrer x^2 de 0 à a');
		expect(entry.latex).toBe('\\dfrac{1}{3} a^3');
		expect(entry.steps).toBeUndefined();
	});

	it('étapes discordantes : `\\ln x` de 0 à 1 → le moteur dit −1, les étapes refusent', () => {
		const entry = lastEntry('.intégrer \\ln(x) de 0 à 1');
		expect(entry.latex).toBe('-1');
		expect(entry.steps).toBeUndefined();
	});

	it('pas de rédaction : `\\frac{1}{x^2}` → la réponse du moteur seule', () => {
		const entry = lastEntry('.intégrer \\frac{1}{x^2}');
		expect(entry.latex).toBe('-\\dfrac{1}{x} + C');
		expect(entry.steps).toBeUndefined();
	});

	it('pôle dans [a ; b] : la ligne est un refus, sans étapes', () => {
		const entry = lastEntry('.intégrer 1/x de -1 à 1');
		expect(entry.failed).toBe(true);
		expect(entry.text).toContain("L'intégrale diverge ou n'est pas définie sur [-1 ; 1]");
		expect(entry.steps).toBeUndefined();
	});
});

// =============================================================================
// La garde de concordance, appelée directement
// =============================================================================

describe('integrateSteps : la garde de concordance', () => {
	it('primitive : une primitive du moteur à une constante près est acceptée', () => {
		// x³/3 + 7 : même dérivée que x³/3
		expect(
			integrateSteps({ expression: 'x^2', variable: null, bounds: null }, node('x^3/3+7'))
		).not.toBeNull();
	});

	it('primitive : une réponse du moteur différente est refusée', () => {
		expect(
			integrateSteps({ expression: 'x^2', variable: null, bounds: null }, node('x^3'))
		).toBeNull();
	});

	it('définie : une valeur du moteur différente est refusée', () => {
		const bounds = { lower: '0', upper: '1' };
		expect(
			integrateSteps({ expression: 'x^2', variable: null, bounds }, node('1/3'))
		).not.toBeNull();
		expect(integrateSteps({ expression: 'x^2', variable: null, bounds }, node('1/2'))).toBeNull();
	});

	it('ne lève jamais : saisie illisible → null', () => {
		expect(
			integrateSteps({ expression: ')(', variable: null, bounds: null }, node('x'))
		).toBeNull();
	});
});
