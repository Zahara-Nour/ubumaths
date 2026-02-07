/**
 * Trigonometric identity transformations.
 *
 * This module is a thin wrapper around the declarative pattern rules defined in
 * `../pattern/rule-sets/trig-identities.ts`. All transformation logic has been
 * migrated to declarative pattern rules for better maintainability and composability.
 */

import type { MathNode } from '../types';
import type { Rule } from '../pattern/types';
import { applyRule, applyRulesWithSteps } from '../pattern/rule';
import {
	trigSimplifyRules,
	allTrigRules,
	trigDoubleAngleRules,
	trigPowerReductionRules,
	trigPythagoreanRules,
	trigQuotientRules,
	trigLinearizationRules,
	trigNegativeAngleRules,
	trigPeriodicRules,
	trigAdditionRules,
	trigDoubleAngleExpansionRules,
	trigCofunctionRules,
	trigSupplementaryRules,
	trigShiftPiOver2Rules,
	trigFactorizationRules,
	trigHalfAngleRules,
	trigHigherPowerRules
} from '../pattern/rule-sets/trig-identities';

/**
 * Result of a trigonometric transformation.
 * Maintains backward compatibility with the old identity-engine interface.
 */
export interface TrigTransformResult {
	readonly result: MathNode;
	readonly changed: boolean;
	readonly appliedRules: readonly string[];
}

/**
 * Converts a RuleApplicationResult to a TrigTransformResult.
 */
function toTransformResult(r: ReturnType<typeof applyRulesWithSteps>): TrigTransformResult {
	return {
		result: r.result,
		changed: r.changed,
		appliedRules: r.steps.map((s) => s.ruleName)
	};
}

/**
 * Finds a rule by name in the combined rule set.
 */
function ruleByName(name: string): Rule {
	const r = allTrigRules.find((r) => r.name === name);
	if (!r) throw new Error(`Unknown trig rule: ${name}`);
	return r;
}

/**
 * Wraps a single rule into a transform function.
 */
function wrapRule(name: string): (node: MathNode) => MathNode | null {
	const rule = ruleByName(name);
	return (node) => applyRule(rule, node);
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Applies all trigonometric simplification rules.
 * This is the main entry point for comprehensive trig simplification.
 *
 * @example
 * applyTrigIdentities(sin²(x)) → 1 - cos²(x)
 */
export function applyTrigIdentities(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigSimplifyRules, node));
}

/**
 * Contracts products of trig functions into double-angle forms.
 *
 * @example
 * contractToDoubleAngle(sin(x)cos(x)) → sin(2x)/2
 */
export function contractToDoubleAngle(node: MathNode): TrigTransformResult {
	return toTransformResult(
		applyRulesWithSteps([...trigDoubleAngleRules, ...trigPowerReductionRules], node)
	);
}

/**
 * Simplifies expressions using Pythagorean identities.
 *
 * @example
 * simplifyPythagorean(sin²(x) + cos²(x)) → 1
 */
export function simplifyPythagorean(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigPythagoreanRules, node));
}

/**
 * Simplifies quotients of trig functions (tan, cot, sec, csc).
 *
 * @example
 * simplifyQuotients(sin(x)/cos(x)) → tan(x)
 */
export function simplifyQuotients(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigQuotientRules, node));
}

/**
 * Linearizes products of trig functions using product-to-sum formulas.
 *
 * @example
 * linearize(sin(x)cos(y)) → (sin(x+y) + sin(x-y))/2
 */
export function linearize(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigLinearizationRules, node));
}

/**
 * Expands addition formulas.
 *
 * @example
 * expandAddition(sin(x + y)) → sin(x)cos(y) + cos(x)sin(y)
 */
export function expandAddition(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigAdditionRules, node));
}

/**
 * Expands double-angle formulas.
 *
 * @example
 * expandDoubleAngle(sin(2x)) → 2sin(x)cos(x)
 */
export function expandDoubleAngle(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigDoubleAngleExpansionRules, node));
}

/**
 * Simplifies negative angle expressions.
 *
 * @example
 * simplifyNegativeAngle(sin(-x)) → -sin(x)
 */
export function simplifyNegativeAngle(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigNegativeAngleRules, node));
}

/**
 * Simplifies cofunction identities (π/2 - x transformations).
 *
 * @example
 * simplifyCofunction(sin(π/2 - x)) → cos(x)
 */
export function simplifyCofunction(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigCofunctionRules, node));
}

/**
 * Simplifies supplementary angle identities (π - x transformations).
 *
 * @example
 * simplifySupplementary(sin(π - x)) → sin(x)
 */
export function simplifySupplementary(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigSupplementaryRules, node));
}

/**
 * Simplifies π/2 shift identities (x + π/2 transformations).
 *
 * @example
 * simplifyShiftPiOver2(sin(x + π/2)) → cos(x)
 */
export function simplifyShiftPiOver2(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigShiftPiOver2Rules, node));
}

/**
 * Factorizes sums/differences of trig functions using sum-to-product formulas.
 *
 * @example
 * factorize(sin(x) + sin(y)) → 2sin((x+y)/2)cos((x-y)/2)
 */
export function factorize(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigFactorizationRules, node));
}

/**
 * Reduces periodic expressions (2π and π shifts).
 *
 * @example
 * reducePeriodic(sin(x + 2π)) → sin(x)
 */
export function reducePeriodic(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigPeriodicRules, node));
}

/**
 * Expands half-angle formulas.
 *
 * @example
 * expandHalfAngle(sin(x/2)) → ±√((1 - cos(x))/2)
 */
export function expandHalfAngle(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigHalfAngleRules, node));
}

/**
 * Reduces higher powers of trig functions.
 *
 * @example
 * reduceHigherPowers(sin³(x)) → 3sin(x)/4 - sin(3x)/4
 */
export function reduceHigherPowers(node: MathNode): TrigTransformResult {
	return toTransformResult(applyRulesWithSteps(trigHigherPowerRules, node));
}

// ============================================================================
// Individual Transform Exports (backward compatibility)
// ============================================================================

export const TRANSFORM_SIN_COS_PRODUCT = wrapRule('sin-cos-product');
export const TRANSFORM_DOUBLE_ANGLE_SIN = wrapRule('double-angle-sin');
export const TRANSFORM_SIN_SQUARED = wrapRule('sin-squared');
export const TRANSFORM_COS_SQUARED = wrapRule('cos-squared');
export const TRANSFORM_PYTHAGOREAN = wrapRule('pythagorean');
export const TRANSFORM_ONE_MINUS_SIN_SQUARED = wrapRule('one-minus-sin-squared');
export const TRANSFORM_ONE_MINUS_COS_SQUARED = wrapRule('one-minus-cos-squared');
export const TRANSFORM_TAN_SQUARED_PLUS_ONE = wrapRule('tan-squared-plus-one');
export const TRANSFORM_SEC_SQUARED_MINUS_ONE = wrapRule('sec-squared-minus-one');
export const TRANSFORM_COT_SQUARED_PLUS_ONE = wrapRule('cot-squared-plus-one');
export const TRANSFORM_CSC_SQUARED_MINUS_ONE = wrapRule('csc-squared-minus-one');
export const TRANSFORM_SIN_OVER_COS = wrapRule('sin-over-cos');
export const TRANSFORM_COS_OVER_SIN = wrapRule('cos-over-sin');
export const TRANSFORM_ONE_OVER_COS = wrapRule('one-over-cos');
export const TRANSFORM_ONE_OVER_SIN = wrapRule('one-over-sin');
export const TRANSFORM_COS_COS_PRODUCT = wrapRule('cos-cos-product');
export const TRANSFORM_SIN_SIN_PRODUCT = wrapRule('sin-sin-product');
export const TRANSFORM_SIN_COS_DIFFERENT = wrapRule('sin-cos-different');
export const TRANSFORM_COS_SUM = wrapRule('cos-sum');
export const TRANSFORM_COS_DIFFERENCE = wrapRule('cos-difference');
export const TRANSFORM_SIN_SUM = wrapRule('sin-sum');
export const TRANSFORM_SIN_DIFFERENCE = wrapRule('sin-difference');
export const TRANSFORM_TAN_SUM = wrapRule('tan-sum');
export const TRANSFORM_TAN_DIFFERENCE = wrapRule('tan-difference');
export const TRANSFORM_EXPAND_DOUBLE_SIN = wrapRule('expand-double-sin');
export const TRANSFORM_EXPAND_DOUBLE_COS = wrapRule('expand-double-cos');
export const TRANSFORM_EXPAND_DOUBLE_TAN = wrapRule('expand-double-tan');
export const TRANSFORM_SIN_NEGATIVE = wrapRule('sin-negative');
export const TRANSFORM_COS_NEGATIVE = wrapRule('cos-negative');
export const TRANSFORM_TAN_NEGATIVE = wrapRule('tan-negative');
export const TRANSFORM_SIN_COFUNCTION = wrapRule('sin-cofunction');
export const TRANSFORM_COS_COFUNCTION = wrapRule('cos-cofunction');
export const TRANSFORM_TAN_COFUNCTION = wrapRule('tan-cofunction');
export const TRANSFORM_SIN_SUPPLEMENTARY = wrapRule('sin-supplementary');
export const TRANSFORM_COS_SUPPLEMENTARY = wrapRule('cos-supplementary');
export const TRANSFORM_TAN_SUPPLEMENTARY = wrapRule('tan-supplementary');
export const TRANSFORM_SIN_PLUS_PI_OVER_2 = wrapRule('sin-plus-pi-over-2');
export const TRANSFORM_COS_PLUS_PI_OVER_2 = wrapRule('cos-plus-pi-over-2');
export const TRANSFORM_TAN_PLUS_PI_OVER_2 = wrapRule('tan-plus-pi-over-2');
export const TRANSFORM_SIN_PLUS_SIN = wrapRule('sin-plus-sin');
export const TRANSFORM_SIN_MINUS_SIN = wrapRule('sin-minus-sin');
export const TRANSFORM_COS_PLUS_COS = wrapRule('cos-plus-cos');
export const TRANSFORM_COS_MINUS_COS = wrapRule('cos-minus-cos');
export const TRANSFORM_SIN_PERIOD_2PI = wrapRule('sin-period-2pi');
export const TRANSFORM_COS_PERIOD_2PI = wrapRule('cos-period-2pi');
export const TRANSFORM_SIN_PLUS_PI = wrapRule('sin-plus-pi');
export const TRANSFORM_COS_PLUS_PI = wrapRule('cos-plus-pi');
export const TRANSFORM_SIN_HALF_ANGLE = wrapRule('sin-half-angle');
export const TRANSFORM_COS_HALF_ANGLE = wrapRule('cos-half-angle');
export const TRANSFORM_TAN_HALF_ANGLE = wrapRule('tan-half-angle');
export const TRANSFORM_SIN_CUBED = wrapRule('sin-cubed');
export const TRANSFORM_COS_CUBED = wrapRule('cos-cubed');
export const TRANSFORM_SIN_FOURTH = wrapRule('sin-fourth');
export const TRANSFORM_COS_FOURTH = wrapRule('cos-fourth');
