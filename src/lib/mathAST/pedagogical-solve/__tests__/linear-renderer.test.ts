import { describe, it, expect } from 'vitest';
import { LinearEquationRenderer } from '../linear-renderer';
import { generateLinearEquationSteps } from '../linear';
import type { LinearSchoolLevel } from '../types';
import {
	number,
	variable,
	add,
	subtract,
	implicitMultiply,
	opposite,
	relation
} from '../../factory';

const x = variable('x');

function eq3x_minus_2_eq_minus_5x_plus_7() {
	return relation(
		'=',
		subtract(implicitMultiply(number('3'), x), number('2')),
		add(opposite(implicitMultiply(number('5'), x)), number('7'))
	);
}

const allLevels: readonly LinearSchoolLevel[] = ['college', 'lycee', 'superieur'];

describe('LinearEquationRenderer', () => {
	const renderer = new LinearEquationRenderer();

	describe('basic rendering', () => {
		it('produces id, rule, title, expressionLatex, schoolLevel for each step', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			const rendered = renderer.renderAll(steps, {
				verbosity: 'detailed',
				schoolLevel: 'college'
			});
			expect(rendered.length).toBe(steps.length);
			for (const r of rendered) {
				expect(r.id).toBeDefined();
				expect(r.rule).toBeDefined();
				expect(r.title.length).toBeGreaterThan(0);
				expect(r.expressionLatex).toBeDefined();
				expect(r.schoolLevel).toBe('college');
			}
		});

		it('schoolLevel is propagated for all 4 levels', () => {
			for (const level of allLevels) {
				const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), { level });
				const rendered = renderer.renderAll(steps, { verbosity: 'summarized', schoolLevel: level });
				for (const r of rendered) expect(r.schoolLevel).toBe(level);
			}
		});
	});

	describe('verbosity', () => {
		it('detailed includes explanation when defined', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			const rendered = renderer.renderAll(steps, {
				verbosity: 'detailed',
				schoolLevel: 'college'
			});
			const someHasExplanation = rendered.some((r) => r.explanation !== undefined);
			expect(someHasExplanation).toBe(true);
		});

		it('summarized never includes explanation', () => {
			for (const level of allLevels) {
				const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), { level });
				const rendered = renderer.renderAll(steps, {
					verbosity: 'summarized',
					schoolLevel: level
				});
				for (const r of rendered) expect(r.explanation).toBeUndefined();
			}
		});
	});

	describe('subSteps recursion', () => {
		it('lycee renders subSteps recursively', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'lycee',
				includeSubSteps: true
			});
			const rendered = renderer.renderAll(steps, { verbosity: 'detailed', schoolLevel: 'lycee' });
			const someWithSub = rendered.find((r) => r.subSteps !== undefined);
			expect(someWithSub).toBeDefined();
			expect(someWithSub!.subSteps!.length).toBeGreaterThan(0);
			// Each substep is also a RenderedStep
			for (const sub of someWithSub!.subSteps!) {
				expect(sub.title.length).toBeGreaterThan(0);
				expect(sub.schoolLevel).toBe('lycee');
			}
		});

		it('college does not produce subSteps (already flat)', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			const rendered = renderer.renderAll(steps, {
				verbosity: 'detailed',
				schoolLevel: 'college'
			});
			for (const r of rendered) expect(r.subSteps).toBeUndefined();
		});
	});

	describe('vocabulary across levels', () => {
		it('add-both-sides : college diffère de lycée/supérieur (« aux deux membres » explicite ou non)', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			const addStep = steps.find((s) => s.operation?.kind === 'add-both-sides')!;
			expect(addStep).toBeDefined();
			const titleCollege = renderer.render(addStep, {
				verbosity: 'summarized',
				schoolLevel: 'college'
			}).title;
			const titleLycee = renderer.render(addStep, {
				verbosity: 'summarized',
				schoolLevel: 'lycee'
			}).title;
			expect(titleCollege).toContain('aux deux membres');
			expect(titleLycee).not.toContain('aux deux membres');
		});

		it('lycée et supérieur partagent le vocabulaire (différence purement structurelle)', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			const addStep = steps.find((s) => s.operation?.kind === 'add-both-sides')!;
			const titleLycee = renderer.render(addStep, {
				verbosity: 'summarized',
				schoolLevel: 'lycee'
			}).title;
			const titleSuperieur = renderer.render(addStep, {
				verbosity: 'summarized',
				schoolLevel: 'superieur'
			}).title;
			expect(titleLycee).toBe(titleSuperieur);
		});
	});

	describe('format', () => {
		it('text format adds a text dump', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			const rendered = renderer.renderAll(steps, {
				verbosity: 'detailed',
				schoolLevel: 'college',
				format: 'text'
			});
			for (const r of rendered) {
				expect(r.text).toBeDefined();
				expect(r.text!.length).toBeGreaterThan(0);
			}
		});

		it('default (structured) format does not set text', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			const rendered = renderer.renderAll(steps, {
				verbosity: 'detailed',
				schoolLevel: 'college'
			});
			for (const r of rendered) expect(r.text).toBeUndefined();
		});
	});

	describe('primaire is unsupported', () => {
		it('throws a clear error when called with schoolLevel: primaire', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			expect(() =>
				renderer.render(steps[0], {
					verbosity: 'summarized',
					// primaire is intentionally not in LinearSchoolLevel; cast for the test
					schoolLevel: 'primaire' as never
				})
			).toThrow(/primaire.*not supported|primary curriculum/);
		});
	});

	describe('expressionLatex behaviour', () => {
		it('uses single-form when before equals after (info-only steps)', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			const identifyStep = steps.find((s) => s.operation?.kind === 'identify-equation');
			if (identifyStep) {
				const r = renderer.render(identifyStep, {
					verbosity: 'summarized',
					schoolLevel: 'college'
				});
				// Identify: before === after, single equation, no align block
				expect(r.expressionLatex).not.toContain('begin{aligned}');
				expect(r.expressionLatex).not.toContain('Rightarrow');
			}
		});

		it('uses \\begin{aligned} when before !== after (equation transformation)', () => {
			const steps = generateLinearEquationSteps(eq3x_minus_2_eq_minus_5x_plus_7(), {
				level: 'college'
			});
			const addStep = steps.find((s) => s.operation?.kind === 'add-both-sides')!;
			const r = renderer.render(addStep, { verbosity: 'summarized', schoolLevel: 'college' });
			expect(r.expressionLatex).toContain('\\begin{aligned}');
			expect(r.expressionLatex).toContain('\\end{aligned}');
			// Each line uses `&=` to align on the equality column
			expect(r.expressionLatex.match(/&=/g)?.length).toBe(2);
		});
	});
});
