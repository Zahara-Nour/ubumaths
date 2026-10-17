/**
 * Écart V47 (2026-10-13), côté rédaction : les pipelines du premier et du
 * second degré lisent la forme canonique, où `\frac{3x^2}{2x}` devient
 * `\frac{3}{2}x`. Mesuré avant : `\frac{3x^2}{2x}\geq 0` concluait x ≥ 0 et
 * `\frac{4x^2}{2x}<6` concluait x < 3, 0 compris — valeur interdite. Le
 * premier degré conclut par une forme résolue, qui ne peut pas exclure un
 * point : il refuse (`InequalityNotSolvable`), l'appelant se replie sur le
 * moteur (`solveInequality`, juste depuis V47).
 *
 * Écart V48 (2026-10-13, option (c) de David) : le second degré refuse aussi.
 * `\frac{2x^3}{x}<2` était rédigé comme 2x² − 2 < 0 : conclusion juste (lue
 * sur `solveInequality`), mais aucune étape n'annonçait l'exclusion de 0, et
 * la première ligne était fausse en 0. Il refuse désormais, comme le premier
 * degré : l'atelier affiche la réponse du moteur, sans « Comment ? ».
 */

import { describe, it, expect } from 'vitest';
import { generateInequalitySteps } from '../index';
import { generateLinearInequalitySteps } from '../linear-inequality';
import { generateQuadraticInequalitySteps } from '../quadratic-inequality';
import { InequalityNotSolvable } from '../../solve/inequality/types';
import { parseLatex } from '../../parser';
import type { RelationNode } from '../../types';

function relationOf(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Relation attendue : ${latex}`);
	return node;
}

describe('valeur interdite effacée par la simplification : refus', () => {
	it.each(['\\frac{3x^2}{2x}\\geq 0', '\\frac{4x^2}{2x}<6'])('premier degré : %s', (inequality) => {
		expect(() => generateLinearInequalitySteps(relationOf(inequality), { level: 'lycee' })).toThrow(
			InequalityNotSolvable
		);
		expect(() => generateInequalitySteps(relationOf(inequality), { level: 'lycee' })).toThrow(
			InequalityNotSolvable
		);
	});

	it.each(['\\frac{2x^3}{x}<2', '\\frac{x^3-1}{x-1}<0'])('second degré : %s', (inequality) => {
		expect(() =>
			generateQuadraticInequalitySteps(relationOf(inequality), { level: 'lycee' })
		).toThrow(InequalityNotSolvable);
		expect(() => generateInequalitySteps(relationOf(inequality), { level: 'lycee' })).toThrow(
			InequalityNotSolvable
		);
	});
});

describe('verrous : sans valeur interdite, rien ne change', () => {
	it.each(['2x+1>3', '\\frac{3x}{2}-1\\leq 5', '-\\frac{2}{3}x+1<5'])('%s', (inequality) => {
		expect(
			generateLinearInequalitySteps(relationOf(inequality), { level: 'lycee' }).length
		).toBeGreaterThan(0);
	});

	it.each(['3x^2-12\\leq 0', '2x^2<2', '-2x^2\\geq -8', 'x^2-1>0'])('%s', (inequality) => {
		expect(
			generateQuadraticInequalitySteps(relationOf(inequality), { level: 'lycee' }).length
		).toBeGreaterThan(0);
		expect(
			generateInequalitySteps(relationOf(inequality), { level: 'lycee' }).length
		).toBeGreaterThan(0);
	});

	it('\\frac{2}{x}\\geq 0 : le pipeline rationnel garde la main', () => {
		expect(
			generateInequalitySteps(relationOf('\\frac{2}{x}\\geq 0'), { level: 'lycee' }).length
		).toBeGreaterThan(0);
	});
});
