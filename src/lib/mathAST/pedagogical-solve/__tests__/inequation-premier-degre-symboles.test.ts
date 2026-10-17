/**
 * Le premier degré écrit ≤ et ≥ comme le reste du rendu : `\leqslant`,
 * `\geqslant` (`RELATION_MAP`, celui de `toLatex`).
 *
 * ⚠️ Ses blocs alignés écrivaient `\leq`/`\geq` (`relToLatex`) alors que les
 * lignes simples, rendues par `toLatex`, écrivent `\leqslant`/`\geqslant` :
 * deux dessins différents du même symbole dans une même correction
 * (relevé le 2026-10-13, en harmonisant le second degré).
 */

import { describe, it, expect } from 'vitest';
import { generateInequalitySteps } from '../index';
import { parseCustomSafe } from '../../parser/custom';
import { isRelation } from '../../guards';
import { LinearEquationRenderer } from '../linear-renderer';
import type { RelationNode } from '../../types';
import type { EquationStep } from '../types';
import { parseLatex } from '../../parser';

function ast(source: string): RelationNode {
	const node = parseCustomSafe(source).ast;
	if (node === null || !isRelation(node)) throw new Error(`pas une relation : ${source}`);
	return node;
}

function rendered(source: string, level: 'college' | 'lycee') {
	const steps = generateInequalitySteps(ast(source), { level });
	return new LinearEquationRenderer().renderAll(steps, {
		schoolLevel: level,
		verbosity: 'detailed'
	});
}

function renderedLatex(source: string, level: 'college' | 'lycee'): readonly string[] {
	return rendered(source, level).map((s) => s.expressionLatex ?? '');
}

/** Bloc aligné de deux lignes, tel que l'écrit le rendu. */
function aligned(first: string, second: string): string {
	return `\\begin{aligned}   ${first} \\\\   ${second} \\end{aligned}`;
}

describe('\\geqslant / \\leqslant dans les blocs alignés : rendu exact', () => {
	it('-2x + 1 ≥ 5 au collège (le sens se retourne)', () => {
		expect(renderedLatex('-2x+1>=5', 'college')).toEqual([
			'-2x + 1\\geqslant 5',
			aligned(
				'-2x + 1 \\textcolor{blue}{- 1} &\\geqslant 5 \\textcolor{blue}{- 1}',
				'-2x &\\geqslant 4'
			),
			aligned(
				'\\dfrac{-2x}{\\textcolor{blue}{-2}} &\\geqslant \\dfrac{4}{\\textcolor{blue}{-2}}',
				'x &\\leqslant -2'
			)
		]);
	});

	it('-2x + 1 ≥ 5 au lycée', () => {
		expect(renderedLatex('-2x+1>=5', 'lycee')).toEqual([
			'-2x + 1\\geqslant 5',
			aligned('-2x &\\geqslant 5 \\textcolor{blue}{- 1}', '-2x &\\geqslant 4'),
			'x \\leqslant -2'
		]);
	});

	it('3x - 4 ≤ 1 au collège', () => {
		expect(renderedLatex('3x-4<=1', 'college')).toEqual([
			'3x - 4\\leqslant 1',
			aligned(
				'3x - 4 \\textcolor{blue}{+ 4} &\\leqslant 1 \\textcolor{blue}{+ 4}',
				'3x &\\leqslant 5'
			),
			aligned(
				'\\dfrac{3x}{\\textcolor{blue}{3}} &\\leqslant \\dfrac{5}{\\textcolor{blue}{3}}',
				'x &\\leqslant \\dfrac{5}{3}'
			)
		]);
	});
});

describe('≠ : diviser ou multiplier par un nombre non nul garde ≠', () => {
	/**
	 * ⚠️ L'explication tombait dans la branche « sans changement de sens » et
	 * disait « $-3$ est positif, donc l'inéquation est préservée » : faux deux
	 * fois (−3 est négatif, et ≠ n'a pas de sens à retourner).
	 */
	it('-3x + 1 ≠ 7 au collège : division par −3', () => {
		const divide = rendered('-3x+1!=7', 'college').find((s) => s.rule === 'divide-both-sides');

		expect(divide?.explanation).toBe(
			"On divise les deux membres par $-3$ pour isoler x. $-3$ n'est pas nul, donc la relation $\\neq$ est préservée."
		);
	});

	it('multiplication par −2 sous ≠', () => {
		const step: EquationStep = {
			id: 1,
			rule: 'multiply-both-sides',
			description: 'On multiplie par -2',
			verbosityLevel: 'detailed',
			before: ast('-x/2!=3'),
			after: ast('x!=-6'),
			operation: { kind: 'multiply-both-sides', operand: parseLatex('-2'), flipOperator: false }
		};
		const out = new LinearEquationRenderer().render(step, {
			schoolLevel: 'college',
			verbosity: 'detailed'
		});

		expect(out.explanation).toBe(
			"On multiplie les deux membres par $-2$. $-2$ n'est pas nul, donc la relation $\\neq$ est préservée."
		);
	});
});
