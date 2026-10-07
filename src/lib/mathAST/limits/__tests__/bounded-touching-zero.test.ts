/**
 * Borné qui RETOMBE à 0 multiplié par ∞ : pas de limite.
 *
 * x(1 + sin x) ≥ 0, mais s'annule en x = −π/2 + 2kπ : la fonction n'a pas de
 * limite en +∞. Le classement numérique du signe (sign-tracking) concluait
 * +∞ (trois échantillons tombés sur de grandes valeurs, aucun changement de
 * signe), et ce faux +∞ se propageait dans les composées : ln, exp, racine,
 * inverse.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { classifyWithSign } from '../sign-tracking';
import { parseLatex } from '../../parser';
import { infinity } from '../../factory';
import { toLatex } from '../../latex-generator';

const PLUS_INFINITY = infinity('positive');

function limitAtPlusInfinity(latex: string) {
	return evaluateLimit(parseLatex(latex), 'x', PLUS_INFINITY, 'both');
}

function valueOf(latex: string): string | null {
	const result = limitAtPlusInfinity(latex);
	return result.value === null ? null : toLatex(result.value);
}

describe('borné de borne inférieure 0 (non stricte) × ∞ en +∞', () => {
	const touchingZero = ['x(1+\\sin x)', 'x^2(1+\\cos x)', 'e^x(1-\\sin x)', 'x+x\\sin x'];

	describe('aucune valeur rendue', () => {
		it.each(touchingZero)('%s', (latex) => {
			expect(valueOf(latex)).toBeNull();
		});
	});

	describe('le classement du signe ne conclut pas ±∞', () => {
		it.each(touchingZero)('%s', (latex) => {
			expect(classifyWithSign(parseLatex(latex), 'x', PLUS_INFINITY, 'both')).toEqual({
				type: 'unknown'
			});
		});
	});

	describe('le faux +∞ ne se propage pas dans une composée', () => {
		it.each([
			'\\frac{1}{x(1+\\sin x)}',
			'\\ln(x(1+\\sin x))',
			'e^{x(1+\\sin x)}',
			'\\sqrt{x(1+\\sin x)}',
			'\\frac{1}{x^2(1+\\cos x)}',
			// e^x déborde en 1e6 : le creux se mesure là où f est encore finie
			'2-3e^x(1-\\sin x)'
		])('%s', (latex) => {
			expect(valueOf(latex)).toBeNull();
		});
	});
});

describe('non-régressions : borné de signe strict, ou pas de borné', () => {
	it.each([
		['x(2+\\sin x)', '+\\infty'],
		['x+\\sin x', '+\\infty'],
		['e^x(2+\\sin x)', '+\\infty'],
		['x^2', '+\\infty'],
		['\\frac{1+\\sin x}{x}', '0'],
		['\\ln(x(2+\\sin x))', '+\\infty'],
		['e^{x(2+\\sin x)}', '+\\infty'],
		['\\frac{1}{x(2+\\sin x)}', '0']
	])('%s → %s', (latex, expected) => {
		expect(valueOf(latex)).toBe(expected);
	});

	it.each(['x(2+\\sin x)', 'x+\\sin x', 'x^2', 'x^3+x', '\\sqrt{x}', '\\ln x'])(
		'classement du signe de %s : +∞',
		(latex) => {
			expect(classifyWithSign(parseLatex(latex), 'x', PLUS_INFINITY, 'both')).toEqual({
				type: 'pos-infinity'
			});
		}
	);
});
