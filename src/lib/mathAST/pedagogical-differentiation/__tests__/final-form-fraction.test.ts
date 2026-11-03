/**
 * La forme finale de f′ met l'exponentielle commune en facteur même quand le
 * coefficient est une fraction (règle D1 ; David, 2026-11-03, page à cocher
 * « Exponentielle commune en facteur », chantier registre-reference).
 *
 * Avant, l'exponentielle sous une barre (`2xeˣ/3`) n'était pas vue :
 * `((1/3)x²eˣ)′` donnait `2xeˣ/3 + x²eˣ/3`, alors que `(0,5x²eˣ)′` donnait
 * `(0,5x² + x)eˣ`. Une division par un nombre écrite après s'écrit pareil
 * (`(x²eˣ/3)′ = (x²/3 + 2x/3)eˣ`).
 */

import { describe, it, expect } from 'vitest';
import { finalDerivativeOf } from '../final-form';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';

const derived = (f: string) => {
	const result = finalDerivativeOf(parseCustom(f));
	return result === null ? null : toLatex(result);
};

const derivedLatex = (f: string) => {
	const result = finalDerivativeOf(parseLatex(f));
	return result === null ? null : toLatex(result);
};

const E = '\\exponentialE';

describe('f′ finale : exponentielle commune sous une barre de nombre', () => {
	it.each([
		['(1/3)x^2*e^x', `\\left( \\dfrac{x^2}{3} + \\dfrac{2 x}{3} \\right) ${E}^x`],
		['x^2*e^x/3', `\\left( \\dfrac{x^2}{3} + \\dfrac{2 x}{3} \\right) ${E}^x`],
		['3x*e^x/2', `\\left( \\dfrac{3 x}{2} + \\dfrac{3}{2} \\right) ${E}^x`],
		['(x^2+1)*e^x/2', `\\left( \\dfrac{x^2}{2} + x + \\dfrac{1}{2} \\right) ${E}^x`]
	])('%s → %s', (f, expected) => {
		expect(derived(f)).toBe(expected);
	});
});

describe('f′ finale : une fraction négative aussi, quelle que soit la saisie (revue de #2329)', () => {
	const expected = `-\\left( \\dfrac{x^2}{3} + \\dfrac{2 x}{3} \\right) ${E}^x`;

	it.each(['-x^2*e^x/3', '-(1/3)x^2*e^x', 'x^2*e^x/(-3)'])('saisie de l’atelier %s', (f) => {
		expect(derived(f)).toBe(expected);
	});

	it.each(['-\\frac{x^2e^x}{3}', '\\frac{x^2e^x}{-3}', '\\frac{x^2e^x}{3}'])(
		'saisie d’une question %s',
		(f) => {
			const sign = f.startsWith('\\frac{x^2e^x}{3}') ? '' : '-';
			expect(derivedLatex(f)).toBe(
				`${sign}\\left( \\dfrac{x^2}{3} + \\dfrac{2 x}{3} \\right) ${E}^x`
			);
		}
	);
});

describe('f′ finale : sans exponentielle commune, la barre reste', () => {
	it.each([
		['(x^3+x)/3', '\\dfrac{3 x^2 + 1}{3}'],
		['(1/4)e^(2x)', `\\dfrac{${E}^{2 x}}{2}`]
	])('%s → %s', (f, expected) => {
		expect(derived(f)).toBe(expected);
	});
});
