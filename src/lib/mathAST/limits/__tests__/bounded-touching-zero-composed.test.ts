/**
 * Borné qui RETOMBE à 0, vu à travers une composée.
 *
 * eˣ(1 + sin x) s'annule en −π/2 + 2kπ : ln(eˣ(1 + sin x)), 1/(eˣ(1 + sin x))
 * et √(eˣ(1 + cos x)) n'ont pas de limite en +∞. La composition conclut à
 * partir du classement du signe de l'argument ; tant que celui-ci concluait
 * +∞ sur trois débordements, le faux +∞ se propageait (corrigé par les
 * fenêtres de creux de #930 — ces tests le figent).
 *
 * Après la réécriture eˣ → exp(x), ln(exp(x)(1 + sin x)) était encore classé
 * +∞ : le logarithme écrase le creux, que l'échantillonnage ne voit plus. Une
 * composée monotone ne se classe donc pas quand son argument montre qu'il n'a
 * pas de limite. Et la détection des formes indéterminées (∞/∞ sur trois
 * débordements) ouvrait L'Hôpital sur un dénominateur sans limite.
 *
 * 1/(x(1 + sin x)) est le cas symétrique : petite aux trois échantillons,
 * mais |f| explose aux zéros du dénominateur. Le classement rendait 0⁺, et
 * exp(1/(x(1 + sin x))) était rendu 1.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { classifyWithSign } from '../sign-tracking';
import { parseLatex } from '../../parser';
import { infinity } from '../../factory';
import { toLatex } from '../../latex-generator';

const PLUS_INFINITY = infinity('positive');

function valueOf(latex: string): string | null {
	const result = evaluateLimit(parseLatex(latex), 'x', PLUS_INFINITY, 'both');
	return result.value === null ? null : toLatex(result.value);
}

describe('composée d’un borné qui retombe à 0 en +∞ : aucune valeur', () => {
	it.each([
		'\\ln(e^x(1+\\sin x))',
		'\\frac{1}{e^x(1+\\sin x)}',
		'\\sqrt{e^x(1+\\cos x)}',
		'\\frac{1}{x(1+\\sin x)}',
		'e^{\\frac{1}{x(1+\\sin x)}}',
		'1+\\frac{1}{x(1+\\sin x)}',
		// après réécriture eˣ → exp(x), ln écrase le creux : classé +∞
		'3\\ln(\\exp(x)(1+\\sin x))',
		'2-3\\ln(e^x(1+\\sin x))',
		'2-3\\sqrt{e^x(1+\\cos x)}',
		// forme « ∞/∞ » annoncée sur trois débordements, L'Hôpital rendait 2
		'2-\\frac{3}{e^x(1+\\sin x)}',
		'\\frac{2\\sin(x)e^x+2e^x-3}{\\sin(x)e^x+e^x}'
	])('%s', (latex) => {
		expect(valueOf(latex)).toBeNull();
	});
});

describe('|f| qui pique aux zéros du dénominateur : le signe ne conclut pas', () => {
	it.each(['\\frac{1}{x(1+\\sin x)}', '\\frac{1}{x^2(1+\\cos x)}', '1+\\frac{1}{x(1+\\sin x)}'])(
		'%s',
		(latex) => {
			expect(classifyWithSign(parseLatex(latex), 'x', PLUS_INFINITY, 'both')).toEqual({
				type: 'unknown'
			});
		}
	);
});

describe('les conclusions justes tiennent', () => {
	it.each([
		// borné × (→ 0) : 0, même si le borné retombe à 0
		['e^{-x}(1+\\sin x)', '0'],
		// borné de signe strict sous ln
		['\\ln(e^x(2+\\sin x))', '+\\infty'],
		['\\frac{1}{x(2+\\sin x)}', '0'],
		['\\frac{1+\\sin x}{x}', '0'],
		['\\frac{\\sin x}{x}', '0'],
		// croissance lente : « pas su » n'est pas « pas de limite »
		['\\frac{\\ln x}{\\ln(x^2+1)}', '\\dfrac{1}{2}'],
		['e^{\\frac{\\sin x}{x}}', '1']
	])('%s → %s', (latex, expected) => {
		expect(valueOf(latex)).toBe(expected);
	});

	it.each([
		['\\frac{1}{x(2+\\sin x)}', 'zero-plus'],
		['\\frac{1+\\sin x}{x}', 'zero-plus'],
		['\\frac{1}{x}', 'zero-plus']
	])('classement de %s : %s', (latex, type) => {
		expect(classifyWithSign(parseLatex(latex), 'x', PLUS_INFINITY, 'both').type).toBe(type);
	});
});
