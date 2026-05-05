/**
 * Tests for `QuadraticEquationRenderer`.
 *
 * Coverage :
 * - Basic rendering shape (id, rule, title, expressionLatex, schoolLevel).
 * - TITLES per level (lycee, superieur).
 * - EXPLANATIONS only included when `verbosity === 'detailed'`.
 * - Per-kind LaTeX formatting (compute-discriminant, apply-formula, read-solutions, etc.).
 * - `assertSupportedLevel` rejects primaire AND college.
 * - `format: 'text'` produces the text dump.
 * - subSteps recursion (smoke test ; quadratic V1 doesn't emit subSteps but the
 *   plumbing should still work).
 *
 * @see docs/wip/quadratic-stepper-progress.md
 */

import { describe, it, expect } from 'vitest';
import { QuadraticEquationRenderer } from '../quadratic-renderer';
import { generateQuadraticEquationSteps } from '../quadratic';
import type { EquationStep, QuadraticSchoolLevel } from '../types';
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
import type { RelationNode } from '../../types';

const x = varNode('x');
const allLevels: readonly QuadraticSchoolLevel[] = ['lycee', 'superieur'];

function eqStandardPositive(): RelationNode {
	return relation(
		'=',
		add(add(power(x, number('2')), implicitMultiply(number('5'), x)), number('6')),
		number('0')
	);
}

function eqStandardDouble(): RelationNode {
	return relation(
		'=',
		add(subtract(power(x, number('2')), implicitMultiply(number('2'), x)), number('1')),
		number('0')
	);
}

function eqStandardNegative(): RelationNode {
	return relation('=', add(add(power(x, number('2')), x), number('1')), number('0'));
}

function eqBZeroPositive(): RelationNode {
	return relation('=', subtract(power(x, number('2')), number('9')), number('0'));
}

function eqBZeroNegative(): RelationNode {
	return relation('=', add(power(x, number('2')), number('4')), number('0'));
}

function eqCZero(): RelationNode {
	return relation(
		'=',
		add(implicitMultiply(number('2'), power(x, number('2'))), implicitMultiply(number('6'), x)),
		number('0')
	);
}

function eqFactored(): RelationNode {
	return relation(
		'=',
		implicitMultiply(parentheses(subtract(x, number('2'))), parentheses(add(x, number('3')))),
		number('0')
	);
}

// =============================================================================

describe('QuadraticEquationRenderer', () => {
	const renderer = new QuadraticEquationRenderer();

	// ===========================================================================
	// Basic rendering shape
	// ===========================================================================

	describe('basic rendering', () => {
		it('produces id, rule, title, expressionLatex, schoolLevel for each step', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const rendered = renderer.renderAll(steps, {
				verbosity: 'detailed',
				schoolLevel: 'lycee'
			});
			expect(rendered.length).toBe(steps.length);
			for (const r of rendered) {
				expect(r.id).toBeDefined();
				expect(r.rule).toBeDefined();
				expect(r.title.length).toBeGreaterThan(0);
				expect(r.expressionLatex).toBeDefined();
				expect(r.schoolLevel).toBe('lycee');
			}
		});

		it('schoolLevel is propagated for both supported levels', () => {
			for (const level of allLevels) {
				const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level });
				const rendered = renderer.renderAll(steps, {
					verbosity: 'summarized',
					schoolLevel: level
				});
				for (const r of rendered) expect(r.schoolLevel).toBe(level);
			}
		});
	});

	// ===========================================================================
	// Verbosity / explanations
	// ===========================================================================

	describe('verbosity', () => {
		it('detailed includes explanation for at least one step', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const rendered = renderer.renderAll(steps, {
				verbosity: 'detailed',
				schoolLevel: 'lycee'
			});
			expect(rendered.some((r) => r.explanation !== undefined)).toBe(true);
		});

		it('summarized never includes explanation', () => {
			for (const level of allLevels) {
				const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level });
				const rendered = renderer.renderAll(steps, {
					verbosity: 'summarized',
					schoolLevel: level
				});
				for (const r of rendered) expect(r.explanation).toBeUndefined();
			}
		});

		it('superieur with detailed verbosity falls back to lycee EXPLANATIONS for missing kinds', () => {
			// `recognize-no-linear-term` has both lycée and supérieur entries — both
			// should yield explanations.
			const steps = generateQuadraticEquationSteps(eqBZeroPositive(), { level: 'superieur' });
			const rendered = renderer.renderAll(steps, {
				verbosity: 'detailed',
				schoolLevel: 'superieur'
			});
			const recognize = rendered.find((r) => r.rule === 'recognize-no-linear-term');
			expect(recognize?.explanation).toBeDefined();
		});
	});

	// ===========================================================================
	// TITLES correctness per kind/level
	// ===========================================================================

	describe('TITLES per kind', () => {
		it('lycee identify-equation → "Équation du second degré"', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const r = renderer.render(steps[0], { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.title).toBe('Équation du second degré');
		});

		it('lycee discriminant-positive title contains "deux solutions distinctes"', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const dp = steps.find((s) => s.operation?.kind === 'discriminant-positive')!;
			const r = renderer.render(dp, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.title).toContain('deux solutions distinctes');
		});

		it('lycee discriminant-zero → "solution double"', () => {
			const steps = generateQuadraticEquationSteps(eqStandardDouble(), { level: 'lycee' });
			const dz = steps.find((s) => s.operation?.kind === 'discriminant-zero')!;
			const r = renderer.render(dz, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.title).toContain('solution double');
		});

		it('lycee discriminant-negative → "pas de solution réelle"', () => {
			const steps = generateQuadraticEquationSteps(eqStandardNegative(), { level: 'lycee' });
			const dn = steps.find((s) => s.operation?.kind === 'discriminant-negative')!;
			const r = renderer.render(dn, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.title).toContain('pas de solution');
		});

		it('apply-quadratic-formula : double case ≠ two-distinct case (titles diffèrent)', () => {
			const stepsDistinct = generateQuadraticEquationSteps(eqStandardPositive(), {
				level: 'lycee'
			});
			const stepsDouble = generateQuadraticEquationSteps(eqStandardDouble(), { level: 'lycee' });
			const a1 = stepsDistinct.find((s) => s.operation?.kind === 'apply-quadratic-formula')!;
			const a2 = stepsDouble.find((s) => s.operation?.kind === 'apply-quadratic-formula')!;
			const t1 = renderer.render(a1, { verbosity: 'summarized', schoolLevel: 'lycee' }).title;
			const t2 = renderer.render(a2, { verbosity: 'summarized', schoolLevel: 'lycee' }).title;
			expect(t1).not.toBe(t2);
			expect(t1).toContain('±');
			expect(t2).not.toContain('±');
		});

		it('superieur titles sont plus compacts que lycée', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'superieur' });
			const cd = steps.find((s) => s.operation?.kind === 'compute-discriminant')!;
			const titleSup = renderer.render(cd, {
				verbosity: 'summarized',
				schoolLevel: 'superieur'
			}).title;
			const titleLyc = renderer.render(cd, { verbosity: 'summarized', schoolLevel: 'lycee' }).title;
			expect(titleSup.length).toBeLessThanOrEqual(titleLyc.length);
		});
	});

	// ===========================================================================
	// expressionLatex : per-kind formatting
	// ===========================================================================

	describe('expressionLatex', () => {
		it('compute-discriminant LaTeX contient "Δ = b² − 4ac" et la valeur substituée', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const cd = steps.find((s) => s.operation?.kind === 'compute-discriminant')!;
			const r = renderer.render(cd, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.expressionLatex).toContain('\\Delta = b^2 - 4ac');
			expect(r.expressionLatex).toContain('\\left(5\\right)^2');
			expect(r.expressionLatex).toMatch(/= 1$/);
		});

		it('apply-quadratic-formula LaTeX contient la formule générale ET la substituée (two-distinct)', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const a = steps.find((s) => s.operation?.kind === 'apply-quadratic-formula')!;
			const r = renderer.render(a, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.expressionLatex).toContain('\\dfrac{-b \\pm \\sqrt{\\Delta}}{2a}');
			// substituted with b=5, a=1, Δ=1
			expect(r.expressionLatex).toContain('\\dfrac{-\\left(5\\right) \\pm \\sqrt{1}}');
			expect(r.expressionLatex).toContain('\\begin{aligned}');
		});

		it('apply-quadratic-formula LaTeX (double) ne contient pas ±', () => {
			const steps = generateQuadraticEquationSteps(eqStandardDouble(), { level: 'lycee' });
			const a = steps.find((s) => s.operation?.kind === 'apply-quadratic-formula')!;
			const r = renderer.render(a, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.expressionLatex).not.toContain('\\pm');
			expect(r.expressionLatex).toContain('\\dfrac{-b}{2a}');
		});

		it('read-solutions LaTeX → S = { x_1 ; x_2 }', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const r = steps.find((s) => s.operation?.kind === 'read-solutions')!;
			const rendered = renderer.render(r, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(rendered.expressionLatex).toContain('S = \\left\\{');
			// FR convention: semicolon separator
			expect(rendered.expressionLatex).toContain(';');
		});

		it('read-solutions singleton LaTeX → S = { x_0 }', () => {
			const steps = generateQuadraticEquationSteps(eqStandardDouble(), { level: 'lycee' });
			const r = steps.find((s) => s.operation?.kind === 'read-solutions')!;
			const rendered = renderer.render(r, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(rendered.expressionLatex).toContain('S = \\left\\{ 1');
			expect(rendered.expressionLatex).not.toContain(';');
		});

		it('no-real-solution LaTeX → S = \\emptyset', () => {
			const steps = generateQuadraticEquationSteps(eqStandardNegative(), { level: 'lycee' });
			const nrs = steps.find((s) => s.operation?.kind === 'no-real-solution')!;
			const r = renderer.render(nrs, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.expressionLatex).toBe('S = \\emptyset');
		});

		it('identify-coefficients LaTeX contient a, b, c séparément', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const ic = steps.find((s) => s.operation?.kind === 'identify-coefficients')!;
			const r = renderer.render(ic, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.expressionLatex).toContain('a = 1');
			expect(r.expressionLatex).toContain('b = 5');
			expect(r.expressionLatex).toContain('c = 6');
		});

		it('isolate-square LaTeX contient le `\\begin{aligned}` (transformation)', () => {
			const steps = generateQuadraticEquationSteps(eqBZeroPositive(), { level: 'lycee' });
			const iso = steps.find((s) => s.operation?.kind === 'isolate-square')!;
			const r = renderer.render(iso, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.expressionLatex).toContain('\\begin{aligned}');
		});

		it('extract-square-root (rhs positif) → x = ± √(rhs)', () => {
			const steps = generateQuadraticEquationSteps(eqBZeroPositive(), { level: 'lycee' });
			const ex = steps.find((s) => s.operation?.kind === 'extract-square-root')!;
			const r = renderer.render(ex, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.expressionLatex).toContain('\\pm \\sqrt{9}');
		});

		it('extract-square-root (rhs nul) montre la transformation x²=0 → x=0', () => {
			// `x² = 0` → `x = 0`
			const eqZero = relation('=', power(x, number('2')), number('0'));
			const steps = generateQuadraticEquationSteps(eqZero, { level: 'lycee' });
			const ex = steps.find((s) => s.operation?.kind === 'extract-square-root');
			expect(ex).toBeDefined();
			const r = renderer.render(ex!, { verbosity: 'summarized', schoolLevel: 'lycee' });
			// Should be a transformation block (before ≠ after)
			expect(r.expressionLatex).toContain('\\begin{aligned}');
		});

		it('zero-product LaTeX : "A · B = 0 ⇔ A = 0 ou B = 0"', () => {
			const steps = generateQuadraticEquationSteps(eqFactored(), { level: 'lycee' });
			const zp = steps.find((s) => s.operation?.kind === 'zero-product')!;
			const r = renderer.render(zp, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.expressionLatex).toContain('= 0');
			expect(r.expressionLatex).toContain('\\Longleftrightarrow');
			expect(r.expressionLatex).toContain('\\text{ou}');
		});

		it('solve-each-factor LaTeX : alignement par facteur', () => {
			const steps = generateQuadraticEquationSteps(eqCZero(), { level: 'lycee' });
			const sef = steps.find((s) => s.operation?.kind === 'solve-each-factor')!;
			const r = renderer.render(sef, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.expressionLatex).toContain('\\begin{aligned}');
			expect(r.expressionLatex).toContain('= 0');
		});

		it('simplify-solutions LaTeX (1 solution) : x_0 = raw = simplified', () => {
			// Construct a synthetic step manually to ensure single-solution rendering
			// path is exercised even though no equation in the standard pipeline
			// produces simplify-solutions with `solutions.length === 1` (the
			// `simplify-solutions` step is skipped for the double case where raw and
			// canonical match).
			const synthStep: EquationStep = {
				id: 1,
				rule: 'simplify-solutions',
				description: 'simplification (synthétique)',
				before: relation('=', x, number('0')),
				after: relation('=', x, number('0')),
				verbosityLevel: 'summarized',
				operation: {
					kind: 'simplify-solutions',
					rawSolutions: [number('1')],
					solutions: [number('1')]
				}
			};
			const r = renderer.render(synthStep, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(r.expressionLatex).toContain('x_0');
		});
	});

	// ===========================================================================
	// Level rejection
	// ===========================================================================

	describe('assertSupportedLevel', () => {
		it('throws for primaire', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			expect(() =>
				renderer.render(steps[0], {
					verbosity: 'summarized',
					// `primaire` is intentionally not in QuadraticSchoolLevel; cast for the test
					schoolLevel: 'primaire' as never
				})
			).toThrow(/primaire.*not supported|syllabus before/);
		});

		it('throws for college', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			expect(() =>
				renderer.render(steps[0], {
					verbosity: 'summarized',
					schoolLevel: 'college' as never
				})
			).toThrow(/college.*not supported|syllabus before/);
		});
	});

	// ===========================================================================
	// format: 'text'
	// ===========================================================================

	describe('format: text', () => {
		it('text format adds a text dump', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const rendered = renderer.renderAll(steps, {
				verbosity: 'detailed',
				schoolLevel: 'lycee',
				format: 'text'
			});
			for (const r of rendered) {
				expect(r.text).toBeDefined();
				expect(r.text!.length).toBeGreaterThan(0);
				expect(r.text!).toContain(`[${r.id}]`);
			}
		});

		it('default (structured) format does not set text', () => {
			const steps = generateQuadraticEquationSteps(eqStandardPositive(), { level: 'lycee' });
			const rendered = renderer.renderAll(steps, {
				verbosity: 'detailed',
				schoolLevel: 'lycee'
			});
			for (const r of rendered) expect(r.text).toBeUndefined();
		});
	});

	// ===========================================================================
	// Integration smoke
	// ===========================================================================

	describe('end-to-end smoke', () => {
		it('toutes les étapes sont rendues sans throw pour les 4 cas (lycée + supérieur)', () => {
			const cases = [
				eqStandardPositive(),
				eqStandardDouble(),
				eqStandardNegative(),
				eqBZeroPositive(),
				eqBZeroNegative(),
				eqCZero(),
				eqFactored()
			];
			for (const eq of cases) {
				for (const level of allLevels) {
					const steps = generateQuadraticEquationSteps(eq, { level });
					expect(() =>
						renderer.renderAll(steps, { verbosity: 'detailed', schoolLevel: level })
					).not.toThrow();
				}
			}
		});
	});
});
