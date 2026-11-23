/**
 * Premier degré, coefficient irrationnel : la ligne réduite regroupe les termes en x
 * (écart V52, relevé le 2026-10-13).
 *
 * `5x+1\leq(\pi-4)x+7` réduisait à `-\pi x + 9x \leqslant 6` (`canonicalForm` développe le
 * coefficient somme) au lieu de `\left( 9 - \pi \right) x \leqslant 6`. L'opération colorée,
 * elle, était déjà factorisée (`movedTerm`).
 */

import { describe, it, expect } from 'vitest';
import { generateEquationSteps, generateInequalitySteps } from '../index';
import { parseLatex } from '../../parser';
import { isRelation } from '../../guards';
import { toLatex } from '../../latex-generator';
import { LinearEquationRenderer } from '../linear-renderer';

function steps(source: string, level: 'college' | 'lycee') {
	const rel = parseLatex(source);
	if (!isRelation(rel)) throw new Error(`pas une relation : ${source}`);
	return rel.relation === '='
		? generateEquationSteps(rel, { level })
		: generateInequalitySteps(rel, { level });
}

/** Le résultat (`after`) de chaque étape, en LaTeX. */
function afters(source: string, level: 'college' | 'lycee'): string[] {
	return steps(source, level).map((s) => toLatex(s.after));
}

describe('V52 : les termes en x regroupés, coefficient irrationnel', () => {
	it('5x+1 ≤ (π−4)x+7 au lycée : (9 − π)x ≤ 6', () => {
		expect(afters('5x+1\\leq(\\pi-4)x+7', 'lycee')).toContain(
			'\\left( 9 - \\pi \\right) x \\leqslant 6'
		);
	});

	it('5x+1 ≤ (π−4)x+7 au collège : (9 − π)x + 1 ≤ 7', () => {
		expect(afters('5x+1\\leq(\\pi-4)x+7', 'college')).toContain(
			'\\left( 9 - \\pi \\right) x + 1 \\leqslant 7'
		);
	});

	it('3x+2 = (π+1)x−4 au lycée : (2 − π)x = −6', () => {
		expect(afters('3x+2=(\\pi+1)x-4', 'lycee')).toContain('\\left( 2 - \\pi \\right) x = -6');
	});

	it('(1+√2)x reste factorisé (témoin)', () => {
		expect(afters('3x+1=(1+\\sqrt{2})x+5', 'lycee').join(' | ')).not.toMatch(
			/\\sqrt\{2\} x \+ \d+ x/
		);
	});

	it('aucun terme en x développé dans les étapes', () => {
		for (const level of ['college', 'lycee'] as const) {
			for (const line of afters('5x+1\\leq(\\pi-4)x+7', level)) {
				expect(line).not.toMatch(/\\pi x \+ \d+ x/);
			}
		}
	});

	it('collège : la division se fait par 9 − π, écrit comme dans la ligne réduite', () => {
		const division = new LinearEquationRenderer()
			.renderAll(steps('5x+1\\leq(\\pi-4)x+7', 'college'), {
				schoolLevel: 'college',
				verbosity: 'detailed'
			})
			.find((s) => s.title.startsWith('On divise'));

		expect(division?.title).toBe('On divise les deux membres par $9 - \\pi$');
		expect(division?.expressionLatex).toContain(
			'\\dfrac{\\left( 9 - \\pi \\right) x}{\\textcolor{blue}{9 - \\pi}}'
		);
	});
});
