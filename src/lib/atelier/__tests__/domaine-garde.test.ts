/**
 * L'Atelier garde le domaine (chantier tidy-conditions, David 2026-10-26) :
 * toutes les commandes se comportent comme une expression tapée et
 * `.développer`, une simplification n'a lieu que si le domaine ne change pas.
 * Celle qui le change passe par le bouton de la ligne, « Simplifier pour
 * x ≠ 0 », qui montre le résultat avec sa condition (et ses étapes).
 *
 * Mesuré avant : `.simplifier x/x` → `1`, `.simplifier (x²−1)/(x+1)` →
 * `x − 1`, `.simplifier ln(x) − ln(x)` → `0`, `.factoriser x/x` → `1`, sans
 * aucune condition sur la ligne ; `.développer x(1/x − 1)` → `−x + x/x`, sans
 * moyen d'aller plus loin ; `1/(1/x)` → `x`.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

function line(input: string): Extract<CalcResult, { kind: 'calcul' | 'commande' }> {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	const result = runInput(s, input);
	if (result.kind !== 'calcul' && result.kind !== 'commande') {
		throw new Error(`attendu une ligne, reçu ${result.kind}`);
	}
	return result;
}

const flat = (latex: string | undefined) => (latex ?? '').replace(/\s/g, '');

describe('par défaut, le domaine est gardé', () => {
	it.each([
		['.simplifier x/x', '\\dfrac{x}{x}'],
		['.simplifier x^2/x', '\\dfrac{x^2}{x}'],
		['.simplifier (x^2-1)/(x+1)', '\\dfrac{x^2-1}{x+1}'],
		['.simplifier ln(x)-ln(x)', '\\ln\\left(x\\right)-\\ln\\left(x\\right)'],
		['.simplifier sqrt(x)^2', '\\sqrt{x}^2'],
		['x/x', '\\dfrac{x}{x}'],
		['1/(1/x)', '\\dfrac{1}{\\dfrac{1}{x}}'],
		['.développer x(1/x-1)', '-x+\\dfrac{x}{x}']
	])('%s → %s', (input, latex) => {
		expect(flat(line(input).latex)).toBe(flat(latex));
	});

	it('.factoriser x/x : rien à factoriser, sans simplifier en douce', () => {
		const result = line('.factoriser x/x');
		expect(result.output).not.toBe('1');
		expect(flat(result.latex)).not.toBe('1');
	});
});

describe('le bouton « Simplifier pour … » montre la simplification et sa condition', () => {
	it.each([
		['.simplifier x/x', 'Simplifier pour x ≠ 0', '1\\text{,}\\quad\\text{pour }x\\neq0'],
		[
			'.simplifier (x^2-1)/(x+1)',
			'Simplifier pour x ≠ −1',
			'x-1\\text{,}\\quad\\text{pour }x\\neq-1'
		],
		['.simplifier ln(x)-ln(x)', 'Simplifier pour x > 0', '0\\text{,}\\quad\\text{pour }x>0'],
		['.simplifier sqrt(x)^2', 'Simplifier pour x ≥ 0', 'x\\text{,}\\quad\\text{pour }x\\geq0'],
		['.simplifier x^2/x+x', 'Simplifier pour x ≠ 0', '2x\\text{,}\\quad\\text{pour }x\\neq0'],
		['x/x', 'Simplifier pour x ≠ 0', '1\\text{,}\\quad\\text{pour }x\\neq0'],
		['1/(1/x)', 'Simplifier pour x ≠ 0', 'x\\text{,}\\quad\\text{pour }x\\neq0'],
		['.développer x(1/x-1)', 'Simplifier pour x ≠ 0', '-x+1\\text{,}\\quad\\text{pour }x\\neq0'],
		['.factoriser x/x', 'Simplifier pour x ≠ 0', '1\\text{,}\\quad\\text{pour }x\\neq0']
	])('%s : « %s » → %s', (input, label, latex) => {
		const { alternative } = line(input);
		expect(alternative?.label).toBe(label);
		expect(flat(alternative?.latex)).toBe(flat(latex));
	});

	it('deux conditions : reliées par « et »', () => {
		const { alternative } = line('x/x+y/y');
		expect(alternative?.label).toBe('Simplifier pour x ≠ 0 et y ≠ 0');
	});

	it('le bouton basculé dit le chemin du retour', () => {
		expect(line('.simplifier x/x').alternative?.back).toBe('Sans simplifier');
	});

	it('.simplifier : le bouton porte les étapes, la condition dans le titre', () => {
		const { alternative } = line('.simplifier (x^2-1)/(x+1)');
		expect(alternative?.steps?.map((s) => s.rule)).toEqual([
			'fraction-factorise',
			'fraction-cancel'
		]);
		expect(alternative?.steps?.[1].title).toContain('x ≠ −1');
	});

	it('.simplifier x^2/x+x : les étapes d’avant la condition restent sur la ligne', () => {
		const result = line('.simplifier x^2/x+x');
		expect(result.steps?.map((s) => s.rule)).not.toContain('fraction-cancel');
		expect(result.alternative?.steps?.map((s) => s.rule)).toContain('fraction-cancel');
	});
});

describe('le domaine ne change pas : la simplification a lieu, sans bouton', () => {
	it.each([
		['.simplifier x/x+ln(x)', '\\ln\\left(x\\right)+1'],
		['.simplifier e^x/e^x', '1'],
		['.simplifier x/x^2', '\\dfrac{1}{x}'],
		['.simplifier 2x+3x', '5x'],
		['.simplifier ln(e^x)', 'x'],
		['x+x', '2x'],
		['.développer (x+1)^2', 'x^2+2x+1']
	])('%s → %s', (input, latex) => {
		const result = line(input);
		expect(flat(result.latex)).toBe(flat(latex));
		expect(result.alternative).toBeUndefined();
	});
});

describe('une condition qu’on ne sait pas écrire : pas de simplification, pas de bouton', () => {
	// `tan` s'écrit depuis le § 5 (L3) : `cot` reste sans condition écrivable
	it('.simplifier cot(x)/cot(x)', () => {
		const result = line('.simplifier cot(x)/cot(x)');
		expect(flat(result.latex)).not.toBe('1');
		expect(result.alternative).toBeUndefined();
	});
});

describe('revue du 2026-10-26 : l’écriture d’une condition ne compte pas', () => {
	it.each([
		['.simplifier 1/(1+x)', '\\dfrac{1}{x+1}'],
		['.simplifier 2/(2x+2)', '\\dfrac{1}{x+1}'],
		['1/(2+x)+1/(x+2)', '\\dfrac{2}{2+x}'],
		['x/x+ln(x)', '1+\\ln\\left(x\\right)']
	])('%s → %s, sans bouton', (input, latex) => {
		const result = line(input);
		expect(flat(result.latex)).toBe(flat(latex));
		expect(result.alternative).toBeUndefined();
	});

	it('.simplifier ln(1+x) : aucun bouton', () => {
		expect(line('.simplifier ln(1+x)').alternative).toBeUndefined();
	});

	it('(x+1)/(1+x) : « Simplifier pour x ≠ −1 » → 1', () => {
		const { alternative } = line('(x+1)/(1+x)');
		expect(alternative?.label).toBe('Simplifier pour x ≠ −1');
		expect(flat(alternative?.latex)).toBe(flat('1\\text{,}\\quad\\text{pour }x\\neq-1'));
	});
});

// § 4.2 (2026-10-26) : la ligne garde l'écriture, comme avant ; le bouton
// montre la réécriture avec la condition où elle vaut (« pour x > 0 »)
describe('revue du 2026-10-26 : une réécriture qui rétrécit le domaine passe au bouton', () => {
	it.each([
		['.simplifier ln(x^2)', 'Simplifier pour x > 0'],
		['.simplifier ln(x^2)+1/(x-1)', 'Simplifier pour x > 0']
	])('%s : « %s »', (input, label) => {
		const result = line(input);
		expect(flat(result.latex)).not.toContain('2\\ln');
		expect(flat(result.latex)).not.toContain('\\ln\\left(x\\right)+');
		expect(flat(result.latex)).not.toContain('\\ln\\left(x\\right)-');
		expect(result.alternative?.label).toContain(label);
	});
});

// Plusieurs lettres (§ 5, L5) : la ligne garde l'écriture ; le bouton vient
// quand chaque condition d'après porte sur une lettre (`x > 0 et y > 0`) et
// dit celles d'avant ; sinon (revue Opus du § 4.2) ni simplification ni bouton
describe('plusieurs lettres : une réécriture qui rétrécit le domaine n’a pas lieu', () => {
	it.each(['.simplifier ln(x*y)', '.simplifier ln(x/y)'])(
		'%s : « pour x > 0 et y > 0 »',
		(input) => {
			const result = line(input);
			expect(result.alternative?.label).toBe('Simplifier pour x > 0 et y > 0');
			expect(flat(result.latex)).not.toContain('\\ln\\left(x\\right)+');
			expect(flat(result.latex)).not.toContain('\\ln\\left(x\\right)-');
		}
	);

	it('.simplifier ln((x+y)z) : x + y > 0 porte sur deux lettres, ni bouton ni simplification', () => {
		const result = line('.simplifier ln((x+y)z)');
		expect(result.alternative).toBeUndefined();
		expect(flat(result.latex)).not.toContain('+\\ln\\left(z\\right)');
	});
});

describe('revue du 2026-10-26 : un décimal tapé reste décimal', () => {
	it('0,5x/x → « 0,5, pour x ≠ 0 »', () => {
		expect(flat(line('0,5x/x').alternative?.latex)).toBe(
			flat('0{,}5\\text{,}\\quad\\text{pour }x\\neq0')
		);
	});
});

// tidy-conditions, PR D : le moteur pédagogique développait `ln(xy)` et
// s'arrêtait sur `ln x + ln y − (ln x + ln y)` (bouton) ; `ln(2x) − ln(2x)`
// laissait cette écriture sur la ligne, sans bouton
describe('une différence de deux logarithmes égaux : le bouton rend 0', () => {
	it.each([
		['.simplifier ln(xy)-ln(xy)', 'Simplifier pour xy > 0', '0\\text{,}\\quad\\text{pour }xy>0'],
		['.simplifier ln(2x)-ln(2x)', 'Simplifier pour x > 0', '0\\text{,}\\quad\\text{pour }x>0'],
		['.simplifier ln(2x)-ln(2x)+1', 'Simplifier pour x > 0', '1\\text{,}\\quad\\text{pour }x>0'],
		[
			'.simplifier ln(x(x+1))-ln(x(x+1))',
			'Simplifier pour x < −1 ou x > 0',
			'0\\text{,}\\quad\\text{pour }x<-1\\text{ ou }x>0'
		],
		['ln(xy)-ln(xy)', 'Simplifier pour xy > 0', '0\\text{,}\\quad\\text{pour }xy>0']
	])('%s : « %s » → %s', (input, label, latex) => {
		const result = line(input);
		expect(result.latex).not.toContain('\\left( \\ln');
		expect(result.alternative?.label).toBe(label);
		expect(flat(result.alternative?.latex)).toBe(flat(latex));
	});

	it('.simplifier ln(x/y)-ln(x/y) : 0', () => {
		expect(flat(line('.simplifier ln(x/y)-ln(x/y)').alternative?.domain?.answer)).toBe('0');
	});

	it('témoin : .simplifier 2ln(xy)-ln(xy) garde ses étapes', () => {
		const { alternative } = line('.simplifier 2ln(xy)-ln(xy)');
		expect(alternative?.label).toBe('Simplifier pour x > 0 et y > 0');
		expect(alternative?.steps?.map((s) => s.rule)).toEqual([
			'ln-product',
			'tidy-collect-like-terms'
		]);
	});
});
