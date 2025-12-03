/**
 * MathAST Normal Form - Arithmetic Simplification Rules
 *
 * Basic arithmetic identity rules applied during normalization:
 * - 0 + x = x, x + 0 = x
 * - 0 * x = 0, x * 0 = 0
 * - 1 * x = x, x * 1 = x
 * - x^0 = 1
 * - x^1 = x
 * - 0^n = 0 (n > 0)
 * - 1^n = 1
 * - x / 1 = x
 * - 0 / x = 0 (x != 0)
 */

import type { MathNode, NumberNode } from '../../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a node represents the number zero.
 */
export function isZeroNode(node: MathNode): boolean {
	if (node.type === 'number') {
		const val = parseFloat(node.value);
		return val === 0;
	}
	return false;
}

/**
 * Checks if a node represents the number one.
 */
export function isOneNode(node: MathNode): boolean {
	if (node.type === 'number') {
		const val = parseFloat(node.value);
		return val === 1;
	}
	return false;
}

/**
 * Checks if a node represents a positive integer.
 */
export function isPositiveIntegerNode(node: MathNode): boolean {
	if (node.type === 'number') {
		const val = parseFloat(node.value);
		return Number.isInteger(val) && val > 0;
	}
	return false;
}

/**
 * Creates a number node with value "0".
 */
export function zeroNode(): NumberNode {
	return { type: 'number', value: '0' };
}

/**
 * Creates a number node with value "1".
 */
export function oneNode(): NumberNode {
	return { type: 'number', value: '1' };
}

// =============================================================================
// Arithmetic Rules
// =============================================================================

/**
 * Applies basic arithmetic simplification rules to a MathNode.
 *
 * Returns a simplified node if a rule applies, or null if no simplification is possible.
 *
 * Rules applied:
 * - Addition: 0 + x = x, x + 0 = x
 * - Subtraction: x - 0 = x
 * - Multiplication: 0 * x = 0, x * 0 = 0, 1 * x = x, x * 1 = x
 * - Division: x / 1 = x, 0 / x = 0
 * - Power (superscript): x^0 = 1, x^1 = x, 0^n = 0, 1^n = 1
 * - Opposite: -0 = 0
 * - Positive: +x = x
 *
 * @param node - The node to simplify
 * @returns Simplified node, or null if no rule applies
 */
export function applyArithmeticRules(node: MathNode): MathNode | null {
	switch (node.type) {
		case 'addition':
			// 0 + x = x
			if (isZeroNode(node.left)) {
				return node.right;
			}
			// x + 0 = x
			if (isZeroNode(node.right)) {
				return node.left;
			}
			return null;

		case 'subtraction':
			// x - 0 = x
			if (isZeroNode(node.right)) {
				return node.left;
			}
			// 0 - x is kept as subtraction for now (becomes opposite during normalization)
			return null;

		case 'multiplication':
			// 0 * x = 0
			if (isZeroNode(node.left)) {
				return zeroNode();
			}
			// x * 0 = 0
			if (isZeroNode(node.right)) {
				return zeroNode();
			}
			// 1 * x = x
			if (isOneNode(node.left)) {
				return node.right;
			}
			// x * 1 = x
			if (isOneNode(node.right)) {
				return node.left;
			}
			return null;

		case 'division':
			// x / 1 = x
			if (isOneNode(node.denominator)) {
				return node.numerator;
			}
			// 0 / x = 0 (assuming x != 0)
			if (isZeroNode(node.numerator)) {
				return zeroNode();
			}
			return null;

		case 'superscript':
			// x^0 = 1
			if (isZeroNode(node.superscript)) {
				return oneNode();
			}
			// x^1 = x
			if (isOneNode(node.superscript)) {
				return node.base;
			}
			// 0^n = 0 (n > 0)
			if (isZeroNode(node.base) && isPositiveIntegerNode(node.superscript)) {
				return zeroNode();
			}
			// 1^n = 1
			if (isOneNode(node.base)) {
				return oneNode();
			}
			return null;

		case 'opposite':
			// -0 = 0
			if (isZeroNode(node.operand)) {
				return zeroNode();
			}
			return null;

		case 'positive':
			// +x = x (positive sign is identity)
			return node.operand;

		default:
			return null;
	}
}

/**
 * Recursively applies arithmetic rules bottom-up.
 *
 * First simplifies children, then applies rules to the parent.
 *
 * @param node - The root node to simplify
 * @returns The simplified node
 */
export function simplifyArithmetic(node: MathNode): MathNode {
	// First, recursively simplify children
	const simplified = simplifyChildren(node);

	// Then try to apply rules at this level
	const result = applyArithmeticRules(simplified);
	return result ?? simplified;
}

/**
 * Simplifies children of a node recursively.
 */
function simplifyChildren(node: MathNode): MathNode {
	switch (node.type) {
		case 'addition':
			return {
				...node,
				left: simplifyArithmetic(node.left),
				right: simplifyArithmetic(node.right)
			};

		case 'subtraction':
			return {
				...node,
				left: simplifyArithmetic(node.left),
				right: simplifyArithmetic(node.right)
			};

		case 'multiplication':
			return {
				...node,
				left: simplifyArithmetic(node.left),
				right: simplifyArithmetic(node.right)
			};

		case 'division':
			return {
				...node,
				numerator: simplifyArithmetic(node.numerator),
				denominator: simplifyArithmetic(node.denominator)
			};

		case 'opposite':
			return {
				...node,
				operand: simplifyArithmetic(node.operand)
			};

		case 'positive':
			return {
				...node,
				operand: simplifyArithmetic(node.operand)
			};

		case 'superscript':
			return {
				...node,
				base: simplifyArithmetic(node.base),
				superscript: simplifyArithmetic(node.superscript)
			};

		case 'subscript':
			return {
				...node,
				base: simplifyArithmetic(node.base),
				subscript: simplifyArithmetic(node.subscript)
			};

		case 'delimiter':
			return {
				...node,
				content: simplifyArithmetic(node.content)
			};

		case 'function':
			return {
				...node,
				args: node.args.map(simplifyArithmetic),
				...(node.power && { power: simplifyArithmetic(node.power) }),
				...(node.base && { base: simplifyArithmetic(node.base) })
			};

		case 'relation':
			return {
				...node,
				left: simplifyArithmetic(node.left),
				right: simplifyArithmetic(node.right)
			};

		case 'unit':
			return {
				...node,
				expression: simplifyArithmetic(node.expression)
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
