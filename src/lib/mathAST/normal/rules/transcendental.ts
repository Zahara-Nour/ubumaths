/**
 * MathAST Normal Form - Transcendental Function Simplification Rules
 *
 * Rules for simplifying transcendental functions:
 * - Trigonometric functions at known angles (valeurs remarquables)
 * - Logarithm identities (ln(1) = 0, ln(e) = 1, log(1) = 0, log(10) = 1)
 * - Exponential identities (exp(0) = 1, e^0 = 1, e^1 = e)
 *
 * These rules apply at the MathNode level during pre-normalization.
 */

import type { MathNode } from '../../types';
import { hashMathNode } from '../hash.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a number node.
 */
function numberNode(value: number): MathNode {
	return { type: 'number', value: String(value) };
}

/**
 * Creates a division node (fraction).
 */
function divisionNode(numerator: MathNode, denominator: MathNode): MathNode {
	return {
		type: 'division',
		numerator,
		denominator,
		displayStyle: 'fraction'
	};
}

/**
 * Creates a sqrt function node.
 */
function sqrtNode(arg: MathNode): MathNode {
	return {
		type: 'function',
		name: 'sqrt',
		args: [arg]
	};
}

/**
 * Creates an opposite (negation) node.
 */
function oppositeNode(operand: MathNode): MathNode {
	return {
		type: 'opposite',
		operand
	};
}

/**
 * Creates a greek letter node (for π).
 */
function _piNode(): MathNode {
	return { type: 'greek', letter: 'pi' };
}

/**
 * Creates a variable node (for e).
 */
function variableNode(name: string): MathNode {
	return { type: 'variable', name };
}

/**
 * Gets the integer value from a number node.
 */
function getIntegerValue(node: MathNode): number | null {
	if (node.type === 'number') {
		const val = parseFloat(node.value);
		if (Number.isInteger(val)) {
			return val;
		}
	}
	return null;
}

/**
 * Checks if a node represents π.
 */
function isPiNode(node: MathNode): boolean {
	return node.type === 'greek' && node.letter === 'pi';
}

/**
 * Checks if a node represents the variable 'e'.
 */
function isENode(node: MathNode): boolean {
	return node.type === 'variable' && node.name === 'e';
}

/**
 * Checks if a node represents a specific number.
 */
function isNumberValue(node: MathNode, value: number): boolean {
	if (node.type === 'number') {
		return parseFloat(node.value) === value;
	}
	return false;
}

/**
 * Checks if a node represents the number 10.
 */
function isTenNode(node: MathNode): boolean {
	return isNumberValue(node, 10);
}

// =============================================================================
// Angle Detection
// =============================================================================

/**
 * Attempts to recognize an angle as a multiple of π.
 * Returns the coefficient k such that angle = k*π, or null if not recognized.
 *
 * Recognized forms:
 * - 0 → 0*π
 * - π → 1*π
 * - 2π (or π*2) → 2*π
 * - π/6 → (1/6)*π
 * - 3π/2 → (3/2)*π
 */
function getAngleCoefficient(node: MathNode): number | null {
	// Case: 0
	if (isNumberValue(node, 0)) {
		return 0;
	}

	// Case: π
	if (isPiNode(node)) {
		return 1;
	}

	// Case: n*π or π*n
	if (node.type === 'multiplication') {
		const leftNum = getIntegerValue(node.left);
		const rightNum = getIntegerValue(node.right);

		if (leftNum !== null && isPiNode(node.right)) {
			return leftNum;
		}
		if (rightNum !== null && isPiNode(node.left)) {
			return rightNum;
		}
	}

	// Case: π/n
	if (node.type === 'division') {
		if (isPiNode(node.numerator)) {
			const denom = getIntegerValue(node.denominator);
			if (denom !== null && denom !== 0) {
				return 1 / denom;
			}
		}

		// Case: n*π/m or (n/m)*π
		if (node.numerator.type === 'multiplication') {
			const mult = node.numerator;
			const leftNum = getIntegerValue(mult.left);
			const rightNum = getIntegerValue(mult.right);
			const denom = getIntegerValue(node.denominator);

			if (denom !== null && denom !== 0) {
				// n*π/m
				if (leftNum !== null && isPiNode(mult.right)) {
					return leftNum / denom;
				}
				// π*n/m
				if (rightNum !== null && isPiNode(mult.left)) {
					return rightNum / denom;
				}
			}
		}
	}

	return null;
}

// =============================================================================
// Trigonometric Values (Valeurs Remarquables)
// =============================================================================

/**
 * Known sine values as a map from angle coefficient (k in k*π) to result.
 * We use a tolerance for floating point comparison.
 */
const SINE_VALUES: Map<string, MathNode> = new Map([
	['0', numberNode(0)], // sin(0) = 0
	['1/6', divisionNode(numberNode(1), numberNode(2))], // sin(π/6) = 1/2
	['1/4', divisionNode(sqrtNode(numberNode(2)), numberNode(2))], // sin(π/4) = √2/2
	['1/3', divisionNode(sqrtNode(numberNode(3)), numberNode(2))], // sin(π/3) = √3/2
	['1/2', numberNode(1)], // sin(π/2) = 1
	['1', numberNode(0)], // sin(π) = 0
	['3/2', oppositeNode(numberNode(1))], // sin(3π/2) = -1
	['2', numberNode(0)] // sin(2π) = 0
]);

/**
 * Known cosine values.
 */
const COSINE_VALUES: Map<string, MathNode> = new Map([
	['0', numberNode(1)], // cos(0) = 1
	['1/6', divisionNode(sqrtNode(numberNode(3)), numberNode(2))], // cos(π/6) = √3/2
	['1/4', divisionNode(sqrtNode(numberNode(2)), numberNode(2))], // cos(π/4) = √2/2
	['1/3', divisionNode(numberNode(1), numberNode(2))], // cos(π/3) = 1/2
	['1/2', numberNode(0)], // cos(π/2) = 0
	['1', oppositeNode(numberNode(1))], // cos(π) = -1
	['3/2', numberNode(0)], // cos(3π/2) = 0
	['2', numberNode(1)] // cos(2π) = 1
]);

/**
 * Known tangent values.
 */
const TANGENT_VALUES: Map<string, MathNode> = new Map([
	['0', numberNode(0)], // tan(0) = 0
	['1/4', numberNode(1)], // tan(π/4) = 1
	['1', numberNode(0)] // tan(π) = 0
]);

/**
 * Converts a coefficient to a normalized string key for lookup.
 * Handles common fractions and integers.
 */
function coefficientToKey(coeff: number): string {
	// Handle exact integers
	if (Number.isInteger(coeff)) {
		return String(coeff);
	}

	// Handle common fractions with tolerance
	const fractions = [
		{ value: 1 / 6, key: '1/6' },
		{ value: 1 / 4, key: '1/4' },
		{ value: 1 / 3, key: '1/3' },
		{ value: 1 / 2, key: '1/2' },
		{ value: 2 / 3, key: '2/3' },
		{ value: 3 / 4, key: '3/4' },
		{ value: 5 / 6, key: '5/6' },
		{ value: 3 / 2, key: '3/2' }
	];

	const tolerance = 1e-10;
	for (const frac of fractions) {
		if (Math.abs(coeff - frac.value) < tolerance) {
			return frac.key;
		}
	}

	// Return as-is if not recognized
	return String(coeff);
}

// =============================================================================
// Trigonometric Simplification
// =============================================================================

/**
 * Simplify trigonometric functions at known angles.
 *
 * Applies valeurs remarquables:
 * - sin(0) = 0, sin(π/6) = 1/2, sin(π/4) = √2/2, sin(π/3) = √3/2, sin(π/2) = 1, etc.
 * - cos(0) = 1, cos(π/6) = √3/2, cos(π/4) = √2/2, cos(π/3) = 1/2, cos(π/2) = 0, etc.
 * - tan(0) = 0, tan(π/4) = 1, tan(π) = 0
 */
export function simplifyTrig(node: MathNode): MathNode {
	if (node.type !== 'function' || node.args.length !== 1) {
		return node;
	}

	const arg = node.args[0];
	const coeff = getAngleCoefficient(arg);

	if (coeff === null) {
		return node;
	}

	const key = coefficientToKey(coeff);

	switch (node.name) {
		case 'sin': {
			const value = SINE_VALUES.get(key);
			return value ?? node;
		}

		case 'cos': {
			const value = COSINE_VALUES.get(key);
			return value ?? node;
		}

		case 'tan': {
			const value = TANGENT_VALUES.get(key);
			return value ?? node;
		}

		default:
			return node;
	}
}

// =============================================================================
// Logarithm Simplification
// =============================================================================

/**
 * Simplify logarithmic expressions.
 *
 * Rules:
 * - ln(1) = 0
 * - ln(e) = 1
 * - log(1) = 0 (base 10)
 * - log(10) = 1 (base 10)
 */
export function simplifyLog(node: MathNode): MathNode {
	if (node.type !== 'function' || node.args.length < 1) {
		return node;
	}

	const arg = node.args[0];

	switch (node.name) {
		case 'ln':
			// ln(1) = 0
			if (isNumberValue(arg, 1)) {
				return numberNode(0);
			}
			// ln(e) = 1
			if (isENode(arg)) {
				return numberNode(1);
			}
			return node;

		case 'log':
			// Check if base is specified (log has optional base as second argument)
			// If no base, assume base 10
			// log(1) = 0 (any base)
			if (isNumberValue(arg, 1)) {
				return numberNode(0);
			}

			// log(10) = 1 when base is 10 (default) or not specified
			if (isTenNode(arg)) {
				// Check if base is explicitly 10 or not specified
				const base = node.base;
				if (!base || isTenNode(base)) {
					return numberNode(1);
				}
			}

			// log_b(b) = 1 for any base b
			if (node.base && hashMathNode(arg) === hashMathNode(node.base)) {
				return numberNode(1);
			}

			return node;

		default:
			return node;
	}
}

// =============================================================================
// Exponential Simplification
// =============================================================================

/**
 * Simplify exponential expressions.
 *
 * Rules:
 * - exp(0) = 1
 * - exp(1) = e
 * - e^0 = 1
 * - e^1 = e
 */
export function simplifyExp(node: MathNode): MathNode {
	// Case: exp(x)
	if (node.type === 'function' && node.name === 'exp' && node.args.length === 1) {
		const arg = node.args[0];

		// exp(0) = 1
		if (isNumberValue(arg, 0)) {
			return numberNode(1);
		}

		// exp(1) = e
		if (isNumberValue(arg, 1)) {
			return variableNode('e');
		}

		return node;
	}

	// Case: e^x (superscript)
	if (node.type === 'superscript') {
		const base = node.base;
		const exponent = node.superscript;

		// e^0 = 1
		if (isENode(base) && isNumberValue(exponent, 0)) {
			return numberNode(1);
		}

		// e^1 = e
		if (isENode(base) && isNumberValue(exponent, 1)) {
			return variableNode('e');
		}

		return node;
	}

	return node;
}

// =============================================================================
// Combined Transcendental Simplification
// =============================================================================

/**
 * Applies all transcendental simplification rules to a MathNode.
 *
 * Returns a simplified node if a rule applies, or null if no simplification is possible.
 *
 * Rules applied:
 * - Trigonometric values at known angles
 * - Logarithm identities
 * - Exponential identities
 *
 * @param node - The node to simplify
 * @returns Simplified node, or null if no rule applies
 */
export function applyTranscendentalRules(node: MathNode): MathNode | null {
	const original = node;

	// Try each simplification
	let result = simplifyTrig(node);
	if (hashMathNode(result) !== hashMathNode(original)) {
		return result;
	}

	result = simplifyLog(node);
	if (hashMathNode(result) !== hashMathNode(original)) {
		return result;
	}

	result = simplifyExp(node);
	if (hashMathNode(result) !== hashMathNode(original)) {
		return result;
	}

	return null;
}

/**
 * Recursively applies transcendental rules bottom-up.
 *
 * First simplifies children, then applies rules at this level.
 *
 * @param node - The root node to simplify
 * @returns The simplified node
 */
export function simplifyTranscendental(node: MathNode): MathNode {
	// First, recursively simplify children
	const simplified = simplifyChildrenTranscendental(node);

	// Then try to apply rules at this level
	const result = applyTranscendentalRules(simplified);
	return result ?? simplified;
}

/**
 * Simplifies children of a node recursively for transcendental rules.
 */
function simplifyChildrenTranscendental(node: MathNode): MathNode {
	switch (node.type) {
		case 'addition':
			return {
				...node,
				left: simplifyTranscendental(node.left),
				right: simplifyTranscendental(node.right)
			};

		case 'subtraction':
			return {
				...node,
				left: simplifyTranscendental(node.left),
				right: simplifyTranscendental(node.right)
			};

		case 'multiplication':
			return {
				...node,
				left: simplifyTranscendental(node.left),
				right: simplifyTranscendental(node.right)
			};

		case 'division':
			return {
				...node,
				numerator: simplifyTranscendental(node.numerator),
				denominator: simplifyTranscendental(node.denominator)
			};

		case 'opposite':
			return {
				...node,
				operand: simplifyTranscendental(node.operand)
			};

		case 'positive':
			return {
				...node,
				operand: simplifyTranscendental(node.operand)
			};

		case 'superscript':
			return {
				...node,
				base: simplifyTranscendental(node.base),
				superscript: simplifyTranscendental(node.superscript)
			};

		case 'subscript':
			return {
				...node,
				base: simplifyTranscendental(node.base),
				subscript: simplifyTranscendental(node.subscript)
			};

		case 'delimiter':
			return {
				...node,
				content: simplifyTranscendental(node.content)
			};

		case 'function':
			return {
				...node,
				args: node.args.map(simplifyTranscendental),
				...(node.power && { power: simplifyTranscendental(node.power) }),
				...(node.base && { base: simplifyTranscendental(node.base) })
			};

		case 'relation':
			return {
				...node,
				left: simplifyTranscendental(node.left),
				right: simplifyTranscendental(node.right)
			};

		case 'unit':
			return {
				...node,
				expression: simplifyTranscendental(node.expression)
			};

		// Leaf nodes - no children to simplify
		case 'number':
		case 'variable':
		case 'greek':
		case 'symbol':
		case 'hole':
			return node;

		default:
			return node;
	}
}
