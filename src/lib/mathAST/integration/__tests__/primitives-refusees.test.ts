/**
 * Primitives classiques de Terminale que le moteur REFUSAIT (oracle, 2026-10-07) :
 * tests de VALEUR (F′ = f numériquement) puis d'écriture.
 *
 * 1. aˣ et a^{u} (u affine) : ∫ aˣ dx = aˣ / ln a ;
 * 2. u′·f(u) avec u NON linéaire (ln x / x, 1/(x ln x), cos x · e^{sin x}…) ;
 *    convention : ln(u) SANS valeur absolue quand u > 0 sur ℝ (trinôme de
 *    discriminant < 0 et de coefficient dominant > 0, eᵘ + c avec c > 0) ;
 * 3. fractions rationnelles à dénominateur trinôme NON factorisé : factorisé
 *    par ses racines (rationnelles, ou ±t pour x² − t²), puis décomposé ;
 *    discriminant < 0 hors forme x² + c : refus (arctan hors programme du lycée).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrate } from '../integrate';
import { compile } from '../../eval/compile';
import { toLatex } from '../../latex-generator';

// =============================================================================
// Constantes
// =============================================================================

const POINTS: readonly number[] = [
	-2.7, -1.3, -0.45, 0.35, 0.85, 1.65, 2.45, 3.3, 4.2, 6.1, 7.5, 9.2
];

const PARAMETERS: readonly Readonly<Record<string, number>>[] = [
	{ a: 2.5, b: 1.5 },
	{ a: -0.6, b: 3.2 },
	{ a: 0.4, b: 0.7 }
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
// 1. aˣ et a^{u}
// =============================================================================

describe('aˣ et a^{u} avec u affine : F = aˣ / ln a', () => {
	it.each([
		'2^x',
		'3^{2x+1}',
		'(\\frac{1}{2})^x',
		'10^{-x}',
		'0.5^{-x}',
		'5^{-x}',
		'10^{0.3x}',
		'3\\cdot 2^x',
		'2^x+x'
	])('%s : F′ = f', (latex) => {
		expect(derivativeMismatch(latex)).toBeNull();
	});

	it.each(PARAMETERS.filter((p) => p.b > 0))('b^x (b = $b) : F′ = f', (vars) => {
		expect(derivativeMismatch('b^x', vars)).toBeNull();
	});

	it('2^x s’écrit 2ˣ / ln 2', () => {
		expect(rendered('2^x')).toBe('\\dfrac{2^x}{\\ln\\left( 2 \\right)}');
	});

	it.each(['1^x', '(-2)^x', '0^x'])('%s : base non admissible, refus', (latex) => {
		expect(integrate(parseLatex(latex), { variable: 'x' }).status).not.toBe('exact');
	});
});

// =============================================================================
// 2. u′·f(u) avec u non linéaire
// =============================================================================

describe('u′·f(u) avec u non linéaire', () => {
	it.each([
		'\\frac{\\ln x}{x}',
		'\\frac{\\ln(x)^2}{x}',
		'\\frac{(\\ln(x))^2}{x}',
		'\\frac{1}{x\\ln x}',
		'\\cos x\\,e^{\\sin x}',
		'\\cos(x)e^{\\sin(x)}',
		'x e^{x^2}',
		'(2x+1)e^{x^2+x}',
		'(x-1)e^{x^2-2x}',
		'\\frac{\\cos(\\ln x)}{x}',
		'(2x+1)(x^2+x)^3',
		'\\frac{2x}{x^2+1}',
		'\\frac{x}{x^2+1}',
		'\\frac{e^{x}}{e^{x}+1}',
		'\\frac{2x+1}{x^2+x+1}'
	])('%s : F′ = f', (latex) => {
		expect(derivativeMismatch(latex)).toBeNull();
	});

	it('ln x / x s’écrit ½ (ln x)²', () => {
		const latex = rendered('\\frac{\\ln x}{x}');
		expect(latex).toContain('\\dfrac{1}{2}');
		expect(latex).toContain('\\ln');
	});

	it('1/(x ln x) : ln|ln x|', () => {
		expect(rendered('\\frac{1}{x\\ln x}')).toBe(
			'\\ln\\left( \\left| \\ln\\left( x \\right) \\right| \\right)'
		);
	});

	it('cos x · e^{sin x} : e^{sin x}', () => {
		expect(rendered('\\cos x\\,e^{\\sin x}')).toContain('^{\\sin\\left( x \\right)}');
	});

	it('convention : ln(x² + 1) SANS valeur absolue (x² + 1 > 0)', () => {
		expect(rendered('\\frac{2x}{x^2+1}')).toBe('\\ln\\left( x^2 + 1 \\right)');
	});

	it('valeur absolue gardée quand u change de signe : ln|x² − 4|', () => {
		expect(rendered('\\frac{2x}{x^2-4}')).toContain('\\left|');
	});

	it('sin²(3x) linéarisé : F′ = f', () => {
		expect(derivativeMismatch('\\sin^2(3x)')).toBeNull();
		expect(derivativeMismatch('\\cos^2(-x)')).toBeNull();
		expect(derivativeMismatch('\\sin^2(x)')).toBeNull();
		expect(derivativeMismatch('\\cos^2(x)')).toBeNull();
	});
});

// =============================================================================
// 3. Dénominateur trinôme non factorisé
// =============================================================================

describe('fractions rationnelles à dénominateur trinôme', () => {
	it.each([
		'\\frac{1}{x^2-4x+3}',
		'\\frac{4}{x^2-2x}',
		'\\frac{1}{x^2-x-6}',
		'\\frac{1}{2x^2-2}',
		'\\frac{1}{9-x^2}',
		'\\frac{2}{1-x^2}',
		'\\frac{1}{2x^2-x-1}',
		'\\frac{x}{x^2-5x+6}',
		'\\frac{3x+1}{x^2-4x+3}',
		'\\frac{1}{x^2-4x+4}'
	])('%s : F′ = f', (latex) => {
		expect(derivativeMismatch(latex)).toBeNull();
	});

	it.each(PARAMETERS)('a/(x² − a²) (a = $a) : F′ = f', (vars) => {
		expect(derivativeMismatch('\\frac{a}{x^2-a^2}', vars)).toBeNull();
	});

	it.each(PARAMETERS)('1/((x − a)(x − b)) (a = $a, b = $b) : F′ = f (résidus)', (vars) => {
		expect(derivativeMismatch('\\frac{1}{(x-a)(x-b)}', vars)).toBeNull();
	});

	it('(x+1)/(x² + 2x + 5) = ½ u′/u : F′ = f, ln sans valeur absolue', () => {
		expect(derivativeMismatch('\\frac{x+1}{x^2+2x+5}')).toBeNull();
		expect(rendered('\\frac{x+1}{x^2+2x+5}')).not.toContain('\\left|');
	});

	it.each(['\\frac{1}{x^2+2x+2}', '\\frac{1}{x^2+x+1}', '\\frac{x}{x^2+2x+5}'])(
		'%s : discriminant < 0, refus (arctan hors programme du lycée)',
		(latex) => {
			const result = integrate(parseLatex(latex), { variable: 'x' });
			expect(result.status).toBe('unsupported');
			expect(result.error).toContain('arctan');
		}
	);
});
