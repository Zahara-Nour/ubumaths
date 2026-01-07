/**
 * Step Recorder Tests
 *
 * Tests for the step recording functionality during normalization.
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
const pow = (base: MathNode, exp: MathNode): MathNode => ({
	type: 'superscript',
	base,
	superscript: exp
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
			const before = add(num('0'), variable('x'));
			const after = variable('x');

			const recorded = recorder.recordStep('additive-identity-left', before, after);

			expect(recorded).toBe(true);
			expect(recorder.length).toBe(1);

			const steps = recorder.getSteps();
			expect(steps[0].rule).toBe('additive-identity-left');
			expect(steps[0].before).toEqual(before);
			expect(steps[0].after).toEqual(after);
		});

		it('should not record step when no transformation occurs', () => {
			const node = variable('x');

			const recorded = recorder.recordStep('some-rule', node, node);

			expect(recorded).toBe(false);
			expect(recorder.length).toBe(0);
		});

		it('should accumulate multiple steps', () => {
			const step1Before = add(num('0'), variable('x'));
			const step1After = variable('x');
			const step2Before = mul(num('1'), variable('y'));
			const step2After = variable('y');

			recorder.recordStep('rule1', step1Before, step1After);
			recorder.recordStep('rule2', step2Before, step2After);

			expect(recorder.length).toBe(2);
		});
	});

	describe('recordStepWithDescription', () => {
		it('should record step with custom description', () => {
			const before = pow(num('2'), num('3'));
			const after = num('8');

			recorder.recordStepWithDescription('custom', 'Description personnalisée', before, after);

			const steps = recorder.getSteps();
			expect(steps[0].description).toBe('Description personnalisée');
		});
	});

	describe('clear', () => {
		it('should clear all recorded steps', () => {
			const before = add(num('0'), variable('x'));
			const after = variable('x');

			recorder.recordStep('rule', before, after);
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
});

// =============================================================================
// Rule Descriptions Tests
// =============================================================================

describe('getRuleDescription', () => {
	it('should return description for known rules', () => {
		expect(getRuleDescription('additive-identity-left')).toContain("L'addition de 0");
		expect(getRuleDescription('multiplicative-zero-left')).toContain('0');
		expect(getRuleDescription('power-zero')).toContain('puissance 0');
	});

	it('should return fallback for unknown rules', () => {
		const desc = getRuleDescription('unknown-rule-xyz');
		expect(desc).toContain('unknown-rule-xyz');
	});
});

// =============================================================================
// Simplify with Steps Tests
// =============================================================================

describe('simplifyWithSteps', () => {
	it('should simplify 0 + x to x and record steps', () => {
		const expr = add(num('0'), variable('x'));
		const { result, steps } = simplifyWithSteps(expr);

		expect(result).toEqual(variable('x'));
		// At least one transformation should have been recorded
		expect(steps.length).toBeGreaterThan(0);
	});

	it('should simplify x * 1 to x and record steps', () => {
		const expr = mul(variable('x'), num('1'));
		const { result, steps } = simplifyWithSteps(expr);

		expect(result).toEqual(variable('x'));
		expect(steps.length).toBeGreaterThan(0);
	});

	it('should simplify x^0 to 1 and record steps', () => {
		const expr = pow(variable('x'), num('0'));
		const { result, steps } = simplifyWithSteps(expr);

		expect(result).toEqual(num('1'));
		expect(steps.length).toBeGreaterThan(0);
	});

	it('should return empty steps when no simplification needed', () => {
		const expr = variable('x');
		const { result, steps } = simplifyWithSteps(expr);

		expect(result).toEqual(expr);
		expect(steps.length).toBe(0);
	});

	it('should record multiple iterations when needed', () => {
		// 0 + (1 * x) should simplify in multiple steps
		const expr = add(num('0'), mul(num('1'), variable('x')));
		const { result, steps } = simplifyWithSteps(expr);

		expect(result).toEqual(variable('x'));
		// Should have recorded transformation steps
		expect(steps.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// Step Format Tests
// =============================================================================

describe('NormalizationStep format', () => {
	it('should have all required fields', () => {
		const before = add(num('0'), variable('x'));
		const { steps } = simplifyWithSteps(before);

		if (steps.length > 0) {
			const step = steps[0];
			expect(step).toHaveProperty('rule');
			expect(step).toHaveProperty('description');
			expect(step).toHaveProperty('before');
			expect(step).toHaveProperty('after');
		}
	});

	it('should have non-empty rule and description', () => {
		const before = add(num('0'), variable('x'));
		const { steps } = simplifyWithSteps(before);

		for (const step of steps) {
			expect(step.rule.length).toBeGreaterThan(0);
			expect(step.description.length).toBeGreaterThan(0);
		}
	});
});

// =============================================================================
// simplifyOnceWithSteps Tests
// =============================================================================

describe('simplifyOnceWithSteps', () => {
	it('should apply simplification without recorder', () => {
		const expr = add(num('0'), variable('x'));
		const result = simplifyOnceWithSteps(expr);

		expect(result).toEqual(variable('x'));
	});

	it('should apply simplification with recorder', () => {
		const recorder = new StepRecorder();
		const expr = add(num('0'), variable('x'));
		const result = simplifyOnceWithSteps(expr, recorder);

		expect(result).toEqual(variable('x'));
		// Should have recorded at least the arithmetic transformation
		expect(recorder.length).toBeGreaterThan(0);
	});
});
