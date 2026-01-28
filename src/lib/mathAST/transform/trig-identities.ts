/**
 * Trigonometric Identities Module
 *
 * Provides transformation functions for trigonometric identities.
 * Uses direct AST matching to handle the specific structure of function nodes.
 *
 * @module mathAST/transform/trig-identities
 */

import type { MathNode, FunctionNode } from '../types';
import {
	isFunction,
	isMultiplication,
	isAddition,
	isSubtraction,
	isDivision,
	isNumber
} from '../guards';
import { number, sin, cos, tan, multiply, divide, add, subtract, superscript } from '../factory';
import { mapNode } from '../transforms';
import { nodesEqual } from '../pattern/match';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of applying trig identity transformations
 */
export interface TrigTransformResult {
	/** The transformed expression */
	readonly result: MathNode;
	/** Whether any transformation was applied */
	readonly changed: boolean;
	/** Names of rules that were applied */
	readonly appliedRules: readonly string[];
}

/**
 * A transformation rule with name and transform function
 */
interface TrigRule {
	readonly name: string;
	readonly transform: (node: MathNode) => MathNode | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a node is a trig function with a specific name
 */
function isTrigFunc(node: MathNode, name: string): node is FunctionNode {
	return isFunction(node) && node.name === name && node.args.length === 1;
}

/**
 * Check if a function node has a power of 2
 */
function hasPowerOf2(node: FunctionNode): boolean {
	return node.power !== undefined && isNumber(node.power) && node.power.value === '2';
}

/**
 * Get the argument of a single-argument function
 */
function getArg(node: FunctionNode): MathNode {
	return node.args[0];
}

/**
 * Double an expression: a -> 2a
 */
function doubleArg(node: MathNode): MathNode {
	return multiply(number('2'), node, 'implicit');
}

/**
 * Halve an expression: a -> a/2
 */
function halveExpr(node: MathNode): MathNode {
	return divide(node, number('2'), 'fraction');
}

// =============================================================================
// Transform Functions
// =============================================================================

/**
 * sin(a) * cos(a) -> sin(2a) / 2
 * Also handles cos(a) * sin(a)
 */
function transformSinCosProduct(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;

	// Check sin(a) * cos(a)
	if (isTrigFunc(node.left, 'sin') && isTrigFunc(node.right, 'cos')) {
		const sinArg = getArg(node.left);
		const cosArg = getArg(node.right);
		if (nodesEqual(sinArg, cosArg)) {
			return halveExpr(sin(doubleArg(sinArg)));
		}
	}

	// Check cos(a) * sin(a)
	if (isTrigFunc(node.left, 'cos') && isTrigFunc(node.right, 'sin')) {
		const cosArg = getArg(node.left);
		const sinArg = getArg(node.right);
		if (nodesEqual(cosArg, sinArg)) {
			return halveExpr(sin(doubleArg(sinArg)));
		}
	}

	return null;
}

/**
 * 2 * sin(a) * cos(a) -> sin(2a)
 * Handles various orderings
 */
function transformDoubleAngleSin(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;

	// Pattern: 2 * (sin(a) * cos(a)) or (2 * sin(a)) * cos(a) etc.
	// We need to find: coefficient 2, sin(a), cos(a) with same argument

	// Helper to extract coefficient and remaining factors
	function extractFactors(n: MathNode): { coeff: number; factors: MathNode[] } {
		const factors: MathNode[] = [];
		let coeff = 1;

		function collect(m: MathNode) {
			if (isMultiplication(m)) {
				collect(m.left);
				collect(m.right);
			} else if (isNumber(m)) {
				coeff *= parseFloat(m.value);
			} else {
				factors.push(m);
			}
		}

		collect(n);
		return { coeff, factors };
	}

	const { coeff, factors } = extractFactors(node);

	if (coeff !== 2) return null;

	// Find sin and cos with same argument
	let sinFunc: FunctionNode | null = null;
	let cosFunc: FunctionNode | null = null;

	for (const f of factors) {
		if (isTrigFunc(f, 'sin') && !hasPowerOf2(f)) {
			sinFunc = f;
		} else if (isTrigFunc(f, 'cos') && !hasPowerOf2(f)) {
			cosFunc = f;
		}
	}

	if (sinFunc && cosFunc && nodesEqual(getArg(sinFunc), getArg(cosFunc))) {
		return sin(doubleArg(getArg(sinFunc)));
	}

	return null;
}

/**
 * sin²(a) -> (1 - cos(2a)) / 2
 */
function transformSinSquared(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (!hasPowerOf2(node)) return null;

	const a = getArg(node);
	return halveExpr(subtract(number('1'), cos(doubleArg(a))));
}

/**
 * cos²(a) -> (1 + cos(2a)) / 2
 */
function transformCosSquared(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (!hasPowerOf2(node)) return null;

	const a = getArg(node);
	return halveExpr(add(number('1'), cos(doubleArg(a))));
}

/**
 * sin²(a) + cos²(a) -> 1
 * Also handles cos²(a) + sin²(a)
 */
function transformPythagorean(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;

	function isSinSquared(n: MathNode): n is FunctionNode {
		return isFunction(n) && n.name === 'sin' && hasPowerOf2(n);
	}

	function isCosSquared(n: MathNode): n is FunctionNode {
		return isFunction(n) && n.name === 'cos' && hasPowerOf2(n);
	}

	// sin²(a) + cos²(a)
	if (isSinSquared(node.left) && isCosSquared(node.right)) {
		if (nodesEqual(getArg(node.left), getArg(node.right))) {
			return number('1');
		}
	}

	// cos²(a) + sin²(a)
	if (isCosSquared(node.left) && isSinSquared(node.right)) {
		if (nodesEqual(getArg(node.left), getArg(node.right))) {
			return number('1');
		}
	}

	return null;
}

/**
 * 1 - sin²(a) -> cos²(a)
 */
function transformOneMinusSinSquared(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isNumber(node.left) || node.left.value !== '1') return null;
	if (!isFunction(node.right) || node.right.name !== 'sin') return null;
	if (!hasPowerOf2(node.right)) return null;

	const a = getArg(node.right);
	return superscript(cos(a), number('2'));
}

/**
 * 1 - cos²(a) -> sin²(a)
 */
function transformOneMinusCosSquared(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isNumber(node.left) || node.left.value !== '1') return null;
	if (!isFunction(node.right) || node.right.name !== 'cos') return null;
	if (!hasPowerOf2(node.right)) return null;

	const a = getArg(node.right);
	return superscript(sin(a), number('2'));
}

/**
 * sin(a) / cos(a) -> tan(a)
 */
function transformSinOverCos(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	if (!isTrigFunc(node.numerator, 'sin')) return null;
	if (!isTrigFunc(node.denominator, 'cos')) return null;

	const sinArg = getArg(node.numerator as FunctionNode);
	const cosArg = getArg(node.denominator as FunctionNode);

	if (nodesEqual(sinArg, cosArg)) {
		return tan(sinArg);
	}

	return null;
}

// =============================================================================
// Rule Collections
// =============================================================================

const DOUBLE_ANGLE_TRANSFORMS: TrigRule[] = [
	{ name: 'double-angle-sin', transform: transformDoubleAngleSin },
	{ name: 'sin-cos-product', transform: transformSinCosProduct }
];

const POWER_REDUCTION_TRANSFORMS: TrigRule[] = [
	{ name: 'sin-squared', transform: transformSinSquared },
	{ name: 'cos-squared', transform: transformCosSquared }
];

const PYTHAGOREAN_TRANSFORMS: TrigRule[] = [
	{ name: 'pythagorean', transform: transformPythagorean },
	{ name: 'one-minus-sin-squared', transform: transformOneMinusSinSquared },
	{ name: 'one-minus-cos-squared', transform: transformOneMinusCosSquared }
];

const QUOTIENT_TRANSFORMS: TrigRule[] = [{ name: 'sin-over-cos', transform: transformSinOverCos }];

const ALL_TRANSFORMS: TrigRule[] = [
	...DOUBLE_ANGLE_TRANSFORMS,
	...POWER_REDUCTION_TRANSFORMS,
	...PYTHAGOREAN_TRANSFORMS,
	...QUOTIENT_TRANSFORMS
];

// =============================================================================
// Application Functions
// =============================================================================

/**
 * Apply transforms to a single node (not recursive)
 */
function applyTransformsToNode(
	node: MathNode,
	transforms: TrigRule[]
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
 * Apply transforms recursively to all subexpressions (single pass, bottom-up)
 */
function applyTransformsDeep(
	node: MathNode,
	transforms: TrigRule[]
): { result: MathNode; appliedRules: Set<string> } {
	const appliedRules = new Set<string>();

	// mapNode already handles recursion bottom-up (children first, then parent)
	// We just need to apply transforms at each node
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
 * Apply all trig identity transforms to an expression.
 *
 * @param node - The expression to transform
 * @param transforms - The transforms to apply (defaults to all)
 * @returns Transformation result with applied rules
 */
export function applyTrigIdentities(
	node: MathNode,
	transforms: TrigRule[] = ALL_TRANSFORMS
): TrigTransformResult {
	let current = node;
	const allAppliedRules = new Set<string>();
	let changed = false;

	// Apply repeatedly until no more changes
	const maxIterations = 10;
	for (let i = 0; i < maxIterations; i++) {
		const { result, appliedRules } = applyTransformsDeep(current, transforms);

		if (appliedRules.size === 0) {
			break;
		}

		for (const rule of appliedRules) {
			allAppliedRules.add(rule);
		}
		current = result;
		changed = true;
	}

	return {
		result: current,
		changed,
		appliedRules: Array.from(allAppliedRules)
	};
}

/**
 * Contract products and powers to double-angle form.
 *
 * Examples:
 * - sin(x) * cos(x) -> sin(2x) / 2
 * - sin²(x) -> (1 - cos(2x)) / 2
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function contractToDoubleAngle(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, [...DOUBLE_ANGLE_TRANSFORMS, ...POWER_REDUCTION_TRANSFORMS]);
}

/**
 * Simplify using Pythagorean identities.
 *
 * Examples:
 * - sin²(x) + cos²(x) -> 1
 * - 1 - sin²(x) -> cos²(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyPythagorean(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, PYTHAGOREAN_TRANSFORMS);
}

/**
 * Convert ratios to tangent/cotangent.
 *
 * Examples:
 * - sin(x) / cos(x) -> tan(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyQuotients(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, QUOTIENT_TRANSFORMS);
}

// =============================================================================
// Exports for individual transforms (for testing)
// =============================================================================

export const TRANSFORM_SIN_COS_PRODUCT = transformSinCosProduct;
export const TRANSFORM_DOUBLE_ANGLE_SIN = transformDoubleAngleSin;
export const TRANSFORM_SIN_SQUARED = transformSinSquared;
export const TRANSFORM_COS_SQUARED = transformCosSquared;
export const TRANSFORM_PYTHAGOREAN = transformPythagorean;
export const TRANSFORM_ONE_MINUS_SIN_SQUARED = transformOneMinusSinSquared;
export const TRANSFORM_ONE_MINUS_COS_SQUARED = transformOneMinusCosSquared;
export const TRANSFORM_SIN_OVER_COS = transformSinOverCos;
