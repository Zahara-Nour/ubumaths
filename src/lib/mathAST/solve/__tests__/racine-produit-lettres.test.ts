/**
 * V92 (registre des écarts) : `x² − ab = 0` rendait ±√a·√b « si 4ab ⩾ 0 ».
 *
 * √(ab) = √a·√b n'est vrai que pour a, b ⩾ 0 : avec a = b = −1, √a√b n'existe
 * pas alors que ab = 1 ⩾ 0 et S = {−1 ; 1}. La racine d'un produit de lettres
 * de signe inconnu ne se découpe jamais (phase 0 validée par David le
 * 2026-11-24, docs/wip/ecarts-valeurs-fausses-progress.md).
 *
 * Sonde : le chemin de l'Atelier (`runInput`), le rendu LaTeX affiché.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '#lib/atelier/atelier.svelte.ts';
import { WebReplEngine } from '#lib/mathAST/cli/web/web-repl-engine.ts';
import { runInput, type CalcResult } from '#lib/atelier/calcul.ts';

/** Des saisies de l'Atelier dans une même session ; la réponse de la dernière. */
function run(...inputs: string[]): CalcResult {
	const session = { atelier: new Atelier(), engine: new WebReplEngine() };
	let result: CalcResult | null = null;
	for (const input of inputs) result = runInput(session, input);
	if (result === null) throw new Error('aucune saisie');
	return result;
}

/** Le LaTeX d'une réponse de l'Atelier (vide pour un refus). */
function latexOf(result: CalcResult): string {
	return 'latex' in result && result.latex ? result.latex : '';
}

describe('V92 — la racine d’un produit de lettres n’est pas découpée', () => {
	it('x² − ab = 0 : S = {√(ab) ; −√(ab)} si ab ⩾ 0', () => {
		expect(latexOf(run('.résoudre x^2-ab=0'))).toBe(
			'S = \\left\\{ \\sqrt{a b} \\,;\\, -\\sqrt{a b} \\right\\} \\quad \\text{si } a b \\geqslant 0'
		);
	});

	it('x² − 4ab = 0 : ±2√(ab) si ab ⩾ 0', () => {
		expect(latexOf(run('.résoudre x^2-4ab=0'))).toBe(
			'S = \\left\\{ 2 \\sqrt{a b} \\,;\\, -2 \\sqrt{a b} \\right\\} \\quad \\text{si } a b \\geqslant 0'
		);
	});

	it('x² − abc = 0 : ±√(abc) si abc ⩾ 0', () => {
		expect(latexOf(run('.résoudre x^2-abc=0'))).toBe(
			'S = \\left\\{ \\sqrt{a b c} \\,;\\, -\\sqrt{a b c} \\right\\} \\quad \\text{si } a b c \\geqslant 0'
		);
	});

	it('x³ − abx = 0 (degré 3, même formule) : 0 et ±√(ab)', () => {
		const latex = latexOf(run('.résoudre x^3-abx=0'));

		expect(latex).toContain('\\sqrt{a b}');
		expect(latex).not.toContain('\\sqrt{a} \\sqrt{b}');
	});
});

describe('V92 — revue : constante dans le coefficient, lettres au carré', () => {
	// Une constante (π, e) faisait retomber sur √π √a √b « si 4πab ⩾ 0 »
	it.each([
		['x^2-\\pi ab=0', '\\sqrt{\\pi} \\sqrt{a b}'],
		['x^2-eab=0', '\\sqrt{\\exponentialE} \\sqrt{a b}'],
		['x^2-2\\pi ab=0', '\\sqrt{2} \\sqrt{\\pi} \\sqrt{a b}']
	])('%s : ±%s si ab ⩾ 0', (equation, root) => {
		expect(latexOf(run(`.résoudre ${equation}`))).toBe(
			`S = \\left\\{ ${root} \\,;\\, -${root} \\right\\} \\quad \\text{si } a b \\geqslant 0`
		);
	});

	// La condition est celle sous laquelle la racine ÉCRITE existe : avec
	// « 4a²bc ⩾ 0 », a = 0, b = 1, c = −1 la vérifiait et √(bc) n'existe pas
	it('x² − a²bc = 0 : ±|a|√(bc) si bc ⩾ 0', () => {
		const latex = latexOf(run('.résoudre x^2-a^2bc=0'));

		expect(latex).toContain('\\sqrt{b c}');
		expect(latex).toContain('\\left| a \\right|');
		expect(latex.endsWith('\\quad \\text{si } b c \\geqslant 0')).toBe(true);
	});

	it('x² − ab²c = 0 : ±|b|√(ac) si ac ⩾ 0', () => {
		const latex = latexOf(run('.résoudre x^2-ab^2c=0'));

		expect(latex).toContain('\\sqrt{a c}');
		expect(latex).toContain('\\left| b \\right|');
		expect(latex.endsWith('\\quad \\text{si } a c \\geqslant 0')).toBe(true);
	});

	it('x² − a²b = 0 : ±|a|√b si b ⩾ 0', () => {
		const latex = latexOf(run('.résoudre x^2-a^2b=0'));

		expect(latex).toContain('\\sqrt{b}');
		expect(latex).toContain('\\left| a \\right|');
		expect(latex.endsWith('\\quad \\text{si } b \\geqslant 0')).toBe(true);
	});
});

describe('V92 — inchangés', () => {
	it('x² − a = 0 : ±√a si a ⩾ 0', () => {
		expect(latexOf(run('.résoudre x^2-a=0'))).toBe(
			'S = \\left\\{ \\sqrt{a} \\,;\\, -\\sqrt{a} \\right\\} \\quad \\text{si } a \\geqslant 0'
		);
	});

	it('x² − a²b = 0 : ±|a|√b (√(a²) = |a| est juste)', () => {
		const latex = latexOf(run('.résoudre x^2-a^2b=0'));

		expect(latex).toContain('\\sqrt{b}');
		expect(latex).toContain('\\left| a \\right|');
	});

	it('avec a = −1 et b = −1 : S = {−1 ; 1}', () => {
		expect(latexOf(run('a=-1', 'b=-1', '.résoudre x^2-ab=0'))).toBe(
			'S = \\left\\{ -1 \\,;\\, 1 \\right\\}'
		);
	});
});
