/**
 * Déplacer un terme négatif d'un membre à l'autre s'écrit « − 2x », jamais
 * « + −2x » (écart V50, relevé le 2026-10-13).
 *
 * ⚠️ Le solveur ne voyait le signe que d'un nombre ou d'un `opposite(…)` :
 * un terme en x à coefficient négatif (`-2x` = produit `(-2)·x`) passait pour
 * positif → « On ajoute -2x » et `\textcolor{blue}{+ -2x}` dans la correction.
 * Le transfert du lycée avait le même angle mort dans son rendu.
 */

import { describe, it, expect } from 'vitest';
import { generateEquationSteps, generateInequalitySteps } from '../index';
import { parseCustomSafe } from '../../parser/custom';
import { isRelation } from '../../guards';
import { LinearEquationRenderer, formatTransformationCustom } from '../linear-renderer';
import type { RelationNode } from '../../types';

function ast(source: string): RelationNode {
	const node = parseCustomSafe(source).ast;
	if (node === null || !isRelation(node)) throw new Error(`pas une relation : ${source}`);
	return node;
}

function steps(source: string, level: 'college' | 'lycee') {
	const rel = ast(source);
	return rel.relation === '='
		? generateEquationSteps(rel, { level })
		: generateInequalitySteps(rel, { level });
}

/** Étapes rendues (titre + LaTeX) qui portent une opération colorée. */
function coloredSteps(source: string, level: 'college' | 'lycee') {
	return new LinearEquationRenderer()
		.renderAll(steps(source, level), { schoolLevel: level, verbosity: 'detailed' })
		.filter((s) => (s.expressionLatex ?? '').includes('textcolor'))
		.map((s) => ({ title: s.title, latex: s.expressionLatex }));
}

function aligned(first: string, second: string): string {
	return `\\begin{aligned}   ${first} \\\\   ${second} \\end{aligned}`;
}

describe('collège : on soustrait la valeur absolue du terme négatif', () => {
	it('3x - 4 ≤ 2x + 1 : « − 2x » (le cas relevé)', () => {
		expect(coloredSteps('3x-4<=2x+1', 'college')[0]).toEqual({
			title: 'On soustrait $2x$ aux deux membres',
			latex: aligned(
				'3x - 4 \\textcolor{blue}{- 2x} &\\leqslant 2x + 1 \\textcolor{blue}{- 2x}',
				'x - 4 &\\leqslant 1'
			)
		});
	});

	it('5x + 1 = 7x - 3 : « − 7x », équation', () => {
		expect(coloredSteps('5x+1=7x-3', 'college')[0]).toEqual({
			title: 'On soustrait $7x$ aux deux membres',
			latex: aligned(
				'5x + 1 \\textcolor{blue}{- 7x} &= 7x - 3 \\textcolor{blue}{- 7x}',
				'-2x + 1 &= -3'
			)
		});
	});

	it('3x = 2x + 1 : « − 2x », membre gauche sans constante', () => {
		expect(coloredSteps('3x=2x+1', 'college')[0].latex).toBe(
			aligned('3x \\textcolor{blue}{- 2x} &= 2x + 1 \\textcolor{blue}{- 2x}', 'x &= 1')
		);
	});

	it('3x + 1 = x - 2 : « − x », coefficient 1 sans « 1x »', () => {
		expect(coloredSteps('3x+1=x-2', 'college')[0].latex).toBe(
			aligned('3x + 1 \\textcolor{blue}{- x} &= x - 2 \\textcolor{blue}{- x}', '2x + 1 &= -2')
		);
	});

	it('4x + 1 = x/2 : « − ½x », coefficient fractionnaire', () => {
		expect(coloredSteps('4x+1=x/2', 'college')[0].latex).toBe(
			aligned(
				'4x + 1 \\textcolor{blue}{- \\dfrac{1}{2}x} &= \\dfrac{x}{2} \\textcolor{blue}{- \\dfrac{1}{2}x}',
				'\\dfrac{7}{2}x + 1 &= 0'
			)
		);
	});

	it('2x + 5 = -3 : « − 5 », constante (déjà juste)', () => {
		expect(coloredSteps('2x+5=-3', 'college')[0].latex).toBe(
			aligned('2x + 5 \\textcolor{blue}{- 5} &= -3 \\textcolor{blue}{- 5}', '2x &= -8')
		);
	});

	it('x - 4 ≤ -2x + 1 : « + 2x », terme positif inchangé', () => {
		expect(coloredSteps('x-4<=-2x+1', 'college')[0].latex).toBe(
			aligned(
				'x - 4 \\textcolor{blue}{+ 2x} &\\leqslant -2x + 1 \\textcolor{blue}{+ 2x}',
				'3x - 4 &\\leqslant 1'
			)
		);
	});

	it('la sortie texte (CLI) suit : « - 2x », pas « + -2x »', () => {
		const first = steps('3x-4<=2x+1', 'college').find(
			(s) => s.operation?.kind === 'subtract-both-sides' || s.operation?.kind === 'add-both-sides'
		);
		if (first === undefined) throw new Error('aucune étape de transfert');
		expect(formatTransformationCustom(first)?.split('\n')[0]).toBe(
			'3x-4 @blue{- 2x} <= 2x+1 @blue{- 2x}'
		);
	});
});

describe('lycée : le transfert écrit « − 2x », pas « + −2x »', () => {
	it('3x - 4 ≤ 2x + 1', () => {
		expect(coloredSteps('3x-4<=2x+1', 'lycee')[0].latex).toBe(
			aligned('3x \\textcolor{blue}{- 2x} &\\leqslant 1 \\textcolor{blue}{+ 4}', 'x &\\leqslant 5')
		);
	});

	it('5x + 1 = 7x - 3 : « − 7x » à gauche, « − 1 » à droite', () => {
		expect(coloredSteps('5x+1=7x-3', 'lycee')[0].latex).toBe(
			aligned('5x \\textcolor{blue}{- 7x} &= -3 \\textcolor{blue}{- 1}', '-2x &= -4')
		);
	});
});
