/**
 * Le carré d'un logarithme s'écrit `\left( \ln\left( 5 \right) \right)^2` (écart V39).
 *
 * `toLatex` écrivait (ln 5)² `\ln\left( 5 \right)^2`, qu'un élève peut lire ln(5²) : le
 * discriminant de `x^2+x\ln 2-1=0` s'affichait `\sqrt{\ln\left( 2 \right)^2 + 4}`.
 *
 * La LECTURE de `\ln 5^2` sans parenthèses, elle, est ln(5²) depuis le 2026-11-27 :
 * `parser/latex/__tests__/puissance-sous-fonction.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../parser';
import { toLatex } from '../latex-generator';

describe('V39 : la puissance d’un logarithme, parenthésée', () => {
	it.each([
		['\\ln(5)^2', '\\left( \\ln\\left( 5 \\right) \\right)^2'],
		['3\\ln(2)^2+4', '3 \\left( \\ln\\left( 2 \\right) \\right)^2 + 4'],
		['\\sqrt{\\ln(2)^2+4}', '\\sqrt{\\left( \\ln\\left( 2 \\right) \\right)^2 + 4}'],
		['\\ln(x)^3', '\\left( \\ln\\left( x \\right) \\right)^3'],
		['\\log(7)^2', '\\left( \\log\\left( 7 \\right) \\right)^2']
	])('%s s’écrit %s', (source, expected) => {
		expect(toLatex(parseLatex(source))).toBe(expected);
	});

	it('l’écriture se relit comme la même valeur', () => {
		const written = toLatex(parseLatex('\\ln(5)^2'));

		expect(toLatex(parseLatex(written))).toBe(written);
	});

	it('déjà parenthésé : pas de parenthèses en double', () => {
		expect(toLatex(parseLatex('\\left(\\ln 5\\right)^2'))).toBe(
			'\\left( \\ln\\left( 5 \\right) \\right)^2'
		);
	});

	it('le logarithme d’un carré ne change pas', () => {
		expect(toLatex(parseLatex('\\ln(x^2)'))).toBe('\\ln\\left( x^2 \\right)');
	});

	it('l’écriture colorée (renderMetadata) dit la même chose', () => {
		expect(toLatex(parseLatex('\\ln(5)^2'), { renderMetadata: true })).toBe(
			'\\left( \\ln\\left( 5 \\right) \\right)^{2}'
		);
	});
});
