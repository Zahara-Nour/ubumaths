/**
 * Revue de #934 (2026-10-07) :
 *
 * 1. aˣ avec une base CONSTANTE négative ou égale à 1 mais non rationnelle
 *    ((1 − √2)ˣ, (ln 0,5)ˣ, (cos 0)ˣ) : la primitive aˣ / ln a était rendue
 *    avec un ln d'un nombre ≤ 0 → refus ;
 * 2. écriture : valeur juste mais non réduite — ln|u|·ln(u) non regroupé,
 *    constante multiplicative gardée dans le ln (ln|c·u| = ln|c| + ln|u|,
 *    ln|c| est absorbé dans la constante d'intégration).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrate, integrateDefinite } from '../integrate';
import { compile } from '../../eval/compile';
import { toLatex } from '../../latex-generator';

// =============================================================================
// Constantes
// =============================================================================

const POINTS: readonly number[] = [
	-2.7, -1.3, -0.45, 0.35, 0.85, 1.65, 2.45, 3.3, 4.2, 6.1, 7.5, 9.2
];

// =============================================================================
// Outils
// =============================================================================

/** Premier écart F′ ≠ f aux points où f est définie, ou null */
function derivativeMismatch(latex: string, vars: Record<string, number> = {}): string | null {
	const result = integrate(parseLatex(latex), { variable: 'x' });
	if (result.status !== 'exact' || result.antiderivative === null) return `statut ${result.status}`;
	const F = compile(result.antiderivative);
	const f = compile(parseLatex(latex));
	let checked = 0;
	for (const x of POINTS) {
		const fx = f({ ...vars, x });
		if (!Number.isFinite(fx) || Math.abs(fx) > 1e6) continue;
		const h = 1e-5 * Math.max(1, Math.abs(x));
		const slope = (F({ ...vars, x: x + h }) - F({ ...vars, x: x - h })) / (2 * h);
		checked++;
		if (!(Math.abs(slope - fx) <= 1e-5 * Math.max(1, Math.abs(fx)))) {
			return `F′(${x}) = ${slope} ≠ f(${x}) = ${fx}`;
		}
	}
	return checked >= 3 ? null : 'moins de 3 points';
}

function rendered(latex: string): string | null {
	const result = integrate(parseLatex(latex), { variable: 'x' });
	return result.antiderivative === null ? null : toLatex(result.antiderivative);
}

// =============================================================================
// 1. Base constante non admissible
// =============================================================================

describe('aˣ : base constante évaluée, refus si ≤ 0 ou = 1', () => {
	it.each([
		'(1-\\sqrt{2})^x',
		'(\\ln 0.5)^x',
		'(\\cos 0)^x',
		'(1-\\sqrt{2})^{2x+1}',
		'(\\ln 0.5)^{2x}'
	])('%s : refus', (latex) => {
		expect(integrate(parseLatex(latex), { variable: 'x' }).status).not.toBe('exact');
	});

	it.each(['(\\sqrt{2}-1)^x', '\\pi^x', '(\\sqrt{2})^x', '(\\ln 3)^{2x+1}'])(
		'%s : base > 0 et ≠ 1, F′ = f',
		(latex) => {
			expect(derivativeMismatch(latex)).toBeNull();
		}
	);

	it('a^x (paramètre) : gardé, base supposée générique (a > 0, a ≠ 1)', () => {
		expect(derivativeMismatch('a^x', { a: 2.5 })).toBeNull();
	});
});

// =============================================================================
// 2. Écriture réduite
// =============================================================================

describe('écriture réduite des primitives en ln', () => {
	it.each([
		['\\frac{x}{x^2+1}\\ln(x^2+1)', '\\dfrac{1}{4} \\ln\\left( x^2 + 1 \\right)^2'],
		['\\frac{2^x}{2^x+1}', '\\dfrac{\\ln\\left( 2^x + 1 \\right)}{\\ln\\left( 2 \\right)}'],
		['\\frac{1}{2x}', '\\dfrac{1}{2} \\ln\\left( \\left| x \\right| \\right)'],
		[
			'\\frac{1}{2x\\ln x}',
			'\\dfrac{1}{2} \\ln\\left( \\left| \\ln\\left( x \\right) \\right| \\right)'
		],
		['\\frac{1}{3x+6}', '\\dfrac{1}{3} \\ln\\left( \\left| x + 2 \\right| \\right)'],
		['\\frac{e^x}{2e^x+2}', '\\dfrac{1}{2} \\ln\\left( \\exponentialE^x + 1 \\right)']
	])('%s s’écrit %s, F′ = f', (latex, expected) => {
		expect(rendered(latex)).toBe(expected);
		expect(derivativeMismatch(latex)).toBeNull();
	});

	it('2x + 1 sans facteur commun : ½ ln|2x + 1| inchangé', () => {
		expect(rendered('\\frac{1}{2x+1}')).toBe(
			'\\dfrac{1}{2} \\ln\\left( \\left| 2 x + 1 \\right| \\right)'
		);
	});

	it('intégrale définie : la constante absorbée s’annule dans F(b) − F(a)', () => {
		const result = integrateDefinite(
			parseLatex('\\frac{1}{2x}'),
			parseLatex('1'),
			parseLatex('3'),
			{
				variable: 'x'
			}
		);
		expect(result.value).not.toBeNull();
		expect(compile(result.value!)({})).toBeCloseTo(Math.log(3) / 2, 10);
	});
});
