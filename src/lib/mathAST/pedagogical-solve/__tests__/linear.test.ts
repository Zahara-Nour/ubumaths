import { describe, it, expect } from 'vitest';
import { generateLinearEquationSteps } from '../linear';
import type { EquationStep, EquationOperation, LinearSchoolLevel } from '../types';
import type { RelationNode } from '../../types';
import {
	number,
	variable,
	add,
	subtract,
	implicitMultiply,
	opposite,
	relation
} from '../../factory';
import { toLatex } from '../../latex-generator';

const supportedLevels: readonly LinearSchoolLevel[] = ['college', 'lycee', 'superieur'];

// =============================================================================
// Test helpers
// =============================================================================

const x = variable('x');

/** Build `2x = 4` */
function eq2x_eq_4(): RelationNode {
	return relation('=', implicitMultiply(number('2'), x), number('4'));
}

/** Build `3x − 2 = −5x + 7` */
function eq3x_minus_2_eq_minus_5x_plus_7(): RelationNode {
	return relation(
		'=',
		subtract(implicitMultiply(number('3'), x), number('2')),
		add(opposite(implicitMultiply(number('5'), x)), number('7'))
	);
}

/** Build `x = 5` (already solved) */
function eq_x_eq_5(): RelationNode {
	return relation('=', x, number('5'));
}

/** Recursively count all steps including subSteps */
function countAllSteps(steps: readonly EquationStep[]): number {
	let n = 0;
	for (const s of steps) {
		n += 1;
		if (s.subSteps) n += countAllSteps(s.subSteps);
	}
	return n;
}

/** Find the read-solution operation in a step tree */
function findSolution(
	steps: readonly EquationStep[]
): (EquationOperation & { kind: 'read-solution' }) | null {
	for (const s of steps) {
		if (s.operation?.kind === 'read-solution') return s.operation;
		if (s.subSteps) {
			const sub = findSolution(s.subSteps);
			if (sub) return sub;
		}
	}
	return null;
}

// =============================================================================
// Tests
// =============================================================================

describe('generateLinearEquationSteps', () => {
	describe('simple equations (already canonical ax = b)', () => {
		it('college: 2x = 4 → identify + divide + solution (3 top-level)', () => {
			const steps = generateLinearEquationSteps(eq2x_eq_4(), { level: 'college' });
			expect(steps.length).toBe(3);
			expect(steps[0].operation?.kind).toBe('identify-equation');
			expect(steps[1].operation?.kind).toBe('divide-both-sides');
			expect(steps[2].operation?.kind).toBe('read-solution');
		});

		it('lycee: 2x = 4 → divide + solution (2 top-level, no identify)', () => {
			const steps = generateLinearEquationSteps(eq2x_eq_4(), { level: 'lycee' });
			expect(steps.length).toBe(2);
			expect(steps[0].operation?.kind).toBe('divide-both-sides');
			expect(steps[1].operation?.kind).toBe('read-solution');
		});

		it('superieur: 2x = 4 → reduce-to-canonical + solution (1-2 top-level)', () => {
			const steps = generateLinearEquationSteps(eq2x_eq_4(), { level: 'superieur' });
			// Either 1 (canonical merges everything) or 2 (canonical + solution)
			expect(steps.length).toBeGreaterThanOrEqual(1);
			expect(steps.length).toBeLessThanOrEqual(2);
			const sol = findSolution(steps);
			expect(sol).not.toBeNull();
		});

		it('all levels: solution is x = 2', () => {
			for (const level of supportedLevels) {
				const steps = generateLinearEquationSteps(eq2x_eq_4(), { level });
				const sol = findSolution(steps);
				expect(sol).not.toBeNull();
				expect(sol!.variable).toBe('x');
				expect(toLatex(sol!.value)).toBe('2');
			}
		});
	});

	describe('full regroupement (x on both sides)', () => {
		it('college: 3x − 2 = −5x + 7 produces flat top-level (no grouping)', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			// Expect: identify + (add 5x | add 2) + divide + solution = 5 top-level
			expect(steps.length).toBeGreaterThanOrEqual(4);
			expect(steps[0].operation?.kind).toBe('identify-equation');
			// Last is solution
			const last = steps[steps.length - 1];
			expect(last.operation?.kind).toBe('read-solution');
			// At least one add-both-sides (for the +5x or +2)
			const hasAdd = steps.some((s) => s.operation?.kind === 'add-both-sides');
			expect(hasAdd).toBe(true);
			// Has divide-both-sides
			const hasDivide = steps.some((s) => s.operation?.kind === 'divide-both-sides');
			expect(hasDivide).toBe(true);
		});

		it('lycee: 3x − 2 = −5x + 7 groups regroupement (2-3 top-level)', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'lycee'
			});
			// Expect: [reduce-to-canonical OR group-x+group-const, divide, solution]
			// Top-level should be ≤ 4
			expect(steps.length).toBeLessThanOrEqual(4);
			// Last is solution
			const last = steps[steps.length - 1];
			expect(last.operation?.kind).toBe('read-solution');
			// SubSteps should exist for the grouping (drill-down)
			const groupingStep = steps.find(
				(s) =>
					s.operation?.kind === 'group-variable-terms' ||
					s.operation?.kind === 'group-constants' ||
					s.operation?.kind === 'reduce-to-canonical'
			);
			expect(groupingStep).toBeDefined();
			expect(groupingStep!.subSteps).toBeDefined();
			expect(groupingStep!.subSteps!.length).toBeGreaterThan(0);
		});

		it('superieur: 3x − 2 = −5x + 7 ultra-condensed (1-2 top-level)', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'superieur'
			});
			expect(steps.length).toBeLessThanOrEqual(2);
			const sol = findSolution(steps);
			expect(sol).not.toBeNull();
			expect(toLatex(sol!.value)).toBe('\\dfrac{9}{8}');
		});

		it('all levels: solution is x = 9/8', () => {
			for (const level of supportedLevels) {
				const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
					level
				});
				const sol = findSolution(steps);
				expect(sol).not.toBeNull();
				expect(toLatex(sol!.value)).toBe('\\dfrac{9}{8}');
			}
		});
	});

	describe('substeps', () => {
		it('lycee with includeSubSteps:true gives drill-down on grouping', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'lycee',
				includeSubSteps: true
			});
			const total = countAllSteps(steps);
			expect(total).toBeGreaterThan(steps.length); // some substeps exist
		});

		it('lycee with includeSubSteps:false has no substeps', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'lycee',
				includeSubSteps: false
			});
			for (const s of steps) {
				expect(s.subSteps).toBeUndefined();
			}
		});

		it('default includeSubSteps is true', () => {
			const stepsDefault = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'lycee'
			});
			const stepsExplicit = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'lycee',
				includeSubSteps: true
			});
			expect(countAllSteps(stepsDefault)).toBe(countAllSteps(stepsExplicit));
		});

		it('college does not need substeps for full regroupement (already flat)', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			// Top-level operations are already fine-grained → no substeps
			for (const s of steps) {
				expect(s.subSteps).toBeUndefined();
			}
		});
	});

	describe('edge cases', () => {
		it('x = 5 is recognized as already solved (read-solution only)', () => {
			const steps = generateLinearEquationSteps(eq_x_eq_5(), { level: 'college' });
			expect(steps.length).toBeGreaterThanOrEqual(1);
			const sol = findSolution(steps);
			expect(sol).not.toBeNull();
			expect(toLatex(sol!.value)).toBe('5');
		});
	});

	describe('step structure invariants', () => {
		it('every step has before and after as RelationNode', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			for (const s of steps) {
				expect(s.before.type).toBe('relation');
				expect(s.after.type).toBe('relation');
			}
		});

		it('rule field mirrors operation.kind when operation is set', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			for (const s of steps) {
				if (s.operation) {
					expect(s.rule).toBe(s.operation.kind);
				}
			}
		});

		it('successive steps chain (after of step n == before of step n+1) at college level', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			for (let i = 0; i + 1 < steps.length; i++) {
				expect(toLatex(steps[i].after)).toBe(toLatex(steps[i + 1].before));
			}
		});
	});
});
