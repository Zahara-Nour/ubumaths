/**
 * Calcul aligné : le bloc traverse toute la chaîne sans perdre ses lignes.
 *
 * Éditeur → markdown stocké → éditeur (aller-retour), rendu élève
 * (`expressionToLatex`), PDF (grille Typst).
 */

import { describe, it, expect } from 'vitest';
import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';
import { markdownToTipTap } from '$lib/components/rich-text/markdown-import';
import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';
import { markdownToTypst } from '$lib/ubumark/generators/typst-generator';
import { RACCOURCIS_MOTS } from '../calcul-aligne';

const CALCUL = '\\begin{aligned}A&=3.5+4\\\\&=7.5\\end{aligned}';
const RAISONNEMENT = `\\begin{aligned}x^2-1=0&\\iff x^2=1\\\\&\\iff x=1${RACCOURCIS_MOTS.ou}x=-1\\end{aligned}`;

describe('aller-retour markdown', () => {
	it.each([CALCUL, RAISONNEMENT])('garde le bloc à l’identique : %s', (latex) => {
		const markdown = `Correction :\n\n$$${latex}$$\n\nFin.`;
		expect(tipTapToMarkdown(markdownToTipTap(markdown))).toBe(markdown);
	});

	it('le nœud de l’éditeur porte le LaTeX intact', () => {
		const json = markdownToTipTap(`$$${CALCUL}$$`);
		const bloc = json.content?.find((n) => n.type === 'mathBlock');
		expect(bloc?.attrs?.latex).toBe(CALCUL);
	});
});

describe('rendu élève', () => {
	it('garde les & et les \\\\ et met la virgule décimale', () => {
		const latex = expressionToLatex(CALCUL, 'latex', null, 'fr');
		expect(latex).toBe('\\begin{aligned}A&=3{,}5+4\\\\&=7{,}5\\end{aligned}');
	});

	it('garde « ou » en mot droit', () => {
		expect(expressionToLatex(RAISONNEMENT, 'latex', null, 'fr')).toContain('\\:\\mathrm{ou}\\:');
	});
});

describe('PDF', () => {
	it('calcul : une grille, une ligne par ligne du calcul, alignée sur =', async () => {
		const typst = await markdownToTypst(`$$${CALCUL}$$`, { includeSetup: false, language: 'fr' });
		expect(typst).toContain('[$A$], [$=$], [$3","5+4$]');
		expect(typst).toContain('[], [$=$], [$7","5$]');
	});

	it('raisonnement : aligné sur ⇔, « ou » droit', async () => {
		const typst = await markdownToTypst(`$$${RAISONNEMENT}$$`, {
			includeSetup: false,
			language: 'fr'
		});
		expect(typst).toContain('[$x^2-1=0$], [$<=>$], [$x^2=1$]');
		expect(typst).toContain('[], [$<=>$], [$x=1 med upright(o u) med x=-1$]');
	});
});
