/**
 * Le tableau de signes, comme donnée puis comme rendu.
 *
 * ⚠️ **Premier rôle de ce fichier : caractériser le LaTeX AVANT extraction.**
 * Les formateurs `formatSignTable` / `formatRationalSignTable` construisaient
 * déjà leurs lignes en mémoire avant d'assembler la chaîne ; on sort cette
 * construction pour qu'un second rendu (le tableau ubumark) parte des MÊMES
 * données. Les assertions ci-dessous figent la sortie existante : si
 * l'extraction change une seule case, elles rougissent.
 */

import { describe, it, expect } from 'vitest';
import { generateInequalitySteps, QuadraticEquationRenderer } from '../index';
import { parseCustomSafe } from '../../parser/custom';

const ast = (s: string) => (parseCustomSafe(s) as { ast: never }).ast;

function tableLatexOf(source: string): string {
	const steps = generateInequalitySteps(ast(source), { level: 'lycee' });
	const rendered = new QuadraticEquationRenderer().renderAll(steps, {
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
	const table = rendered.find((s) => s.rule.includes('sign-table'));
	return table?.expressionLatex ?? '(aucun tableau)';
}

describe('le LaTeX des tableaux de signes ne bouge pas', () => {
	it('second degré, deux racines', () => {
		expect(tableLatexOf('x^2-3x+2>0')).toMatchInlineSnapshot(
			`"\\begin{array}{|c|ccccccc|} \\hline x & -\\infty & & 1 & & 2 & & +\\infty \\\\ \\hline P(x) & & + & 0 & - & 0 & + & \\\\ \\hline \\end{array}"`
		);
	});

	it('second degré, coefficient dominant négatif', () => {
		expect(tableLatexOf('-x^2+3x-2>0')).toMatchInlineSnapshot(
			`"\\begin{array}{|c|ccccccc|} \\hline x & -\\infty & & 1 & & 2 & & +\\infty \\\\ \\hline P(x) & & - & 0 & + & 0 & - & \\\\ \\hline \\end{array}"`
		);
	});

	it('rationnelle simple', () => {
		expect(tableLatexOf('(x-1)/(x+2)>0')).toMatchInlineSnapshot(`
			"\\begin{array}{|c|cccccc|}
			\\hline
			x & -\\infty &  & -2 &  & 1 &  & +\\infty \\\\
			\\hline
			P(x) &  & - &  & - & 0 & + &  \\\\
			\\hline
			Q(x) &  & - & 0 & + &  & + &  \\\\
			\\hline
			\\dfrac{P(x)}{Q(x)} &  & + & || & - & 0 & + &  \\\\
			\\hline
			\\end{array}"
		`);
	});

	it('rationnelle sans racine au numérateur', () => {
		expect(tableLatexOf('1/(x-1)<0')).toMatchInlineSnapshot(`
			"\\begin{array}{|c|cccc|}
			\\hline
			x & -\\infty &  & 1 &  & +\\infty \\\\
			\\hline
			P(x) &  & + &  & + &  \\\\
			\\hline
			Q(x) &  & - & 0 & + &  \\\\
			\\hline
			\\dfrac{P(x)}{Q(x)} &  & - & || & + &  \\\\
			\\hline
			\\end{array}"
		`);
	});
});
