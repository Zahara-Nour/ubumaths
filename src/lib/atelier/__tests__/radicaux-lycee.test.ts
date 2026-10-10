/**
 * `.résoudre` sur les équations et inéquations à racine carrée que tapent les
 * élèves de lycée (décision de David, 2026-10-08 : les cas du lycée, pas les
 * cas exotiques).
 *
 * Mesuré sur main avant ce lot :
 * - `√x = √2` rendait x = 79999999999999994478719195161/4·10²⁸ : la constante
 *   isolée passait par un flottant, élevé au carré ;
 * - `√x = x − 2` : « Type d'equation non supporte: unknown » — aucun solveur
 *   pour √u = v quand v dépend de x ;
 * - TOUTE inéquation à racine : « Je n'ai pas su lire cette expression » —
 *   la commande refusait toute relation autre que « = », alors que
 *   `solveInequality` sait faire.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

/** La réponse affichée sur la ligne, ou le message du refus. */
function answer(equation: string): string | undefined {
	const result = runInput(session(), `.résoudre ${equation}`);
	if (result.kind === 'refus') return `refus : ${result.message}`;
	return result.kind === 'commande' ? result.latex : undefined;
}

describe('√u = c : une valeur exacte reste exacte', () => {
	it.each([
		['sqrt(x)=sqrt(2)', 'x = 2'],
		['sqrt(x)=sqrt(3)', 'x = 3'],
		['sqrt(x)=2sqrt(2)', 'x = 8'],
		['sqrt(x+1)=sqrt(5)', 'x = 4']
	])('%s → %s', (equation, expected) => {
		expect(answer(equation)).toBe(expected);
	});
});

describe('√u = v, v dépendant de x : v ≥ 0 et u = v²', () => {
	it.each([
		['sqrt(x)=x-2', 'x = 4'],
		['sqrt(x+3)=x+1', 'x = 1'],
		['sqrt(2x+3)=x', 'x = 3'],
		['sqrt(x+5)=x-1', 'x = 4'],
		['sqrt(x)=2x-1', 'x = 1'],
		['sqrt(x+2)=x', 'x = 2'],
		['2sqrt(x)=x', 'S = \\left\\{ 0 \\,;\\, 4 \\right\\}']
	])('%s → %s', (equation, expected) => {
		expect(answer(equation)).toBe(expected);
	});

	it('√(x+1) = −x garde la condition −x ≥ 0 : seule la racine négative reste', () => {
		// x² − x − 1 = 0 : (1 ± √5)/2 ; seule (1 − √5)/2 ≤ 0
		const latex = answer('sqrt(x+1)=-x');
		expect(latex).toMatch(/^x = /);
		expect(latex).toContain('\\sqrt{5}');
		expect(latex).not.toContain('S =');
		// Même écriture que le moteur pour x² − x − 1 = 0
		expect(latex).toBe('x = \\dfrac{1}{2} - \\dfrac{\\sqrt{5}}{2}');
	});
});

describe('déjà justes avant le lot (non-régression)', () => {
	it.each([
		['sqrt(x)=3', 'x = 9'],
		['sqrt(x+1)=3', 'x = 8'],
		['sqrt(2x-1)=5', 'x = 13'],
		['sqrt(x)=-1', 'S = \\emptyset'],
		['3sqrt(x)-6=0', 'x = 4'],
		['sqrt(x)=1/2', 'x = \\dfrac{1}{4}'],
		['sqrt(x^2+1)=2', 'S = \\left\\{ -\\sqrt{3} \\,;\\, \\sqrt{3} \\right\\}'],
		['sqrt(x^2)=3', 'S = \\left\\{ -3 \\,;\\, 3 \\right\\}']
	])('%s → %s', (equation, expected) => {
		expect(answer(equation)).toBe(expected);
	});
});

describe('inéquations à racine : l’ensemble, domaine u ≥ 0 compris', () => {
	it.each([
		['sqrt(x)<2', 'S = [0 ; 4['],
		['sqrt(x)>3', 'S = ]9 ; +\\infty['],
		['sqrt(x)<=1', 'S = [0 ; 1]'],
		['sqrt(x-1)>2', 'S = ]5 ; +\\infty['],
		['sqrt(x)>=-1', 'S = [0 ; +\\infty['],
		['sqrt(x)<-1', 'S = \\emptyset'],
		['sqrt(x+2)<x', 'S = ]2 ; +\\infty['],
		['1/sqrt(x)<2', 'S = ]\\dfrac{1}{4} ; +\\infty[']
	])('%s → %s', (inequality, expected) => {
		expect(answer(inequality)).toBe(expected);
	});

	it('une inéquation que le moteur ne sait pas résoudre le DIT, sans « pas su lire »', () => {
		// Mélange trigonométrique / exponentielle : le signe reste inconnu sur au
		// moins un intervalle (`solveInequality` rend `partial`)
		const result = runInput(session(), '.résoudre sin(x)+sqrt(x)>x^3-exp(x)');
		expect(result.kind).toBe('refus');
		if (result.kind !== 'refus') return;
		expect(result.message).toBe('Je ne sais pas encore résoudre cette inéquation.');
	});
});

describe('revue : x² qui s’annulent, singletons, <= et ≤ (2026-10-08)', () => {
	it.each([
		// √u = v où u − v² devient AFFINE : x² + 5 = x² + 2x + 1
		['sqrt(x^2+5)=x+1', 'x = 2'],
		['sqrt(x^2+9)=x+3', 'x = 0'],
		['sqrt(x^2-3)=x-1', 'x = 2'],
		// La même cause sans racine : les x² s'annulent après développement
		['x^2+5=(x+1)^2', 'x = 2'],
		['x^2-x^2+2x=4', 'x = 2']
	])('%s → %s', (equation, expected) => {
		expect(answer(equation)).toBe(expected);
	});

	it('un intervalle réduit à un point s’écrit en singleton', () => {
		expect(answer('sqrt(x)<=x')).toBe('S = \\{0\\} \\cup [1 ; +\\infty[');
	});

	it.each([
		// `<=` / `>=` après une puissance : le parseur LaTeX ne lisait pas `<=`
		['x^3<=x', 'S = ]-\\infty ; -1] \\cup [0 ; 1]'],
		['x^3>=4x', 'S = [-2 ; 0] \\cup [2 ; +\\infty['],
		['e^x<=1', 'S = ]-\\infty ; 0]'],
		['e^x>=1', 'S = [0 ; +\\infty['],
		// Inchangés
		['x^2>=4', 'S = ]-\\infty ; -2] \\cup [2 ; +\\infty['],
		['x<=3', 'x \\leqslant 3'],
		// ≤ ≥ tapés tels quels
		['sqrt(x)≤3', 'S = [0 ; 9]'],
		['√(x+1)≤3', 'S = [-1 ; 8]'],
		['sqrt(x)≥1', 'S = [1 ; +\\infty[']
	])('%s → %s', (inequality, expected) => {
		expect(answer(inequality)).toBe(expected);
	});

	// Une borne en ln s'écrit en seuil, valeur approchée comprise (décision de
	// David, 2026-10-09)
	it('e^(2x) >= 3 est résolue (borne ln(3)/2)', () => {
		expect(answer('e^(2x)>=3')).toBe('x \\geq \\dfrac{\\ln\\left( 3 \\right)}{2} \\approx 0{,}55');
	});

	it('le nombre e s’écrit \\exponentialE, que MathLive rend « e » (vérifié)', () => {
		expect(answer('ln(x)<1')).toBe('S = ]0 ; \\exponentialE[');
		expect(answer('ln(x)=1')).toBe('x = \\exponentialE');
	});
});

describe('√ tapé sans parenthèses : la racine porte sur l’atome qui suit', () => {
	it.each([
		['√x=3', 'x = 9'],
		['√x<2', 'S = [0 ; 4['],
		['√x+1=3', 'x = 4'],
		// Inchangés
		['√(x+1)=3', 'x = 8'],
		['sqrt(x)=3', 'x = 9'],
		['\\sqrt{x}=3', 'x = 9']
	])('%s → %s', (equation, expected) => {
		expect(answer(equation)).toBe(expected);
	});

	it('√2x = 4 se lit √2 · x : x = 2√2', () => {
		expect(answer('√2x=4')).toBe(answer('sqrt(2)x=4'));
		expect(answer('√2x=4')).toBe('x = 2\\sqrt{2}');
	});

	it('√u_n = 2 se lit √(u_n) : pas de refus « plusieurs lettres »', () => {
		expect(answer('√u_n=2')).toBe(answer('sqrt(u_n)=2'));
		expect(answer('√x_1=2')).toBe(answer('sqrt(x_1)=2'));
	});

	it('2x + √3 = 0 : x = −√3/2', () => {
		expect(answer('2x+√3=0')).toBe(answer('2x+sqrt(3)=0'));
		expect(answer('2x+√3=0')).toContain('\\sqrt{3}');
	});
});

describe('ℝ s’écrit \\mathbb{R}, ℝ privé de points \\mathbb{R} \\setminus', () => {
	it.each([
		['x+1>x', 'S = \\mathbb{R}'],
		['x>=x', 'S = \\mathbb{R}'],
		['x^2>=0', 'S = \\mathbb{R}'],
		['x^2>0', 'S = \\mathbb{R} \\setminus \\left\\{ 0 \\right\\}'],
		['(x-1)(x-2)>0 ; x', 'S = ]-\\infty ; 1[ \\cup ]2 ; +\\infty['],
		// Inchangés
		['x+1<x', 'S = \\emptyset'],
		['1/x>0', 'S = ]0 ; +\\infty[']
	])('%s → %s', (inequality, expected) => {
		expect(answer(inequality)).toBe(expected);
	});

	it('deux points exclus : « ; » en LaTeX comme en texte', () => {
		const result = runInput(session(), '.résoudre (x^2-1)^2>0');
		expect(result.kind === 'commande' ? result.latex : '').toBe(
			'S = \\mathbb{R} \\setminus \\left\\{ -1 \\,;\\, 1 \\right\\}'
		);
		expect(result.kind === 'commande' ? result.output : '').toBe('S = ℝ \\ {-1 ; 1}');
	});

	it('le texte du terminal écrit ℝ \\ {0}, comme .domaine', () => {
		const result = runInput(session(), '.résoudre x^2>0');
		expect(result.kind === 'commande' ? result.output : '').toBe('S = ℝ \\ {0}');
	});
});

describe('une identité sur le domaine a pour solutions TOUT le domaine', () => {
	it.each([
		['x^2/x=x', 'S = \\mathbb{R} \\setminus \\left\\{ 0 \\right\\}'],
		['(x^2+x)/x=x+1', 'S = \\mathbb{R} \\setminus \\left\\{ 0 \\right\\}'],
		['x/x=1', 'S = \\mathbb{R} \\setminus \\left\\{ 0 \\right\\}'],
		['(x^2-1)/(x-1)=x+1', 'S = \\mathbb{R} \\setminus \\left\\{ 1 \\right\\}'],
		// Inchangés
		['(x^2-1)/(x-1)=2', 'S = \\emptyset'],
		['1/x=2', 'x = \\dfrac{1}{2}'],
		['x+1=x+1', 'S = \\mathbb{R}'],
		['x+1=x', 'S = \\emptyset']
	])('%s → %s', (equation, expected) => {
		expect(answer(equation)).toBe(expected);
	});
});

describe('bornes en racine carrée : \\sqrt{…} jamais échappé (2de)', () => {
	it.each([
		['x^2>2', 'S = ]-\\infty ; -\\sqrt{2}[ \\cup ]\\sqrt{2} ; +\\infty['],
		['x^2<3', 'S = ]-\\sqrt{3} ; \\sqrt{3}['],
		['x^2>=5', 'S = ]-\\infty ; -\\sqrt{5}] \\cup [\\sqrt{5} ; +\\infty['],
		['(x-1)^2<2', 'S = ]1 - \\sqrt{2} ; 1 + \\sqrt{2}[']
	])('%s → %s', (inequality, expected) => {
		expect(answer(inequality)).toBe(expected);
	});
});
