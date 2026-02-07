/**
 * Hyperbolic Identities Module
 *
 * Thin wrapper around declarative pattern rules for hyperbolic identity transformations.
 * All pattern matching and transform logic is implemented in the rule-sets module.
 *
 * @module mathAST/transform/hyperbolic-identities
 */

import type { MathNode } from '../types';
import type { Rule, RuleApplicationResult } from '../pattern/types';
import { applyRulesWithSteps, applyRule } from '../pattern/rule';
import {
	allHyperbolicRules,
	hypSimplifyRules,
	hypDoubleAngleRules,
	hypPowerReductionRules,
	hypPythagoreanRules,
	hypQuotientRules,
	hypLinearizationRules,
	hypAdditionRules,
	hypDoubleAngleExpansionRules,
	hypNegativeArgumentRules,
	hypFactorizationRules,
	hypHalfAngleRules,
	hypHigherPowerRules
} from '../pattern/rule-sets/hyperbolic-identities';

// =============================================================================
// Types
// =============================================================================

/** Result of applying hyperbolic identity transformations */
export interface HyperbolicTransformResult {
	readonly result: MathNode;
	readonly changed: boolean;
	readonly appliedRules: readonly string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert RuleApplicationResult to HyperbolicTransformResult
 */
function toTransformResult(r: RuleApplicationResult): HyperbolicTransformResult {
	return {
		result: r.result,
		changed: r.changed,
		appliedRules: r.steps.map((s) => s.ruleName)
	};
}

/**
 * Find a rule by name in the global hyperbolic rule set
 */
function ruleByName(name: string): Rule {
	const r = allHyperbolicRules.find((rule) => rule.name === name);
	if (!r) throw new Error(`Unknown hyperbolic rule: ${name}`);
	return r;
}

/**
 * Wrap a single rule as a transform function
 */
function wrapRule(name: string): (node: MathNode) => MathNode | null {
	const rule = ruleByName(name);
	return (node) => applyRule(rule, node);
}

// =============================================================================
// Public API Functions
// =============================================================================

/**
 * Apply all hyperbolic identity transforms to an expression.
 *
 * Default transforms exclude inverse operations (addition formulas, expansions, etc.)
 * to avoid transformation loops.
 *
 * @param node - The expression to transform
 * @returns Transformation result with applied rules
 */
export function applyHyperbolicIdentities(node: MathNode): HyperbolicTransformResult {
	return toTransformResult(applyRulesWithSteps(hypSimplifyRules, node));
}

/**
 * Contract products and powers to double-angle form.
 *
 * Examples:
 * - sinh(x) * cosh(x) -> sinh(2x) / 2
 * - sinh²(x) -> (cosh(2x) - 1) / 2
 * - cosh²(x) -> (cosh(2x) + 1) / 2
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function contractToDoubleAngleH(node: MathNode): HyperbolicTransformResult {
	return toTransformResult(
		applyRulesWithSteps([...hypDoubleAngleRules, ...hypPowerReductionRules], node)
	);
}

/**
 * Simplify using hyperbolic Pythagorean identities.
 *
 * Examples:
 * - cosh²(x) - sinh²(x) -> 1
 * - 1 + sinh²(x) -> cosh²(x)
 * - cosh²(x) - 1 -> sinh²(x)
 * - 1 - tanh²(x) -> sech²(x)
 * - coth²(x) - 1 -> csch²(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyHyperbolicPythagorean(node: MathNode): HyperbolicTransformResult {
	return toTransformResult(applyRulesWithSteps(hypPythagoreanRules, node));
}

/**
 * Convert ratios to tanh/coth/sech/csch.
 *
 * Examples:
 * - sinh(x) / cosh(x) -> tanh(x)
 * - cosh(x) / sinh(x) -> coth(x)
 * - 1 / cosh(x) -> sech(x)
 * - 1 / sinh(x) -> csch(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyHyperbolicQuotients(node: MathNode): HyperbolicTransformResult {
	return toTransformResult(applyRulesWithSteps(hypQuotientRules, node));
}

/**
 * Linearize products of hyperbolic functions (product-to-sum formulas).
 *
 * Examples:
 * - cosh(a) * cosh(b) -> (cosh(a+b) + cosh(a-b)) / 2
 * - sinh(a) * sinh(b) -> (cosh(a+b) - cosh(a-b)) / 2
 * - sinh(a) * cosh(b) -> (sinh(a+b) + sinh(a-b)) / 2
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function linearizeH(node: MathNode): HyperbolicTransformResult {
	return toTransformResult(applyRulesWithSteps(hypLinearizationRules, node));
}

/**
 * Expand argument sums and differences (addition formulas).
 *
 * Examples:
 * - cosh(a + b) -> cosh(a)cosh(b) + sinh(a)sinh(b)
 * - sinh(a + b) -> sinh(a)cosh(b) + cosh(a)sinh(b)
 * - tanh(a + b) -> (tanh(a) + tanh(b)) / (1 + tanh(a)tanh(b))
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function expandAdditionH(node: MathNode): HyperbolicTransformResult {
	return toTransformResult(applyRulesWithSteps(hypAdditionRules, node));
}

/**
 * Expand double arguments to single argument expressions.
 *
 * Examples:
 * - sinh(2x) -> 2sinh(x)cosh(x)
 * - cosh(2x) -> cosh²(x) + sinh²(x)
 * - tanh(2x) -> 2tanh(x) / (1 + tanh²(x))
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function expandDoubleAngleH(node: MathNode): HyperbolicTransformResult {
	return toTransformResult(applyRulesWithSteps(hypDoubleAngleExpansionRules, node));
}

/**
 * Simplify negative argument expressions.
 *
 * Examples:
 * - sinh(-x) -> -sinh(x)
 * - cosh(-x) -> cosh(x)
 * - tanh(-x) -> -tanh(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyNegativeArgumentH(node: MathNode): HyperbolicTransformResult {
	return toTransformResult(applyRulesWithSteps(hypNegativeArgumentRules, node));
}

/**
 * Factorize sums/differences of hyperbolic functions (sum-to-product formulas).
 *
 * Examples:
 * - sinh(a) + sinh(b) -> 2sinh((a+b)/2)cosh((a-b)/2)
 * - cosh(a) - cosh(b) -> 2sinh((a+b)/2)sinh((a-b)/2)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function factorizeH(node: MathNode): HyperbolicTransformResult {
	return toTransformResult(applyRulesWithSteps(hypFactorizationRules, node));
}

/**
 * Expand half-argument expressions.
 *
 * Examples:
 * - sinh(x/2) -> √((cosh(x) - 1)/2)
 * - cosh(x/2) -> √((cosh(x) + 1)/2)
 * - tanh(x/2) -> sinh(x) / (1 + cosh(x))
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function expandHalfAngleH(node: MathNode): HyperbolicTransformResult {
	return toTransformResult(applyRulesWithSteps(hypHalfAngleRules, node));
}

/**
 * Reduce higher powers of hyperbolic functions.
 *
 * Examples:
 * - sinh³(x) -> (sinh(3x) - 3sinh(x)) / 4
 * - cosh³(x) -> (cosh(3x) + 3cosh(x)) / 4
 * - sinh⁴(x) -> (3 - 4cosh(2x) + cosh(4x)) / 8
 * - cosh⁴(x) -> (3 + 4cosh(2x) + cosh(4x)) / 8
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function reduceHigherPowersH(node: MathNode): HyperbolicTransformResult {
	return toTransformResult(applyRulesWithSteps(hypHigherPowerRules, node));
}

// =============================================================================
// Individual Transform Exports (for testing and direct use)
// =============================================================================

// Double angle
export const TRANSFORM_SINH_COSH_PRODUCT = wrapRule('sinh-cosh-product');
export const TRANSFORM_DOUBLE_ANGLE_SINH = wrapRule('double-angle-sinh');

// Power reduction
export const TRANSFORM_SINH_SQUARED = wrapRule('sinh-squared');
export const TRANSFORM_COSH_SQUARED = wrapRule('cosh-squared');

// Pythagorean
export const TRANSFORM_HYPERBOLIC_PYTHAGOREAN = wrapRule('hyperbolic-pythagorean');
export const TRANSFORM_ONE_PLUS_SINH_SQUARED = wrapRule('one-plus-sinh-squared');
export const TRANSFORM_COSH_SQUARED_MINUS_ONE = wrapRule('cosh-squared-minus-one');
export const TRANSFORM_ONE_MINUS_TANH_SQUARED = wrapRule('one-minus-tanh-squared');
export const TRANSFORM_SECH_TANH_PYTHAGOREAN = wrapRule('sech-tanh-pythagorean');
export const TRANSFORM_COTH_SQUARED_MINUS_ONE = wrapRule('coth-squared-minus-one');
export const TRANSFORM_COTH_CSCH_PYTHAGOREAN = wrapRule('coth-csch-pythagorean');
export const TRANSFORM_ONE_PLUS_CSCH_SQUARED = wrapRule('one-plus-csch-squared');

// Quotients
export const TRANSFORM_SINH_OVER_COSH = wrapRule('sinh-over-cosh');
export const TRANSFORM_COSH_OVER_SINH = wrapRule('cosh-over-sinh');
export const TRANSFORM_ONE_OVER_COSH = wrapRule('one-over-cosh');
export const TRANSFORM_ONE_OVER_SINH = wrapRule('one-over-sinh');

// Linearization
export const TRANSFORM_COSH_COSH_PRODUCT = wrapRule('cosh-cosh-product');
export const TRANSFORM_SINH_SINH_PRODUCT = wrapRule('sinh-sinh-product');
export const TRANSFORM_SINH_COSH_DIFFERENT = wrapRule('sinh-cosh-different');

// Addition formulas
export const TRANSFORM_COSH_SUM = wrapRule('cosh-sum');
export const TRANSFORM_COSH_DIFFERENCE = wrapRule('cosh-difference');
export const TRANSFORM_SINH_SUM = wrapRule('sinh-sum');
export const TRANSFORM_SINH_DIFFERENCE = wrapRule('sinh-difference');
export const TRANSFORM_TANH_SUM = wrapRule('tanh-sum');
export const TRANSFORM_TANH_DIFFERENCE = wrapRule('tanh-difference');

// Double angle expansion
export const TRANSFORM_EXPAND_DOUBLE_SINH = wrapRule('expand-double-sinh');
export const TRANSFORM_EXPAND_DOUBLE_COSH = wrapRule('expand-double-cosh');
export const TRANSFORM_EXPAND_DOUBLE_TANH = wrapRule('expand-double-tanh');

// Negative argument
export const TRANSFORM_SINH_NEGATIVE = wrapRule('sinh-negative');
export const TRANSFORM_COSH_NEGATIVE = wrapRule('cosh-negative');
export const TRANSFORM_TANH_NEGATIVE = wrapRule('tanh-negative');

// Factorization
export const TRANSFORM_SINH_PLUS_SINH = wrapRule('sinh-plus-sinh');
export const TRANSFORM_SINH_MINUS_SINH = wrapRule('sinh-minus-sinh');
export const TRANSFORM_COSH_PLUS_COSH = wrapRule('cosh-plus-cosh');
export const TRANSFORM_COSH_MINUS_COSH = wrapRule('cosh-minus-cosh');

// Half angle
export const TRANSFORM_SINH_HALF_ANGLE = wrapRule('sinh-half-angle');
export const TRANSFORM_COSH_HALF_ANGLE = wrapRule('cosh-half-angle');
export const TRANSFORM_TANH_HALF_ANGLE = wrapRule('tanh-half-angle');

// Higher powers
export const TRANSFORM_SINH_CUBED = wrapRule('sinh-cubed');
export const TRANSFORM_COSH_CUBED = wrapRule('cosh-cubed');
export const TRANSFORM_SINH_FOURTH = wrapRule('sinh-fourth');
export const TRANSFORM_COSH_FOURTH = wrapRule('cosh-fourth');
