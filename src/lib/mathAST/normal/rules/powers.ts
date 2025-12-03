/**
 * MathAST Normal Form - Power Simplification Rules
 *
 * Rules for simplifying expressions involving powers/exponents:
 * - x^a * x^b = x^(a+b)
 * - (x^a)^b = x^(ab)
 * - (xy)^a = x^a * y^a
 * - (x/y)^a = x^a / y^a
 */

import type { MathNode } from '../../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if two nodes represent the same base.
 * For now, uses structural equality.
 */
function sameBase(a: MathNode, b: MathNode): boolean {
	return nodesStructurallyEqual(a, b);
}

/**
 * Checks if two nodes are structurally equal.
 */
function nodesStructurallyEqual(a: MathNode, b: MathNode): boolean {
	if (a.type !== b.type) return false;

	switch (a.type) {
		case 'number':
			return a.value === (b as typeof a).value;

		case 'variable':
			return a.name === (b as typeof a).name;

		case 'greek':
			return a.letter === (b as typeof a).letter;

		case 'symbol':
			return a.symbol === (b as typeof a).symbol;

		case 'hole':
			return a.index === (b as typeof a).index;

		case 'addition':
		case 'subtraction':
			return (
				nodesStructurallyEqual(a.left, (b as typeof a).left) &&
				nodesStructurallyEqual(a.right, (b as typeof a).right)
			);

		case 'multiplication':
			return (
				nodesStructurallyEqual(a.left, (b as typeof a).left) &&
				nodesStructurallyEqual(a.right, (b as typeof a).right)
			);

		case 'division':
			return (
				nodesStructurallyEqual(a.numerator, (b as typeof a).numerator) &&
				nodesStructurallyEqual(a.denominator, (b as typeof a).denominator)
			);

		case 'opposite':
		case 'positive':
			return nodesStructurallyEqual(a.operand, (b as typeof a).operand);

		case 'superscript':
			return (
				nodesStructurallyEqual(a.base, (b as typeof a).base) &&
				nodesStructurallyEqual(a.superscript, (b as typeof a).superscript)
			);

		case 'subscript':
			return (
				nodesStructurallyEqual(a.base, (b as typeof a).base) &&
				nodesStructurallyEqual(a.subscript, (b as typeof a).subscript)
			);

		case 'delimiter':
			return nodesStructurallyEqual(a.content, (b as typeof a).content);

		case 'function': {
			const bFunc = b as typeof a;
			if (a.name !== bFunc.name) return false;
			if (a.args.length !== bFunc.args.length) return false;
			for (let i = 0; i < a.args.length; i++) {
				if (!nodesStructurallyEqual(a.args[i], bFunc.args[i])) return false;
			}
			return true;
		}

		case 'relation':
			return (
				a.relation === (b as typeof a).relation &&
				nodesStructurallyEqual(a.left, (b as typeof a).left) &&
				nodesStructurallyEqual(a.right, (b as typeof a).right)
			);

		case 'unit':
			return nodesStructurallyEqual(a.expression, (b as typeof a).expression);

		default:
			return false;
	}
}

/**
 * Checks if a node is a power (superscript) node.
 */
function isPowerNode(
	node: MathNode
): node is { type: 'superscript'; base: MathNode; superscript: MathNode } {
	return node.type === 'superscript';
}

/**
 * Checks if a node is a numeric integer.
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
 * Creates a number node from a value.
 */
function numberNode(value: number): MathNode {
	return { type: 'number', value: String(value) };
}

// =============================================================================
// Power Rules
// =============================================================================

/**
 * Applies power simplification rules to a MathNode.
 *
 * Returns a simplified node if a rule applies, or null if no simplification is possible.
 *
 * Rules applied:
 * - x^a * x^b = x^(a+b) (only for integer exponents for now)
 * - (x^a)^b = x^(a*b) (only for integer exponents for now)
 * - (xy)^n = x^n * y^n (for integer n)
 * - (x/y)^n = x^n / y^n (for integer n)
 *
 * @param node - The node to simplify
 * @returns Simplified node, or null if no rule applies
 */
export function applyPowerRules(node: MathNode): MathNode | null {
	switch (node.type) {
		case 'multiplication': {
			// x^a * x^b = x^(a+b)
			const result = tryMergePowers(node.left, node.right);
			if (result) return result;
			return null;
		}

		case 'superscript': {
			// (x^a)^b = x^(a*b)
			if (isPowerNode(node.base)) {
				const innerBase = node.base.base;
				const innerExp = getIntegerValue(node.base.superscript);
				const outerExp = getIntegerValue(node.superscript);

				if (innerExp !== null && outerExp !== null) {
					const newExp = innerExp * outerExp;
					if (newExp === 0) {
						return numberNode(1);
					}
					if (newExp === 1) {
						return innerBase;
					}
					return {
						type: 'superscript',
						base: innerBase,
						superscript: numberNode(newExp)
					};
				}
			}

			// (xy)^n = x^n * y^n (for integer n)
			if (node.base.type === 'multiplication') {
				const exp = getIntegerValue(node.superscript);
				if (exp !== null && exp >= 0) {
					const { left, right } = node.base;
					return {
						type: 'multiplication',
						left: { type: 'superscript', base: left, superscript: node.superscript },
						right: { type: 'superscript', base: right, superscript: node.superscript },
						displayStyle: 'implicit'
					};
				}
			}

			// (x/y)^n = x^n / y^n (for integer n)
			if (node.base.type === 'division') {
				const exp = getIntegerValue(node.superscript);
				if (exp !== null && exp >= 0) {
					const { numerator, denominator, displayStyle } = node.base;
					return {
						type: 'division',
						numerator: { type: 'superscript', base: numerator, superscript: node.superscript },
						denominator: { type: 'superscript', base: denominator, superscript: node.superscript },
						displayStyle
					};
				}
			}

			return null;
		}

		default:
			return null;
	}
}

/**
 * Tries to merge x^a * x^b into x^(a+b).
 * Returns null if not applicable.
 */
function tryMergePowers(left: MathNode, right: MathNode): MathNode | null {
	// Get base and exponent for left operand
	let leftBase: MathNode;
	let leftExp: number;

	if (isPowerNode(left)) {
		const exp = getIntegerValue(left.superscript);
		if (exp === null) return null;
		leftBase = left.base;
		leftExp = exp;
	} else {
		// Implicit exponent of 1
		leftBase = left;
		leftExp = 1;
	}

	// Get base and exponent for right operand
	let rightBase: MathNode;
	let rightExp: number;

	if (isPowerNode(right)) {
		const exp = getIntegerValue(right.superscript);
		if (exp === null) return null;
		rightBase = right.base;
		rightExp = exp;
	} else {
		// Implicit exponent of 1
		rightBase = right;
		rightExp = 1;
	}

	// Check if bases are the same
	if (!sameBase(leftBase, rightBase)) {
		return null;
	}

	// Combine exponents
	const newExp = leftExp + rightExp;

	if (newExp === 0) {
		return numberNode(1);
	}

	if (newExp === 1) {
		return leftBase;
	}

	return {
		type: 'superscript',
		base: leftBase,
		superscript: numberNode(newExp)
	};
}

/**
 * Recursively applies power rules bottom-up.
 *
 * First simplifies children, then applies rules at this level.
 *
 * @param node - The root node to simplify
 * @returns The simplified node
 */
export function simplifyPowers(node: MathNode): MathNode {
	// First, recursively simplify children
	const simplified = simplifyChildrenPowers(node);

	// Then try to apply rules at this level
	const result = applyPowerRules(simplified);
	return result ?? simplified;
}

/**
 * Simplifies children of a node recursively for power rules.
 */
function simplifyChildrenPowers(node: MathNode): MathNode {
	switch (node.type) {
		case 'addition':
			return {
				...node,
				left: simplifyPowers(node.left),
				right: simplifyPowers(node.right)
			};

		case 'subtraction':
			return {
				...node,
				left: simplifyPowers(node.left),
				right: simplifyPowers(node.right)
			};

		case 'multiplication':
			return {
				...node,
				left: simplifyPowers(node.left),
				right: simplifyPowers(node.right)
			};

		case 'division':
			return {
				...node,
				numerator: simplifyPowers(node.numerator),
				denominator: simplifyPowers(node.denominator)
			};

		case 'opposite':
			return {
				...node,
				operand: simplifyPowers(node.operand)
			};

		case 'positive':
			return {
				...node,
				operand: simplifyPowers(node.operand)
			};

		case 'superscript':
			return {
				...node,
				base: simplifyPowers(node.base),
				superscript: simplifyPowers(node.superscript)
			};

		case 'subscript':
			return {
				...node,
				base: simplifyPowers(node.base),
				subscript: simplifyPowers(node.subscript)
			};

		case 'delimiter':
			return {
				...node,
				content: simplifyPowers(node.content)
			};

		case 'function':
			return {
				...node,
				args: node.args.map(simplifyPowers),
				...(node.power && { power: simplifyPowers(node.power) }),
				...(node.base && { base: simplifyPowers(node.base) })
			};

		case 'relation':
			return {
				...node,
				left: simplifyPowers(node.left),
				right: simplifyPowers(node.right)
			};

		case 'unit':
			return {
				...node,
				expression: simplifyPowers(node.expression)
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
