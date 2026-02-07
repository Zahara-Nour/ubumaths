/**
 * Algebraic Identities Module
 *
 * Thin wrapper around pattern-based algebraic identity rules.
 * Provides backward-compatible API and individual transform exports.
 *
 * Uses the pattern matching system for structural detection,
 * with fallback to analysis/structures.ts for numeric cases.
 *
 * @module mathAST/transform/algebraic-identities
 */

import type { MathNode } from '../types';
import type { Rule, RuleApplicationResult } from '../pattern/types';
import { applyRulesWithSteps, applyRule } from '../pattern/rule';
import {
	algebraicFactoringRules,
	algebraicExpandingRules,
	algebraicSimplifyRules
} from '../pattern/rule-sets/algebraic-identities';

// =============================================================================
// Types
// =============================================================================

/** Result of applying algebraic identity transformations */
export interface AlgebraicTransformResult {
	readonly result: MathNode;
	readonly changed: boolean;
	readonly appliedRules: readonly string[];
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert RuleApplicationResult to AlgebraicTransformResult
 */
function toTransformResult(r: RuleApplicationResult): AlgebraicTransformResult {
	return {
		result: r.result,
		changed: r.changed,
		appliedRules: r.steps.map((s) => s.ruleName)
	};
}

/**
 * Find a rule by name from all algebraic rules
 */
const allAlgebraicRules: Rule[] = [...algebraicFactoringRules, ...algebraicExpandingRules];

function ruleByName(name: string): Rule {
	const rule = allAlgebraicRules.find((r) => r.name === name);
	if (!rule) throw new Error(`Unknown algebraic rule: ${name}`);
	return rule;
}

/**
 * Wrap a single rule into a transform function
 */
function wrapRule(name: string): (node: MathNode) => MathNode | null {
	const rule = ruleByName(name);
	return (node) => applyRule(rule, node);
}

/**
 * Wrap multiple rules into a transform function (tries each until one succeeds)
 * Used for symbolic + numeric fallback patterns (diff-squares, sum/diff-cubes)
 */
function wrapRules(...names: string[]): (node: MathNode) => MathNode | null {
	const rules = names.map((n) => ruleByName(n));
	return (node) => {
		for (const rule of rules) {
			const result = applyRule(rule, node);
			if (result !== null) return result;
		}
		return null;
	};
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Factor algebraic expressions using remarkable identities.
 *
 * Examples:
 * - a² - b² → (a+b)(a-b)
 * - x² - 4 → (x+2)(x-2)
 * - a² + 2ab + b² → (a+b)²
 * - x² + 6x + 9 → (x+3)²
 * - a³ + b³ → (a+b)(a² - ab + b²)
 * - a³ - b³ → (a-b)(a² + ab + b²)
 *
 * @param node - The expression to factor
 * @returns Transformation result
 */
export function factorAlgebraic(node: MathNode): AlgebraicTransformResult {
	return toTransformResult(applyRulesWithSteps(algebraicFactoringRules, node));
}

/**
 * Expand algebraic expressions using remarkable identities.
 *
 * Examples:
 * - (a+b)(a-b) → a² - b²
 * - (a+b)² → a² + 2ab + b²
 * - (a-b)² → a² - 2ab + b²
 *
 * @param node - The expression to expand
 * @returns Transformation result
 */
export function expandAlgebraic(node: MathNode): AlgebraicTransformResult {
	return toTransformResult(applyRulesWithSteps(algebraicExpandingRules, node));
}

/**
 * Apply algebraic identity transforms (factoring by default).
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function applyAlgebraicIdentities(node: MathNode): AlgebraicTransformResult {
	return toTransformResult(applyRulesWithSteps(algebraicSimplifyRules, node));
}

// =============================================================================
// Individual Transform Exports (for backward compatibility)
// =============================================================================

/**
 * a² - b² → (a+b)(a-b)
 * Also handles numeric cases like x² - 4 → (x+2)(x-2)
 */
export const TRANSFORM_DIFF_SQUARES_TO_PRODUCT = wrapRules(
	'diff-squares-symbolic',
	'diff-squares-numeric'
);

/**
 * a² + 2ab + b² → (a+b)²
 * a² - 2ab + b² → (a-b)²
 * Also handles numeric cases like x² + 6x + 9 → (x+3)²
 */
export const TRANSFORM_PERFECT_SQUARE_TRINOMIAL = wrapRule('perfect-square-trinomial');

/**
 * a³ + b³ → (a+b)(a² - ab + b²)
 * Also handles numeric cases like x³ + 8 → (x+2)(x² - 2x + 4)
 */
export const TRANSFORM_SUM_CUBES_TO_PRODUCT = wrapRules('sum-cubes-symbolic', 'sum-cubes-numeric');

/**
 * a³ - b³ → (a-b)(a² + ab + b²)
 * Also handles numeric cases like x³ - 27 → (x-3)(x² + 3x + 9)
 */
export const TRANSFORM_DIFF_CUBES_TO_PRODUCT = wrapRules(
	'diff-cubes-symbolic',
	'diff-cubes-numeric'
);

/**
 * (a+b)(a-b) → a² - b²
 */
export const TRANSFORM_PRODUCT_TO_DIFF_SQUARES = wrapRule('product-to-diff-squares');

/**
 * (a+b)² → a² + 2ab + b²
 */
export const TRANSFORM_EXPAND_SUM_SQUARED = wrapRule('expand-sum-squared');

/**
 * (a-b)² → a² - 2ab + b²
 */
export const TRANSFORM_EXPAND_DIFF_SQUARED = wrapRule('expand-diff-squared');
