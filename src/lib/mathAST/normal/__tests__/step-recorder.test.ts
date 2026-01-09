/**
 * Step Recorder Tests
 *
 * Tests for the step recording functionality during Phase 1 simplification.
 *
 * Note: Phase 1 now only handles radical rules. Arithmetic and power rules
 * have been moved to Phase 2 (polynomial normalization).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	StepRecorder,
	getRuleDescription,
	simplifyWithSteps,
	simplifyOnceWithSteps
} from '../step-recorder';
import type { MathNode } from '../../types';

// =============================================================================
// Test Helpers
// =============================================================================

const num = (value: string): MathNode => ({ type: 'number', value });
const variable = (name: string): MathNode => ({ type: 'variable', name });
const add = (left: MathNode, right: MathNode): MathNode => ({ type: 'addition', left, right });
const mul = (left: MathNode, right: MathNode): MathNode => ({
	type: 'multiplication',
	left,
	right,
	displayStyle: 'implicit'
});
const div = (numerator: MathNode, denominator: MathNode): MathNode => ({
	type: 'division',
	numerator,
	denominator,
	displayStyle: 'fraction'
});
const pow = (base: MathNode, exp: MathNode): MathNode => ({
	type: 'superscript',
	base,
	superscript: exp
});
const sqrt = (arg: MathNode): MathNode => ({
	type: 'function',
	name: 'sqrt',
	args: [arg]
});

// =============================================================================
// StepRecorder Class Tests
// =============================================================================

describe('StepRecorder', () => {
	let recorder: StepRecorder;

	beforeEach(() => {
		recorder = new StepRecorder();
	});

	describe('recordStep', () => {
		it('should record step when transformation occurs', () => {
			const before = mul(sqrt(num('2')), sqrt(num('3')));
			const after = sqrt(mul(num('2'), num('3')));

			const recorded = recorder.recordStep(
				'radical-product',
				'Description',
				before,
				after,
				'detailed'
			);

			expect(recorded).toBe(true);
			expect(recorder.length).toBe(1);

			const steps = recorder.getSteps();
			expect(steps[0].rule).toBe('radical-product');
			expect(steps[0].before).toEqual(before);
			expect(steps[0].after).toEqual(after);
			expect(steps[0].id).toBe(1);
			expect(steps[0].verbosityLevel).toBe('detailed');
		});

		it('should not record step when no transformation occurs', () => {
			const node = variable('x');

			const recorded = recorder.recordStep('some-rule', 'Description', node, node, 'detailed');

			expect(recorded).toBe(false);
			expect(recorder.length).toBe(0);
		});

		it('should accumulate multiple steps with incrementing IDs', () => {
			const step1Before = mul(sqrt(num('2')), sqrt(num('3')));
			const step1After = sqrt(mul(num('2'), num('3')));
			const step2Before = sqrt(div(variable('x'), variable('y')));
			const step2After = div(sqrt(variable('x')), sqrt(variable('y')));

			recorder.recordStep('rule1', 'Desc 1', step1Before, step1After, 'detailed');
			recorder.recordStep('rule2', 'Desc 2', step2Before, step2After, 'summarized');

			expect(recorder.length).toBe(2);
			const steps = recorder.getSteps();
			expect(steps[0].id).toBe(1);
			expect(steps[1].id).toBe(2);
		});
	});

	describe('recordStepByRule', () => {
		it('should record step with auto-lookup description', () => {
			const before = mul(sqrt(num('2')), sqrt(num('3')));
			const after = sqrt(mul(num('2'), num('3')));

			const recorded = recorder.recordStepByRule('radicals', before, after, 'summarized');

			expect(recorded).toBe(true);
			const steps = recorder.getSteps();
			expect(steps[0].description).toContain('radicaux');
			expect(steps[0].verbosityLevel).toBe('summarized');
		});
	});

	describe('recordStepWithDescription', () => {
		it('should record step with custom description', () => {
			const before = pow(num('2'), num('3'));
			const after = num('8');

			recorder.recordStepWithDescription(
				'custom',
				'Description personnalisée',
				before,
				after,
				'detailed'
			);

			const steps = recorder.getSteps();
			expect(steps[0].description).toBe('Description personnalisée');
			expect(steps[0].verbosityLevel).toBe('detailed');
		});
	});

	describe('clear', () => {
		it('should clear all recorded steps', () => {
			const before = mul(sqrt(num('2')), sqrt(num('3')));
			const after = sqrt(mul(num('2'), num('3')));

			recorder.recordStep('rule', 'Description', before, after, 'detailed');
			expect(recorder.length).toBe(1);

			recorder.clear();
			expect(recorder.length).toBe(0);
		});
	});

	describe('getSteps', () => {
		it('should return readonly steps array', () => {
			const steps = recorder.getSteps();
			expect(Array.isArray(steps)).toBe(true);
		});
	});

	describe('getStepsFiltered', () => {
		beforeEach(() => {
			const before1 = mul(sqrt(num('2')), sqrt(num('3')));
			const after1 = sqrt(mul(num('2'), num('3')));
			const before2 = pow(num('2'), num('3'));
			const after2 = num('8');

			// Record one detailed step and one summarized step
			recorder.recordStep('rule1', 'Detailed step', before1, after1, 'detailed');
			recorder.recordStep('rule2', 'Summarized step', before2, after2, 'summarized');
		});

		it('should return all steps for detailed verbosity', () => {
			const steps = recorder.getStepsFiltered('detailed');
			expect(steps.length).toBe(2);
		});

		it('should filter out detailed steps for summarized verbosity', () => {
			const steps = recorder.getStepsFiltered('summarized');
			expect(steps.length).toBe(1);
			expect(steps[0].verbosityLevel).toBe('summarized');
		});

		it('should return empty for result verbosity', () => {
			const steps = recorder.getStepsFiltered('result');
			expect(steps.length).toBe(0);
		});
	});
});

// =============================================================================
// Rule Descriptions Tests
// =============================================================================

describe('getRuleDescription', () => {
	it('should return description for known rules', () => {
		expect(getRuleDescription('radicals')).toContain('radicaux');
	});

	it('should return fallback for unknown rules', () => {
		const desc = getRuleDescription('unknown-rule-xyz');
		expect(desc).toContain('unknown-rule-xyz');
	});
});

// =============================================================================
// Simplify with Steps Tests (Phase 1 - Radicals only)
// =============================================================================

describe('simplifyWithSteps', () => {
	it('should simplify sqrt(a) * sqrt(b) to sqrt(ab) and record steps', () => {
		const expr = mul(sqrt(num('2')), sqrt(num('3')));
		const { result, steps } = simplifyWithSteps(expr);

		expect(result).toEqual(sqrt(mul(num('2'), num('3'))));
		// Transformation should have been recorded
		expect(steps.length).toBeGreaterThan(0);
	});

	it('should return empty steps when no simplification needed', () => {
		const expr = variable('x');
		const { result, steps } = simplifyWithSteps(expr);

		expect(result).toEqual(expr);
		expect(steps.length).toBe(0);
	});

	it('should not simplify arithmetic expressions (now handled in Phase 2)', () => {
		// 0 + x is NOT simplified in Phase 1 anymore
		const expr = add(num('0'), variable('x'));
		const { result, steps } = simplifyWithSteps(expr);

		// Should remain unchanged
		expect(result).toEqual(expr);
		expect(steps.length).toBe(0);
	});

	it('should simplify nested sqrt expressions', () => {
		// (sqrt(2) * sqrt(3)) + x should simplify the sqrt part
		const expr = add(mul(sqrt(num('2')), sqrt(num('3'))), variable('x'));
		const { result, steps } = simplifyWithSteps(expr);

		expect(result.type).toBe('addition');
		if (result.type === 'addition') {
			expect(result.left).toEqual(sqrt(mul(num('2'), num('3'))));
			expect(result.right).toEqual(variable('x'));
		}
		expect(steps.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// Step Format Tests
// =============================================================================

describe('NormalizationStep format', () => {
	it('should have all required fields', () => {
		const before = mul(sqrt(num('2')), sqrt(num('3')));
		const { steps } = simplifyWithSteps(before);

		if (steps.length > 0) {
			const step = steps[0];
			expect(step).toHaveProperty('id');
			expect(step).toHaveProperty('rule');
			expect(step).toHaveProperty('description');
			expect(step).toHaveProperty('before');
			expect(step).toHaveProperty('after');
			expect(step).toHaveProperty('verbosityLevel');
		}
	});

	it('should have non-empty rule and description', () => {
		const before = mul(sqrt(num('2')), sqrt(num('3')));
		const { steps } = simplifyWithSteps(before);

		for (const step of steps) {
			expect(step.rule.length).toBeGreaterThan(0);
			expect(step.description.length).toBeGreaterThan(0);
			expect(step.id).toBeGreaterThan(0);
		}
	});
});

// =============================================================================
// simplifyOnceWithSteps Tests
// =============================================================================

describe('simplifyOnceWithSteps', () => {
	it('should apply simplification without recorder', () => {
		const expr = mul(sqrt(num('2')), sqrt(num('3')));
		const result = simplifyOnceWithSteps(expr);

		expect(result).toEqual(sqrt(mul(num('2'), num('3'))));
	});

	it('should apply simplification with recorder', () => {
		const recorder = new StepRecorder();
		const expr = mul(sqrt(num('2')), sqrt(num('3')));
		const result = simplifyOnceWithSteps(expr, recorder);

		expect(result).toEqual(sqrt(mul(num('2'), num('3'))));
		// Should have recorded the radical transformation
		expect(recorder.length).toBeGreaterThan(0);
	});

	it('should not transform non-radical expressions', () => {
		const recorder = new StepRecorder();
		// This is arithmetic, not radical - should not be simplified
		const expr = add(num('0'), variable('x'));
		const result = simplifyOnceWithSteps(expr, recorder);

		expect(result).toEqual(expr);
		expect(recorder.length).toBe(0);
	});
});
