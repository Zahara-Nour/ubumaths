/**
 * Integration Step Recorder Tests
 *
 * Tests for the step recording functionality during integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	IntegrationStepRecorderImpl,
	createStepRecorder,
	shouldIncludeStep
} from '../step-recorder';
import { getRuleDescription, describeCustomRule } from '../descriptions-fr';
import type { MathNode } from '../../types';
import type { IntegrationVerbosity } from '../types';

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
// IntegrationStepRecorderImpl Tests
// =============================================================================

describe('IntegrationStepRecorderImpl', () => {
	let recorder: IntegrationStepRecorderImpl;

	beforeEach(() => {
		recorder = new IntegrationStepRecorderImpl();
	});

	describe('recordStep', () => {
		it('should record a step with all required fields', () => {
			const before = pow(variable('x'), num('2'));
			const after = mul(num('1/3'), pow(variable('x'), num('3')));

			recorder.recordStep(
				'power-rule',
				'On applique la regle des puissances',
				before,
				after,
				'summarized'
			);

			expect(recorder.length).toBe(1);

			const steps = recorder.getSteps();
			expect(steps[0].id).toBe(1);
			expect(steps[0].rule).toBe('power-rule');
			expect(steps[0].description).toBe('On applique la regle des puissances');
			expect(steps[0].before).toEqual(before);
			expect(steps[0].after).toEqual(after);
			expect(steps[0].verbosityLevel).toBe('summarized');
		});

		it('should record a step with optional operand', () => {
			const before = variable('x');
			const after = variable('u');
			const operand = add(variable('x'), num('1'));

			recorder.recordStep(
				'apply-substitution',
				'On effectue le changement de variable',
				before,
				after,
				'detailed',
				operand
			);

			const steps = recorder.getSteps();
			expect(steps[0].operand).toEqual(operand);
		});

		it('should record a step with optional technicalNote', () => {
			const before = variable('x');
			const after = variable('u');

			recorder.recordStep(
				'apply-substitution',
				'On effectue le changement de variable',
				before,
				after,
				'detailed',
				undefined,
				'u = x + 1, du = dx'
			);

			const steps = recorder.getSteps();
			expect(steps[0].technicalNote).toBe('u = x + 1, du = dx');
		});

		it('should increment step ID for each recorded step', () => {
			const node1 = num('1');
			const node2 = num('2');
			const node3 = num('3');

			recorder.recordStep('rule1', 'desc1', node1, node2, 'detailed');
			recorder.recordStep('rule2', 'desc2', node2, node3, 'detailed');
			recorder.recordStep('rule3', 'desc3', node3, node1, 'detailed');

			const steps = recorder.getSteps();
			expect(steps[0].id).toBe(1);
			expect(steps[1].id).toBe(2);
			expect(steps[2].id).toBe(3);
		});

		it('should accumulate multiple steps', () => {
			const x = variable('x');
			const x2 = pow(x, num('2'));
			const x3 = pow(x, num('3'));

			recorder.recordStep('step1', 'First step', x, x2, 'detailed');
			recorder.recordStep('step2', 'Second step', x2, x3, 'summarized');

			expect(recorder.length).toBe(2);
		});
	});

	describe('recordStepByRule', () => {
		it('should use default description from getRuleDescription', () => {
			const before = pow(variable('x'), num('2'));
			const after = mul(num('1/3'), pow(variable('x'), num('3')));

			recorder.recordStepByRule('power-rule', before, after, 'summarized');

			const steps = recorder.getSteps();
			expect(steps[0].description).toBe(getRuleDescription('power-rule'));
		});

		it('should pass optional operand and technicalNote', () => {
			const before = variable('x');
			const after = variable('u');
			const operand = add(variable('x'), num('1'));

			recorder.recordStepByRule(
				'apply-substitution',
				before,
				after,
				'detailed',
				operand,
				'u = x + 1'
			);

			const steps = recorder.getSteps();
			expect(steps[0].operand).toEqual(operand);
			expect(steps[0].technicalNote).toBe('u = x + 1');
		});
	});

	describe('getSteps', () => {
		it('should return empty array when no steps recorded', () => {
			const steps = recorder.getSteps();
			expect(steps).toEqual([]);
		});

		it('should return readonly array', () => {
			recorder.recordStep('rule', 'desc', num('1'), num('2'), 'detailed');
			const steps = recorder.getSteps();
			expect(Array.isArray(steps)).toBe(true);
		});

		it('should return all recorded steps', () => {
			recorder.recordStep('rule1', 'desc1', num('1'), num('2'), 'detailed');
			recorder.recordStep('rule2', 'desc2', num('2'), num('3'), 'summarized');

			const steps = recorder.getSteps();
			expect(steps.length).toBe(2);
		});
	});

	describe('getStepsFiltered', () => {
		beforeEach(() => {
			// Record steps at different verbosity levels
			recorder.recordStep('detailed-step', 'Detailed', num('1'), num('2'), 'detailed');
			recorder.recordStep('summarized-step', 'Summarized', num('2'), num('3'), 'summarized');
		});

		it('should return empty array for result verbosity', () => {
			const steps = recorder.getStepsFiltered('result');
			expect(steps).toEqual([]);
		});

		it('should return only summarized steps for summarized verbosity', () => {
			const steps = recorder.getStepsFiltered('summarized');
			expect(steps.length).toBe(1);
			expect(steps[0].rule).toBe('summarized-step');
		});

		it('should return all steps for detailed verbosity', () => {
			const steps = recorder.getStepsFiltered('detailed');
			expect(steps.length).toBe(2);
		});
	});

	describe('clear', () => {
		it('should clear all recorded steps', () => {
			recorder.recordStep('rule', 'desc', num('1'), num('2'), 'detailed');
			expect(recorder.length).toBe(1);

			recorder.clear();
			expect(recorder.length).toBe(0);
			expect(recorder.getSteps()).toEqual([]);
		});

		it('should reset step ID counter', () => {
			recorder.recordStep('rule1', 'desc1', num('1'), num('2'), 'detailed');
			recorder.clear();
			recorder.recordStep('rule2', 'desc2', num('3'), num('4'), 'detailed');

			const steps = recorder.getSteps();
			expect(steps[0].id).toBe(1);
		});
	});

	describe('length', () => {
		it('should return 0 for empty recorder', () => {
			expect(recorder.length).toBe(0);
		});

		it('should return correct count after recording', () => {
			recorder.recordStep('r1', 'd1', num('1'), num('2'), 'detailed');
			expect(recorder.length).toBe(1);

			recorder.recordStep('r2', 'd2', num('2'), num('3'), 'detailed');
			expect(recorder.length).toBe(2);
		});
	});
});

// =============================================================================
// createStepRecorder Factory Tests
// =============================================================================

describe('createStepRecorder', () => {
	it('should create a new IntegrateStepRecorder instance', () => {
		const recorder = createStepRecorder();
		expect(recorder).toBeDefined();
		expect(recorder.length).toBe(0);
	});

	it('should create independent instances', () => {
		const recorder1 = createStepRecorder();
		const recorder2 = createStepRecorder();

		recorder1.recordStep('rule', 'desc', num('1'), num('2'), 'detailed');

		expect(recorder1.length).toBe(1);
		expect(recorder2.length).toBe(0);
	});
});

// =============================================================================
// shouldIncludeStep Tests
// =============================================================================

describe('shouldIncludeStep', () => {
	const testCases: Array<{
		stepVerbosity: IntegrationVerbosity;
		requestedVerbosity: IntegrationVerbosity;
		expected: boolean;
	}> = [
		// Result verbosity - nothing shown except result
		{ stepVerbosity: 'detailed', requestedVerbosity: 'result', expected: false },
		{ stepVerbosity: 'summarized', requestedVerbosity: 'result', expected: false },

		// Summarized verbosity - only summarized and below
		{ stepVerbosity: 'detailed', requestedVerbosity: 'summarized', expected: false },
		{ stepVerbosity: 'summarized', requestedVerbosity: 'summarized', expected: true },

		// Detailed verbosity - all steps
		{ stepVerbosity: 'detailed', requestedVerbosity: 'detailed', expected: true },
		{ stepVerbosity: 'summarized', requestedVerbosity: 'detailed', expected: true }
	];

	testCases.forEach(({ stepVerbosity, requestedVerbosity, expected }) => {
		it(`should return ${expected} for step=${stepVerbosity}, requested=${requestedVerbosity}`, () => {
			expect(shouldIncludeStep(stepVerbosity, requestedVerbosity)).toBe(expected);
		});
	});
});

// =============================================================================
// getRuleDescription Tests
// =============================================================================

describe('getRuleDescription', () => {
	it('should return description for known basic rules', () => {
		expect(getRuleDescription('power-rule')).toContain('puissances');
		expect(getRuleDescription('constant-rule')).toContain('constante');
		expect(getRuleDescription('sum-rule')).toContain('somme');
	});

	it('should return description for u-substitution rules', () => {
		expect(getRuleDescription('identify-substitution')).toContain('substitution');
		expect(getRuleDescription('apply-substitution')).toContain('changement de variable');
		expect(getRuleDescription('substitute-back')).toContain('remplace');
	});

	it('should return description for integration by parts rules', () => {
		expect(getRuleDescription('identify-parts')).toContain('u dv');
		expect(getRuleDescription('apply-parts-formula')).toContain('uv');
	});

	it('should return description for trigonometric rules', () => {
		expect(getRuleDescription('sin-rule')).toContain('sin');
		expect(getRuleDescription('cos-rule')).toContain('cos');
	});

	it('should include proper French accents', () => {
		expect(getRuleDescription('power-rule')).toContain('règle');
		expect(getRuleDescription('power-rule')).toContain('intégrale');
		expect(getRuleDescription('identify-parts')).toContain('intégrale');
	});
});

describe('describeCustomRule', () => {
	it('should return fallback description for custom rules', () => {
		const desc = describeCustomRule('unknown-rule-xyz');
		expect(desc).toContain('Règle');
		expect(desc).toContain('unknown-rule-xyz');
	});

	it('should handle any string input', () => {
		expect(describeCustomRule('my-custom-step')).toBe('Règle: my-custom-step');
	});
});

// =============================================================================
// IntegrateStep Format Tests
// =============================================================================

describe('IntegrateStep format', () => {
	it('should have all required fields', () => {
		const recorder = createStepRecorder();
		const before = pow(variable('x'), num('2'));
		const after = mul(num('1/3'), pow(variable('x'), num('3')));

		recorder.recordStep('power-rule', 'Description', before, after, 'summarized');

		const steps = recorder.getSteps();
		expect(steps.length).toBe(1);

		const step = steps[0];
		expect(step).toHaveProperty('id');
		expect(step).toHaveProperty('rule');
		expect(step).toHaveProperty('description');
		expect(step).toHaveProperty('before');
		expect(step).toHaveProperty('after');
		expect(step).toHaveProperty('verbosityLevel');
	});

	it('should have non-empty rule and description', () => {
		const recorder = createStepRecorder();
		recorder.recordStep('power-rule', 'Description', num('1'), num('2'), 'detailed');

		const steps = recorder.getSteps();
		for (const step of steps) {
			expect(step.rule.length).toBeGreaterThan(0);
			expect(step.description.length).toBeGreaterThan(0);
		}
	});

	it('should have correct types for all fields', () => {
		const recorder = createStepRecorder();
		recorder.recordStep('rule', 'desc', num('1'), num('2'), 'detailed', num('3'), 'note');

		const step = recorder.getSteps()[0];
		expect(typeof step.id).toBe('number');
		expect(typeof step.rule).toBe('string');
		expect(typeof step.description).toBe('string');
		expect(typeof step.verbosityLevel).toBe('string');
		expect(typeof step.before).toBe('object');
		expect(typeof step.after).toBe('object');
		expect(typeof step.operand).toBe('object');
		expect(typeof step.technicalNote).toBe('string');
	});
});
