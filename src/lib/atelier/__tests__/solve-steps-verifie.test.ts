/**
 * `.résoudre` — la conclusion des étapes est VÉRIFIÉE contre le moteur.
 *
 * Mesuré le 2026-10-08 : `solveSteps('(2x-4)=0')` concluait `x = 0` alors que
 * le moteur répond x = 2. Un affichage faux est pire que pas d'étapes : en cas
 * de désaccord, `solveSteps` rend `null` (repli sur la réponse du moteur).
 */

import { describe, expect, it } from 'vitest';
import { solveSteps } from '../solve-steps';
import { conclusionAgrees } from '../solve-steps-check';
import { generateEquationSteps, generateInequalitySteps } from '$lib/mathAST/pedagogical-solve';
import { parseLatex } from '$lib/mathAST/parser';
import { isRelation } from '$lib/mathAST/guards';
import type { RelationNode } from '$lib/mathAST/types';

function rel(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (!isRelation(node)) throw new Error(`pas une relation : ${latex}`);
	return node;
}

function lastStepOf(latex: string) {
	const r = rel(latex);
	const steps =
		r.relation === '='
			? generateEquationSteps(r, { level: 'college', variable: 'x' })
			: generateInequalitySteps(r, { level: 'college', variable: 'x' });
	return steps[steps.length - 1];
}

describe('solveSteps — cas frères de (2x-4)=0 : bonne réponse, ou repli', () => {
	it.each([
		['(2x-4)=0', 'x = 2'],
		['(x+1)=3', 'x = 2'],
		['((x))=5', 'x = 5'],
		['\\left(2x-4\\right)=0', 'x = 2'],
		['(x-1)>0', 'x > 1'],
		['(x-1)(x+2)=0', 'S = \\left\\{ 1 \\,;\\, -2 \\right\\}']
	])('%s répond %s', (input, expected) => {
		expect(solveSteps(input)?.answer).toBe(expected);
	});

	it.each(['2(x-1)=4', '-(x-3)=0', '(2x-4)/2=0'])(
		'%s : pas d’étapes (repli sur le moteur), jamais x = 0',
		(input) => {
			expect(solveSteps(input)).toBeNull();
		}
	);
});

describe('conclusionAgrees — le garde-fou', () => {
	it('accepte une conclusion juste', () => {
		expect(conclusionAgrees(rel('2x-4=0'), 'x', lastStepOf('2x-4=0'))).toBe(true);
		expect(conclusionAgrees(rel('x^2-4=0'), 'x', lastStepOf('x^2-4=0'))).toBe(true);
		expect(conclusionAgrees(rel('x-1>0'), 'x', lastStepOf('x-1>0'))).toBe(true);
	});

	it('refuse une équation dont la conclusion ne vérifie pas l’équation', () => {
		// Les étapes de 2x-4=0 (x = 2) présentées comme résolvant 2x-6=0
		expect(conclusionAgrees(rel('2x-6=0'), 'x', lastStepOf('2x-4=0'))).toBe(false);
	});

	it('refuse un ensemble incomplet (une racine manquante)', () => {
		// x = 2 vérifie x^2-4=0, mais -2 manque
		expect(conclusionAgrees(rel('x^2-4=0'), 'x', lastStepOf('x-2=0'))).toBe(false);
	});

	it('refuse une inéquation mal conclue (borne fausse)', () => {
		expect(conclusionAgrees(rel('x-2>0'), 'x', lastStepOf('x-1>0'))).toBe(false);
	});

	it('refuse une inéquation mal conclue (borne incluse à tort)', () => {
		expect(conclusionAgrees(rel('x-1>0'), 'x', lastStepOf('x-1\\ge 0'))).toBe(false);
	});
});
