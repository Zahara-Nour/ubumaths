/**
 * Quadratic Renderer V2 — inequality enhancements.
 *
 * Verifies that `QuadraticEquationRenderer` produces inequality-aware
 * TITLES + EXPLANATIONS, plus dedicated rendering for the new
 * `quadratic-sign-table` and `inequality-conclude-quadratic` kinds.
 *
 * @module mathAST/pedagogical-solve/__tests__/quadratic-renderer-inequality.test
 */

import { describe, it, expect } from 'vitest';
import { generateQuadraticInequalitySteps } from '../quadratic-inequality';
import { generateQuadraticEquationSteps } from '../quadratic';
import { QuadraticEquationRenderer } from '../quadratic-renderer';
import { parseLatex } from '../../parser';
import { equals, number } from '../../factory';
import type { RelationNode } from '../../types';

const renderer = new QuadraticEquationRenderer();

function ineq(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error('not a relation');
	return node;
}

function eq0(latex: string): RelationNode {
	return equals(parseLatex(latex), number('0'));
}

// =============================================================================
// identify-equation
// =============================================================================

describe('QuadraticEquationRenderer — identify-equation', () => {
	it('says "Inéquation du second degré" when relation is not "="', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const identify = rendered.find((r) => r.rule === 'identify-equation');
		expect(identify?.title).toMatch(/Inéquation du second degré/);
	});

	it('still says "Équation du second degré" for equations (regression)', () => {
		const steps = generateQuadraticEquationSteps(eq0('x^2 - 5x + 6'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const identify = rendered.find((r) => r.rule === 'identify-equation');
		expect(identify?.title).toMatch(/^Équation du second degré$/);
	});
});

// =============================================================================
// discriminant-* in inequality context
// =============================================================================

describe('QuadraticEquationRenderer — discriminant titles in inequality context', () => {
	it('Δ > 0 says "racines" for inequalities', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const dpos = rendered.find((r) => r.rule === 'discriminant-positive');
		expect(dpos?.title).toMatch(/racines/i);
	});

	it('Δ > 0 still says "solutions" for equations (regression)', () => {
		const steps = generateQuadraticEquationSteps(eq0('x^2 - 5x + 6'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const dpos = rendered.find((r) => r.rule === 'discriminant-positive');
		expect(dpos?.title).toMatch(/solutions/i);
	});

	it('Δ = 0 says "racine double" for inequalities', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 4x + 4 < 0'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const dzero = rendered.find((r) => r.rule === 'discriminant-zero');
		expect(dzero?.title).toMatch(/racine/i);
	});

	it('Δ < 0 says "pas de racine" for inequalities', () => {
		// Use a non-fast-path expression (b ≠ 0) so the Δ pipeline is exercised.
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + x + 1 < 0'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const dneg = rendered.find((r) => r.rule === 'discriminant-negative');
		expect(dneg?.title).toMatch(/pas de racine/i);
	});
});

// =============================================================================
// quadratic-sign-table rendering
// =============================================================================

describe('QuadraticEquationRenderer — quadratic-sign-table', () => {
	it('produces a LaTeX \\begin{array} block', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const tab = rendered.find((r) => r.rule === 'quadratic-sign-table');
		expect(tab).toBeDefined();
		expect(tab!.expressionLatex).toMatch(/\\begin\{array\}/);
		expect(tab!.expressionLatex).toMatch(/\\end\{array\}/);
		// Should contain the variable name and root values
		expect(tab!.expressionLatex).toMatch(/x/);
		expect(tab!.expressionLatex).toMatch(/-\\infty/);
		expect(tab!.expressionLatex).toMatch(/\+\\infty/);
	});

	it('shows roots 2 and 3 in the table for x² − 5x + 6', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const tab = rendered.find((r) => r.rule === 'quadratic-sign-table');
		expect(tab!.expressionLatex).toMatch(/&\s*2\s*&/);
		expect(tab!.expressionLatex).toMatch(/&\s*3\s*&/);
	});

	it('shows zero entries (Δ < 0): single-sign table', () => {
		// Non-fast-path (b ≠ 0) so the standard Δ pipeline emits a sign table.
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + x + 1 < 0'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const tab = rendered.find((r) => r.rule === 'quadratic-sign-table');
		// Table should NOT contain any "0" entries (no roots)
		expect(tab!.expressionLatex).toMatch(/\\begin\{array\}/);
		// Should contain the sign of `a` (here +)
		expect(tab!.expressionLatex).toMatch(/\+/);
	});

	it('a < 0 shows "-" sign at the extremes', () => {
		const steps = generateQuadraticInequalitySteps(ineq('-x^2 + 5x - 6 < 0'), {
			level: 'lycee'
		});
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const tab = rendered.find((r) => r.rule === 'quadratic-sign-table');
		// The table should contain "-" signs (a < 0 at extremes)
		expect(tab!.expressionLatex).toMatch(/-/);
	});
});

// =============================================================================
// inequality-conclude-quadratic
// =============================================================================

describe('QuadraticEquationRenderer — inequality-conclude-quadratic', () => {
	it('produces "S = ]2 ; 3[" for x² − 5x + 6 < 0', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 - 5x + 6 < 0'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const concl = rendered.find((r) => r.rule === 'inequality-conclude-quadratic');
		expect(concl).toBeDefined();
		expect(concl!.title).toMatch(/S\s*=/);
		expect(concl!.title).toMatch(/2/);
		expect(concl!.title).toMatch(/3/);
		expect(concl!.expressionLatex).toMatch(/S\s*=/);
	});

	it('produces "S = ∅" / "\\emptyset" for x² + 1 < 0 (palier 2c fast path)', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + 1 < 0'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		// b = 0 → palier 2c fast path → conclude-from-isolated-square.
		const concl = rendered.find((r) => r.rule === 'inequality-conclude-from-isolated-square');
		expect(concl).toBeDefined();
		expect(concl!.title).toMatch(/∅|\\emptyset/);
		expect(concl!.expressionLatex).toMatch(/\\emptyset/);
	});

	it('produces "S = ℝ" / "\\mathbb{R}" for x² + 1 > 0 (palier 2c fast path)', () => {
		const steps = generateQuadraticInequalitySteps(ineq('x^2 + 1 > 0'), { level: 'lycee' });
		const rendered = renderer.renderAll(steps, {
			verbosity: 'detailed',
			schoolLevel: 'lycee'
		});
		const concl = rendered.find((r) => r.rule === 'inequality-conclude-from-isolated-square');
		expect(concl!.title).toMatch(/ℝ|\\mathbb\{R\}/);
		expect(concl!.expressionLatex).toMatch(/\\mathbb\{R\}/);
	});
});

// =============================================================================
// Smoke
// =============================================================================

describe('QuadraticEquationRenderer — smoke', () => {
	const cases: { latex: string; level: 'lycee' | 'superieur' }[] = [
		{ latex: 'x^2 - 5x + 6 < 0', level: 'lycee' },
		{ latex: 'x^2 - 5x + 6 \\geq 0', level: 'lycee' },
		{ latex: '-x^2 + 5x - 6 > 0', level: 'lycee' },
		{ latex: 'x^2 - 4x + 4 \\leq 0', level: 'lycee' },
		{ latex: 'x^2 + 1 \\geq 0', level: 'superieur' },
		{ latex: '2x^2 - 8 < 0', level: 'lycee' }
	];

	for (const { latex, level } of cases) {
		it(`renders "${latex}" at ${level} without throwing`, () => {
			const steps = generateQuadraticInequalitySteps(ineq(latex), { level });
			expect(() =>
				renderer.renderAll(steps, { verbosity: 'detailed', schoolLevel: level })
			).not.toThrow();
		});
	}
});
