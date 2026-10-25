/**
 * Écart V36 — le signe d'un coefficient se lit sur sa VALEUR.
 *
 * `-\dfrac{2}{3}x + 1 < 5` concluait x < −6 (au lieu de x > −6) : le diviseur
 * `-\frac23` est un `opposite(division)`, que la lecture du signe sur
 * `number` / `opposite(number)` ne voyait pas — l'explication le disait
 * « positif ». Mêmes causes, mêmes effets : coefficient décimal (`-0.5`
 * devient `-\frac12`), radical (`-\sqrt2`), inéquation dégénérée à
 * constantes fractionnaires (`0 < \frac23` lue comme une contradiction),
 * tableau de signes du second degré à coefficient dominant fractionnaire.
 *
 * Entrées parsées ; oracle : `solveInequality` sur l'énoncé, comparé au
 * même `solveInequality` sur la conclusion pédagogique.
 */

import { describe, it, expect } from 'vitest';
import { generateLinearInequalitySteps } from '../linear-inequality';
import { generateQuadraticInequalitySteps } from '../quadratic-inequality';
import { LinearEquationRenderer } from '../linear-renderer';
import { quadraticSignTableGrid, QuadraticEquationRenderer } from '../quadratic-renderer';
import { InequalityNotSolvable } from '../../solve/inequality/types';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { solveInequality } from '../../solve/inequality';
import { formatDomainFull } from '../../domain/format';
import type { EquationStep, EquationOperation, LinearSchoolLevel } from '../types';
import type { RenderedStep } from '../../common/step-renderer-base';
import type { RelationNode } from '../../types';

// =============================================================================
// Helpers
// =============================================================================

const LEVELS: readonly LinearSchoolLevel[] = ['college', 'lycee', 'superieur'];

/** Les quatre symboles, chacun avec son symbole retourné et son écriture LaTeX. */
const OPERATORS = [
	{ input: '<', flipped: '>', latex: '<', flippedLatex: '>' },
	{ input: '>', flipped: '<', latex: '>', flippedLatex: '<' },
	{ input: '\\le', flipped: '\\ge', latex: '\\leqslant', flippedLatex: '\\geqslant' },
	{ input: '\\ge', flipped: '\\le', latex: '\\geqslant', flippedLatex: '\\leqslant' }
] as const;

function ineq(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`pas une relation : ${latex}`);
	return node;
}

function flattenSteps(steps: readonly EquationStep[]): EquationStep[] {
	return steps.flatMap((s) => [s, ...flattenSteps(s.subSteps ?? [])]);
}

function flattenRendered(steps: readonly RenderedStep[]): RenderedStep[] {
	return steps.flatMap((s) => [s, ...flattenRendered(s.subSteps ?? [])]);
}

/** La relation à laquelle aboutit la correction pédagogique. */
function conclusion(steps: readonly EquationStep[]): RelationNode {
	const last = steps[steps.length - 1].after;
	if (last.type !== 'relation') throw new Error('la dernière étape ne rend pas une relation');
	return last;
}

/** L'ensemble des solutions d'une relation, écrit en intervalles (oracle). */
function solutionSet(relation: RelationNode): string {
	return formatDomainFull(solveInequality(relation).solution).interval;
}

/** Tout le texte montré à l'élève : titres et explications, sous-étapes comprises. */
function renderedProse(steps: readonly EquationStep[], level: LinearSchoolLevel): string {
	const rendered = new LinearEquationRenderer().renderAll(steps, {
		schoolLevel: level,
		verbosity: 'detailed'
	});
	return flattenRendered(rendered)
		.map((s) => `${s.title}\n${s.explanation ?? ''}`)
		.join('\n');
}

/**
 * L'étape qui défait le coefficient : division, ou multiplication par l'inverse
 * d'un coefficient écrit en fraction (Q51, 2026-10-25 : `-\\frac{2}{3}x` → × −3/2).
 */
function divisionOperation(steps: readonly EquationStep[]): EquationOperation | undefined {
	return flattenSteps(steps)
		.map((s) => s.operation)
		.find(
			(op) =>
				op?.kind === 'divide-both-sides' ||
				op?.kind === 'multiply-both-sides' ||
				op?.kind === 'simplify-coefficient'
		);
}

// =============================================================================
// Division par un coefficient négatif non entier : le sens change
// =============================================================================

describe('V36 — division par un coefficient négatif non entier', () => {
	describe('-\\dfrac{2}{3}x + 1 < 5 : S = ]-6 ; +∞[ (le cas remonté)', () => {
		for (const level of LEVELS) {
			it(`${level} : conclut x > -6, change le sens et dit « négatif »`, () => {
				const input = ineq('-\\dfrac{2}{3}x+1<5');
				const steps = generateLinearInequalitySteps(input, { level });

				expect(toLatex(conclusion(steps))).toBe('x > -6');
				expect(solutionSet(input)).toBe(']-6 ; +∞[');

				const division = divisionOperation(steps);
				expect(division).toBeDefined();
				expect(division).toMatchObject({ flipOperator: true });

				const prose = renderedProse(steps, level);
				expect(prose).not.toContain('est positif');
				if (level === 'college') {
					// Q51 : on multiplie par l'inverse du coefficient écrit en fraction
					expect(prose).toContain('changement de sens car $-\\dfrac{3}{2}$ est négatif');
				}
			});
		}
	});

	/** `{op}` est remplacé par le symbole testé ; le sens change toujours. */
	const NEGATIVE_PANEL = [
		'-\\frac23x+1{op}5',
		'-\\frac{2x}{3}+1{op}5',
		'-\\frac12x{op}3',
		'\\frac{-3}{4}x{op}1',
		'\\frac{2}{-3}x+1{op}5',
		'-0.5x{op}2',
		'-\\sqrt2x{op}1'
	];

	for (const template of NEGATIVE_PANEL) {
		for (const op of OPERATORS) {
			const latex = template.replace('{op}', op.input);
			for (const level of LEVELS) {
				it(`${level} : ${latex} — sens retourné, conclusion = solution de solve`, () => {
					const input = ineq(latex);
					const steps = generateLinearInequalitySteps(input, { level });
					const final = conclusion(steps);

					expect(toLatex(final)).toContain(` ${op.flippedLatex} `);
					expect(solutionSet(final)).toBe(solutionSet(input));
					expect(divisionOperation(steps)).toMatchObject({ flipOperator: true });
					expect(renderedProse(steps, level)).not.toContain('est positif');
				});
			}
		}
	}
});

// =============================================================================
// Témoins positifs (le sens est gardé) et entier négatif (déjà juste)
// =============================================================================

describe('V36 — témoins', () => {
	for (const op of OPERATORS) {
		const positive = `\\frac23x+1${op.input}5`;
		const integer = `-2x+1${op.input}5`;
		for (const level of LEVELS) {
			it(`${level} : ${positive} garde le sens`, () => {
				const input = ineq(positive);
				const steps = generateLinearInequalitySteps(input, { level });
				const final = conclusion(steps);
				expect(toLatex(final)).toBe(`x ${op.latex} 6`);
				expect(solutionSet(final)).toBe(solutionSet(input));
				expect(divisionOperation(steps)).not.toMatchObject({ flipOperator: true });
				expect(renderedProse(steps, level)).not.toContain('changement de sens');
			});

			it(`${level} : ${integer} retourne le sens`, () => {
				const input = ineq(integer);
				const steps = generateLinearInequalitySteps(input, { level });
				const final = conclusion(steps);
				expect(toLatex(final)).toBe(`x ${op.flippedLatex} -2`);
				expect(solutionSet(final)).toBe(solutionSet(input));
			});
		}
	}
});

// =============================================================================
// Cas frère : inéquation dégénérée à constantes non entières
// =============================================================================

describe('V36 — inéquation dégénérée : la constante se compare sur sa valeur', () => {
	const CASES: readonly { latex: string; truth: boolean; set: string }[] = [
		{ latex: '\\frac12x+1<\\frac12x+\\frac53', truth: true, set: 'ℝ' },
		{ latex: 'x+0.5<x+1', truth: true, set: 'ℝ' },
		{ latex: '\\sqrt2+x<x+2', truth: true, set: 'ℝ' },
		{ latex: '2x+\\frac12<2x+\\frac13', truth: false, set: '∅' },
		{ latex: '-\\frac13x+\\frac52\\ge-\\frac13x+\\frac52', truth: true, set: 'ℝ' },
		{ latex: '-\\frac13x+\\frac52>-\\frac13x+\\frac52', truth: false, set: '∅' }
	];
	for (const { latex, truth, set } of CASES) {
		for (const level of LEVELS) {
			it(`${level} : ${latex} → S = ${set}`, () => {
				const input = ineq(latex);
				expect(solutionSet(input)).toBe(set);
				const steps = generateLinearInequalitySteps(input, { level });
				const conclude = flattenSteps(steps).find(
					(s) => s.operation?.kind === 'inequality-conclude-truth'
				);
				expect(conclude?.operation).toMatchObject({ truth });
				expect(renderedProse(steps, level)).toContain(truth ? 'S = ℝ' : 'S = ∅');
			});
		}
	}
});

// =============================================================================
// Cas frère : tableau de signes du second degré, coefficient dominant non entier
// =============================================================================

describe('V36 — tableau de signes du second degré : signe de a lu sur sa valeur', () => {
	const CASES: readonly { latex: string; intervals: readonly ('+' | '-')[] }[] = [
		{ latex: '-\\frac12x^2+x+4\\le0', intervals: ['-', '+', '-'] },
		{ latex: '-\\frac{x^2}{2}+x+4\\le0', intervals: ['-', '+', '-'] },
		{ latex: '-x^2+2x+8\\le0', intervals: ['-', '+', '-'] },
		{ latex: '\\frac12x^2-x-4\\le0', intervals: ['+', '-', '+'] }
	];
	for (const { latex, intervals } of CASES) {
		it(`lycée : ${latex} → ${intervals.join(' ')}`, () => {
			const steps = generateQuadraticInequalitySteps(ineq(latex), { level: 'lycee' });
			const op = flattenSteps(steps)
				.map((s) => s.operation)
				.find((o) => o?.kind === 'quadratic-sign-table');
			if (op?.kind !== 'quadratic-sign-table') throw new Error('pas de tableau de signes');
			const grid = quadraticSignTableGrid(op);
			expect(grid?.rows[0].intervals).toEqual(intervals);
		});
	}
});

// =============================================================================
// Revue V36 — prose exacte, LaTeX du tableau, sommes de constantes, indécidable
// =============================================================================

describe('V36 — la prose du changement de sens, mot pour mot', () => {
	// Coefficient écrit en fraction : on multiplie par son inverse (Q51)
	const CASES: readonly { latex: string; coefficient: string }[] = [
		{ latex: '-\\dfrac{2}{3}x+1<5', coefficient: '-\\dfrac{3}{2}' },
		{ latex: '-0.5x<2', coefficient: '-\\dfrac{1}{2}' },
		{ latex: '-\\sqrt2x<1', coefficient: '-\\sqrt{2}' },
		{ latex: '\\frac{-3}{4}x\\ge1', coefficient: '-\\dfrac{4}{3}' }
	];
	for (const { latex, coefficient } of CASES) {
		for (const level of LEVELS) {
			it(`${level} : ${latex} — « changement de sens car $${coefficient}$ est négatif »`, () => {
				const steps = generateLinearInequalitySteps(ineq(latex), { level });
				const prose = renderedProse(steps, level);
				// Collège : « On divise … par » ; lycée et supérieur : « On simplifie le coefficient ».
				expect(prose).toMatch(/changement de sens( car \$[^$]+\$ est négatif)?\)/);
				if (level === 'college') {
					expect(prose).toContain(`changement de sens car $${coefficient}$ est négatif`);
					expect(prose).toContain(`Comme $${coefficient}$ est négatif`);
				}
				expect(prose).not.toContain('est positif');
			});
		}
	}
});

describe('V36 — le LaTeX du tableau de signes du second degré', () => {
	const CASES: readonly { latex: string; body: string }[] = [
		{ latex: '-\\frac12x^2+x+4\\le0', body: 'P(x) & & - & 0 & + & 0 & - &' },
		{ latex: '\\frac12x^2-x-4\\le0', body: 'P(x) & & + & 0 & - & 0 & + &' }
	];
	for (const { latex, body } of CASES) {
		it(`lycée : ${latex}`, () => {
			const steps = generateQuadraticInequalitySteps(ineq(latex), { level: 'lycee' });
			const rendered = flattenRendered(
				new QuadraticEquationRenderer().renderAll(steps, {
					schoolLevel: 'lycee',
					verbosity: 'detailed'
				})
			).find((s) => s.signTable !== undefined);
			expect(rendered?.expressionLatex).toContain('\\begin{array}');
			expect(rendered?.expressionLatex).toContain(body);
		});
	}
});

describe('V36 — coefficient somme de constantes (valeur approchée hors marge)', () => {
	for (const latex of ['(1-\\sqrt2)x<1', 'x-\\sqrt2x>1', '(\\sqrt2-1)x<1']) {
		for (const level of LEVELS) {
			it(`${level} : ${latex} — conclusion = solution de solve`, () => {
				const input = ineq(latex);
				const final = conclusion(generateLinearInequalitySteps(input, { level }));
				expect(solutionSet(final)).toBe(solutionSet(input));
			});
		}
	}
});

describe('V36 — constante de signe indécidable : refus, pas de S = ∅ deviné', () => {
	for (const level of LEVELS) {
		it(`${level} : x+\\sqrt2-1.4142135623>x lève InequalityNotSolvable`, () => {
			expect(() =>
				generateLinearInequalitySteps(ineq('x+\\sqrt2-1.4142135623>x'), { level })
			).toThrow(InequalityNotSolvable);
		});
	}
});
