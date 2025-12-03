/**
 * MathAST Normal Form - Radical Simplification Rules
 *
 * Rules for simplifying expressions involving radicals/roots:
 * - sqrt(a^2*b) = a*sqrt(b) (already handled in radical.ts simplifyRadical)
 * - sqrt(a) * sqrt(b) = sqrt(ab) (already handled in radical.ts mulRadicalsSameIndex)
 * - sqrt(a/b) = sqrt(a) / sqrt(b)
 * - root[n](a^n) = a
 *
 * These rules apply at the MathNode level during pre-normalization.
 * The algebraic radical operations in radical.ts handle the numeric computation.
 */

import type { MathNode } from '../../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the argument of a sqrt function node.
 */
function getSqrtArg(node: MathNode): MathNode | null {
	if (node.type === 'function' && node.name === 'sqrt' && node.args.length === 1) {
		return node.args[0];
	}
	return null;
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
 * Creates a number node.
 */
function numberNode(value: number): MathNode {
	return { type: 'number', value: String(value) };
}

// =============================================================================
// Radical Rules
// =============================================================================

/**
 * Applies radical simplification rules to a MathNode.
 *
 * Returns a simplified node if a rule applies, or null if no simplification is possible.
 *
 * Rules applied:
 * - sqrt(a) * sqrt(b) = sqrt(a*b)
 * - sqrt(a/b) = sqrt(a) / sqrt(b)
 * - sqrt(a^2) = |a| (simplified to a for positive a)
 * - sqrt(1) = 1
 * - sqrt(0) = 0
 *
 * @param node - The node to simplify
 * @returns Simplified node, or null if no rule applies
 */
export function applyRadicalRules(node: MathNode): MathNode | null {
	switch (node.type) {
		case 'multiplication': {
			// sqrt(a) * sqrt(b) = sqrt(a*b)
			const leftArg = getSqrtArg(node.left);
			const rightArg = getSqrtArg(node.right);

			if (leftArg && rightArg) {
				return sqrtNode({
					type: 'multiplication',
					left: leftArg,
					right: rightArg,
					displayStyle: 'implicit'
				});
			}
			return null;
		}

		case 'function': {
			if (node.name === 'sqrt' && node.args.length === 1) {
				const arg = node.args[0];

				// sqrt(0) = 0
				if (arg.type === 'number' && parseFloat(arg.value) === 0) {
					return numberNode(0);
				}

				// sqrt(1) = 1
				if (arg.type === 'number' && parseFloat(arg.value) === 1) {
					return numberNode(1);
				}

				// sqrt(a/b) = sqrt(a) / sqrt(b)
				if (arg.type === 'division') {
					return {
						type: 'division',
						numerator: sqrtNode(arg.numerator),
						denominator: sqrtNode(arg.denominator),
						displayStyle: arg.displayStyle
					};
				}

				// sqrt(x^2) = |x| (we simplify to x for now, assuming positive)
				if (arg.type === 'superscript') {
					const exp = getIntegerValue(arg.superscript);
					if (exp !== null && exp === 2) {
						// For simplicity, return abs(base)
						// In practice, this requires knowing the sign of base
						return {
							type: 'function',
							name: 'abs',
							args: [arg.base]
						};
					}
				}

				// sqrt(n) for perfect square integers
				if (arg.type === 'number') {
					const val = parseFloat(arg.value);
					if (Number.isInteger(val) && val >= 0) {
						const sqrt = Math.sqrt(val);
						if (Number.isInteger(sqrt)) {
							return numberNode(sqrt);
						}
					}
				}
			}

			// root[n](a^n) = a
			if (node.name === 'root' && node.args.length === 2) {
				const [arg, indexNode] = node.args;
				const index = getIntegerValue(indexNode);

				if (index !== null && arg.type === 'superscript') {
					const exp = getIntegerValue(arg.superscript);
					if (exp !== null && exp === index) {
						// For odd n, root[n](x^n) = x
						// For even n, root[n](x^n) = |x|
						if (index % 2 === 1) {
							return arg.base;
						} else {
							return {
								type: 'function',
								name: 'abs',
								args: [arg.base]
							};
						}
					}
				}
			}

			return null;
		}

		default:
			return null;
	}
}

/**
 * Recursively applies radical rules bottom-up.
 *
 * First simplifies children, then applies rules at this level.
 *
 * @param node - The root node to simplify
 * @returns The simplified node
 */
export function simplifyRadicals(node: MathNode): MathNode {
	// First, recursively simplify children
	const simplified = simplifyChildrenRadicals(node);

	// Then try to apply rules at this level
	const result = applyRadicalRules(simplified);
	return result ?? simplified;
}

/**
 * Simplifies children of a node recursively for radical rules.
 */
function simplifyChildrenRadicals(node: MathNode): MathNode {
	switch (node.type) {
		case 'addition':
			return {
				...node,
				left: simplifyRadicals(node.left),
				right: simplifyRadicals(node.right)
			};

		case 'subtraction':
			return {
				...node,
				left: simplifyRadicals(node.left),
				right: simplifyRadicals(node.right)
			};

		case 'multiplication':
			return {
				...node,
				left: simplifyRadicals(node.left),
				right: simplifyRadicals(node.right)
			};

		case 'division':
			return {
				...node,
				numerator: simplifyRadicals(node.numerator),
				denominator: simplifyRadicals(node.denominator)
			};

		case 'opposite':
			return {
				...node,
				operand: simplifyRadicals(node.operand)
			};

		case 'positive':
			return {
				...node,
				operand: simplifyRadicals(node.operand)
			};

		case 'superscript':
			return {
				...node,
				base: simplifyRadicals(node.base),
				superscript: simplifyRadicals(node.superscript)
			};

		case 'subscript':
			return {
				...node,
				base: simplifyRadicals(node.base),
				subscript: simplifyRadicals(node.subscript)
			};

		case 'delimiter':
			return {
				...node,
				content: simplifyRadicals(node.content)
			};

		case 'function':
			return {
				...node,
				args: node.args.map(simplifyRadicals),
				...(node.power && { power: simplifyRadicals(node.power) }),
				...(node.base && { base: simplifyRadicals(node.base) })
			};

		case 'relation':
			return {
				...node,
				left: simplifyRadicals(node.left),
				right: simplifyRadicals(node.right)
			};

		case 'unit':
			return {
				...node,
				expression: simplifyRadicals(node.expression)
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
