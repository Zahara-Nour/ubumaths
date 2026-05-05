/**
 * Pipeline tests for `generateQuadraticEquationSteps`.
 *
 * Coverage :
 * - Cas standard Δ > 0 / = 0 / < 0
 * - Cas b = 0 (positif, négatif, zéro)
 * - Cas c = 0
 * - Cas déjà factorisé `(x − 2)(x + 3) = 0`
 * - Forme non standard (transposition vers `… = 0`)
 * - Variantes lycée / supérieur (strategy-driven)
 * - Throws : non-degré-2, paramétrique
 * - Invariants structurels
 *
 * @see docs/wip/quadratic-stepper-progress.md
 */

import { describe, it, expect } from 'vitest';
import { generateQuadraticEquationSteps, PedagogicalQuadraticNotImplemented } from '../quadratic';
import type { EquationOperation, EquationStep, QuadraticSchoolLevel } from '../types';
import type { RelationNode } from '../../types';
import {
	add,
	implicitMultiply,
	number,
	parentheses,
	power,
	relation,
	subtract,
	variable as varNode
} from '../../factory';
import { toLatex } from '../../latex-generator';

// =============================================================================
// Test fixtures
// =============================================================================

const x = varNode('x');

/** Build `x² + 5x + 6 = 0` (Δ = 1, x = -3 / -2). */
function eqStandardPositive(): RelationNode {
	return relation(
		'=',
		add(add(power(x, number('2')), implicitMultiply(number('5'), x)), number('6')),
		number('0')
	);
}

/** Build `x² − 2x + 1 = 0` (Δ = 0, x = 1). */
function eqStandardDouble(): RelationNode {
	return relation(
		'=',
		add(subtract(power(x, number('2')), implicitMultiply(number('2'), x)), number('1')),
		number('0')
	);
}

/** Build `x² + x + 1 = 0` (Δ = -3, no solution). */
function eqStandardNegative(): RelationNode {
	return relation('=', add(add(power(x, number('2')), x), number('1')), number('0'));
}

/** Build `x² − 9 = 0` (b = 0, x = ±3). */
function eqBZeroPositive(): RelationNode {
	return relation('=', subtract(power(x, number('2')), number('9')), number('0'));
}

/** Build `x² + 4 = 0` (b = 0, no solution). */
function eqBZeroNegative(): RelationNode {
	return relation('=', add(power(x, number('2')), number('4')), number('0'));
}

/** Build `x² = 0` (b = 0, c = 0, double root x = 0). */
function eqBZeroZero(): RelationNode {
	return relation('=', power(x, number('2')), number('0'));
}

/** Build `2x² + 6x = 0` (c = 0, x = 0 ou -3). */
function eqCZero(): RelationNode {
	return relation(
		'=',
		add(implicitMultiply(number('2'), power(x, number('2'))), implicitMultiply(number('6'), x)),
		number('0')
	);
}

/** Build `(x − 2)(x + 3) = 0` (factored, x = 2 ou -3). */
function eqFactored(): RelationNode {
	return relation(
		'=',
		implicitMultiply(parentheses(subtract(x, number('2'))), parentheses(add(x, number('3')))),
		number('0')
	);
}

/** Build `x² + 2 = x + 8` → after standardize `x² − x − 6 = 0` (Δ = 25, x = -2 / 3). */
function eqNonStandard(): RelationNode {
	return relation('=', add(power(x, number('2')), number('2')), add(x, number('8')));
}

/** Build `mx² + 2x + 1 = 0` (parametric — V1 scope refusal). */
function eqParametric(): RelationNode {
	const m = varNode('m');
	return relation(
		'=',
		add(
			add(implicitMultiply(m, power(x, number('2'))), implicitMultiply(number('2'), x)),
			number('1')
		),
		number('0')
	);
}

/** Recursively count all steps including subSteps. */
function countAllSteps(steps: readonly EquationStep[]): number {
	let n = 0;
	for (const s of steps) {
		n += 1;
		if (s.subSteps) n += countAllSteps(s.subSteps);
	}
	return n;
}

/** Find an operation by kind. */
function findOp<K extends EquationOperation['kind']>(
	steps: readonly EquationStep[],
	kind: K
): (EquationOperation & { kind: K }) | null {
	for (const s of steps) {
		if (s.operation?.kind === kind) return s.operation as EquationOperation & { kind: K };
		if (s.subSteps) {
			const sub = findOp(s.subSteps, kind);
			if (sub) return sub;
		}
	}
	return null;
}

const supportedLevels: readonly QuadraticSchoolLevel[] = ['lycee', 'superieur'];

// =============================================================================
// Tests
// =============================================================================

describe('generateQuadraticEquationSteps', () => {
	// ===========================================================================
	// Cas standard Δ > 0
	// ===========================================================================

	describe('cas standard Δ > 0 (deux solutions distinctes)', () => {
		it('lycee: x² + 5x + 6 = 0 → identify + identify-coeffs + compute-Δ + Δ-positive + apply-formula + simplify + read', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).toEqual([
				'identify-equation',
				'identify-coefficients',
				'compute-discriminant',
				'discriminant-positive',
				'apply-quadratic-formula',
				'simplify-solutions',
				'read-solutions'
			]);
		});

		it('superieur: x² + 5x + 6 = 0 sans identify ni discriminant-sign', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'superieur' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).toEqual([
				'identify-coefficients',
				'compute-discriminant',
				'apply-quadratic-formula',
				'simplify-solutions',
				'read-solutions'
			]);
		});

		it('solutions sont x = -3 et x = -2', () => {
			for (const level of supportedLevels) {
				const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level });
				const read = findOp(steps, 'read-solutions');
				expect(read).not.toBeNull();
				const latexs = read!.solutions.map((s) => toLatex(s)).sort();
				expect(latexs).toEqual(['-2', '-3']);
			}
		});

		it('discriminant numericValue est 1', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const compute = findOp(steps, 'compute-discriminant');
			expect(compute?.numericValue).toBe(1);
		});

		it('apply-quadratic-formula carries case: two-distinct + 2 raw solutions', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const apply = findOp(steps, 'apply-quadratic-formula');
			expect(apply?.case).toBe('two-distinct');
			expect(apply?.solutions).toHaveLength(2);
		});
	});

	// ===========================================================================
	// Cas standard Δ = 0 (solution double)
	// ===========================================================================

	describe('cas standard Δ = 0 (solution double)', () => {
		it('lycee: x² − 2x + 1 = 0 → discriminant-zero + apply-formula(double) + read', () => {
			const steps = generateQuadraticEquationSteps(eqStandardDouble(), { level: 'lycee' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).toContain('discriminant-zero');
			expect(kinds).toContain('apply-quadratic-formula');
			expect(kinds).toContain('read-solutions');
		});

		it('apply-quadratic-formula carries case: double + 1 raw solution', () => {
			const steps = generateQuadraticEquationSteps(eqStandardDouble(), { level: 'lycee' });
			const apply = findOp(steps, 'apply-quadratic-formula');
			expect(apply?.case).toBe('double');
			expect(apply?.solutions).toHaveLength(1);
		});

		it('solution est x = 1', () => {
			const steps = generateQuadraticEquationSteps(eqStandardDouble(), { level: 'lycee' });
			const read = findOp(steps, 'read-solutions');
			expect(read?.solutions).toHaveLength(1);
			expect(toLatex(read!.solutions[0])).toBe('1');
		});

		it('discriminant numericValue est 0', () => {
			const steps = generateQuadraticEquationSteps(eqStandardDouble(), { level: 'lycee' });
			const compute = findOp(steps, 'compute-discriminant');
			expect(compute?.numericValue).toBe(0);
		});

		it('superieur: pas de discriminant-zero séparé (folded)', () => {
			const steps = generateQuadraticEquationSteps(eqStandardDouble(), { level: 'superieur' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).not.toContain('discriminant-zero');
		});
	});

	// ===========================================================================
	// Cas standard Δ < 0 (pas de solution réelle)
	// ===========================================================================

	describe('cas standard Δ < 0 (pas de solution réelle)', () => {
		it('lycee: x² + x + 1 = 0 → discriminant-negative + no-real-solution', () => {
			const steps = generateQuadraticEquationSteps(eqStandardNegative(), { level: 'lycee' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).toContain('discriminant-negative');
			expect(kinds).toContain('no-real-solution');
			// Pas de read-solutions
			expect(kinds).not.toContain('read-solutions');
			// Pas d'apply-quadratic-formula
			expect(kinds).not.toContain('apply-quadratic-formula');
		});

		it('discriminant numericValue est -3', () => {
			const steps = generateQuadraticEquationSteps(eqStandardNegative(), { level: 'lycee' });
			const compute = findOp(steps, 'compute-discriminant');
			expect(compute?.numericValue).toBe(-3);
		});

		it('superieur: no-real-solution sans discriminant-sign séparé', () => {
			const steps = generateQuadraticEquationSteps(eqStandardNegative(), { level: 'superieur' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).not.toContain('discriminant-negative');
			expect(kinds).toContain('no-real-solution');
		});
	});

	// ===========================================================================
	// Cas b = 0
	// ===========================================================================

	describe('cas b = 0 (rhs positif)', () => {
		it('lycee: x² − 9 = 0 → recognize-no-linear-term + isolate-square + extract-square-root + read', () => {
			const steps = generateQuadraticEquationSteps(eqBZeroPositive(), { level: 'lycee' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).toEqual([
				'identify-equation',
				'recognize-no-linear-term',
				'isolate-square',
				'extract-square-root',
				'read-solutions'
			]);
		});

		it('isolate-square rhs est 9 (=−c/a)', () => {
			const steps = generateQuadraticEquationSteps(eqBZeroPositive(), { level: 'lycee' });
			const isolate = findOp(steps, 'isolate-square');
			expect(toLatex(isolate!.rhs)).toBe('9');
		});

		it('solutions sont x = -3 et x = 3', () => {
			const steps = generateQuadraticEquationSteps(eqBZeroPositive(), { level: 'lycee' });
			const read = findOp(steps, 'read-solutions');
			const latexs = read!.solutions.map(toLatex).sort();
			expect(latexs).toEqual(['-3', '3']);
		});

		it("superieur: pas d'identify-equation", () => {
			const steps = generateQuadraticEquationSteps(eqBZeroPositive(), { level: 'superieur' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).not.toContain('identify-equation');
		});
	});

	describe('cas b = 0 (rhs négatif)', () => {
		it('x² + 4 = 0 → isolate-square (rhs = -4) + no-real-solution', () => {
			const steps = generateQuadraticEquationSteps(eqBZeroNegative(), { level: 'lycee' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).toContain('isolate-square');
			expect(kinds).toContain('no-real-solution');
			expect(kinds).not.toContain('extract-square-root');
		});

		it('isolate-square rhs est -4', () => {
			const steps = generateQuadraticEquationSteps(eqBZeroNegative(), { level: 'lycee' });
			const isolate = findOp(steps, 'isolate-square');
			expect(toLatex(isolate!.rhs)).toBe('-4');
		});
	});

	describe('cas b = 0 (rhs nul, ax² = 0)', () => {
		it('x² = 0 → isolate-square (rhs = 0) + extract-square-root + read [x = 0]', () => {
			const steps = generateQuadraticEquationSteps(eqBZeroZero(), { level: 'lycee' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).toContain('isolate-square');
			expect(kinds).toContain('extract-square-root');
			const read = findOp(steps, 'read-solutions');
			expect(read?.solutions).toHaveLength(1);
			expect(toLatex(read!.solutions[0])).toBe('0');
		});
	});

	// ===========================================================================
	// Cas c = 0
	// ===========================================================================

	describe('cas c = 0', () => {
		it('lycee: 2x² + 6x = 0 → recognize + factor-common-x + zero-product + solve-each + read', () => {
			const steps = generateQuadraticEquationSteps(eqCZero(), { level: 'lycee' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).toEqual([
				'identify-equation',
				'recognize-no-constant-term',
				'factor-common-x',
				'zero-product',
				'solve-each-factor',
				'read-solutions'
			]);
		});

		it('solutions sont x = 0 et x = -3', () => {
			const steps = generateQuadraticEquationSteps(eqCZero(), { level: 'lycee' });
			const read = findOp(steps, 'read-solutions');
			const latexs = read!.solutions.map(toLatex).sort();
			expect(latexs).toEqual(['-3', '0']);
		});

		it('zero-product carries 2 factors (x et 2x+6)', () => {
			const steps = generateQuadraticEquationSteps(eqCZero(), { level: 'lycee' });
			const zp = findOp(steps, 'zero-product');
			expect(zp?.factors).toHaveLength(2);
		});

		it('solve-each-factor carries pairs avec factor + value', () => {
			const steps = generateQuadraticEquationSteps(eqCZero(), { level: 'lycee' });
			const sef = findOp(steps, 'solve-each-factor');
			expect(sef?.pairs).toHaveLength(2);
			const values = sef!.pairs.map((p) => toLatex(p.value)).sort();
			expect(values).toEqual(['-3', '0']);
		});
	});

	// ===========================================================================
	// Cas factorisé
	// ===========================================================================

	describe('cas factorisé (linear)(linear) = 0', () => {
		it('lycee: (x−2)(x+3) = 0 → recognize-factored + zero-product + solve-each + read', () => {
			const steps = generateQuadraticEquationSteps(eqFactored(), { level: 'lycee' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).toEqual([
				'identify-equation',
				'recognize-factored',
				'zero-product',
				'solve-each-factor',
				'read-solutions'
			]);
		});

		it('solutions sont x = 2 et x = -3', () => {
			const steps = generateQuadraticEquationSteps(eqFactored(), { level: 'lycee' });
			const read = findOp(steps, 'read-solutions');
			const latexs = read!.solutions.map(toLatex).sort();
			expect(latexs).toEqual(['-3', '2']);
		});

		it('recognize-factored capture les 2 facteurs', () => {
			const steps = generateQuadraticEquationSteps(eqFactored(), { level: 'lycee' });
			const rf = findOp(steps, 'recognize-factored');
			expect(rf?.factors).toHaveLength(2);
		});

		it("superieur: pas d'identify-equation", () => {
			const steps = generateQuadraticEquationSteps(eqFactored(), { level: 'superieur' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).not.toContain('identify-equation');
			expect(kinds[0]).toBe('recognize-factored');
		});
	});

	// ===========================================================================
	// Forme non standard (transposition)
	// ===========================================================================

	describe('forme non standard (transposition)', () => {
		it('x² + 2 = x + 8 → standardize step en premier (puis cas standard)', () => {
			const steps = generateQuadraticEquationSteps(eqNonStandard(), { level: 'lycee' });
			const stdStep = steps.find((s) => s.operation?.kind === 'standardize');
			expect(stdStep).toBeDefined();
			// Standardize step's after must be `<form> = 0`
			expect(stdStep!.after.right.type).toBe('number');
			expect((stdStep!.after.right as { value: string }).value).toBe('0');
		});

		it('solutions de x² + 2 = x + 8 sont -2 et 3 (Δ = 25)', () => {
			const steps = generateQuadraticEquationSteps(eqNonStandard(), { level: 'lycee' });
			const read = findOp(steps, 'read-solutions');
			const latexs = read!.solutions.map(toLatex).sort();
			expect(latexs).toEqual(['-2', '3']);
		});

		it('compute-discriminant numericValue est 25', () => {
			const steps = generateQuadraticEquationSteps(eqNonStandard(), { level: 'lycee' });
			const compute = findOp(steps, 'compute-discriminant');
			expect(compute?.numericValue).toBe(25);
		});

		it('discriminant-positive émis (lycée)', () => {
			const steps = generateQuadraticEquationSteps(eqNonStandard(), { level: 'lycee' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).toContain('discriminant-positive');
		});
	});

	// ===========================================================================
	// Throws
	// ===========================================================================

	describe('throws', () => {
		it('équation linéaire `2x + 3 = 0` lève une erreur (degré 1)', () => {
			const eq = relation('=', add(implicitMultiply(number('2'), x), number('3')), number('0'));
			expect(() => generateQuadraticEquationSteps(eq, { level: 'lycee' })).toThrow(/not quadratic/);
		});

		it('équation cubique `x³ = 0` lève une erreur (degré 3)', () => {
			const eq = relation('=', power(x, number('3')), number('0'));
			expect(() => generateQuadraticEquationSteps(eq, { level: 'lycee' })).toThrow(/not quadratic/);
		});

		it('coefficients paramétriques (`mx² + 2x + 1 = 0`) lève PedagogicalQuadraticNotImplemented', () => {
			// Pass `variable: 'x'` explicitly because the equation has TWO unknowns
			// (m, x) and detectVariable() would otherwise refuse to pick.
			expect(() =>
				generateQuadraticEquationSteps(eqParametric(), { level: 'lycee', variable: 'x' })
			).toThrow(PedagogicalQuadraticNotImplemented);
		});

		it('PedagogicalQuadraticNotImplemented contient le motif "parametric"', () => {
			expect(() =>
				generateQuadraticEquationSteps(eqParametric(), { level: 'lycee', variable: 'x' })
			).toThrow(/parametric/);
		});

		it('plusieurs variables non détectées (sans varOpt) lève une erreur', () => {
			const y = varNode('y');
			const eq = relation(
				'=',
				add(power(x, number('2')), implicitMultiply(number('2'), y)),
				number('0')
			);
			expect(() => generateQuadraticEquationSteps(eq, { level: 'lycee' })).toThrow();
		});
	});

	// ===========================================================================
	// includeIdentify variant per level
	// ===========================================================================

	describe('strategy : includeIdentify', () => {
		it('lycee inclut identify-equation', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds[0]).toBe('identify-equation');
		});

		it('superieur omet identify-equation', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'superieur' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds[0]).toBe('identify-coefficients');
		});

		it('identify-equation porte equationType: quadratic', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const id = findOp(steps, 'identify-equation');
			expect(id?.equationType).toBe('quadratic');
		});
	});

	// ===========================================================================
	// Variable detection / override
	// ===========================================================================

	describe('variable detection', () => {
		it('detecte automatiquement x', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const read = findOp(steps, 'read-solutions');
			expect(read?.variable).toBe('x');
		});

		it('respecte options.variable: t', () => {
			const t = varNode('t');
			const eq = relation(
				'=',
				add(add(power(t, number('2')), implicitMultiply(number('5'), t)), number('6')),
				number('0')
			);
			const steps = generateQuadraticEquationSteps(eq, { level: 'lycee', variable: 't' });
			const read = findOp(steps, 'read-solutions');
			expect(read?.variable).toBe('t');
			const latexs = read!.solutions.map(toLatex).sort();
			expect(latexs).toEqual(['-2', '-3']);
		});
	});

	// ===========================================================================
	// Step structure invariants
	// ===========================================================================

	describe('invariants structurels', () => {
		it('chaque step a before/after de type relation', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			for (const s of steps) {
				expect(s.before.type).toBe('relation');
				expect(s.after.type).toBe('relation');
			}
		});

		it('rule mirrors operation.kind quand operation est défini', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			for (const s of steps) {
				if (s.operation) {
					expect(s.rule).toBe(s.operation.kind);
				}
			}
		});

		it('IDs sont 1, 2, 3, … (renumberSteps appliqué)', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			for (let i = 0; i < steps.length; i++) {
				expect(steps[i].id).toBe(i + 1);
			}
		});

		it('aucun step null ou undefined dans la liste', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			expect(steps.every((s) => s !== null && s !== undefined)).toBe(true);
		});

		it('countAllSteps === steps.length (pas de subSteps en V1)', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			expect(countAllSteps(steps)).toBe(steps.length);
		});
	});

	// ===========================================================================
	// Cas standard avec coefficients négatifs
	// ===========================================================================

	describe('cas standard avec coefficients variés', () => {
		it('x² − 5x + 6 = 0 → x = 2 et x = 3 (Δ = 1)', () => {
			const eq = relation(
				'=',
				add(subtract(power(x, number('2')), implicitMultiply(number('5'), x)), number('6')),
				number('0')
			);
			const steps = generateQuadraticEquationSteps(eq, { level: 'lycee' });
			const read = findOp(steps, 'read-solutions');
			const latexs = read!.solutions.map(toLatex).sort();
			expect(latexs).toEqual(['2', '3']);
		});

		it('2x² − 4x + 2 = 0 → x = 1 (double, Δ = 0)', () => {
			const eq = relation(
				'=',
				add(
					subtract(
						implicitMultiply(number('2'), power(x, number('2'))),
						implicitMultiply(number('4'), x)
					),
					number('2')
				),
				number('0')
			);
			const steps = generateQuadraticEquationSteps(eq, { level: 'lycee' });
			const apply = findOp(steps, 'apply-quadratic-formula');
			expect(apply?.case).toBe('double');
			const read = findOp(steps, 'read-solutions');
			expect(read!.solutions.map(toLatex)).toEqual(['1']);
		});

		it('3x² − 3x − 18 = 0 → x = -2 et x = 3 (Δ = 225)', () => {
			const eq = relation(
				'=',
				subtract(
					subtract(
						implicitMultiply(number('3'), power(x, number('2'))),
						implicitMultiply(number('3'), x)
					),
					number('18')
				),
				number('0')
			);
			const steps = generateQuadraticEquationSteps(eq, { level: 'lycee' });
			const compute = findOp(steps, 'compute-discriminant');
			expect(compute?.numericValue).toBe(225);
			const read = findOp(steps, 'read-solutions');
			const latexs = read!.solutions.map(toLatex).sort();
			expect(latexs).toEqual(['-2', '3']);
		});
	});

	// ===========================================================================
	// Cas b = 0 fractions
	// ===========================================================================

	describe('cas b = 0 — coefficients fractionnaires', () => {
		it('2x² − 8 = 0 → x = ±2 (rhs = 4)', () => {
			const eq = relation(
				'=',
				subtract(implicitMultiply(number('2'), power(x, number('2'))), number('8')),
				number('0')
			);
			const steps = generateQuadraticEquationSteps(eq, { level: 'lycee' });
			const isolate = findOp(steps, 'isolate-square');
			expect(toLatex(isolate!.rhs)).toBe('4');
			const read = findOp(steps, 'read-solutions');
			const latexs = read!.solutions.map(toLatex).sort();
			expect(latexs).toEqual(['-2', '2']);
		});
	});

	// ===========================================================================
	// Cas factorisé avec opposite
	// ===========================================================================

	describe('cas factorisé — variantes', () => {
		it('(x + 1)(x − 5) = 0 → x = -1 et x = 5', () => {
			const eq = relation(
				'=',
				implicitMultiply(parentheses(add(x, number('1'))), parentheses(subtract(x, number('5')))),
				number('0')
			);
			const steps = generateQuadraticEquationSteps(eq, { level: 'lycee' });
			const read = findOp(steps, 'read-solutions');
			const latexs = read!.solutions.map(toLatex).sort();
			expect(latexs).toEqual(['-1', '5']);
		});
	});

	// ===========================================================================
	// Operation field exhaustiveness — `simplify-solutions` carries pairing
	// ===========================================================================

	describe('simplify-solutions emit conditions', () => {
		it('émis seulement quand raw ≠ simplified (cas standard Δ > 0)', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const simplify = findOp(steps, 'simplify-solutions');
			expect(simplify).not.toBeNull();
			expect(simplify!.rawSolutions).toHaveLength(2);
			expect(simplify!.solutions).toHaveLength(2);
			// Raw and simplified should differ structurally
			const rawLatex = simplify!.rawSolutions.map(toLatex);
			const simpLatex = simplify!.solutions.map(toLatex);
			expect(rawLatex).not.toEqual(simpLatex);
		});

		it('absent quand raw === simplified (cas Δ = 0 produit déjà x = 1 canonique)', () => {
			// `x² − 2x + 1 = 0` → x = (2 − √0) / 2 = 2/2 = 1. Mais notre formula
			// emit le brut `(2 − √0) / 2` ≠ `1` ; donc simplify-solutions est émis.
			// Le cas réellement « pas de simplification » est rare en quadratique
			// (les solutions issues de la formule sont presque toujours non
			// canoniques). Ce test couvre le cas factorisé dont les solutions sont
			// déjà canoniques.
			const steps = generateQuadraticEquationSteps(eqFactored(), { level: 'lycee' });
			const simplify = findOp(steps, 'simplify-solutions');
			// Factorisé n'émet pas simplify-solutions (les solutions sont déjà
			// produites canoniques par solveLinearFactor → canon).
			expect(simplify).toBeNull();
		});
	});

	// ===========================================================================
	// Couverture per-cas × niveau supérieur (omission identify-equation)
	// ===========================================================================

	describe('superieur — omission de identify-equation pour tous les cas', () => {
		it('cas c=0 (superieur) : pas d’identify-equation', () => {
			const steps = generateQuadraticEquationSteps(eqCZero(), { level: 'superieur' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).not.toContain('identify-equation');
			expect(kinds[0]).toBe('recognize-no-constant-term');
		});

		it('cas factorisé (superieur) : pas d’identify-equation, démarre par recognize-factored', () => {
			const steps = generateQuadraticEquationSteps(eqFactored(), { level: 'superieur' });
			const kinds = steps.map((s) => s.operation?.kind);
			expect(kinds).not.toContain('identify-equation');
			expect(kinds[0]).toBe('recognize-factored');
		});
	});
});

// =============================================================================
// PedagogicalQuadraticNotImplemented
// =============================================================================

describe('PedagogicalQuadraticNotImplemented', () => {
	it('extends Error, exposes reason field', () => {
		const err = new PedagogicalQuadraticNotImplemented('test reason');
		expect(err).toBeInstanceOf(Error);
		expect(err.reason).toBe('test reason');
		expect(err.name).toBe('PedagogicalQuadraticNotImplemented');
		expect(err.message).toContain('test reason');
	});
});
