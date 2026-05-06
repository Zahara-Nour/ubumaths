/**
 * LinearEquationRenderer — Inequality V2 enhancements
 *
 * Verifies that the renderer produces inequality-aware TITLES, EXPLANATIONS,
 * and transformation lines:
 * - `identify-equation` says "Inéquation" when the relation is not `=`.
 * - `divide-both-sides` / `multiply-both-sides` / `simplify-coefficient` with
 *   `flipOperator: true` carry a "changement de sens" note in their title.
 * - Explanations for these ops adapt their wording (égalité → inégalité; flip
 *   rule mentioned when relevant).
 * - The new `inequality-conclude-truth` kind has dedicated TITLE + EXPLANATION
 *   for both `truth: true` (S = ℝ) and `truth: false` (contradiction).
 * - `formatTransformationLines` treats `inequality-conclude-truth` as info-only.
 *
 * Equation-side regression is covered by the pre-existing
 * `linear-renderer.test.ts`.
 *
 * @module mathAST/pedagogical-solve/__tests__/linear-renderer-inequality.test
 */

import { describe, it, expect } from 'vitest';
import { generateLinearInequalitySteps } from '../linear-inequality';
import { generateLinearEquationSteps } from '../linear';
import { LinearEquationRenderer, formatTransformationLines } from '../linear-renderer';
import { parseLatex } from '../../parser';
import type { EquationStep, EquationOperation } from '../types';
import type { RelationNode } from '../../types';

// =============================================================================
// Helpers
// =============================================================================

function ineq(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error('not a relation');
	return node;
}

function eq(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error('not a relation');
	return node;
}

function flatten(steps: readonly EquationStep[]): EquationStep[] {
	const out: EquationStep[] = [];
	for (const s of steps) {
		out.push(s);
		if (s.subSteps) out.push(...flatten(s.subSteps));
	}
	return out;
}

function findStep<K extends EquationOperation['kind']>(
	steps: readonly EquationStep[],
	kind: K
): EquationStep | null {
	for (const s of flatten(steps)) {
		if (s.operation?.kind === kind) return s;
	}
	return null;
}

const renderer = new LinearEquationRenderer();

// =============================================================================
// 1 — identify-equation says "Inéquation" for inequalities
// =============================================================================

describe('LinearEquationRenderer — identify-equation', () => {
	it('says "Inéquation" when the relation is "<"', () => {
		const steps = generateLinearInequalitySteps(ineq('x + 3 < 5'), { level: 'college' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const identify = rendered.find((r) => r.rule === 'identify-equation');
		expect(identify?.title).toMatch(/Inéquation/i);
		expect(identify?.title).not.toMatch(/^Équation/);
	});

	it('still says "Équation" for equalities (regression)', () => {
		const steps = generateLinearEquationSteps(eq('2x + 3 = 7'), { level: 'college' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const identify = rendered.find((r) => r.rule === 'identify-equation');
		expect(identify?.title).toMatch(/^Équation/);
	});

	it('explanation for inequality identify mentions "inéquation" and the flip rule', () => {
		const steps = generateLinearInequalitySteps(ineq('x + 3 < 5'), { level: 'college' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const identify = rendered.find((r) => r.rule === 'identify-equation');
		expect(identify?.explanation).toMatch(/inéquation/i);
	});
});

// =============================================================================
// 2 — divide-both-sides title with flipOperator
// =============================================================================

describe('LinearEquationRenderer — divide-both-sides flip note', () => {
	it('includes "changement de sens" in title when flipOperator is true', () => {
		const steps = generateLinearInequalitySteps(ineq('-2x \\geq 6'), { level: 'college' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const divide = rendered.find((r) => r.rule === 'divide-both-sides');
		expect(divide).toBeDefined();
		expect(divide!.title).toMatch(/changement de sens/i);
	});

	it('does NOT include "changement de sens" when flipOperator is false (positive divisor)', () => {
		const steps = generateLinearInequalitySteps(ineq('2x + 3 < 7'), { level: 'college' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const divide = rendered.find((r) => r.rule === 'divide-both-sides');
		expect(divide).toBeDefined();
		expect(divide!.title).not.toMatch(/changement de sens/i);
	});

	it('does NOT include the note for equation divide (regression)', () => {
		const steps = generateLinearEquationSteps(eq('2x + 3 = 7'), { level: 'college' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const divide = rendered.find((r) => r.rule === 'divide-both-sides');
		expect(divide!.title).not.toMatch(/changement de sens/i);
	});
});

// =============================================================================
// 3 — simplify-coefficient (lycée) flip note
// =============================================================================

describe('LinearEquationRenderer — simplify-coefficient flip note', () => {
	it('includes "changement de sens" in lycée title when flipOperator is true', () => {
		const steps = generateLinearInequalitySteps(ineq('-2x \\geq 6'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const simplify = rendered.find((r) => r.rule === 'simplify-coefficient');
		expect(simplify).toBeDefined();
		expect(simplify!.title).toMatch(/changement de sens/i);
	});

	it('does NOT include the note when flipOperator is undefined (regression)', () => {
		const steps = generateLinearEquationSteps(eq('2x + 3 = 7'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const simplify = rendered.find((r) => r.rule === 'simplify-coefficient');
		expect(simplify!.title).not.toMatch(/changement de sens/i);
	});
});

// =============================================================================
// 4 — multiply-both-sides flip note
// =============================================================================

describe('LinearEquationRenderer — multiply-both-sides flip note', () => {
	it('includes "changement de sens" when flipOperator is true', () => {
		// Build a manual step with multiply-both-sides + flipOperator: true
		const manualStep: EquationStep = {
			id: 1,
			rule: 'multiply-both-sides',
			description: 'On multiplie par -1 (changement de sens)',
			before: ineq('-x < 3'),
			after: ineq('x > -3'),
			operation: {
				kind: 'multiply-both-sides',
				operand: parseLatex('-1'),
				flipOperator: true
			}
		};
		const rendered = renderer.render(manualStep, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		expect(rendered.title).toMatch(/changement de sens/i);
	});
});

// =============================================================================
// 5 — Explanations adapted for inequalities
// =============================================================================

describe('LinearEquationRenderer — explanations adapted for inequalities', () => {
	it('add-both-sides explanation says "inégalité" (not "égalité") for inequalities', () => {
		const steps = generateLinearInequalitySteps(ineq('x + 3 < 5'), { level: 'college' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const sub = rendered.find((r) => r.rule === 'subtract-both-sides');
		expect(sub).toBeDefined();
		expect(sub!.explanation).toMatch(/inégalité/i);
		expect(sub!.explanation).not.toMatch(/l'égalité est préservée/i);
	});

	it('divide-both-sides explanation mentions the flip rule when flipOperator is true', () => {
		const steps = generateLinearInequalitySteps(ineq('-2x \\geq 6'), { level: 'college' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const divide = rendered.find((r) => r.rule === 'divide-both-sides');
		expect(divide!.explanation).toMatch(/négatif|changement de sens|retourn/i);
	});

	it('equation explanations remain unchanged (regression)', () => {
		const steps = generateLinearEquationSteps(eq('2x + 3 = 7'), { level: 'college' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const divide = rendered.find((r) => r.rule === 'divide-both-sides');
		expect(divide!.explanation).toMatch(/égalité/i);
	});
});

// =============================================================================
// 6 — inequality-conclude-truth (new kind)
// =============================================================================

describe('LinearEquationRenderer — inequality-conclude-truth', () => {
	it('renders truth=true with "S = ℝ" or equivalent', () => {
		const steps = generateLinearInequalitySteps(ineq('0 < 1'), { level: 'college' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const concl = rendered.find((r) => r.rule === 'inequality-conclude-truth');
		expect(concl).toBeDefined();
		// Title should mention truth ("toujours vraie" or similar)
		expect(concl!.title).toMatch(/vraie|ℝ|toute|tout réel/i);
	});

	it('renders truth=false with "∅" or "contradiction"', () => {
		const steps = generateLinearInequalitySteps(ineq('0 > 1'), { level: 'college' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'college'
		});
		const concl = rendered.find((r) => r.rule === 'inequality-conclude-truth');
		expect(concl).toBeDefined();
		expect(concl!.title).toMatch(/contradiction|∅|aucune solution|fausse|impossible/i);
	});

	it('explanation is provided for both truth values', () => {
		for (const [latex, expectedFragment] of [
			['0 < 1', /vraie|tout réel/i],
			['0 > 1', /fausse|aucune|contradiction/i]
		] as const) {
			const steps = generateLinearInequalitySteps(ineq(latex), { level: 'college' });
			const rendered = renderer.renderAll(steps, {
				verbosity: 'detailed',
				schoolLevel: 'college'
			});
			const concl = rendered.find((r) => r.rule === 'inequality-conclude-truth');
			expect(concl?.explanation).toMatch(expectedFragment);
		}
	});

	it('lycee level renders inequality-conclude-truth too', () => {
		const steps = generateLinearInequalitySteps(ineq('2x + 3 < 2x + 7'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const concl = rendered.find((r) => r.rule === 'inequality-conclude-truth');
		expect(concl).toBeDefined();
		expect(concl!.title.length).toBeGreaterThan(0);
	});

	it('formatTransformationLines returns null for inequality-conclude-truth (info-only)', () => {
		const steps = generateLinearInequalitySteps(ineq('0 < 1'), { level: 'college' });
		const concludeStep = findStep(steps, 'inequality-conclude-truth');
		expect(concludeStep).not.toBeNull();
		expect(formatTransformationLines(concludeStep!)).toBeNull();
	});
});

// =============================================================================
// 7 — Smoke: full pipeline render does not throw
// =============================================================================

describe('LinearEquationRenderer — smoke for representative inequalities', () => {
	const cases: readonly { latex: string; level: 'college' | 'lycee' }[] = [
		{ latex: 'x + 3 < 5', level: 'college' },
		{ latex: '-2x \\geq 6', level: 'college' },
		{ latex: '5 - x > 2x + 8', level: 'college' },
		{ latex: '2x + 3 \\neq 5', level: 'college' },
		{ latex: '-x < 3', level: 'lycee' },
		{ latex: '2x + 7 < 2x + 3', level: 'college' }
	];

	for (const { latex, level } of cases) {
		it(`renders "${latex}" at ${level} without throwing`, () => {
			const steps = generateLinearInequalitySteps(ineq(latex), { level });
			expect(() =>
				renderer.renderAll(steps, { verbosity: 'detailed', schoolLevel: level })
			).not.toThrow();
		});
	}
});
