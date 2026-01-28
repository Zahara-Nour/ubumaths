/**
 * Identity Transform Engine
 *
 * Shared infrastructure for applying identity-based transformations.
 * Used by trig-identities, hyperbolic-identities, and algebraic-identities.
 *
 * @module mathAST/transform/identity-engine
 */

import type { MathNode } from '../types';
import type { MatchBindings } from '../pattern/types';
import { isMathNodeBinding } from '../pattern/types';
import { mapNode } from '../transforms';

// =============================================================================
// Types
// =============================================================================

/**
 * A transformation rule with name and transform function.
 */
export interface TransformRule {
	readonly name: string;
	readonly transform: (node: MathNode) => MathNode | null;
}

/**
 * Result of applying identity transformations.
 */
export interface TransformResult {
	/** The transformed expression */
	readonly result: MathNode;
	/** Whether any transformation was applied */
	readonly changed: boolean;
	/** Names of rules that were applied */
	readonly appliedRules: readonly string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract MathNode from pattern match bindings safely.
 */
export function getBinding(bindings: MatchBindings, name: string): MathNode | null {
	const value = bindings.get(name);
	if (value && isMathNodeBinding(value)) return value;
	return null;
}

// =============================================================================
// Application Functions
// =============================================================================

/**
 * Apply transforms to a single node (not recursive).
 * Returns the first matching transform's result, or the original node.
 */
export function applyTransformsToNode(
	node: MathNode,
	transforms: readonly TransformRule[]
): { result: MathNode; applied: string | null } {
	for (const rule of transforms) {
		const result = rule.transform(node);
		if (result !== null) {
			return { result, applied: rule.name };
		}
	}
	return { result: node, applied: null };
}

/**
 * Apply transforms recursively to all subexpressions (single pass, bottom-up).
 */
export function applyTransformsDeep(
	node: MathNode,
	transforms: readonly TransformRule[]
): { result: MathNode; appliedRules: Set<string> } {
	const appliedRules = new Set<string>();

	// mapNode handles recursion bottom-up (children first, then parent)
	const result = mapNode(node, (n) => {
		const { result: transformed, applied } = applyTransformsToNode(n, transforms);
		if (applied) {
			appliedRules.add(applied);
		}
		return transformed;
	});

	return { result, appliedRules };
}

/**
 * Apply identity transforms to an expression with fixed-point iteration.
 *
 * Applies transforms bottom-up repeatedly until no more changes occur
 * or maxIterations is reached.
 *
 * @param node - The expression to transform
 * @param transforms - The transforms to apply
 * @param maxIterations - Maximum iteration count (default 10)
 * @returns Transformation result with applied rules
 */
export function applyIdentityTransforms(
	node: MathNode,
	transforms: readonly TransformRule[],
	maxIterations = 10
): TransformResult {
	let current = node;
	const allAppliedRules = new Set<string>();
	let changed = false;

	for (let i = 0; i < maxIterations; i++) {
		const { result, appliedRules } = applyTransformsDeep(current, transforms);

		if (appliedRules.size === 0) {
			break;
		}

		appliedRules.forEach((rule) => allAppliedRules.add(rule));
		current = result;
		changed = true;
	}

	return {
		result: current,
		changed,
		appliedRules: Array.from(allAppliedRules)
	};
}
