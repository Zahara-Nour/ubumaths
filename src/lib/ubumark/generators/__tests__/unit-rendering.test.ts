/**
 * Une grandeur écrite dans un énoncé, de la notation jusqu'aux trois sorties
 * (2026-09-24) : écran (MathLive), export `.tex`, PDF (Typst).
 *
 * Avant : `~3[m.s^{-1}]~` était une erreur de parseur ; `~2[cm]~` s'affichait
 * « \unitcm » en rouge à l'écran, faisait échouer l'export `.tex` (siunitx
 * absent) ; `~3[m s^-1]~` se lisait « par milliseconde ».
 */

import { describe, it, expect } from 'vitest';
import { convertLatexToMarkup } from 'mathlive/ssr';
import { parseMarkdown } from '../../parser/markdown-parser';
import { generateLatex } from '../latex-generator';
import { generateTypst } from '../typst-generator';
import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';

const SOURCE = 'Vitesse : ~3[m.s^{-1}]~, distance : ~90[km/h]~, longueur $2~\\unit{cm}$.';

describe('écran — expressionToLatex rend un LaTeX que MathLive affiche', () => {
	it.each([
		['3[m.s^{-1}]', 'custom', '3~\\mathrm{m}\\cdot\\mathrm{s}^{-1}'],
		['3[m.s^-1]', 'custom', '3~\\mathrm{m}\\cdot\\mathrm{s}^{-1}'],
		['90[km/h]', 'custom', '90~\\mathrm{km}/\\mathrm{h}'],
		['2~\\unit{cm}', 'latex', '2~\\mathrm{cm}']
	] as const)('%s (%s) → %s, sans erreur MathLive', (expression, syntax, expected) => {
		const latex = expressionToLatex(expression, syntax);
		expect(latex).toBe(expected);
		expect(convertLatexToMarkup(latex)).not.toContain('ML__error');
	});

	it('une espace dans l’unité s’affiche comme une erreur, pas comme une milliseconde', () => {
		const latex = expressionToLatex('3[m s^-1]', 'custom');
		expect(latex).toContain('\\textcolor{red}');
		expect(latex).toMatch(/Space inside a unit/);
	});
});

describe('export .tex', () => {
	it('ne contient plus aucune commande \\unit', () => {
		const tex = generateLatex(parseMarkdown(SOURCE), { includePreamble: false });
		expect(tex).not.toContain('\\unit');
		expect(tex).toContain('\\mathrm{m}\\cdot\\mathrm{s}^{-1}');
		expect(tex).toContain('\\mathrm{km}/\\mathrm{h}');
		expect(tex).toContain('2~\\mathrm{cm}');
	});
});

describe('PDF (Typst)', () => {
	it('rend les unités en romain, barre collée, sans « unit » ni fraction', () => {
		const typst = generateTypst(parseMarkdown(SOURCE), { includeSetup: false });
		expect(typst).toContain('3 thin upright("m") dot.op upright("s")^(-1)');
		expect(typst).toContain('90 thin upright("km")"/"upright("h")');
		expect(typst).toContain('2 thin upright("cm")');
		expect(typst).not.toMatch(/"unit"|mathrm/);
	});
});
