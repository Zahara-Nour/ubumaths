/**
 * `.évaluer` : « Comment ? » (PR 3 de `.évaluer`, décisions de David du
 * 2026-10-14).
 *
 * - **E2** : rédaction COLLÈGE, une opération par étape (pièges du négatif
 *   compris : (−3)² = (−3) × (−3) = 9, « Soustraire −3, c'est ajouter 3 »).
 * - **E3** : la première étape est rédigée par l'atelier, « On remplace $x$
 *   par $-3$ », l'expression où la valeur a pris la place de la lettre,
 *   négatifs entre parenthèses ; le RÉSUMÉ = ce remplacement + le résultat.
 * - **E4** : pas de « Comment ? » quand le calcul n'a rien à montrer :
 *   fonction transcendante (`e^0`, `\ln 1`, `\sin 0`), une seule étape
 *   « On calcule », aucune étape.
 * - **Garde** : les étapes concluent, par valeur exacte, la réponse du
 *   moteur ; toute exception → pas d'étapes ; aucun `*` dans le LaTeX.
 * - **E5** : réponse décimale → virgule dans les étapes ; étapes qui passent
 *   par des fractions alors que la réponse est décimale → pas de « Comment ? ».
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

/** Le LaTeX d'une étape, sans espaces, sans couleur, sans `\left`/`\right`. */
function flat(step: RenderedStep): string {
	return (step.expressionLatex ?? '')
		.replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
		.replace(/\\textcolor\{blue\}/g, '')
		.replace(/\\left|\\right/g, '')
		.replace(/[{}\s&]/g, '');
}

/** La dernière ligne écrite par les étapes : la valeur conclue. */
function conclusion(all: readonly RenderedStep[]): string {
	const last = flat(all[all.length - 1]);
	return last.split('\\\\').pop()?.replace(/^=/, '') ?? '';
}

/** Aucun astérisque, dans aucune étape, résumé compris. */
function expectNoStar(input: string, setup: readonly string[] = []): void {
	const result = line(input, setup);
	for (const step of [...(result.steps ?? []), ...(result.summary ?? [])]) {
		expect(step.expressionLatex ?? '').not.toContain('*');
	}
}

// =============================================================================
// E3 : le remplacement, rédigé par l'atelier
// =============================================================================

describe('la première étape : on remplace la lettre par la valeur', () => {
	it('x^2 en x=3 : « On remplace $x$ par $3$ », puis 3 × 3 = 9', () => {
		const all = steps('.évaluer x^2 en x=3');
		expect(all[0].title).toBe('On remplace $x$ par $3$');
		expect(flat(all[0])).toBe('3^2');
		expect(all.some((s) => flat(s).includes('3\\times3'))).toBe(true);
		expect(conclusion(all)).toBe('9');
	});

	it('x^2 en x=-3 : le négatif entre parenthèses, (−3) × (−3) = 9', () => {
		const all = steps('.évaluer x^2 en x=-3');
		expect(all[0].title).toBe('On remplace $x$ par $-3$');
		expect(all[0].expressionLatex).toContain('\\left(');
		expect(flat(all[0])).toBe('(-3)^2');
		expect(all.some((s) => flat(s).includes('(-3)\\times(-3)'))).toBe(true);
		expect(conclusion(all)).toBe('9');
	});

	it('-x^2 en x=3 : −3² = −9 (l’opposé du carré)', () => {
		const all = steps('.évaluer -x^2 en x=3');
		expect(flat(all[0])).toBe('-3^2');
		expect(conclusion(all)).toBe('-9');
	});

	it('3x-5 en x=-2 : 3 × (−2) − 5, le produit écrit ×', () => {
		const all = steps('.évaluer 3x-5 en x=-2');
		expect(flat(all[0])).toBe('3\\times(-2)-5');
		expect(conclusion(all)).toBe('-11');
		expectNoStar('.évaluer 3x-5 en x=-2');
	});

	it('2x^2-3x+1 en x=-1 : une opération par étape, et « Soustraire −3 »', () => {
		const all = steps('.évaluer 2x^2-3x+1 en x=-1');
		expect(flat(all[0])).toBe('2\\times(-1)^2-3\\times(-1)+1');
		expect(all.some((s) => s.title.includes('Soustraire $-3$'))).toBe(true);
		expect(conclusion(all)).toBe('6');
		expectNoStar('.évaluer 2x^2-3x+1 en x=-1');
	});

	it('\\frac{x+1}{x-1} en x=3 : (3 + 1)/(3 − 1) = 2', () => {
		const all = steps('.évaluer \\frac{x+1}{x-1} en x=3');
		expect(flat(all[0])).toBe('\\dfrac3+13-1');
		expect(conclusion(all)).toBe('2');
	});

	it('\\frac12x+\\frac34 en x=2 : dénominateur commun, 7/4', () => {
		const all = steps('.évaluer \\frac12x+\\frac34 en x=2');
		expect(flat(all[0])).toBe('\\dfrac12\\times2+\\dfrac34');
		expect(all.some((s) => s.rule === 'to-common-denominator')).toBe(true);
		expect(conclusion(all)).toBe('\\dfrac74');
	});

	it('\\sqrt{x+5} en x=4 : √9 = 3', () => {
		const all = steps('.évaluer \\sqrt{x+5} en x=4');
		expect(flat(all[0])).toBe('\\sqrt4+5');
		expect(conclusion(all)).toBe('3');
	});

	it('(x-1)^2 en x=-1 : (−1 − 1)² = (−2)² = 4', () => {
		const all = steps('.évaluer (x-1)^2 en x=-1');
		expect(flat(all[0])).toBe('(-1-1)^2');
		expect(all.some((s) => flat(s).includes('(-2)\\times(-2)'))).toBe(true);
		expect(conclusion(all)).toBe('4');
	});

	it('x^3 en x=-2 : (−2) × (−2) × (−2) = −8', () => {
		const all = steps('.évaluer x^3 en x=-2');
		expect(all.some((s) => flat(s).includes('(-2)\\times(-2)\\times(-2)'))).toBe(true);
		expect(conclusion(all)).toBe('-8');
	});

	it('une fonction de l’atelier : f(2) = 2² + 1, puis 5', () => {
		const all = steps('.évaluer f en x=2', ['f(x) = x^2+1']);
		expect(all[0].title).toBe('On remplace $x$ par $2$');
		expect(flat(all[0])).toBe('f(2)=2^2+1');
		expect(conclusion(all)).toBe('5');
	});

	it('la réponse de la ligne ne change pas', () => {
		expect(line('.évaluer 2x^2-3x+1 en x=-1').latex).toBe('6');
		expect(line('.évaluer f en x=2', ['f(x) = x^2+1']).latex?.replace(/\s/g, '')).toBe('f(2)=5');
	});
});

// =============================================================================
// Résumé / Détaillé
// =============================================================================

describe('le résumé : le remplacement, puis le résultat', () => {
	it('2x^2-3x+1 en x=-1 : deux étapes, la seconde conclut 6', () => {
		const result = line('.évaluer 2x^2-3x+1 en x=-1');
		const summary = result.summary;
		expect(summary).toBeDefined();
		expect(summary).toHaveLength(2);
		expect(summary?.[0]).toEqual(result.steps?.[0]);
		const last = flat(summary?.[1] ?? { id: 0, rule: '', title: '' });
		expect(last).toBe('2\\times(-1)^2-3\\times(-1)+1=6');
		// Le détaillé, lui, montre chaque opération
		expect(result.steps?.length).toBeGreaterThan(2);
	});

	it('une fonction : le résultat s’écrit f(2) = 5', () => {
		const summary = line('.évaluer f en x=2', ['f(x) = x^2+1']).summary;
		expect(flat(summary?.[1] ?? { id: 0, rule: '', title: '' })).toBe('f(2)=5');
	});

	it('une seule opération après le remplacement : pas d’interrupteur', () => {
		const result = line('.évaluer 2x en x=3');
		expect(result.steps).toHaveLength(2);
		expect(result.summary).toBeUndefined();
	});
});

// =============================================================================
// E4 : rien à montrer → pas de « Comment ? »
// =============================================================================

describe('pas de « Comment ? » quand le calcul n’a rien à montrer', () => {
	it.each([
		['.évaluer e^x en x=0'],
		['.évaluer \\ln x en x=1'],
		['.évaluer \\sin x en x=0'],
		['.évaluer \\cos(x) en x=0']
	])('%s : fonction transcendante', (input) => {
		expect(line(input).steps).toBeUndefined();
	});

	it('une valeur qui ne se calcule pas : rien (x en x=3)', () => {
		expect(line('.évaluer x en x=3').steps).toBeUndefined();
	});
});

// =============================================================================
// Refus, décimaux, plusieurs lettres
// =============================================================================

describe('refus, décimaux, plusieurs lettres', () => {
	it('valeur interdite : le refus du moteur, sans étapes', () => {
		const result = runInput(session(), '.évaluer \\frac{x+1}{x-1} en x=1');
		expect(result.kind).toBe('refus');
		if (result.kind === 'refus') expect(result.steps).toBeUndefined();
	});

	it('réponse décimale, étapes en fractions : pas de « Comment ? » (x^2 en x=1,5)', () => {
		const result = line('.évaluer x^2 en x=1,5');
		expect(result.latex).toBe('2{,}25');
		expect(result.steps).toBeUndefined();
	});

	it('réponse décimale, étapes en décimaux : la virgule (2x en x=1,5)', () => {
		const all = steps('.évaluer 2x en x=1,5');
		expect(all[0].expressionLatex).toContain('1{,}5');
		expect(all.every((s) => !(s.expressionLatex ?? '').includes('1.5'))).toBe(true);
		expect(conclusion(all)).toBe('3');
	});

	it('une valeur posée en plus de la variable : pas d’étapes', () => {
		expect(line('.évaluer a x en x=3', ['a = 2']).steps).toBeUndefined();
	});
});

// =============================================================================
// Revue du 2026-10-14
// =============================================================================

describe('revue : valeur posée, négatif en tête de produit, parenthèses inutiles', () => {
	it('une valeur posée tapée après « en » (x=a) : pas d’étapes', () => {
		expect(line('.évaluer 2x en x=a', ['a = 3']).steps).toBeUndefined();
	});

	it('f en x=a : la ligne s’écrit f(3) = 10, sans parenthèses doublées', () => {
		const result = line('.évaluer f en x=a', ['a = 3', 'f(x) = x^2+1']);
		expect(result.latex?.replace(/\s/g, '')).toBe('f(3)=10');
		expect(result.output).toBe('f(3) = 10');
		expect(result.steps).toBeUndefined();
	});

	it('x(x-1) en x=-2 : le négatif en tête de produit entre parenthèses dès le remplacement', () => {
		const all = steps('.évaluer x(x-1) en x=-2');
		expect(flat(all[0])).toBe('(-2)(-2-1)');
		expect(conclusion(all)).toBe('6');
	});

	it('x\\cdot x en x=-2 : (−2) × (−2)', () => {
		const all = steps('.évaluer x\\cdot x en x=-2');
		expect(flat(all[0])).toBe('(-2)\\times(-2)');
		expect(conclusion(all)).toBe('4');
	});

	it('-x^2 en x=-3 : −(−3)² = −9', () => {
		const all = steps('.évaluer -x^2 en x=-3');
		expect(flat(all[0])).toBe('-(-3)^2');
		expect(conclusion(all)).toBe('-9');
	});

	it('e^x+1 en x=0 : une puissance de e, pas de « Comment ? »', () => {
		// Mesuré : le pipeline n'y rend que « On calcule » (déjà écarté)
		expect(line('.évaluer e^x+1 en x=0').steps).toBeUndefined();
	});

	it.each([
		['.évaluer e^x+x^2 en x=0'],
		['.évaluer 2e^x+3x en x=0'],
		['.évaluer \\ln(x)+x^2 en x=1']
	])('%s : des opérations autour d’une fonction transcendante, pas de « Comment ? »', (input) => {
		// Sans la garde, ces lignes montraient e^0 et ln(1) avalés par « On calcule »
		expect(line(input).steps).toBeUndefined();
	});

	it('g(x)+1 en x=2 : 2² + 1, puis 2 × 2, sans parenthèses inutiles', () => {
		const all = steps('.évaluer g(x)+1 en x=2', ['g(x) = x^2']);
		expect(flat(all[0])).toBe('2^2+1');
		expect(all.some((s) => flat(s).includes('2\\times2'))).toBe(true);
		expect(conclusion(all)).toBe('5');
	});
});
