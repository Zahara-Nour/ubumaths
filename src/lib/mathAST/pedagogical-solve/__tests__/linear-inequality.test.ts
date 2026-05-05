/**
 * Pedagogical Linear Inequality — Tests
 *
 * Covers the 20 behaviours specified in
 * `docs/wip/pedagogical-inequality-spec.md`.
 *
 * @module mathAST/pedagogical-solve/__tests__/linear-inequality.test
 */

import { describe, it, expect } from 'vitest';
import {
	generateLinearInequalitySteps,
	UnsupportedInequalityDegree,
	PedagogicalInequalityError
} from '../linear-inequality';
import { InequalityNotSolvable } from '../../solve/inequality/types';
import { parseLatex } from '../../parser';
import type { EquationStep, EquationOperation, LinearSchoolLevel } from '../types';
import type { RelationNode } from '../../types';
import { toLatex } from '../../latex-generator';

// =============================================================================
// Helpers
// =============================================================================

const supportedLevels: readonly LinearSchoolLevel[] = ['college', 'lycee'];

function ineq(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') {
		throw new Error(`Expected relation, got ${node.type} for "${latex}"`);
	}
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

function findOp<K extends EquationOperation['kind']>(
	steps: readonly EquationStep[],
	kind: K
): (EquationOperation & { kind: K }) | null {
	for (const s of flatten(steps)) {
		if (s.operation?.kind === kind) return s.operation as EquationOperation & { kind: K };
	}
	return null;
}

function lastStep(steps: readonly EquationStep[]): EquationStep {
	const flat = flatten(steps);
	return flat[flat.length - 1];
}

// =============================================================================
// 1-5 — Linéaire simple
// =============================================================================

describe('generateLinearInequalitySteps — linéaire simple', () => {
	it('1. x + 3 < 5 → x < 2', () => {
		for (const level of supportedLevels) {
			const steps = generateLinearInequalitySteps(ineq('x + 3 < 5'), { level });
			const last = lastStep(steps);
			expect(last.after.relation).toBe('<');
			expect(toLatex(last.after.left)).toBe('x');
			expect(toLatex(last.after.right)).toBe('2');
		}
	});

	it('2. x − 4 ≥ 1 → x ≥ 5', () => {
		const steps = generateLinearInequalitySteps(ineq('x - 4 \\geq 1'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('>=');
		expect(toLatex(last.after.right)).toBe('5');
	});

	it('3. 2x ≤ 6 → x ≤ 3', () => {
		const steps = generateLinearInequalitySteps(ineq('2x \\leq 6'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('<=');
		expect(toLatex(last.after.right)).toBe('3');
	});

	it('4. 2x + 3 < 7 → x < 2', () => {
		const steps = generateLinearInequalitySteps(ineq('2x + 3 < 7'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('<');
		expect(toLatex(last.after.right)).toBe('2');
	});

	it('5. 5x − 2 > 8 → x > 2', () => {
		const steps = generateLinearInequalitySteps(ineq('5x - 2 > 8'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('>');
		expect(toLatex(last.after.right)).toBe('2');
	});
});

// =============================================================================
// 6-9 — Coefficient négatif (règle clé du retournement)
// =============================================================================

describe('generateLinearInequalitySteps — coefficient négatif', () => {
	it('6. −x < 3 → x > −3 (avec flipOperator)', () => {
		const steps = generateLinearInequalitySteps(ineq('-x < 3'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('>'); // l'opérateur a été retourné
		expect(toLatex(last.after.right)).toMatch(/^-3$/);
		// Le step de division doit porter flipOperator: true
		const div = findOp(steps, 'divide-both-sides') ?? findOp(steps, 'simplify-coefficient');
		expect(div).not.toBeNull();
		expect(div!.flipOperator).toBe(true);
	});

	it('7. −2x ≥ 6 → x ≤ −3 (flip)', () => {
		const steps = generateLinearInequalitySteps(ineq('-2x \\geq 6'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('<=');
		expect(toLatex(last.after.right)).toMatch(/^-3$/);
		const div = findOp(steps, 'divide-both-sides');
		expect(div?.flipOperator).toBe(true);
	});

	it('8. 4 − x > 1 → x < 3 (flip)', () => {
		const steps = generateLinearInequalitySteps(ineq('4 - x > 1'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('<');
		expect(toLatex(last.after.right)).toBe('3');
	});

	it('9. 3 − 2x ≤ 11 → x ≥ −4 (flip)', () => {
		const steps = generateLinearInequalitySteps(ineq('3 - 2x \\leq 11'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('>=');
		expect(toLatex(last.after.right)).toMatch(/^-4$/);
		const div = findOp(steps, 'divide-both-sides');
		expect(div?.flipOperator).toBe(true);
	});
});

// =============================================================================
// 10-12 — x des deux côtés
// =============================================================================

describe('generateLinearInequalitySteps — x des deux côtés', () => {
	it('10. 2x + 1 < x + 5 → x < 4', () => {
		const steps = generateLinearInequalitySteps(ineq('2x + 1 < x + 5'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('<');
		expect(toLatex(last.after.right)).toBe('4');
	});

	it('11. 3x − 2 ≥ x + 4 → x ≥ 3', () => {
		const steps = generateLinearInequalitySteps(ineq('3x - 2 \\geq x + 4'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('>=');
		expect(toLatex(last.after.right)).toBe('3');
	});

	it('12. 5 − x > 2x + 8 → x < −1 (flip)', () => {
		const steps = generateLinearInequalitySteps(ineq('5 - x > 2x + 8'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('<');
		expect(toLatex(last.after.right)).toMatch(/^-1$/);
		const div = findOp(steps, 'divide-both-sides');
		expect(div?.flipOperator).toBe(true);
	});
});

// =============================================================================
// 13-16 — Cas dégénérés (a = 0)
// =============================================================================

describe('generateLinearInequalitySteps — cas dégénérés', () => {
	it('13. 0 < 1 → conclude-inequality-truth (true)', () => {
		const steps = generateLinearInequalitySteps(ineq('0 < 1'), { level: 'college' });
		const concl = findOp(steps, 'inequality-conclude-truth');
		expect(concl).not.toBeNull();
		expect(concl!.truth).toBe(true);
	});

	it('14. 0 > 1 → conclude-inequality-truth (false)', () => {
		const steps = generateLinearInequalitySteps(ineq('0 > 1'), { level: 'college' });
		const concl = findOp(steps, 'inequality-conclude-truth');
		expect(concl?.truth).toBe(false);
	});

	it('15. 2x + 3 < 2x + 7 → conclude (true)', () => {
		const steps = generateLinearInequalitySteps(ineq('2x + 3 < 2x + 7'), { level: 'college' });
		const concl = findOp(steps, 'inequality-conclude-truth');
		expect(concl?.truth).toBe(true);
	});

	it('16. 2x + 7 < 2x + 3 → conclude (false)', () => {
		const steps = generateLinearInequalitySteps(ineq('2x + 7 < 2x + 3'), { level: 'college' });
		const concl = findOp(steps, 'inequality-conclude-truth');
		expect(concl?.truth).toBe(false);
	});
});

// =============================================================================
// 17 — !=
// =============================================================================

describe('generateLinearInequalitySteps — !=', () => {
	it('17. 2x + 3 ≠ 5 → x ≠ 1, jamais de flip', () => {
		const steps = generateLinearInequalitySteps(ineq('2x + 3 \\neq 5'), { level: 'college' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('!=');
		expect(toLatex(last.after.right)).toBe('1');
		// Aucune étape ne doit porter flipOperator: true pour !=
		for (const s of flatten(steps)) {
			const op = s.operation;
			if (
				op &&
				(op.kind === 'divide-both-sides' ||
					op.kind === 'simplify-coefficient' ||
					op.kind === 'multiply-both-sides')
			) {
				expect(op.flipOperator).not.toBe(true);
			}
		}
	});
});

// =============================================================================
// 18-20 — Erreurs
// =============================================================================

describe('generateLinearInequalitySteps — erreurs', () => {
	it('18. degré 2 → throw UnsupportedInequalityDegree', () => {
		expect(() => generateLinearInequalitySteps(ineq('x^2 < 1'), { level: 'college' })).toThrow(
			UnsupportedInequalityDegree
		);
	});

	it('19. coef paramétrique → throw InequalityNotSolvable', () => {
		expect(() =>
			generateLinearInequalitySteps(ineq('m \\cdot x + 1 < 0'), {
				level: 'college',
				variable: 'x'
			})
		).toThrow(InequalityNotSolvable);
	});

	it('20. relation = → throw PedagogicalInequalityError', () => {
		expect(() => generateLinearInequalitySteps(ineq('x = 5'), { level: 'college' })).toThrow(
			PedagogicalInequalityError
		);
	});
});

// =============================================================================
// Smoke — final-step canonical form
// =============================================================================

describe('generateLinearInequalitySteps — forme canonique', () => {
	it('le dernier `after` est sous la forme x ⊻ value', () => {
		const steps = generateLinearInequalitySteps(ineq('5x - 2 > 8'), { level: 'college' });
		const final = lastStep(steps).after;
		expect(toLatex(final.left)).toBe('x');
	});

	it('lycee est compatible', () => {
		const steps = generateLinearInequalitySteps(ineq('2x + 3 < 7'), { level: 'lycee' });
		const last = lastStep(steps);
		expect(last.after.relation).toBe('<');
		expect(toLatex(last.after.right)).toBe('2');
	});
});
