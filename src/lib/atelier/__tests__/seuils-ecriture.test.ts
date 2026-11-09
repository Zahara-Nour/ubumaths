/**
 * `.résoudre` sur les SEUILS des suites géométriques (1re / Tle) : l'écriture
 * de la réponse (décision de David, 2026-10-09).
 *
 * 1. Les décimaux tapés par l'élève restent des décimaux DANS les ln, écrits à
 *    la française (`\ln(0{,}8)`, pas `\ln(\frac{4}{5})`) ; le texte dit la même
 *    chose (`ln(0.8)`), avec ou sans `dans`.
 * 2. Une solution (ou une borne) qui contient un ln reçoit sa valeur approchée
 *    à 2 décimales : `n > \dfrac{\ln(0{,}1)}{\ln(0{,}8)} \approx 10{,}32`.
 *    Rien quand la solution est exacte simple (`2^n = 1024` → 10) ou sans ln.
 * 3. Pas de « premier entier » : c'est le travail de l'élève.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult } from '../calcul';

function run(input: string): CalcResult {
	return runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, input);
}

/** Le rendu LaTeX de la réponse, sans espaces. */
function answer(result: CalcResult): string {
	if (result.kind !== 'commande' && result.kind !== 'calcul') {
		throw new Error(`attendu une réponse, reçu ${JSON.stringify(result)}`);
	}
	return (result.latex ?? '').replace(/\s+/g, '');
}

/** Le texte de la réponse. */
function text(result: CalcResult): string {
	if (result.kind !== 'commande') {
		throw new Error(`attendu une réponse, reçu ${JSON.stringify(result)}`);
	}
	return result.output;
}

const solve = (input: string): CalcResult => run(`.résoudre ${input}`);

describe('seuil d’une inéquation : décimaux gardés, valeur approchée', () => {
	it.each([
		[
			'0.8^n<0.1',
			'n>\\dfrac{\\ln\\left(0{,}1\\right)}{\\ln\\left(0{,}8\\right)}\\approx10{,}32',
			'n > ln(0,1)/ln(0,8) ≈ 10,32'
		],
		[
			'1.05^n>2',
			'n>\\dfrac{\\ln\\left(2\\right)}{\\ln\\left(1{,}05\\right)}\\approx14{,}21',
			'n > ln(2)/ln(1,05) ≈ 14,21'
		],
		[
			'0.9^n<0.5',
			'n>\\dfrac{\\ln\\left(0{,}5\\right)}{\\ln\\left(0{,}9\\right)}\\approx6{,}58',
			'n > ln(0,5)/ln(0,9) ≈ 6,58'
		],
		[
			'2^n>1000',
			'n>\\dfrac{\\ln\\left(1000\\right)}{\\ln\\left(2\\right)}\\approx9{,}97',
			'n > ln(1000)/ln(2) ≈ 9,97'
		],
		['e^x>5', 'x>\\ln\\left(5\\right)\\approx1{,}61', 'x > ln(5) ≈ 1,61']
	])('%s → %s', (input, latex, output) => {
		const result = solve(input);
		expect(answer(result)).toBe(latex);
		expect(text(result)).toBe(output);
	});

	it('inégalité large : 0.8^n<=0.1 → n ⩾ …', () => {
		expect(answer(solve('0.8^n<=0.1'))).toBe(
			'n\\geq\\dfrac{\\ln\\left(0{,}1\\right)}{\\ln\\left(0{,}8\\right)}\\approx10{,}32'
		);
	});
});

describe('équation : décimaux gardés, valeur approchée au bouton ≈ (David, 2026-11-03)', () => {
	it.each([
		[
			'1.5^n=10',
			'S=\\left\\{\\dfrac{\\ln\\left(10\\right)}{\\ln\\left(1{,}5\\right)}\\right\\}',
			'S = {ln(10)/ln(1,5)}'
		],
		[
			// La cible 1500/1000 s'écrit 1,5 : l'élève a tapé des décimaux
			'1000*1.02^n=1500',
			'S=\\left\\{\\dfrac{\\ln\\left(1{,}5\\right)}{\\ln\\left(1{,}02\\right)}\\right\\}',
			'S = {ln(1,5)/ln(1,02)}'
		],
		['e^x=5', 'S=\\left\\{\\ln\\left(5\\right)\\right\\}', 'S = {ln(5)}']
	])('%s → %s', (input, latex, output) => {
		const result = solve(input);
		expect(answer(result)).toBe(latex);
		expect(text(result).endsWith(`\n${output}`)).toBe(true);
	});

	it('avec `dans` : la même écriture', () => {
		const result = solve('1.5^n=10 dans [0 ; 100]');
		expect(answer(result)).toBe(
			'S=\\left\\{\\dfrac{\\ln\\left(10\\right)}{\\ln\\left(1{,}5\\right)}\\right\\}'
		);
		expect(text(result)).toBe('S = {ln(10)/ln(1,5)}');
	});
});

describe('sans ln : rien ne change', () => {
	it.each([
		['2^n=1024', 'S=\\left\\{10\\right\\}'],
		['3^x=1/9', 'S=\\left\\{-2\\right\\}'],
		['0.5^n<=0.25', 'S=[2;+\\infty['],
		['2*0.5^n=1', 'S=\\left\\{1\\right\\}'],
		['2^n=-3', 'S=\\emptyset'],
		['0.3x=1', 'S=\\left\\{\\dfrac{10}{3}\\right\\}'],
		['ln(x)=1', 'S=\\left\\{\\exponentialE\\right\\}'],
		['2x+1<7', 'S=]-\\infty;3[']
	])('%s → %s', (input, expected) => {
		expect(answer(solve(input))).toBe(expected);
	});

	it('pas de « ≈ » dans le texte d’une solution exacte', () => {
		expect(text(solve('2^n=1024'))).not.toContain('≈');
		expect(text(solve('0.5^n<=0.25'))).toBe('S = [2 ; +∞[');
	});

	it.each([
		['.dériver 0.5x^2', 'x'],
		// Un décimal tapé : la primitive en décimal quand elle tombe juste (R5, Q42 b)
		['.intégrer 1.5x', '0{,}75x^2+C']
	])('%s → %s', (input, expected) => {
		expect(answer(run(input))).toBe(expected);
	});
});

describe('base e : la même règle (revue, 2026-10-09)', () => {
	it.each([
		['e^x=0.5', 'S=\\left\\{\\ln\\left(0{,}5\\right)\\right\\}', 'S = {ln(0,5)}'],
		['e^x=2.5', 'S=\\left\\{\\ln\\left(2{,}5\\right)\\right\\}', 'S = {ln(2,5)}'],
		// La valeur approchée va au mode décimal, comme au bouton ≈ (PR 2c, Q2)
		['ln(x)=2', 'S=\\left\\{\\exponentialE^2\\right\\}', 'S = {e^2}']
	])('%s → %s', (input, latex, output) => {
		const result = solve(input);
		expect(answer(result)).toBe(latex);
		expect(text(result).endsWith(`\n${output}`)).toBe(true);
	});

	it('le texte d’un seuil est mis au propre comme le LaTeX : e^(2x)>=3', () => {
		const result = solve('e^(2x)>=3');
		expect(answer(result)).toBe('x\\geq\\dfrac{\\ln\\left(3\\right)}{2}\\approx0{,}55');
		expect(text(result)).toBe('x ≥ ln(3)/2 ≈ 0,55');
	});

	it('e^(-x)>0,5 est résolue : x < … ≈ 0,69', () => {
		const result = solve('e^(-x)>0.5');
		expect(answer(result)).toMatch(/^x<.*\\ln.*\\approx0\{,\}69$/);
		expect(text(result)).toMatch(/^x < .*ln.* ≈ 0,69$/);
	});

	// La réponse est l'ensemble ; sa valeur approchée va au bouton ≈ (David, 2026-11-03)
	it('e^(-x)=0,5 est résolue : S = {−ln(0,5)}', () => {
		expect(answer(solve('e^(-x)=0.5'))).toBe('S=\\left\\{-\\ln\\left(0{,}5\\right)\\right\\}');
	});

	it('cible décimale après division : 200*1.05^n>300 → ln(1,5)', () => {
		expect(answer(solve('200*1.05^n>300'))).toBe(
			'n>\\dfrac{\\ln\\left(1{,}5\\right)}{\\ln\\left(1{,}05\\right)}\\approx8{,}31'
		);
	});

	it('une inéquation avec « dans » : l’ensemble restreint, la borne en ln approchée', () => {
		const result = solve('0.8^n<0.1 dans [0;100]');
		expect(answer(result)).toContain('\\approx10{,}32');
		expect(text(result)).toBe('S = ]ln(0,1)/ln(0,8) ; 100] avec ln(0,1)/ln(0,8) ≈ 10,32');
	});
});
