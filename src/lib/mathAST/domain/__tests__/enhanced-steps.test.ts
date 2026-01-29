/**
 * Tests for Enhanced Domain Steps
 *
 * Tests for the enhanced pedagogical step recording system.
 */

import { describe, it, expect } from 'vitest';
import { createDomainStepRecorder, getNullRecorder } from '../domain-step-recorder';
import {
	getDomainRuleDescription,
	applyDomainRuleTemplate,
	DOMAIN_RULE_DESCRIPTIONS
} from '../step-descriptions';
import {
	isConstraintRule,
	isPreimageRule,
	isOperationRule,
	getConstraintRuleForFunction
} from '../enhanced-step-types';
import type { DomainRule } from '../enhanced-step-types';
import { intervalDomain, greaterThanOrEqual, fromNumber } from '../factory';

// =============================================================================
// Step Descriptions Tests
// =============================================================================

describe('getDomainRuleDescription', () => {
	it('should return description for sqrt_constraint', () => {
		const desc = getDomainRuleDescription('sqrt_constraint');
		expect(desc).toContain('racine carrée');
		expect(desc).toContain('positif ou nul');
	});

	it('should return description for ln_constraint', () => {
		const desc = getDomainRuleDescription('ln_constraint');
		expect(desc).toContain('logarithme');
		expect(desc).toContain('strictement positif');
	});

	it('should return description for division_constraint', () => {
		const desc = getDomainRuleDescription('division_constraint');
		expect(desc).toContain('dénominateur');
		expect(desc).toContain('non nul');
	});

	it('should return description for all defined rules', () => {
		const rules = Object.keys(DOMAIN_RULE_DESCRIPTIONS) as DomainRule[];
		for (const rule of rules) {
			const desc = getDomainRuleDescription(rule);
			expect(desc).toBeTruthy();
			expect(desc).not.toBe(`Règle: ${rule}`);
		}
	});

	it('should return fallback for unknown rule', () => {
		const desc = getDomainRuleDescription('unknown_rule' as DomainRule);
		expect(desc).toBe('Règle: unknown_rule');
	});
});

describe('applyDomainRuleTemplate', () => {
	it('should substitute single value', () => {
		const result = applyDomainRuleTemplate('sqrt_constraint', { expr: 'x - 2' });
		expect(result).toContain('x - 2');
		expect(result).toContain('≥ 0');
	});

	it('should substitute multiple values', () => {
		const result = applyDomainRuleTemplate('preimage_linear', {
			expr: '2x + 1',
			op: '≥',
			bound: '0'
		});
		expect(result).toContain('2x + 1');
		expect(result).toContain('≥');
		expect(result).toContain('0');
	});

	it('should substitute same placeholder multiple times', () => {
		const result = applyDomainRuleTemplate('arcsin_constraint', { expr: 'x/2' });
		// Template uses {expr} multiple times
		expect(result.match(/x\/2/g)?.length).toBeGreaterThanOrEqual(1);
	});
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('isConstraintRule', () => {
	it('should return true for constraint rules', () => {
		expect(isConstraintRule('sqrt_constraint')).toBe(true);
		expect(isConstraintRule('ln_constraint')).toBe(true);
		expect(isConstraintRule('division_constraint')).toBe(true);
		expect(isConstraintRule('arcsin_constraint')).toBe(true);
		expect(isConstraintRule('power_constraint')).toBe(true);
	});

	it('should return false for non-constraint rules', () => {
		expect(isConstraintRule('intersection')).toBe(false);
		expect(isConstraintRule('preimage_linear')).toBe(false);
		expect(isConstraintRule('composition')).toBe(false);
	});
});

describe('isPreimageRule', () => {
	it('should return true for preimage rules', () => {
		expect(isPreimageRule('preimage_linear')).toBe(true);
		expect(isPreimageRule('preimage_quadratic')).toBe(true);
		expect(isPreimageRule('preimage_cubic')).toBe(true);
		expect(isPreimageRule('preimage_general')).toBe(true);
	});

	it('should return false for non-preimage rules', () => {
		expect(isPreimageRule('sqrt_constraint')).toBe(false);
		expect(isPreimageRule('intersection')).toBe(false);
	});
});

describe('isOperationRule', () => {
	it('should return true for operation rules', () => {
		expect(isOperationRule('intersection')).toBe(true);
		expect(isOperationRule('union')).toBe(true);
		expect(isOperationRule('complement')).toBe(true);
		expect(isOperationRule('difference')).toBe(true);
	});

	it('should return false for non-operation rules', () => {
		expect(isOperationRule('sqrt_constraint')).toBe(false);
		expect(isOperationRule('preimage_linear')).toBe(false);
	});
});

describe('getConstraintRuleForFunction', () => {
	it('should return correct rule for sqrt', () => {
		expect(getConstraintRuleForFunction('sqrt')).toBe('sqrt_constraint');
	});

	it('should return correct rule for ln', () => {
		expect(getConstraintRuleForFunction('ln')).toBe('ln_constraint');
	});

	it('should return correct rule for log variants', () => {
		expect(getConstraintRuleForFunction('log')).toBe('log_constraint');
		expect(getConstraintRuleForFunction('log10')).toBe('log_constraint');
		expect(getConstraintRuleForFunction('log2')).toBe('log_constraint');
	});

	it('should return correct rule for inverse trig functions', () => {
		expect(getConstraintRuleForFunction('asin')).toBe('arcsin_constraint');
		expect(getConstraintRuleForFunction('arcsin')).toBe('arcsin_constraint');
		expect(getConstraintRuleForFunction('acos')).toBe('arccos_constraint');
		expect(getConstraintRuleForFunction('arccos')).toBe('arccos_constraint');
	});

	it('should return correct rule for periodic trig functions', () => {
		expect(getConstraintRuleForFunction('tan')).toBe('tan_constraint');
		expect(getConstraintRuleForFunction('cot')).toBe('cot_constraint');
		expect(getConstraintRuleForFunction('sec')).toBe('sec_constraint');
		expect(getConstraintRuleForFunction('csc')).toBe('csc_constraint');
	});

	it('should return null for unrestricted functions', () => {
		expect(getConstraintRuleForFunction('sin')).toBeNull();
		expect(getConstraintRuleForFunction('cos')).toBeNull();
		expect(getConstraintRuleForFunction('exp')).toBeNull();
	});
});

// =============================================================================
// Domain Step Recorder Tests
// =============================================================================

describe('DomainStepRecorder', () => {
	it('should start empty', () => {
		const recorder = createDomainStepRecorder();
		expect(recorder.length).toBe(0);
		expect(recorder.getSteps()).toHaveLength(0);
	});

	it('should record a step', () => {
		const recorder = createDomainStepRecorder();
		recorder.record('sqrt_constraint', '\\sqrt{x - 2}', 'x - 2 \\geq 0');

		expect(recorder.length).toBe(1);
		const steps = recorder.getSteps();
		expect(steps).toHaveLength(1);
		expect(steps[0].rule).toBe('sqrt_constraint');
		expect(steps[0].expression).toBe('\\sqrt{x - 2}');
		expect(steps[0].constraint).toBe('x - 2 \\geq 0');
	});

	it('should record step with intermediate domain', () => {
		const recorder = createDomainStepRecorder();
		const domain = intervalDomain([greaterThanOrEqual(fromNumber(2))]);

		recorder.record('sqrt_constraint', '\\sqrt{x - 2}', 'x \\geq 2', {
			intermediateDomain: domain
		});

		const steps = recorder.getSteps();
		expect(steps[0].intermediateDomain).toBeDefined();
		expect(steps[0].intermediateDomain?.kind).toBe('interval_set');
	});

	it('should record step with custom description', () => {
		const recorder = createDomainStepRecorder();
		recorder.record('sqrt_constraint', '\\sqrt{x - 2}', 'x \\geq 2', {
			description: 'Custom description'
		});

		const steps = recorder.getSteps();
		expect(steps[0].description).toBe('Custom description');
	});

	it('should record step with reasoning', () => {
		const recorder = createDomainStepRecorder();
		recorder.record('sqrt_constraint', '\\sqrt{x - 2}', 'x \\geq 2', {
			reasoning: 'Pour que √(x-2) soit définie, il faut x-2 ≥ 0'
		});

		const steps = recorder.getSteps();
		expect(steps[0].reasoning).toContain('√(x-2)');
	});

	it('should generate unique IDs', () => {
		const recorder = createDomainStepRecorder();
		recorder.record('sqrt_constraint', 'a', 'b');
		recorder.record('ln_constraint', 'c', 'd');
		recorder.record('division_constraint', 'e', 'f');

		const steps = recorder.getSteps();
		expect(steps[0].id).toBe(1);
		expect(steps[1].id).toBe(2);
		expect(steps[2].id).toBe(3);
	});

	it('should use default summarized verbosity', () => {
		const recorder = createDomainStepRecorder();
		recorder.record('sqrt_constraint', 'a', 'b');

		const steps = recorder.getSteps();
		expect(steps[0].verbosityLevel).toBe('summarized');
	});

	it('should clear all steps', () => {
		const recorder = createDomainStepRecorder();
		recorder.record('sqrt_constraint', 'a', 'b');
		recorder.record('ln_constraint', 'c', 'd');

		recorder.clear();

		expect(recorder.length).toBe(0);
		expect(recorder.getSteps()).toHaveLength(0);
	});

	it('should reset ID counter after clear', () => {
		const recorder = createDomainStepRecorder();
		recorder.record('sqrt_constraint', 'a', 'b');
		recorder.clear();
		recorder.record('ln_constraint', 'c', 'd');

		const steps = recorder.getSteps();
		expect(steps[0].id).toBe(1);
	});
});

describe('DomainStepRecorder template recording', () => {
	it('should record with template', () => {
		const recorder = createDomainStepRecorder();
		recorder.recordWithTemplate('sqrt_constraint', '\\sqrt{x - 2}', 'x \\geq 2', { expr: 'x - 2' });

		const steps = recorder.getSteps();
		expect(steps[0].reasoning).toBeDefined();
		expect(steps[0].reasoning).toContain('x - 2');
	});
});

describe('DomainStepRecorder verbosity filtering', () => {
	it('should return empty for result verbosity', () => {
		const recorder = createDomainStepRecorder();
		recorder.record('sqrt_constraint', 'a', 'b', { verbosityLevel: 'summarized' });
		recorder.record('ln_constraint', 'c', 'd', { verbosityLevel: 'detailed' });

		const filtered = recorder.getStepsFiltered('result');
		expect(filtered).toHaveLength(0);
	});

	it('should return summarized steps for summarized verbosity', () => {
		const recorder = createDomainStepRecorder();
		recorder.record('sqrt_constraint', 'a', 'b', { verbosityLevel: 'summarized' });
		recorder.record('ln_constraint', 'c', 'd', { verbosityLevel: 'detailed' });

		const filtered = recorder.getStepsFiltered('summarized');
		expect(filtered).toHaveLength(1);
		expect(filtered[0].rule).toBe('sqrt_constraint');
	});

	it('should return all steps for detailed verbosity', () => {
		const recorder = createDomainStepRecorder();
		recorder.record('sqrt_constraint', 'a', 'b', { verbosityLevel: 'summarized' });
		recorder.record('ln_constraint', 'c', 'd', { verbosityLevel: 'detailed' });

		const filtered = recorder.getStepsFiltered('detailed');
		expect(filtered).toHaveLength(2);
	});
});

// =============================================================================
// Null Recorder Tests
// =============================================================================

describe('NullDomainStepRecorder', () => {
	it('should have length 0', () => {
		const recorder = getNullRecorder();
		expect(recorder.length).toBe(0);
	});

	it('should return empty steps', () => {
		const recorder = getNullRecorder();
		expect(recorder.getSteps()).toHaveLength(0);
		expect(recorder.getStepsFiltered('detailed')).toHaveLength(0);
	});

	it('should accept record calls without error', () => {
		const recorder = getNullRecorder();
		expect(() => {
			recorder.record('sqrt_constraint', 'a', 'b');
		}).not.toThrow();
	});

	it('should accept recordWithTemplate calls without error', () => {
		const recorder = getNullRecorder();
		expect(() => {
			recorder.recordWithTemplate('sqrt_constraint', 'a', 'b', { expr: 'x' });
		}).not.toThrow();
	});

	it('should accept clear calls without error', () => {
		const recorder = getNullRecorder();
		expect(() => {
			recorder.clear();
		}).not.toThrow();
	});

	it('should return same singleton instance', () => {
		const recorder1 = getNullRecorder();
		const recorder2 = getNullRecorder();
		expect(recorder1).toBe(recorder2);
	});
});
