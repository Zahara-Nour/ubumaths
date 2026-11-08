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
/** Calcul centré (`array{rcl}`) : la forme qu'écrit désormais l'éditeur. */
const CENTRE = `\\begin{array}{rcl}n=1&\\iff&n+1=2\\\\&\\Rightarrow&n=0.5${RACCOURCIS_MOTS.ou}n=2\\end{array}`;
/**
 * Calcul centré au grand format : membres ouverts par `\\displaystyle` (nu, ou en
 * groupe comme l'écrit MathLive après une frappe), lignes espacées.
 */
const GRAND =
	'\\begin{array}{rcl}\\displaystyle \\frac{1}{2}&=&\\displaystyle \\frac{2}{4}' +
	'\\\\[6pt]&=&{\\displaystyle 0.5}\\end{array}';

describe('aller-retour markdown', () => {
	it.each([CALCUL, RAISONNEMENT, CENTRE, GRAND])('garde le bloc à l’identique : %s', (latex) => {
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

	it('calcul centré : garde le tableau rcl, ses & et ses \\\\', () => {
		expect(expressionToLatex(CENTRE, 'latex', null, 'fr')).toBe(
			`\\begin{array}{rcl}n=1&\\iff&n+1=2\\\\&\\Rightarrow&n=0{,}5${RACCOURCIS_MOTS.ou}n=2\\end{array}`
		);
	});
});

describe('rendu élève — calcul centré au grand format', () => {
	it('garde le style et l’écart, sans virgule dans l’écart', () => {
		expect(expressionToLatex(GRAND, 'latex', null, 'fr')).toBe(
			'\\begin{array}{rcl}\\displaystyle \\frac{1}{2}&=&\\displaystyle \\frac{2}{4}' +
				'\\\\[6pt]&=&{\\displaystyle 0{,}5}\\end{array}'
		);
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

	it('calcul centré : la même grille, relation au milieu', async () => {
		const typst = await markdownToTypst(`$$${CENTRE}$$`, { includeSetup: false, language: 'fr' });
		expect(typst).toContain('[$n=1$], [$<=>$], [$n+1=2$]');
		expect(typst).toContain('[], [$=>$], [$n=0","5 med upright(o u) med n=2$]');
	});

	it('calcul centré : toute relation du milieu reste au milieu (revue #2422)', async () => {
		const latex = '\\begin{array}{rcl}x&\\approx&3.1\\\\&\\subset&E\\end{array}';
		const typst = await markdownToTypst(`$$${latex}$$`, { includeSetup: false, language: 'fr' });
		expect(typst).toContain('[$x$], [$approx$], [$3","1$]');
		expect(typst).toContain('[], [$subset$], [$E$]');
	});

	it('calcul centré au grand format : ni style ni écart dans la grille', async () => {
		const typst = await markdownToTypst(`$$${GRAND}$$`, { includeSetup: false, language: 'fr' });
		expect(typst).not.toContain('displaystyle');
		expect(typst).not.toContain('6pt');
		expect(typst).toContain('[], [$=$], [$0","5$]');
	});
});
