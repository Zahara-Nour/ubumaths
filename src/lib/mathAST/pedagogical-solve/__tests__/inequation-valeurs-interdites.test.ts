/**
 * Écart V47 (2026-10-13), côté rédaction : les pipelines du premier et du
 * second degré lisent la forme canonique, où `\frac{3x^2}{2x}` devient
 * `\frac{3}{2}x`. Mesuré avant : `\frac{3x^2}{2x}\geq 0` concluait x ≥ 0 et
 * `\frac{4x^2}{2x}<6` concluait x < 3, 0 compris — valeur interdite. Le
 * premier degré conclut par une forme résolue, qui ne peut pas exclure un
 * point : il refuse (`InequalityNotSolvable`), l'appelant se replie sur le
 * moteur (`solveInequality`, juste depuis V47). Le second degré conclut par
 * `solveInequality` : sa conclusion est juste, ses étapes restent (V48).
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

	it('second degré : \\frac{2x^3}{x}<2 garde ses étapes, sa conclusion exclut 0', () => {
		// La conclusion lit `solveInequality` (juste depuis V47) ; le tableau de
		// signes de 2x² − 2 ne montre pas la valeur interdite (écart V48)
		const steps = generateQuadraticInequalitySteps(relationOf('\\frac{2x^3}{x}<2'), {
			level: 'lycee'
		});
		expect(steps[steps.length - 1].description).toBe('Solution : $]-1 ; 0[ \\cup ]0 ; 1[$');
	});
});

describe('verrous : sans valeur interdite, rien ne change', () => {
	it.each(['2x+1>3', '\\frac{3x}{2}-1\\leq 5', '-\\frac{2}{3}x+1<5'])('%s', (inequality) => {
		expect(
			generateLinearInequalitySteps(relationOf(inequality), { level: 'lycee' }).length
		).toBeGreaterThan(0);
	});

	it('3x^2-12\\leq 0', () => {
		expect(
			generateQuadraticInequalitySteps(relationOf('3x^2-12\\leq 0'), { level: 'lycee' }).length
		).toBeGreaterThan(0);
	});

	it('\\frac{2}{x}\\geq 0 : le pipeline rationnel garde la main', () => {
		expect(
			generateInequalitySteps(relationOf('\\frac{2}{x}\\geq 0'), { level: 'lycee' }).length
		).toBeGreaterThan(0);
	});
});
