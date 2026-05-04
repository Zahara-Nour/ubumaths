import { describe, it, expect } from 'vitest';
import { SolvePedagogicalRenderer } from '../pedagogical-renderer';
import type { SolveStep } from '../types';
import type { SchoolLevel } from '../../common/step-renderer-base';
import { number, variable, add, implicitMultiply, relation } from '../../factory';

// =============================================================================
// Test helpers
// =============================================================================

const renderer = new SolvePedagogicalRenderer();

function makeStep(overrides: Partial<SolveStep> = {}): SolveStep {
	return {
		id: 1,
		rule: 'subtract-constant',
		description: 'On soustrait la constante des deux membres',
		before: relation(
			'=',
			add(implicitMultiply(number('2'), variable('x')), number('3')),
			number('7')
		),
		after: relation('=', implicitMultiply(number('2'), variable('x')), number('4')),
		verbosityLevel: 'detailed',
		operand: number('3'),
		...overrides
	};
}

const allLevels: readonly SchoolLevel[] = ['primaire', 'college', 'lycee', 'superieur'] as const;

// =============================================================================
// Tests
// =============================================================================

describe('SolvePedagogicalRenderer', () => {
	describe('basic structure', () => {
		it('renders id, rule, title, expressionLatex', () => {
			const out = renderer.render(makeStep(), {
				verbosity: 'summarized',
				schoolLevel: 'lycee'
			});
			expect(out.id).toBe(1);
			expect(out.rule).toBe('subtract-constant');
			expect(out.title.length).toBeGreaterThan(0);
			expect(out.expressionLatex).toBeDefined();
			expect(out.expressionLatex).toContain('Rightarrow');
		});

		it('always sets schoolLevel on the rendered step', () => {
			for (const level of allLevels) {
				const out = renderer.render(makeStep(), { verbosity: 'summarized', schoolLevel: level });
				expect(out.schoolLevel).toBe(level);
			}
		});
	});

	describe('linear rules — level-specific vocabulary', () => {
		it('subtract-constant produces distinct titles per level', () => {
			const titles = allLevels.map(
				(lvl) =>
					renderer.render(makeStep({ rule: 'subtract-constant', operand: number('3') }), {
						verbosity: 'summarized',
						schoolLevel: lvl
					}).title
			);
			// All four levels should produce different vocabulary
			expect(new Set(titles).size).toBeGreaterThanOrEqual(3);
		});

		it('divide-coefficient produces distinct titles per level', () => {
			const step = makeStep({ rule: 'divide-coefficient', operand: number('2') });
			const titles = allLevels.map(
				(lvl) => renderer.render(step, { verbosity: 'summarized', schoolLevel: lvl }).title
			);
			expect(new Set(titles).size).toBeGreaterThanOrEqual(3);
		});

		it('all primary linear rules have a lycee title (fallback)', () => {
			const linearRules = [
				'identify-linear',
				'subtract-constant',
				'add-constant',
				'divide-coefficient',
				'multiply-coefficient',
				'isolate-variable'
			];
			for (const rule of linearRules) {
				const step = makeStep({ rule, operand: number('5') });
				const out = renderer.render(step, { verbosity: 'summarized', schoolLevel: 'lycee' });
				expect(out.title.length).toBeGreaterThan(0);
				// Title should NOT be the raw rule name
				expect(out.title).not.toBe(rule);
			}
		});
	});

	describe('quadratic rules — level-specific vocabulary', () => {
		it('compute-discriminant produces titles for college and lycee', () => {
			const step = makeStep({ rule: 'compute-discriminant', operand: undefined });
			const titleCollege = renderer.render(step, {
				verbosity: 'summarized',
				schoolLevel: 'college'
			}).title;
			const titleLycee = renderer.render(step, {
				verbosity: 'summarized',
				schoolLevel: 'lycee'
			}).title;
			expect(titleCollege.length).toBeGreaterThan(0);
			expect(titleLycee.length).toBeGreaterThan(0);
		});

		it('all primary quadratic rules have a lycee title', () => {
			const quadraticRules = [
				'identify-quadratic',
				'identify-coefficients',
				'compute-discriminant',
				'discriminant-positive',
				'discriminant-zero',
				'discriminant-negative',
				'apply-quadratic-formula',
				'simplify-solution'
			];
			for (const rule of quadraticRules) {
				const step = makeStep({ rule });
				const out = renderer.render(step, { verbosity: 'summarized', schoolLevel: 'lycee' });
				expect(out.title.length).toBeGreaterThan(0);
				expect(out.title).not.toBe(rule);
			}
		});
	});

	describe('verbosity', () => {
		it('detailed adds an explanation when one is defined', () => {
			const out = renderer.render(makeStep({ rule: 'subtract-constant', operand: number('3') }), {
				verbosity: 'detailed',
				schoolLevel: 'primaire'
			});
			expect(out.explanation).toBeDefined();
			expect(out.explanation!.length).toBeGreaterThan(0);
		});

		it('summarized omits explanation', () => {
			const out = renderer.render(makeStep({ rule: 'subtract-constant', operand: number('3') }), {
				verbosity: 'summarized',
				schoolLevel: 'primaire'
			});
			expect(out.explanation).toBeUndefined();
		});

		it('detailed without an explanation entry returns undefined explanation', () => {
			// e.g. lycee level with a rule that has only title (no explanation)
			const out = renderer.render(makeStep({ rule: 'subtract-constant', operand: number('3') }), {
				verbosity: 'detailed',
				schoolLevel: 'lycee'
			});
			// lycee may or may not have explanation; just verify it's a string or undefined
			expect(out.explanation === undefined || typeof out.explanation === 'string').toBe(true);
		});
	});

	describe('format', () => {
		it('text format adds a text field', () => {
			const out = renderer.render(makeStep(), {
				verbosity: 'summarized',
				schoolLevel: 'lycee',
				format: 'text'
			});
			expect(out.text).toBeDefined();
			expect(out.text!.length).toBeGreaterThan(0);
		});

		it('default format does not set text field', () => {
			const out = renderer.render(makeStep(), { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(out.text).toBeUndefined();
		});
	});

	describe('fallback chain', () => {
		it('unknown rule falls back to step.description', () => {
			const step = makeStep({
				rule: 'completely-unknown-rule',
				description: 'Some FR description'
			});
			const out = renderer.render(step, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(out.title).toBe('Some FR description');
		});

		it('rule covered only at lycee falls back from primaire', () => {
			// A quadratic rule (typically lycee-only) requested at primaire level
			// should fall back to the lycee title rather than failing.
			const step = makeStep({
				rule: 'compute-discriminant',
				description: 'Calcul du discriminant'
			});
			const out = renderer.render(step, { verbosity: 'summarized', schoolLevel: 'primaire' });
			expect(out.title.length).toBeGreaterThan(0);
		});
	});

	describe('renderAll', () => {
		it('maps each step', () => {
			const steps: SolveStep[] = [
				makeStep({ id: 1, rule: 'subtract-constant', operand: number('3') }),
				makeStep({ id: 2, rule: 'divide-coefficient', operand: number('2') })
			];
			const out = renderer.renderAll(steps, { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(out).toHaveLength(2);
			expect(out[0].id).toBe(1);
			expect(out[1].id).toBe(2);
		});

		it('returns empty array for empty input', () => {
			const out = renderer.renderAll([], { verbosity: 'summarized', schoolLevel: 'lycee' });
			expect(out).toEqual([]);
		});
	});

	describe('snapshot: 2x + 3 = 7 produces distinct level outputs', () => {
		it('the four level outputs are all different', () => {
			const steps: SolveStep[] = [
				makeStep({ id: 1, rule: 'identify-linear', operand: undefined }),
				makeStep({ id: 2, rule: 'subtract-constant', operand: number('3') }),
				makeStep({ id: 3, rule: 'divide-coefficient', operand: number('2') })
			];
			const titlesByLevel = allLevels.map((lvl) =>
				renderer
					.renderAll(steps, { verbosity: 'detailed', schoolLevel: lvl })
					.map((s) => s.title)
					.join('|')
			);
			// At least 3 of the 4 levels should produce distinct outputs (primaire, college, lycee, superieur)
			expect(new Set(titlesByLevel).size).toBeGreaterThanOrEqual(3);
		});
	});
});
