/**
 * Affichage d'une écriture d'unité (2026-09-24).
 *
 * `\unit` vient de siunitx : MathLive l'affichait en rouge (« \unitcm »),
 * l'export `.tex` ne compilait pas, et `^-1` n'élevait que le `-`. Les
 * tests de rendu passent par le vrai MathLive (rendu serveur), pas seulement
 * par la chaîne LaTeX : une chaîne juste peut rester invisible.
 */

import { describe, it, expect } from 'vitest';
import { convertLatexToMarkup } from 'mathlive/ssr';
import { unitWritingToLatex, unitWritingToTypst, displayUnitsInLatex } from '../display';

/** Le rendu MathLive : erreur éventuelle, texte visible, et contenu des exposants. */
function renderWithMathLive(latex: string) {
	const markup = convertLatexToMarkup(latex);
	return {
		hasError: markup.includes('ML__error'),
		text: markup.replace(/<[^>]+>/g, '').replace(/\u200b/g, '')
	};
}

describe('unitWritingToLatex', () => {
	it.each([
		['cm', '\\mathrm{cm}'],
		['m^2', '\\mathrm{m}^{2}'],
		['m^{2}', '\\mathrm{m}^{2}'],
		['m.s^-1', '\\mathrm{m}\\cdot\\mathrm{s}^{-1}'],
		['m.s^{-1}', '\\mathrm{m}\\cdot\\mathrm{s}^{-1}'],
		['km/h', '\\mathrm{km}/\\mathrm{h}'],
		['°C', '{}^{\\circ}\\mathrm{C}'],
		['μm', '\\mu{}\\mathrm{m}'],
		['€', '\\text{€}']
	])('%s → %s', (writing, expected) => {
		expect(unitWritingToLatex(writing)).toBe(expected);
	});
});

describe('unitWritingToTypst', () => {
	it.each([
		['cm', 'upright("cm")'],
		['m^{2}', 'upright("m")^(2)'],
		['m.s^{-1}', 'upright("m") dot.op upright("s")^(-1)'],
		['km/h', 'upright("km")"/"upright("h")']
	])('%s → %s', (writing, expected) => {
		expect(unitWritingToTypst(writing)).toBe(expected);
	});
});

describe('displayUnitsInLatex', () => {
	it('remplace chaque \\unit, accolades d’exposant comprises', () => {
		expect(displayUnitsInLatex('3~\\unit{m.s^{-1}}+2~\\unit{cm}')).toBe(
			'3~\\mathrm{m}\\cdot\\mathrm{s}^{-1}+2~\\mathrm{cm}'
		);
	});

	it('laisse intact un LaTeX sans unité', () => {
		expect(displayUnitsInLatex('x^{-1}+\\frac{1}{2}')).toBe('x^{-1}+\\frac{1}{2}');
	});
});

describe('rendu MathLive réel', () => {
	it('\\unit brut est bien une erreur pour MathLive (le défaut corrigé)', () => {
		expect(renderWithMathLive('2~\\unit{cm}').hasError).toBe(true);
	});

	it.each([
		['2~\\unit{cm}', '2 cm'],
		['3~\\unit{m.s^{-1}}', '3 m⋅s−1'],
		['90~\\unit{km/h}', '90 km/h'],
		['20~\\unit{°C}', '20 ∘C'],
		['3~\\unit{kg/(m.s)}', '3 kg/(m⋅s)']
	])('%s s’affiche sans erreur : « %s »', (latex, visible) => {
		const r = renderWithMathLive(displayUnitsInLatex(latex));
		expect(r.hasError).toBe(false);
		expect(r.text.replace(/\s+/g, ' ').trim()).toBe(visible);
	});

	/** Le texte du premier exposant : ce que MathLive met en petit (70 %). */
	function firstExponentText(latex: string): string {
		const markup = convertLatexToMarkup(latex);
		const start = markup.indexOf('font-size: 70%');
		const block = markup.slice(start, markup.indexOf('</span></span></span>', start));
		return block.replace(/^[^>]*>/, '').replace(/<[^>]+>/g, '');
	}

	it('l’exposant -1 monte en entier (le 1 avec le −)', () => {
		expect(firstExponentText(displayUnitsInLatex('3~\\unit{m.s^-1}'))).toBe('−1');
	});

	it('témoin : l’ancienne macro de la page de debug n’élevait que le −', () => {
		expect(firstExponentText('3~\\mathsf{m.s^-1}')).toBe('−');
	});
});
