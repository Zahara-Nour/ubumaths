/**
 * Tests for the shared identity transform engine
 */

import { describe, it, expect } from 'vitest';
import type { MathNode } from '../../types';
import {
	applyTransformsToNode,
	applyTransformsDeep,
	applyIdentityTransforms,
	getBinding,
	type TransformRule
} from '../identity-engine';
import { number, add, subtract, multiply, variable } from '../../factory';

// =============================================================================
// Test helpers
// =============================================================================

/** Simple rule: number 1 -> number 0 */
const RULE_ONE_TO_ZERO: TransformRule = {
	name: 'one-to-zero',
	transform: (node) =>
		node.type === 'number' && (node as { value: string }).value === '1' ? number('0') : null
};

/** Simple rule: number 2 -> number 3 */
const RULE_TWO_TO_THREE: TransformRule = {
	name: 'two-to-three',
	transform: (node) =>
		node.type === 'number' && (node as { value: string }).value === '2' ? number('3') : null
};

/** Rule that replaces x + y -> x * y */
const RULE_ADD_TO_MUL: TransformRule = {
	name: 'add-to-mul',
	transform: (node) => {
		if (node.type === 'addition') {
			const addNode = node as { left: MathNode; right: MathNode };
			return multiply(addNode.left, addNode.right, 'implicit');
		}
		return null;
	}
};

/** Rule that never matches */
const RULE_NEVER: TransformRule = {
	name: 'never-matches',
	transform: () => null
};

/** Chain rule: 0 -> 42 (for testing iteration) */
const RULE_ZERO_TO_42: TransformRule = {
	name: 'zero-to-42',
	transform: (node) =>
		node.type === 'number' && (node as { value: string }).value === '0' ? number('42') : null
};

// =============================================================================
// getBinding
// =============================================================================

describe('getBinding', () => {
	it('returns MathNode from bindings', () => {
		const bindings = new Map();
		const node = number('5');
		bindings.set('x', node);
		expect(getBinding(bindings, 'x')).toBe(node);
	});

	it('returns null for missing binding', () => {
		const bindings = new Map();
		expect(getBinding(bindings, 'x')).toBeNull();
	});

	it('returns null for sequence binding', () => {
		const bindings = new Map();
		bindings.set('x', { kind: 'sum-sequence', terms: [] });
		expect(getBinding(bindings, 'x')).toBeNull();
	});
});

// =============================================================================
// applyTransformsToNode
// =============================================================================

describe('applyTransformsToNode', () => {
	it('applies first matching rule', () => {
		const node = number('1');
		const { result, applied } = applyTransformsToNode(node, [RULE_ONE_TO_ZERO]);
		expect(result).toEqual(number('0'));
		expect(applied).toBe('one-to-zero');
	});

	it('returns original node when no rules match', () => {
		const node = number('5');
		const { result, applied } = applyTransformsToNode(node, [RULE_ONE_TO_ZERO]);
		expect(result).toBe(node);
		expect(applied).toBeNull();
	});

	it('applies first matching rule in order', () => {
		const node = number('1');
		const { result, applied } = applyTransformsToNode(node, [RULE_NEVER, RULE_ONE_TO_ZERO]);
		expect(result).toEqual(number('0'));
		expect(applied).toBe('one-to-zero');
	});

	it('handles empty transform list', () => {
		const node = number('1');
		const { result, applied } = applyTransformsToNode(node, []);
		expect(result).toBe(node);
		expect(applied).toBeNull();
	});
});

// =============================================================================
// applyTransformsDeep
// =============================================================================

describe('applyTransformsDeep', () => {
	it('transforms nested nodes bottom-up', () => {
		// 1 + 2 -> 0 + 3 (both leaves transformed)
		const node = add(number('1'), number('2'));
		const { result, appliedRules } = applyTransformsDeep(node, [
			RULE_ONE_TO_ZERO,
			RULE_TWO_TO_THREE
		]);
		expect(result).toEqual(add(number('0'), number('3')));
		expect(appliedRules.has('one-to-zero')).toBe(true);
		expect(appliedRules.has('two-to-three')).toBe(true);
	});

	it('transforms deeply nested nodes', () => {
		// (1 + x) - y -> (0 + x) - y
		const node = subtract(add(number('1'), variable('x')), variable('y'));
		const { result, appliedRules } = applyTransformsDeep(node, [RULE_ONE_TO_ZERO]);
		expect(result).toEqual(subtract(add(number('0'), variable('x')), variable('y')));
		expect(appliedRules.size).toBe(1);
	});

	it('returns empty appliedRules when nothing matches', () => {
		const node = variable('x');
		const { result, appliedRules } = applyTransformsDeep(node, [RULE_ONE_TO_ZERO]);
		expect(result).toEqual(variable('x'));
		expect(appliedRules.size).toBe(0);
	});

	it('applies parent transform after children', () => {
		// x + y -> x * y (addition at root is transformed)
		const node = add(variable('x'), variable('y'));
		const { result, appliedRules } = applyTransformsDeep(node, [RULE_ADD_TO_MUL]);
		expect(result.type).toBe('multiplication');
		expect(appliedRules.has('add-to-mul')).toBe(true);
	});
});

// =============================================================================
// applyIdentityTransforms
// =============================================================================

describe('applyIdentityTransforms', () => {
	it('applies transforms and reports changed=true', () => {
		const node = number('1');
		const result = applyIdentityTransforms(node, [RULE_ONE_TO_ZERO]);
		expect(result.result).toEqual(number('0'));
		expect(result.changed).toBe(true);
		expect(result.appliedRules).toContain('one-to-zero');
	});

	it('reports changed=false when no transforms match', () => {
		const node = variable('x');
		const result = applyIdentityTransforms(node, [RULE_ONE_TO_ZERO]);
		expect(result.changed).toBe(false);
		expect(result.appliedRules).toHaveLength(0);
	});

	it('iterates until fixed point', () => {
		// 1 -> 0 -> 42 (chain of two rules, needs 2 iterations)
		const node = number('1');
		const result = applyIdentityTransforms(node, [RULE_ONE_TO_ZERO, RULE_ZERO_TO_42]);
		expect(result.result).toEqual(number('42'));
		expect(result.changed).toBe(true);
		expect(result.appliedRules).toContain('one-to-zero');
		expect(result.appliedRules).toContain('zero-to-42');
	});

	it('respects maxIterations', () => {
		// Rule that always changes: n -> n+1 (looping)
		const loopRule: TransformRule = {
			name: 'loop',
			transform: (node) => {
				if (node.type === 'number') {
					const val = parseInt((node as { value: string }).value);
					return number(String(val + 1));
				}
				return null;
			}
		};

		const node = number('0');
		const result = applyIdentityTransforms(node, [loopRule], 3);
		// Should stop after 3 iterations
		expect(result.changed).toBe(true);
		expect(result.appliedRules).toContain('loop');
		// The result should reflect 3 iterations
		expect((result.result as { value: string }).value).toBe('3');
	});

	it('collects all applied rule names', () => {
		const node = add(number('1'), number('2'));
		const result = applyIdentityTransforms(node, [RULE_ONE_TO_ZERO, RULE_TWO_TO_THREE]);
		expect(result.appliedRules).toContain('one-to-zero');
		expect(result.appliedRules).toContain('two-to-three');
	});

	it('handles empty transform list', () => {
		const node = number('1');
		const result = applyIdentityTransforms(node, []);
		expect(result.result).toBe(node);
		expect(result.changed).toBe(false);
		expect(result.appliedRules).toHaveLength(0);
	});

	it('transforms nested expressions', () => {
		// (1 + 2) with both rules -> (0 + 3)
		const node = add(number('1'), number('2'));
		const result = applyIdentityTransforms(node, [RULE_ONE_TO_ZERO, RULE_TWO_TO_THREE]);
		expect(result.result).toEqual(add(number('0'), number('3')));
		expect(result.changed).toBe(true);
	});
});
