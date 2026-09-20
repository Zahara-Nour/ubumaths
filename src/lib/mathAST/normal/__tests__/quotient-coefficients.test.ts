/**
 * Forme normale des quotients : signe et contenu numérique des coefficients.
 *
 * Bug du relevé du 2026-09-20 (§6.1) : `normalFormFromFraction` réduisait le
 * pgcd monomial et polynomial entre numérateur et dénominateur, mais jamais le
 * signe ni le pgcd des coefficients numériques. `(2x)/(4y)` et `x/(2y)` avaient
 * deux hash différents, donc `areEquivalent` les séparait — et un élève qui
 * écrivait l'un pour l'autre était compté faux.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseCustom } from '../../parser/custom';
import { normalize } from '../normalize';
import { preprocess } from '../rules';
import { denormalize } from '../denormalize';
import { toLatex } from '../../latex-generator';

const eq = (a: string, b: string) => areEquivalent(parseCustom(a), parseCustom(b));
const round = (s: string) => toLatex(denormalize(normalize(preprocess(parseCustom(s)))));

describe('quotients — signe des coefficients', () => {
	it('(-x)/(-y) ≡ x/y', () => {
		expect(eq('(-x)/(-y)', 'x/y')).toBe(true);
	});

	it('x/(-y) ≡ (-x)/y', () => {
		expect(eq('x/(-y)', '(-x)/y')).toBe(true);
	});

	it('x/(-y) ≡ -(x/y)', () => {
		expect(eq('x/(-y)', '-(x/y)')).toBe(true);
	});

	it('(x+1)/(-y) ≡ (-x-1)/y', () => {
		expect(eq('(x+1)/(-y)', '(-x-1)/y')).toBe(true);
	});
});

describe('quotients — contenu numérique des coefficients', () => {
	it('(2x)/(4y) ≡ x/(2y)', () => {
		expect(eq('(2x)/(4y)', 'x/(2y)')).toBe(true);
	});

	it('(x/2)/(y/3) ≡ (3x)/(2y)', () => {
		expect(eq('(x/2)/(y/3)', '(3x)/(2y)')).toBe(true);
	});

	it('(2x+2)/(4y) ≡ (x+1)/(2y)', () => {
		expect(eq('(2x+2)/(4y)', '(x+1)/(2y)')).toBe(true);
	});

	it('(6x)/(4y) ≡ (3x)/(2y)', () => {
		expect(eq('(6x)/(4y)', '(3x)/(2y)')).toBe(true);
	});

	it('2/(4y) ≡ 1/(2y)', () => {
		expect(eq('2/(4y)', '1/(2y)')).toBe(true);
	});

	it('signe et contenu ensemble : (-2x)/(-4y) ≡ x/(2y)', () => {
		expect(eq('(-2x)/(-4y)', 'x/(2y)')).toBe(true);
	});
});

describe('quotients — la réduction ne rend pas équivalent ce qui ne l’est pas', () => {
	it('(2x)/(4y) ≢ x/y', () => {
		expect(eq('(2x)/(4y)', 'x/y')).toBe(false);
	});

	it('x/(-y) ≢ x/y', () => {
		expect(eq('x/(-y)', 'x/y')).toBe(false);
	});

	it('(2x)/(4y) ≢ (2x)/(3y)', () => {
		expect(eq('(2x)/(4y)', '(2x)/(3y)')).toBe(false);
	});
});

describe('quotients — ce que denormalize rend', () => {
	it('(2x)/(4y) se réécrit x/(2y)', () => {
		expect(round('(2x)/(4y)')).toBe('\\dfrac{x}{2 y}');
	});

	it('(-x)/(-y) se réécrit x/y', () => {
		expect(round('(-x)/(-y)')).toBe('\\dfrac{x}{y}');
	});

	it('un polynôme à coefficients rationnels garde ses fractions (dénominateur 1 non concerné)', () => {
		// x/2 + 1/3 n'est pas un quotient à dénominateur symbolique : rien ne change.
		expect(eq('x/2+1/3', '(3x+2)/6')).toBe(true);
	});
});
