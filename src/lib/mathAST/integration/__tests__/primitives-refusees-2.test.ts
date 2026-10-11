/**
 * Primitives de Terminale encore REFUSÉES par l'oracle (2026-10-08) : tests de
 * VALEUR (F′ = f numériquement, de part et d'autre des singularités) puis
 * d'écriture.
 *
 * 1. tangente : 1/cos²(u) → tan(u)/a, tan²(u) = 1/cos²(u) − 1, 1 + tan²(u),
 *    1/tan(u) = cos(u)/sin(u) → ln|sin u| (|·| : sin change de signe) ;
 * 2. parties avec ln au numérateur d'une fraction : ln x / xⁿ = ln x · x⁻ⁿ ;
 * 3. |ax + b| → (ax + b)|ax + b| / (2a), dérivable sur ℝ, F′ = |ax + b| partout.
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
function derivativeMismatch(latex: string): string | null {
	const result = integrate(parseLatex(latex), { variable: 'x' });
	if (result.status !== 'exact' || result.antiderivative === null) return `statut ${result.status}`;
	const F = compile(result.antiderivative);
	const f = compile(parseLatex(latex));
	let checked = 0;
	for (const x of POINTS) {
		const fx = f({ x });
		if (!Number.isFinite(fx) || Math.abs(fx) > 1e6) continue;
		const h = 1e-5 * Math.max(1, Math.abs(x));
		const slope = (F({ x: x + h }) - F({ x: x - h })) / (2 * h);
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
// 1. Tangente
// =============================================================================

describe('tangente : 1/cos², tan², 1 + tan², 1/tan', () => {
	it.each([
		'\\frac{1}{\\cos^2 x}',
		'\\frac{1}{\\cos^2(x)}',
		'\\frac{1}{(\\cos x)^2}',
		'\\frac{1}{\\cos^2(3x)}',
		'\\frac{1}{\\cos^2(2x+1)}',
		'\\frac{5}{\\cos^2(-x+2)}',
		'\\tan^2 x',
		'\\tan^2(2x)',
		'1+\\tan^2(x)',
		'1+\\tan^2(2x)',
		'\\frac{1}{\\tan x}',
		'\\frac{1}{\\tan(2x+1)}',
		'\\frac{\\sin x}{\\cos x}'
	])('%s : F′ = f', (latex) => {
		expect(derivativeMismatch(latex)).toBeNull();
	});

	it.each([
		['\\frac{1}{\\cos^2 x}', '\\tan\\left( x \\right)'],
		['\\frac{1}{\\cos^2(3x)}', '\\dfrac{1}{3} \\tan\\left( 3 x \\right)'],
		['1+\\tan^2(x)', '\\tan\\left( x \\right)'],
		['\\frac{1}{\\tan x}', '\\ln\\left( \\left| \\sin\\left( x \\right) \\right| \\right)']
	])('%s s’écrit %s', (latex, expected) => {
		expect(rendered(latex)).toBe(expected);
	});
});

// =============================================================================
// 2. Parties : ln au numérateur
// =============================================================================

describe('parties : ln x / xⁿ', () => {
	it.each([
		'\\frac{\\ln x}{x^2}',
		'\\frac{\\ln(x)}{x^3}',
		'\\frac{3\\ln x}{x^2}',
		'\\frac{\\ln x}{\\sqrt x}'
	])('%s : F′ = f', (latex) => {
		expect(derivativeMismatch(latex)).toBeNull();
	});
});

// =============================================================================
// 3. Valeur absolue d'une affine
// =============================================================================

describe('|ax + b| : F = (ax + b)|ax + b| / (2a)', () => {
	it.each(['|x|', '|x-3|', '|2x-1|', '|-3x+2|', '2\\left|x+1\\right|', '-|3x+2|'])(
		'%s : F′ = f',
		(latex) => {
			expect(derivativeMismatch(latex)).toBeNull();
		}
	);

	it.each([
		['|x|', '\\dfrac{1}{2} x \\left| x \\right|'],
		['|2x-1|', '\\dfrac{1}{4} \\left( 2 x - 1 \\right) \\left| 2 x - 1 \\right|']
	])('%s s’écrit %s', (latex, expected) => {
		expect(rendered(latex)).toBe(expected);
	});
});

// =============================================================================
// 4. Trinôme de discriminant négatif : arctan (décision de David, 2026-10-08)
// =============================================================================

describe('trinôme de discriminant < 0 : écriture de classe', () => {
	it.each([
		['\\frac{1}{x^2+2x+2}', '\\arctan\\left( x + 1 \\right)'],
		['\\frac{1}{4x^2+1}', '\\dfrac{1}{2} \\arctan\\left( 2 x \\right)'],
		['\\frac{3}{2x^2+8}', '\\dfrac{3}{4} \\arctan\\left( \\dfrac{1}{2} x \\right)']
	])('%s s’écrit %s', (latex, expected) => {
		expect(derivativeMismatch(latex)).toBeNull();
		expect(rendered(latex)).toBe(expected);
	});

	it('1/(x² + x + 1) : (2/√3)·arctan((2x + 1)/√3), sans ln ni |·|', () => {
		expect(derivativeMismatch('\\frac{1}{x^2+x+1}')).toBeNull();
		const shown = rendered('\\frac{1}{x^2+x+1}') ?? '';
		expect(shown).toContain('\\arctan');
		expect(shown).toContain('\\sqrt{3}');
		expect(shown).not.toContain('\\ln');
	});

	it('x/(x² + 2x + 5) : ln sans valeur absolue (trinôme > 0)', () => {
		expect(derivativeMismatch('\\frac{x}{x^2+2x+5}')).toBeNull();
		const shown = rendered('\\frac{x}{x^2+2x+5}') ?? '';
		expect(shown).toContain('\\arctan');
		expect(shown).not.toContain('\\left|');
	});

	it('∫₀¹ 1/(x² + 1) dx = π/4', () => {
		const result = integrateDefinite(
			parseLatex('\\frac{1}{x^2+1}'),
			parseLatex('0'),
			parseLatex('1'),
			{
				variable: 'x'
			}
		);
		expect(result.value === null ? null : toLatex(result.value)).toBe('\\dfrac{1}{4} \\pi');
	});
});
