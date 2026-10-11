/**
 * Différence de deux carrés, puis produit nul (V20, chantier K21)
 *
 * `sin²x − cos²x = 0` se factorise en `(sin x + cos x)(sin x − cos x) = 0`, et
 * chaque facteur est une équation que `solve` sait résoudre (`tan x = ∓1`).
 * Mesuré avant le correctif : « Type d'equation transcendante non supporte ».
 *
 * L'ensemble attendu, sur [0 ; 2π[ : π/4, 3π/4, 5π/4, 7π/4 (cos 2x = 0). Les
 * familles rendues sont dépliées sur cet intervalle et comparées : une famille
 * trop large ou trop étroite échoue. Coefficient ≠ 1 compris (2 sin²x − 2 cos²x).
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import { isRelation } from '../../guards';
import { subtract } from '../../factory';
import { compile } from '../../eval/compile';
import type { RelationNode } from '../../types';
import { toLatex } from '../../latex-generator';
import type { SolveResult } from '../types';

function parseEquation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (!isRelation(node)) throw new Error(`Relation attendue, reçu ${node.type}`);
	return node;
}

/** Les solutions de la famille périodique dans [0 ; 2π[, triées. */
function unfoldOnOneTurn(result: SolveResult): number[] {
	const family = result.periodicSolutions;
	if (!family) throw new Error('Famille périodique attendue');
	const period = family.periodNumeric;
	const values: number[] = [];
	for (const base of family.baseSolutions) {
		const start = compile(base.value)({});
		for (let k = -10; k <= 10; k++) {
			const v = start + k * period;
			const inTurn = v >= -1e-12 && v < 2 * Math.PI - 1e-9;
			if (inTurn && !values.some((w) => Math.abs(w - v) < 1e-9)) values.push(v);
		}
	}
	return values.sort((a, b) => a - b);
}

const QUARTERS = [1, 3, 5, 7].map((n) => (n * Math.PI) / 4);

describe('sin²x − cos²x = 0 : différence de carrés puis produit nul', () => {
	it.each([
		'\\sin^2x-\\cos^2x=0',
		'\\cos^2x-\\sin^2x=0',
		'\\sin^2 x=\\cos^2 x',
		'2\\sin^2x-2\\cos^2x=0',
		'3\\cos(x)^2=3\\sin(x)^2'
	])('%s → π/4 + kπ/2, vérifié numériquement', (latex) => {
		const equation = parseEquation(latex);
		const result = solve(equation);
		expect(result.error).toBeUndefined();

		const turn = unfoldOnOneTurn(result);
		expect(turn).toHaveLength(QUARTERS.length);
		turn.forEach((v, i) => expect(v).toBeCloseTo(QUARTERS[i], 9));

		const residual = compile(subtract(equation.left, equation.right));
		for (const v of turn) expect(Math.abs(residual({ x: v }))).toBeLessThan(1e-9);
	});

	it('la première étape annonce l’identité, puis le produit nul', () => {
		const result = solve(parseEquation('\\sin^2x-\\cos^2x=0'));
		expect(result.steps[0].description).toBe(
			'On factorise avec l’identité a² − b² = (a + b)(a − b)'
		);
		expect(result.steps.some((s) => s.rule === 'zero-product-property')).toBe(true);
	});

	it('sin²x − 2cos²x = 0 n’est pas une différence de carrés de même coefficient : pas de factorisation inventée', () => {
		const result = solve(parseEquation('\\sin^2x-2\\cos^2x=0'));
		expect(result.steps.some((s) => s.rule === 'difference-of-squares')).toBe(false);
	});
});

describe('Un polynôme garde ses étapes : la différence de carrés est réservée au non polynomial', () => {
	// Étapes relevées sur main (0e1f3c14d), avant la différence de carrés
	it.each([
		['(x-1)^2-x^2=0', ['identify-linear-coefficients', 'isolate-variable'], [0.5]],
		['x^2-(x+1)^2=0', ['identify-linear-coefficients', 'isolate-variable'], [-0.5]],
		[
			'(x^2+1)^2-(2x)^2=0',
			[
				'identify-quartic',
				'identify-biquadratic',
				'biquadratic-substitution',
				'biquadratic-back-substitution',
				'isolate-variable',
				'isolate-variable'
			],
			[-1, 1]
		]
	] as const)('%s : étapes de main', (latex, rules, values) => {
		const equation = parseEquation(latex);
		const result = solve(equation, { verbosity: 'detailed' });
		expect(result.steps.map((s) => s.rule)).toEqual(rules);
		const found = result.solutions.map((s) => compile(s.value)({})).sort((a, b) => a - b);
		expect(found).toHaveLength(values.length);
		found.forEach((v, i) => expect(v).toBeCloseTo(values[i], 12));
		const residual = compile(subtract(equation.left, equation.right));
		for (const v of found) expect(Math.abs(residual({ x: v }))).toBeLessThan(1e-9);
	});

	it('sin²x − cos²x : les facteurs gardent l’écriture de l’identité', () => {
		const result = solve(parseEquation('2\\sin^2x-2\\cos^2x=0'));
		const step = result.steps.find((s) => s.rule === 'difference-of-squares');
		expect(step && toLatex(step.after)).toBe(
			'2 \\left( \\sin\\left( x \\right) + \\cos\\left( x \\right) \\right) \\left( \\sin\\left( x \\right) - \\cos\\left( x \\right) \\right)'
		);
	});
});
