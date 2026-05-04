import { describe, it, expect } from 'vitest';
import { GenericTechnicalRenderer } from '../technical-renderer';
import type { BaseStep } from '../step-recorder-base';
import type { MathNode } from '../../types';
import { number } from '../../factory';

describe('GenericTechnicalRenderer', () => {
	const renderer = new GenericTechnicalRenderer<BaseStep>();

	function makeStep(overrides: Partial<BaseStep> = {}): BaseStep {
		return {
			id: 1,
			rule: 'test-rule',
			description: 'A test rule',
			before: number('2'),
			after: number('3'),
			verbosityLevel: 'detailed',
			...overrides
		};
	}

	describe('render — structured output (default)', () => {
		it('returns id, rule, title, and expressionLatex from a BaseStep', () => {
			const out = renderer.render(makeStep(), { verbosity: 'detailed' });
			expect(out.id).toBe(1);
			expect(out.rule).toBe('test-rule');
			expect(out.title).toBe('A test rule');
			expect(out.expressionLatex).toBe('2 \\Rightarrow 3');
		});

		it('does not set the text field by default', () => {
			const out = renderer.render(makeStep(), { verbosity: 'detailed' });
			expect(out.text).toBeUndefined();
		});

		it('does not set schoolLevel (technical = no school adaptation)', () => {
			const out = renderer.render(makeStep(), { verbosity: 'detailed' });
			expect(out.schoolLevel).toBeUndefined();
		});

		it('does not set explanation (explanation is a pedagogical concept)', () => {
			const out = renderer.render(makeStep(), { verbosity: 'detailed' });
			expect(out.explanation).toBeUndefined();
		});
	});

	describe('render — text format', () => {
		it('sets a text field with rule, description, and expression', () => {
			const out = renderer.render(makeStep(), { verbosity: 'detailed', format: 'text' });
			expect(out.text).toBeDefined();
			expect(out.text).toContain('test-rule');
			expect(out.text).toContain('A test rule');
			expect(out.text).toContain('2');
			expect(out.text).toContain('3');
		});

		it('preserves the structured fields alongside the text dump', () => {
			const out = renderer.render(makeStep(), { verbosity: 'detailed', format: 'text' });
			expect(out.id).toBe(1);
			expect(out.rule).toBe('test-rule');
			expect(out.expressionLatex).toBe('2 \\Rightarrow 3');
		});
	});

	describe('render — extra field detection (reflection)', () => {
		it('dumps an extra MathNode field (operand) as LaTeX', () => {
			type StepWithOperand = BaseStep & { readonly operand: MathNode };
			const step: StepWithOperand = { ...makeStep(), operand: number('5') };
			const out = renderer.render(step, { verbosity: 'detailed', format: 'text' });
			expect(out.text).toContain('operand');
			expect(out.text).toContain('5');
		});

		it('dumps an extra string field (phase) as-is', () => {
			type StepWithPhase = BaseStep & { readonly phase: string };
			const step: StepWithPhase = { ...makeStep(), phase: 'normalize' };
			const out = renderer.render(step, { verbosity: 'detailed', format: 'text' });
			expect(out.text).toContain('phase');
			expect(out.text).toContain('normalize');
		});

		it('skips undefined extra fields', () => {
			type StepWithMaybe = BaseStep & { readonly domainNote?: string };
			const step: StepWithMaybe = { ...makeStep(), domainNote: undefined };
			const out = renderer.render(step, { verbosity: 'detailed', format: 'text' });
			expect(out.text).not.toContain('domainNote');
		});

		it('does not dump core BaseStep fields (before/after) again under raw keys', () => {
			const out = renderer.render(makeStep(), { verbosity: 'detailed', format: 'text' });
			expect(out.text).not.toMatch(/before=/);
			expect(out.text).not.toMatch(/after=/);
		});
	});

	describe('renderAll', () => {
		it('maps each step through render', () => {
			const steps: BaseStep[] = [
				makeStep({ id: 1, rule: 'r1' }),
				makeStep({ id: 2, rule: 'r2' }),
				makeStep({ id: 3, rule: 'r3' })
			];
			const out = renderer.renderAll(steps, { verbosity: 'detailed' });
			expect(out).toHaveLength(3);
			expect(out.map((s) => s.id)).toEqual([1, 2, 3]);
			expect(out.map((s) => s.rule)).toEqual(['r1', 'r2', 'r3']);
		});

		it('returns an empty array for empty input', () => {
			const out = renderer.renderAll([], { verbosity: 'detailed' });
			expect(out).toEqual([]);
		});
	});

	describe('verbosity is informational only (no filtering)', () => {
		it('returns the same output regardless of verbosity', () => {
			const step = makeStep();
			const summary = renderer.render(step, { verbosity: 'summarized' });
			const detailed = renderer.render(step, { verbosity: 'detailed' });
			expect(summary).toEqual(detailed);
		});
	});
});
