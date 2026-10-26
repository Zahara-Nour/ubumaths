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
		['1/(1/x)', '\\dfrac{1}{\\left(\\dfrac{1}{x}\\right)}'],
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
		['.simplifier x/x', 'Simplifier pour x ≠ 0', '1,\\quad\\text{pour }x\\neq0'],
		['.simplifier (x^2-1)/(x+1)', 'Simplifier pour x ≠ −1', 'x-1,\\quad\\text{pour }x\\neq-1'],
		['.simplifier ln(x)-ln(x)', 'Simplifier pour x > 0', '0,\\quad\\text{pour }x>0'],
		['.simplifier sqrt(x)^2', 'Simplifier pour x ≥ 0', 'x,\\quad\\text{pour }x\\geq0'],
		['.simplifier x^2/x+x', 'Simplifier pour x ≠ 0', '2x,\\quad\\text{pour }x\\neq0'],
		['x/x', 'Simplifier pour x ≠ 0', '1,\\quad\\text{pour }x\\neq0'],
		['1/(1/x)', 'Simplifier pour x ≠ 0', 'x,\\quad\\text{pour }x\\neq0'],
		['.développer x(1/x-1)', 'Simplifier pour x ≠ 0', '-x+1,\\quad\\text{pour }x\\neq0'],
		['.factoriser x/x', 'Simplifier pour x ≠ 0', '1,\\quad\\text{pour }x\\neq0']
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
	it('.simplifier tan(x)/tan(x)', () => {
		const result = line('.simplifier tan(x)/tan(x)');
		expect(flat(result.latex)).not.toBe('1');
		expect(result.alternative).toBeUndefined();
	});
});
