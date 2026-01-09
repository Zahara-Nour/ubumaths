/**
 * MathAST Normal Form - Radical Simplification Rules (Phase 1)
 *
 * Only rules that Phase 2 (polynomial normalization) cannot handle efficiently:
 * - sqrt(a) * sqrt(b) = sqrt(ab) for symbolic radicals
 *
 * All other radical simplifications (sqrt(0), sqrt(1), sqrt(n) perfect squares)
 * are handled in Phase 2 by normalizeFunction.
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
 * Creates a sqrt function node.
 */
function sqrtNode(arg: MathNode): MathNode {
	return {
		type: 'function',
		name: 'sqrt',
		args: [arg]
	};
}

// =============================================================================
// Radical Rules
// =============================================================================

/**
 * Applies radical simplification rules to a MathNode.
 *
 * Returns a simplified node if a rule applies, or null if no simplification is possible.
 *
 * Rules applied (Phase 1 only - what Phase 2 cannot do efficiently):
 * - sqrt(a) * sqrt(b) = sqrt(a*b) for symbolic radicals
 *
 * @param node - The node to simplify
 * @returns Simplified node, or null if no rule applies
 */
export function applyRadicalRules(node: MathNode): MathNode | null {
	if (node.type !== 'multiplication') {
		return null;
	}

	// sqrt(a) * sqrt(b) = sqrt(a*b)
	// Phase 2 cannot combine different sqrt bases in monomials
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
